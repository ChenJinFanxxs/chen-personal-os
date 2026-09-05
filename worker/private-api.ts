// All private state is accessed here, before the public page renderer.
import { validateRecord } from "../app/record-validation";
type Statement = { bind(...args: unknown[]): Statement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<{ results: T[] }>; run(): Promise<unknown> };
export type PrivateEnv = {
  DB: { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown[]> };
  FILES: { put(key: string, body: ArrayBuffer, options?: unknown): Promise<unknown>; get(key: string): Promise<{ body: ReadableStream } | null> };
  BOOTSTRAP_SECRET?: string;
};
type RecordRow = { id: string; value: string; revision: number; deleted: number; updated_at: number };
type Device = { id: string; name: string; created_at: number };
const cookieName = "personal_os_device";
const allowedRecords = /^(finance|english|skill-edits|skill-folders|skill:[a-z0-9-]+)$/;
const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff", ...headers } });
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
export async function hash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), b => b.toString(16).padStart(2, "0")).join(""); }
const cookie = (value: string, request: Request) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
const decodeRow = (row: RecordRow) => ({ id: row.id, value: JSON.parse(row.value), revision: row.revision, deleted: Boolean(row.deleted), updatedAt: row.updated_at });
async function limitedBytes(request: Request, limit: number) {
  const reader = request.body?.getReader(); if (!reader) return new Uint8Array(0);
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new Error("请求内容过大"); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const part of chunks) { bytes.set(part, offset); offset += part.length; } return bytes;
}
async function body(request: Request) {
  return JSON.parse(new TextDecoder().decode(await limitedBytes(request, 8 * 1024 * 1024)));
}
async function device(request: Request, env: PrivateEnv) {
  const value = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!value || !/^[a-f0-9]{64}$/.test(value)) return null;
  return env.DB.prepare("SELECT id, name, created_at FROM devices WHERE token_hash = ?").bind(await hash(value)).first<Device>();
}
async function rateLimit(request: Request, env: PrivateEnv, action: string) {
  const key = `${action}:${await hash(request.headers.get("CF-Connecting-IP") ?? "local")}:${Math.floor(Date.now() / 600000)}`;
  const row = await env.DB.prepare("INSERT INTO attempts(id,count) VALUES(?,1) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count").bind(key).first<{ count: number }>();
  return (row?.count ?? 100) <= 20;
}
async function newDevice(env: PrivateEnv, name: unknown) {
  const secret = token(); const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO devices(id,token_hash,name,created_at) VALUES(?,?,?,?)").bind(id, await hash(secret), String(name || "我的设备").slice(0, 80), Date.now()).run();
  return secret;
}

