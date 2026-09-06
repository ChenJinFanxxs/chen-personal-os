/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type SetStateAction } from "react";
import { Cloud, Download, RefreshCw, Smartphone, Trash2, Upload, X } from "lucide-react";
import QRCode from "qrcode";
import JSZip from "jszip";
import { Capacitor } from "@capacitor/core";
import { validateRecord } from "./record-validation";

export type SavedRecord = { id: string; value: unknown; revision: number; deleted?: boolean; updatedAt?: number };
type Pending = SavedRecord & { operationId: string };
type Cache = { records: Record<string, SavedRecord>; pending: Record<string, Pending>; conflicts: Record<string, SavedRecord>; knownDevice?: boolean };
const cacheKey = "personal-os-private-cache-v1";
const emptyCache = (): Cache => ({ records: {}, pending: {}, conflicts: {} });
const labels: Record<string, string> = { finance: "理财", english: "英语", "skill-edits": "收录标题与标签", "skill-folders": "收录分类" };
const legacyKeys: Record<string, string> = { finance: "personal-os-finance-v1", english: "personal-os-english-v2", "skill-edits": "personal-os-skill-library-edits-v1", "skill-folders": "personal-os-skill-folders-v1" };
const nativeApp = Capacitor.isNativePlatform();
const nativeTokenKey = "personal-os-native-device-v1";
const cloudOrigin = "https://chen-personal-os-20260810.chenjinfan43.chatgpt.site";
const apiRoot = nativeApp ? `${cloudOrigin}/api/private` : "/api/private";

async function privateFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (nativeApp) {
    headers.set("X-Personal-OS-Client", "android");
    const token = localStorage.getItem(nativeTokenKey);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(apiRoot + path, { ...init, headers, credentials: nativeApp ? "omit" : "same-origin", cache: "no-store" });
}

