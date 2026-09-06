import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Miniflare } from 'miniflare';
import ts from 'typescript';

test('private storage: authentication, pairing, conflicts, retries, files and revocation', async () => {
  const source = (await readFile('worker/private-api.ts','utf8')).replace('import { validateRecord } from "../app/record-validation";', '') + '\n' + await readFile('app/record-validation.ts','utf8');
  const script = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const mf = new Miniflare({modules:true,script:script+'\nexport default { fetch: privateApi };',compatibilityDate:'2026-05-01',d1Databases:['DB'],r2Buckets:['FILES'],bindings:{BOOTSTRAP_SECRET:'test-bootstrap-secret'}});
  try {
    const db=await mf.getD1Database('DB');
    const sql=await readFile('drizzle/0000_needy_butterfly.sql','utf8');
    for(const statement of sql.split('--> statement-breakpoint')) if(statement.trim()) await db.prepare(statement.trim()).run();
    const call=(path,body,cookie,method=body===undefined?'GET':'POST',origin='https://workbench.test')=>mf.dispatchFetch(`https://workbench.test/api/private${path}`,{method,headers:{origin,...(cookie?{cookie}:{}),...(body!==undefined?{'content-type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    assert.equal((await call('/records')).status,401);
    assert.equal((await call('/bootstrap',{secret:'wrong'})).status,403);
    assert.equal((await call('/bootstrap',{secret:'test-bootstrap-secret'},null,'POST','https://evil.test')).status,403);
    const initialized=await call('/bootstrap',{secret:'test-bootstrap-secret',name:'computer'});
    assert.equal(initialized.status,201); const cookie=initialized.headers.get('set-cookie').split(';')[0];
    assert.match(initialized.headers.get('set-cookie'),/HttpOnly/); assert.match(initialized.headers.get('set-cookie'),/Secure/);
    const {recovery}=await initialized.json();
    assert.equal((await call('/bootstrap',{secret:'test-bootstrap-secret'})).status,503);
    const pair=await (await call('/pairing',{},cookie)).json();
    const paired=await call('/pair',{code:pair.code,name:'phone'}); assert.equal(paired.status,200);
    const phone=paired.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('/pair',{code:pair.code})).status,403);
    const nativePair=await (await call('/pairing',{},cookie)).json();
    const native=await mf.dispatchFetch('https://workbench.test/api/private/pair',{method:'POST',headers:{origin:'https://localhost','x-personal-os-client':'android','content-type':'application/json'},body:JSON.stringify({code:nativePair.code,name:'android'})});
    assert.equal(native.status,200); const nativeToken=(await native.json()).deviceToken; assert.match(nativeToken,/^[a-f0-9]{64}$/);
    const nativeRecords=await mf.dispatchFetch('https://workbench.test/api/private/records',{headers:{origin:'https://localhost','x-personal-os-client':'android',authorization:`Bearer ${nativeToken}`}}); assert.equal(nativeRecords.status,200);
    const forgedNative=await mf.dispatchFetch('https://workbench.test/api/private/pair',{method:'POST',headers:{origin:'https://evil.test','x-personal-os-client':'android','content-type':'application/json'},body:JSON.stringify({code:'0'.repeat(64),name:'attacker'})}); assert.equal(forgedNative.status,403);
    const expired=await (await call('/pairing',{},cookie)).json(); await db.prepare('UPDATE pairings SET expires_at=0').run();
    assert.equal((await call('/pair',{code:expired.code})).status,403);
    const op={id:'skill:test',revision:0,operationId:crypto.randomUUID(),value:{slug:'test',name:'中文',markdown:'# 完整原文\n你好'}};
    const writes=await Promise.all([call('/records',op,cookie),call('/records',op,phone)]); assert.ok(writes.every(r=>r.status===200));
    let stored=await (await call('/records',undefined,phone)).json(); assert.equal(stored.records[0].revision,1);assert.equal(stored.records[0].value.markdown,op.value.markdown);
    const conflicting=await call('/records',{...op,operationId:crypto.randomUUID(),value:{...op.value,name:'another'}},phone);
    assert.equal(conflicting.status,409); assert.equal((await conflicting.json()).conflict.revision,1);
    const update={...op,revision:1,operationId:crypto.randomUUID(),value:{...op.value,name:'update'}};
    assert.equal((await call('/records',update,phone)).status,200);
    assert.equal((await call('/records',op,cookie)).status,200); // Lost response retry never rewinds newer data.
    stored=await (await call('/records',undefined,cookie)).json(); assert.equal(stored.records[0].revision,2); assert.equal(stored.records[0].value.name,'update');
    const competing=await Promise.all(['A','B'].map(name=>call('/records',{...update,revision:2,operationId:crypto.randomUUID(),value:{...op.value,name}},cookie)));
    assert.deepEqual(competing.map(r=>r.status).sort(),[200,409]);
    assert.equal((await call('/records',{...update,revision:3,operationId:crypto.randomUUID()},cookie,'POST','https://evil.test')).status,403);
    const fileId=crypto.randomUUID(); const bytes=new Uint8Array([1,2,3,4]);
    const upload=await mf.dispatchFetch(`https://workbench.test/api/private/files/${fileId}`,{method:'POST',headers:{origin:'https://workbench.test',cookie,'content-type':'audio/webm'},body:bytes}); assert.equal(upload.status,200);
    assert.equal((await call(`/files/${fileId}`)).status,401);
    const audio=await call(`/files/${fileId}`,undefined,phone); assert.equal(audio.status,200);assert.match(audio.headers.get('cache-control'),/no-store/);assert.deepEqual(new Uint8Array(await audio.arrayBuffer()),bytes);
    const phoneDevice=(await (await call('/devices',undefined,cookie)).json()).find(d=>d.name==='phone');
    await call(`/devices/${phoneDevice.id}`,undefined,cookie,'DELETE');
    assert.equal((await call('/records',undefined,phone)).status,401);assert.equal((await call(`/files/${fileId}`,undefined,phone)).status,401);
    const recovered=await call('/recover',{code:recovery});assert.equal(recovered.status,200);assert.equal((await call('/recover',{code:recovery})).status,403);
    for(let i=0;i<20;i++)await call('/pair',{code:'0'.repeat(64)});
    assert.equal((await call('/pair',{code:'0'.repeat(64)})).status,429);
  } finally { await mf.dispose(); }
});