export async function privateApi(request: Request, env: PrivateEnv): Promise<Response> {
  try {
    const url = new URL(request.url); const path = url.pathname.slice("/api/private".length); const method = request.method;
    if (!["GET", "POST", "DELETE"].includes(method)) return json({ error: "不支持的操作" }, 405);
    if (method !== "GET" && (request.headers.get("origin") !== url.origin || request.headers.get("sec-fetch-site") === "cross-site")) return json({ error: "请求来源不匹配" }, 403);
    if (!env.DB) return json({ error: "云端储存尚未就绪" }, 503);
    if (path === "/bootstrap" && method === "POST") {
      if (!(await rateLimit(request, env, "bootstrap"))) return json({ error: "尝试过多，请稍后再试" }, 429);
      const input = await body(request);
      if (!env.BOOTSTRAP_SECRET || typeof input.secret !== "string" || await hash(input.secret) !== await hash(env.BOOTSTRAP_SECRET)) return json({ error: "初始化凭证无效" }, 403);
      const recovery = token(); const secret = token(); const id = crypto.randomUUID();
      // A single transaction prevents a half-created, publicly claimable workspace.
      await env.DB.batch([
        env.DB.prepare("INSERT INTO workspace(id,recovery_hash,created_at) VALUES(1,?,?)").bind(await hash(recovery), Date.now()),
        env.DB.prepare("INSERT INTO devices(id,token_hash,name,created_at) VALUES(?,?,?,?)").bind(id, await hash(secret), String(input.name || "电脑").slice(0,80), Date.now()),
      ]);
      return json({ recovery }, 201, { "Set-Cookie": cookie(secret, request) });
    }
    if ((path === "/pair" || path === "/recover") && method === "POST") {
      if (!(await rateLimit(request, env, path))) return json({ error: "尝试过多，请十分钟后再试" }, 429);
      const input = await body(request);
      if (typeof input.code !== "string" || !/^[a-f0-9]{64}$/.test(input.code)) return json({ error: "凭证格式不正确" }, 400);
      const codeHash = await hash(input.code);
      if (path === "/pair") {
        const consumed = await env.DB.prepare("DELETE FROM pairings WHERE hash=? AND expires_at>? AND device_id IN (SELECT id FROM devices) RETURNING hash").bind(codeHash, Date.now()).first();
        if (!consumed) return json({ error: "配对码已失效或已使用，请重新生成" }, 403);
        return json({ ok: true }, 200, { "Set-Cookie": cookie(await newDevice(env, input.name), request) });
      }
      const recovery = token();
      const consumed = await env.DB.prepare("UPDATE workspace SET recovery_hash=? WHERE id=1 AND recovery_hash=? RETURNING id").bind(await hash(recovery), codeHash).first();
      if (!consumed) return json({ error: "恢复码无效或已使用" }, 403);
      return json({ recovery }, 200, { "Set-Cookie": cookie(await newDevice(env, input.name), request) });
    }
    const current = await device(request, env);
    if (path === "/session" && method === "GET") return json({ paired: Boolean(current), device: current });
    if (!current) return json({ error: "请先配对此设备" }, 401);
    if (path === "/devices" && method === "GET") return json((await env.DB.prepare("SELECT id,name,created_at FROM devices ORDER BY created_at").all()).results);
    if (path.startsWith("/devices/") && method === "DELETE") {
      const id = path.slice(9);
      await env.DB.batch([env.DB.prepare("DELETE FROM pairings WHERE device_id=?").bind(id), env.DB.prepare("DELETE FROM devices WHERE id=?").bind(id)]);
      return json({ ok: true });
    }
    if (path === "/pairing" && method === "POST") {
      const code = token();
      await env.DB.prepare("INSERT INTO pairings(hash,device_id,expires_at) VALUES(?,?,?)").bind(await hash(code), current.id, Date.now() + 600000).run();
      return json({ code, expiresAt: Date.now() + 600000 });
    }
    if (path === "/recovery" && method === "POST") {
      const code = token();
      await env.DB.prepare("UPDATE workspace SET recovery_hash=? WHERE id=1").bind(await hash(code)).run();
      return json({ recovery: code });
    }
    if (path === "/records" && method === "GET") {
      return json({ records: (await env.DB.prepare("SELECT * FROM records").all<RecordRow>()).results.map(decodeRow) });
    }
    if (path === "/records" && method === "POST") {
      const input = await body(request);
      if (!allowedRecords.test(input.id) || !Number.isInteger(input.revision) || input.revision < 0 || typeof input.operationId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(input.operationId) || input.value === undefined) return json({ error: "记录格式不正确" }, 400);
      const invalid = validateRecord(input.id, input.value);
      if (invalid) return json({ error: invalid }, 400);
      const value = JSON.stringify(input.value); const deleted = input.deleted ? 1 : 0;
      const fingerprint = await hash(JSON.stringify([input.id, input.revision, value, deleted]));
      const previous = await env.DB.prepare("SELECT fingerprint,result FROM operations WHERE id=?").bind(input.operationId).first<{ fingerprint: string; result: string }>();
      if (previous) return previous.fingerprint === fingerprint ? json(JSON.parse(previous.result)) : json({ error: "操作编号已使用" }, 409);
      const now = Date.now();
      // The operation log is written from the exact state just changed in this transaction.
      const result = { id: input.id, revision: input.revision + 1, value: input.value, deleted: Boolean(deleted), updatedAt: now };
      await env.DB.batch([
        env.DB.prepare("INSERT INTO records(id,value,revision,deleted,updated_at) SELECT ?,?,1,?,? WHERE NOT EXISTS(SELECT 1 FROM operations WHERE id=?) AND (?=0 OR EXISTS(SELECT 1 FROM records WHERE id=? AND revision=?)) ON CONFLICT(id) DO UPDATE SET value=excluded.value,revision=records.revision+1,deleted=excluded.deleted,updated_at=excluded.updated_at WHERE records.revision=? AND ?>0").bind(input.id, value, deleted, now, input.operationId, input.revision, input.id, input.revision, input.revision, input.revision),
        env.DB.prepare("INSERT INTO operations(id,fingerprint,result,created_at) SELECT ?,?,?,? WHERE changes()=1 ON CONFLICT(id) DO NOTHING").bind(input.operationId, fingerprint, JSON.stringify(result), now),
      ]);
      const saved = await env.DB.prepare("SELECT fingerprint,result FROM operations WHERE id=?").bind(input.operationId).first<{ fingerprint: string; result: string }>();
      if (saved) return saved.fingerprint === fingerprint ? json(JSON.parse(saved.result)) : json({ error: "操作编号已使用" }, 409);
      const remote = await env.DB.prepare("SELECT * FROM records WHERE id=?").bind(input.id).first<RecordRow>();
      return json({ error: "另一台设备修改了这份记录", conflict: remote ? decodeRow(remote) : null }, 409);
    }
    if (path === "/files" && method === "GET") return json((await env.DB.prepare("SELECT * FROM files ORDER BY created_at").all()).results);
    if (path.startsWith("/files/")) {
      const id = path.slice(7);
      if (!/^[a-zA-Z0-9-]{16,80}$/.test(id)) return json({ error: "附件编号无效" }, 400);
      if (method === "POST") {
        const mime = (request.headers.get("content-type") ?? "").split(";")[0];
        if (!/^(audio\/(webm|ogg|mp4|mpeg|wav)|image\/(png|jpeg|webp))$/.test(mime)) return json({ error: "不支持此附件格式" }, 400);
        if (Number(request.headers.get("content-length")) > 25 * 1024 * 1024) return json({ error: "附件不能超过25MB" }, 413);
        const bytes = (await limitedBytes(request, 25 * 1024 * 1024)).buffer as ArrayBuffer;
        if (bytes.byteLength > 25 * 1024 * 1024) return json({ error: "附件不能超过25MB" }, 413);
        const existing = await env.DB.prepare("SELECT id FROM files WHERE id=?").bind(id).first();
        if (!existing) {
          await env.FILES.put(id, bytes);
          await env.DB.prepare("INSERT INTO files(id,name,mime,size,created_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id, id, mime, bytes.byteLength, Date.now()).run();
        }
        return json({ id });
      }
      if (method === "GET") {
        const meta = await env.DB.prepare("SELECT mime FROM files WHERE id=?").bind(id).first<{ mime: string }>();
        const object = meta ? await env.FILES.get(id) : null;
        if (!object) return json({ error: "附件不存在" }, 404);
        return new Response(object.body, { headers: { "Content-Type": meta!.mime, "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" } });
      }
    }
    return json({ error: "接口不存在" }, 404);
  } catch (error) {
    console.error("Private storage operation failed", error instanceof Error ? error.message : "unknown");
    return json({ error: "保存服务暂时不可用，原记录不会被清空，请稍后重试" }, 503);
  }
}