export async function api(path: string, data?: unknown, method?: string) {
  const response = await privateFetch(path, { method: method ?? (data === undefined ? "GET" : "POST"), headers: data === undefined ? undefined : { "Content-Type": "application/json" }, body: data === undefined ? undefined : JSON.stringify(data) });
  let value: any;
  try { value = await response.json(); }
  catch { throw Object.assign(new Error(nativeApp ? "云端暂时不可达" : "服务器返回了无法读取的内容"), { status: response.status }); }
  if (!response.ok) throw Object.assign(new Error(value.error || "请求失败"), { status: response.status, conflict: value.conflict });
  if (nativeApp && typeof value.deviceToken === "string") localStorage.setItem(nativeTokenKey, value.deviceToken);
  return value;
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function saveJson(value: unknown, name: string) { download(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }), name); }
async function audioDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("personal-os-attachments", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function fileAction(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest) {
  const db = await audioDb();
  return new Promise<any>((resolve, reject) => {
    const tx = db.transaction("files", mode); const req = action(tx.objectStore("files"));
    tx.oncomplete = () => { db.close(); resolve(req.result); }; tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export async function queueAttachment(blob: Blob) {
  const id = crypto.randomUUID();
  await fileAction("readwrite", store => store.put({ id, blob, uploaded: false }));
  return id;
}
export function PrivateAudio({ id }: { id: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { let active = true; let objectUrl = "";
    void fileAction("readonly", store => store.get(id)).then(async item => {
      if (!active) return;
      if (item) objectUrl = URL.createObjectURL(item.blob);
      else { const response = await privateFetch(`/files/${id}`); if (!response.ok) return; objectUrl = URL.createObjectURL(await response.blob()); }
      if (active) setSrc(objectUrl);
    });
    return () => { active = false; if (objectUrl.startsWith("blob:")) URL.revokeObjectURL(objectUrl); };
  }, [id]);
  // These are user-created practice recordings, so no transcript track exists.
  // eslint-disable-next-line jsx-a11y/media-has-caption
  return <audio controls preload="none" src={src || undefined} aria-label="训练录音" />;
}

type StoreContext = { cache: Cache; set: (id: string, value: SetStateAction<unknown>) => void; paired: boolean; flush: () => Promise<void> };
const Store = createContext<StoreContext | null>(null);
export function usePrivateRecords() { const store = useContext(Store); if (!store) throw new Error("Private store is missing"); return store; }
export function useSyncedState<T>(id: string, initial: T): [T, (next: SetStateAction<T>) => void] {
  const store = usePrivateRecords();
  const value = (store.cache.pending[id]?.value ?? store.cache.records[id]?.value ?? initial) as T;
  return [value, next => store.set(id, next as SetStateAction<unknown>)];
}

export function PrivateStore({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Cache>(emptyCache);
  const current = useRef(cache); const busy = useRef(false);
  const [paired, setPaired] = useState(false); const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("正在连接"); const [panel, setPanel] = useState(false);
  const [code, setCode] = useState(""); const [recoveryMode, setRecoveryMode] = useState(false);
  const [recovery, setRecovery] = useState(""); const [qr, setQr] = useState(""); const [pairLink, setPairLink] = useState("");
  const [devices, setDevices] = useState<{ id: string; name: string }[]>([]);
  const [migration, setMigration] = useState<Record<string, unknown> | null>(null);
  const [preview, setPreview] = useState<SavedRecord[] | null>(null);
  const importZip = useRef<JSZip | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const installHint = "在小米浏览器菜单中选择添加到桌面；如需独立窗口，可使用支持安装的 Chrome 浏览器。";
  function commit(next: Cache) {
    current.current = next; setCache(next);
    try { localStorage.setItem(cacheKey, JSON.stringify(next)); }
    catch { setStatus("本地储存空间不足，请立即导出备份并联网保存"); }
  }
  function set(id: string, value: SetStateAction<unknown>) {
    const state = current.current;
    const previous = state.pending[id]?.value ?? state.records[id]?.value;
    const resolved = typeof value === "function" ? (value as (current: unknown) => unknown)(previous) : value;
    commit({ ...state, pending: { ...state.pending, [id]: { id, value: resolved, revision: state.pending[id]?.revision ?? state.records[id]?.revision ?? 0, operationId: crypto.randomUUID() } } });
    setStatus("待同步");
  }
  async function flush() {
    if (busy.current || !navigator.onLine) { if (!navigator.onLine) setStatus("离线 · 修改暂存此设备"); return; }
    busy.current = true;
    try {
      const session = await api("/session");
      if (!session.paired) { if (nativeApp) localStorage.removeItem(nativeTokenKey); setPaired(false); commit({ ...current.current, knownDevice: false }); setStatus("请配对此设备"); return; }
      setPaired(true);
      for (const pending of Object.values(current.current.pending)) {
        if (pending.id !== "finance") continue;
        const value = structuredClone(pending.value) as any; let changed = false;
        for (const goal of value.goals || []) {
          if (typeof goal.image === "string" && /^data:image\/(png|jpeg|webp);base64,/.test(goal.image)) {
            goal.image = `${apiRoot}/files/${await queueAttachment(await (await fetch(goal.image)).blob())}`; changed = true;
          }
        }
        if (changed && current.current.pending[pending.id]?.operationId === pending.operationId) commit({ ...current.current, pending: { ...current.current.pending, [pending.id]: { ...pending, value } } });
      }
      const attachments = await fileAction("readonly", store => store.getAll());
      for (const item of attachments.filter((item: any) => !item.uploaded)) {
        const response = await privateFetch(`/files/${item.id}`, { method: "POST", headers: { "Content-Type": item.blob.type || "audio/webm" }, body: item.blob });
        if (!response.ok) throw new Error("录音或图片上传失败，已保留在此设备");
        await fileAction("readwrite", store => store.put({ ...item, uploaded: true }));
      }
      for (const pending of Object.values(current.current.pending)) {
        if (current.current.conflicts[pending.id]) continue;
        try {
          const saved = await api("/records", pending) as SavedRecord;
          const state = current.current; const nextPending = { ...state.pending };
          if (nextPending[pending.id]?.operationId === pending.operationId) delete nextPending[pending.id];
          else if (nextPending[pending.id]) nextPending[pending.id] = { ...nextPending[pending.id], revision: saved.revision, operationId: crypto.randomUUID() };
          commit({ ...state, records: { ...state.records, [saved.id]: saved }, pending: nextPending, knownDevice: true });
        } catch (error: any) {
          if (error.status === 409 && error.conflict) { commit({ ...current.current, conflicts: { ...current.current.conflicts, [pending.id]: error.conflict } }); }
          else throw error;
        }
      }
      const result = await api("/records"); const records = Object.fromEntries(result.records.map((r: SavedRecord) => [r.id, r]));
      commit({ ...current.current, records, knownDevice: true });
      setStatus(Object.keys(current.current.conflicts).length ? "有修改冲突，请处理" : Object.keys(current.current.pending).length ? "待同步" : "已同步");
    } catch (error: any) {
      if (nativeApp && current.current.knownDevice) { setPaired(true); setStatus("离线模式 · 修改暂存此设备"); }
      else setStatus(`同步失败：${error.message}`);
    }
    finally { busy.current = false; setReady(true); }
  }
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(cacheKey) || "null"); if (saved?.records && saved?.pending && saved?.conflicts) { current.current = saved; setCache(saved); if (saved.knownDevice) setPaired(true); } } catch { setStatus("本地缓存无法读取，正在尝试云端恢复"); }
    const legacy: Record<string, unknown> = {};
    for (const [id, key] of Object.entries(legacyKeys)) { const raw = localStorage.getItem(key); if (raw) { try { legacy[id] = JSON.parse(raw); } catch { legacy[`${id}-unreadable`] = raw; } } }
    const oldEnglish = localStorage.getItem("personal-os-english-v1");
    if (oldEnglish && !legacy.english) { try { legacy["english-v1"] = JSON.parse(oldEnglish); } catch { legacy["english-unreadable"] = oldEnglish; } }
    if (Object.keys(legacy).length && !localStorage.getItem("personal-os-migration-reviewed")) setMigration(legacy);
    const fragment = new URLSearchParams(location.hash.slice(1));
    const pairing = fragment.get("pair"); const bootstrap = fragment.get("setup");
    if (pairing || bootstrap) history.replaceState(null, "", location.pathname + location.search);
    if (pairing) setCode(pairing);
    async function init() {
      if (legacy["english-v1"] && !legacy.english) { const { readSavedData } = await import("./english/EnglishSystem"); legacy.english = readSavedData(); setMigration({ ...legacy }); }
      if (bootstrap) { try { const result = await api("/bootstrap", { secret: bootstrap, name: "我的电脑" }); setRecovery(result.recovery); setPanel(true); } catch (e: any) { setStatus(e.message); } }
      if (pairing) { try { await api("/pair", { code: pairing, name: /Android/i.test(navigator.userAgent) ? "我的手机" : "我的电脑" }); setCode(""); } catch (e: any) { setStatus(e.message); } }
      await flush();
      // Pairing is the authorized migration entry; preserve a backup before the first upload.
      if ((pairing || bootstrap) && current.current.knownDevice && Object.keys(legacy).length) {
        saveJson({ app: "personal-os-legacy", data: legacy }, "legacy-browser-backup.json");
        for (const [id, value] of Object.entries(legacy)) if (legacyKeys[id] && !validateRecord(id, value) && !current.current.records[id] && !current.current.pending[id]) set(id, value);
        await flush();
      }
    }
    void init();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void flush(); }, 15000);
    const resume = () => { if (document.visibilityState === "visible") void flush(); };
    const install = (event: Event) => { event.preventDefault(); setInstallPrompt(event); };
    const nativePair = (event: Event) => { const value = (event as CustomEvent<string>).detail; if (/^[a-f0-9]{64}$/.test(value)) { setCode(value); setPanel(true); setStatus("已读取安卓配对码，请连接此设备"); } };
    window.addEventListener("online", resume); document.addEventListener("visibilitychange", resume); window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("personal-os-pair", nativePair);
    if (!nativeApp && "serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { clearInterval(timer); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); window.removeEventListener("beforeinstallprompt", install); window.removeEventListener("personal-os-pair", nativePair); };
  }, []);
  useEffect(() => { if (!paired || !Object.keys(cache.pending).length) return; const timer = setTimeout(() => void flush(), 800); return () => clearTimeout(timer); }, [cache.pending, paired]);
  async function run(action: () => Promise<void>) { try { await action(); } catch (e: any) { setStatus(e.message); } }
  async function pair() {
    const result = await api(recoveryMode ? "/recover" : "/pair", { code: code.trim(), name: /Android/i.test(navigator.userAgent) ? "我的手机" : "我的电脑" });
    if (result.recovery) setRecovery(result.recovery);
    setCode(""); await flush();
  }
  async function createPair(target: "web" | "android" = "web") {
    const result = await api("/pairing", {});
    const link = target === "android" ? `personalos://pair?code=${result.code}` : `${nativeApp ? cloudOrigin : location.origin}/#pair=${result.code}`;
    setPairLink(link); setQr(await QRCode.toDataURL(link, { width: 240, margin: 2 }));
    setTimeout(() => { setQr(""); setPairLink(""); }, 600000);
  }
  async function exportBackup() {
    setStatus("正在准备完整备份");
    const zip = new JSZip();
    const records = { ...current.current.records, ...current.current.pending };
    zip.file("records.json", JSON.stringify({ app: "personal-os", version: 1, records: Object.values(records), conflicts: current.current.conflicts }, null, 2));
    const list = navigator.onLine && paired ? await api("/files") : [];
    const local = await fileAction("readonly", store => store.getAll());
    for (const item of list) {
      const cached = local.find((entry: any) => entry.id === item.id);
      const response = cached ? null : await privateFetch(`/files/${item.id}`);
      if (response && !response.ok) throw new Error("附件下载失败，尚未生成完整备份");
      zip.file(`files/${item.id}`, cached?.blob ?? await response!.blob());
    }
    for (const item of local) { if (!list.some((entry: any) => entry.id === item.id)) list.push({ id: item.id, mime: item.blob.type, size: item.blob.size }); zip.file(`files/${item.id}`, item.blob); }
    zip.file("files.json", JSON.stringify(list));
    download(await zip.generateAsync({ type: "blob" }), `personal-os-${new Date().toISOString().slice(0,10)}.zip`);
    setStatus(navigator.onLine ? "完整备份已导出" : "已导出本机备份；未缓存的云端附件不在其中");
  }
  async function readImport(file?: File) {
    if (!file) return;
    importZip.current = null;
    let value;
    if (file.name.endsWith(".zip")) { const zip = await JSZip.loadAsync(file); importZip.current = zip; value = JSON.parse(await zip.file("records.json")!.async("string")); }
    else value = JSON.parse(await file.text());
    if (value.app === "personal-os-legacy" && value.data) value = { app: "personal-os", version: 1, records: Object.entries(value.data).filter(([id]) => legacyKeys[id]).map(([id, data]) => ({ id, value: data, revision: 0 })) };
    if (value.app === "chen-personal-os" && value.module === "english" && value.version === 2) value = { app: "personal-os", version: 1, records: [{ id: "english", value: value.data, revision: 0 }] };
    if (value.app !== "personal-os" || value.version !== 1 || !Array.isArray(value.records)) throw new Error("这不是受支持的工作台备份");
    if (value.records.some((r: any) => !/^(finance|english|skill-edits|skill-folders|skill:[a-z0-9-]+)$/.test(r.id) || r.value === undefined)) throw new Error("备份包含无效记录");
    for (const record of value.records) { const invalid = validateRecord(record.id, record.value); if (invalid) throw new Error(invalid); }
    setPreview(value.records);
  }
  async function applyImport() {
    if (!preview) return;
    for (const record of preview) { const invalid = validateRecord(record.id, record.value); if (invalid) throw new Error(invalid); }
    saveJson({ app: "personal-os", version: 1, records: Object.values({ ...current.current.records, ...current.current.pending }) }, "before-import.json");
    const zip = importZip.current;
    if (zip?.file("files.json")) {
      const files = JSON.parse(await zip.file("files.json")!.async("string"));
      for (const file of files) { if (!zip.file(`files/${file.id}`)) throw new Error("备份缺少附件，已停止导入"); }
      for (const file of files) { const bytes = await zip.file(`files/${file.id}`)!.async("arraybuffer"); await fileAction("readwrite", store => store.put({ id: file.id, blob: new Blob([bytes], { type: file.mime }), uploaded: false })); }
    }
    for (const record of preview) set(record.id, record.value);
    setPreview(null); importZip.current = null; localStorage.setItem("personal-os-migration-reviewed", "true"); setMigration(null); await flush();
  }
  function resolveConflict(id: string, useLocal: boolean) {
    const state = current.current; saveJson({ local: state.pending[id], remote: state.conflicts[id] }, `conflict-${id.replace(":", "-")}.json`);
    const remote = state.conflicts[id]; const conflicts = { ...state.conflicts }; delete conflicts[id];
    const pending = { ...state.pending };
    if (useLocal) pending[id] = { ...pending[id], revision: remote.revision, operationId: crypto.randomUUID() }; else delete pending[id];
    commit({ ...state, records: { ...state.records, [id]: remote }, conflicts, pending });
  }
  const inputRef = useRef<HTMLInputElement>(null);
  const context = { cache, paired, set, flush };
  return <Store.Provider value={context}>
    <div className="private-toolbar"><span role="status"><Cloud size={16} />{status}</span><button title="设备与备份" aria-label="设备与备份" onClick={() => { setPanel(true); if (paired) void run(async () => setDevices(await api("/devices"))); }}><Smartphone size={18} /></button>{paired && <button title="立即同步" aria-label="立即同步" onClick={() => void flush()}><RefreshCw size={18} /></button>}</div>
    {ready && !paired && <aside className="private-migration private-unpaired"><strong>当前为本机空间</strong><p>可以直接浏览和记录；连接你的私人空间后，才会读取并同步你的云端内容。</p><button onClick={() => setPanel(true)}>连接我的私人空间</button></aside>}
    {ready ? children : <main className="private-entry"><h1>个人工作台</h1><p>正在连接你的工作台</p></main>}
    {migration && paired && <aside className="private-migration"><strong>发现此浏览器的旧记录</strong><p>先备份，再选择迁入。不同设备的记录不会自动覆盖。</p><button onClick={() => { saveJson({ app: "personal-os-legacy", data: migration }, "legacy-browser-backup.json"); const records = Object.entries(migration).filter(([id]) => legacyKeys[id]).map(([id, value]) => ({ id, value, revision: 0 })); setPreview(records); setPanel(true); }}>备份并预览迁移</button><button onClick={() => { localStorage.setItem("personal-os-migration-reviewed", "true"); setMigration(null); }}>暂不迁移</button></aside>}
    {panel && <div className="private-overlay"><section className="private-panel" role="dialog" aria-modal="true" aria-label="设备与备份"><header><h2>设备与备份</h2><button title="关闭" aria-label="关闭" onClick={() => setPanel(false)}><X size={20} /></button></header>
      <p role="status">{status}</p>
      <button onClick={() => void run(async () => { if (installPrompt) { await installPrompt.prompt(); setInstallPrompt(null); } else setStatus(installHint); })}><Smartphone size={16} />添加到主屏幕</button>
      {!paired && <><h3>连接私人空间</h3><label>{recoveryMode ? "恢复码" : "配对码或配对链接"}<input type="password" value={code} onChange={e => { const raw = e.target.value; try { const url = new URL(raw); setCode(new URLSearchParams(url.hash.slice(1)).get("pair") || raw); } catch { setCode(raw); } }} autoComplete="off" /></label><button onClick={() => void run(pair)}>连接此设备</button><button onClick={() => setRecoveryMode(!recoveryMode)}>{recoveryMode ? "使用配对码" : "使用恢复码"}</button></>}
      {paired && <><h3>设备配对</h3><button onClick={() => void run(() => createPair("web"))}>生成网页配对码</button><button onClick={() => void run(() => createPair("android"))}>生成安卓安装包配对码</button>{qr && <div className="pairing-code"><img src={qr} alt="手机配对二维码" width="240" height="240" /><button onClick={() => void run(async () => { await navigator.clipboard.writeText(pairLink); setStatus("配对链接已复制，请勿转发给其他人"); })}>复制配对链接</button></div>}
      {devices.map(d => <div className="private-device" key={d.id}><span>{d.name}</span><button title={`撤销${d.name}`} aria-label={`撤销${d.name}`} onClick={() => void run(async () => { if (!confirm(`撤销「${d.name}」的云端访问？`)) return; await api(`/devices/${d.id}`, undefined, "DELETE"); setDevices(await api("/devices")); await flush(); })}><Trash2 size={16}/></button></div>)}
      <h3>备份与恢复</h3><button onClick={() => void run(exportBackup)}><Download size={16}/>导出备份</button><button onClick={() => inputRef.current?.click()}><Upload size={16}/>导入备份</button><input ref={inputRef} type="file" accept=".json,.zip" hidden onChange={e => { void run(() => readImport(e.target.files?.[0])); e.target.value = ""; }} />
      <button onClick={() => void run(async () => { if (confirm("生成新恢复码后，旧恢复码失效。继续？")) setRecovery((await api("/recovery", {})).recovery); })}>生成新恢复码</button>
      {preview && <div><h3>导入预览：{preview.length} 份记录</h3><ul>{preview.map(r => <li key={r.id}>{labels[r.id] || r.id} · {cache.records[r.id] ? "替换现有内容" : "新增"}</li>)}</ul><button onClick={() => void run(applyImport)}>备份当前内容并确认导入</button><button onClick={() => setPreview(null)}>取消</button></div>}
      {Object.entries(cache.conflicts).map(([id, remote]) => <section key={id}><h3>{labels[id] || id} 有两份修改</h3><details><summary>查看本机与云端版本</summary><pre>{JSON.stringify({ 本机: cache.pending[id]?.value, 云端: remote.value }, null, 2)}</pre></details><button onClick={() => resolveConflict(id, true)}>备份两版并保留本机</button><button onClick={() => resolveConflict(id, false)}>备份两版并采用云端</button></section>)}
      </>}
      {recovery && <div><h3>请保存恢复码</h3><p>更换设备或清理浏览器后，可以用它找回记录。</p><button onClick={() => saveJson({ recovery }, "personal-os-recovery.json")}>下载恢复码</button></div>}
    </section></div>}
  </Store.Provider>;
}
