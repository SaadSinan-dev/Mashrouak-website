import assert from'node:assert/strict';import{createTestPlatform}from'./postgres-fixture';import{finishSnapshot,importSnapshot,migrationTables}from'../backend/scripts/d1-snapshot';import{seedEntries}from'../backend/src/seed-content';
const platform=await createTestPlatform();let checks=0;const check=(value:unknown,label:string)=>{assert.ok(value,label);checks++;};
const user=crypto.randomUUID(),content=crypto.randomUUID(),conversation=crypto.randomUUID();
const data=JSON.stringify(seedEntries.find(entry=>entry.kind==='settings')!.data),tables=Object.fromEntries(migrationTables.map(table=>[table,[]])) as Record<string,Record<string,unknown>[]>;
tables.users=[{id:user,email:'migration-qa@example.test',name:'Migration QA',password_hash:'unused',role:'owner',active:1,created_at:'2026-11-09 12:34:56'}];
tables.content=[{id:content,kind:'settings',slug:'global',sort_order:0,status:'published',draft:data,published:data,version:7,updated_at:'2026-11-09T12:34:56.000Z'}];
tables.revisions=[{id:crypto.randomUUID(),content_id:content,version:6,data,actor_id:user,created_at:'2026-11-08 12:34:56'}];
tables.audit_logs=[{id:crypto.randomUUID(),actor_id:user,action:'content.publish',target_id:content,detail:'Preserved QA audit',created_at:'2026-11-09 12:34:56'}];
tables.conversations=[{id:conversation,visitor_hash:'visitor-hash',name:'QA',email:'',language:'ar',status:'pending',assigned_to:user,ai_state:'idle',created_at:'2026-11-09 12:34:56',updated_at:'2026-11-09 12:34:56'}];
tables.messages=[{id:crypto.randomUUID(),conversation_id:conversation,sender:'visitor',body:'رسالة محفوظة',client_id:crypto.randomUUID(),operator_id:null,read_at:null,created_at:'2026-11-09 12:34:56'}];
tables.sessions=[{token_hash:'preserved-session-hash',user_id:user,expires_at:Date.now()+3600000}];tables.rate_limits=[{key:'qa-limit',count:3,reset_at:Date.now()+3600000}];tables.preview_tokens=[{token_hash:'preserved-preview-hash',content_id:content,expires_at:Date.now()+3600000}];
tables.media=[{id:crypto.randomUUID(),object_key:'private/legacy-preserved',filename:'legacy.png',type:'image/png',size:68,alt_ar:'الأصل',alt_en:'Original',visibility:'private',created_at:'2020-01-01 00:00:00',cloudinary_asset_id:null,cloudinary_public_id:null,cloudinary_resource_type:null,cloudinary_delivery_type:null,cloudinary_version:null,cloudinary_format:null,cloudinary_secure_url:null,width:null,height:null,revision:1,updated_at:null}];
const snapshot=finishSnapshot(tables,'local');
try{
 const dry=await importSnapshot(platform.pool,snapshot);check(!dry.applied,'Dry run performs no import');check(Number((await platform.pool.query('SELECT count(*) AS n FROM users')).rows[0].n)===0,'Dry run leaves application tables empty');
 const imported=await importSnapshot(platform.pool,snapshot,true);check(imported.applied,'Native PostgreSQL imports source in a single verified transaction');
 for(const table of migrationTables)check(Number((await platform.pool.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n)===snapshot.manifest[table]!.count,'Source row count preserved: '+table);
 const identity=await platform.pool.query('SELECT id,created_at FROM users');check(identity.rows[0].id===user&&identity.rows[0].created_at==='2026-11-09T12:34:56.000Z','Identifiers and SQLite UTC timestamp instants are preserved');
 check((await importSnapshot(platform.pool,snapshot,true)).identical,'Exact repeated import makes no changes');
 await platform.pool.query('UPDATE content SET version=42 WHERE id=$1',[content]);await assert.rejects(()=>importSnapshot(platform.pool,snapshot,true),/refuses to overwrite/);checks++;check((await platform.pool.query('SELECT version FROM content WHERE id=$1',[content])).rows[0].version===42,'Nonempty different target is never reset or overwritten');
 const bad=structuredClone(snapshot);bad.tables.extra_table=[];await assert.rejects(()=>importSnapshot(platform.pool,bad),/Unmapped/);checks++;
 const corrupt=structuredClone(snapshot);corrupt.tables.users![0]!.name='tampered';await assert.rejects(()=>importSnapshot(platform.pool,corrupt),/manifest/);checks++;
 const empty=await createTestPlatform();try{const invalid=structuredClone(tables);invalid.messages![0]!.conversation_id=crypto.randomUUID();await assert.rejects(()=>importSnapshot(empty.pool,finishSnapshot(invalid,'local'),true));checks++;check(Number((await empty.pool.query('SELECT count(*) AS n FROM users')).rows[0].n)===0&&Number((await empty.pool.query('SELECT count(*) AS n FROM content')).rows[0].n)===0,'Relationship failure rolls back all earlier imported records');}finally{await empty.dispose();}
 console.log(`PASS: ${checks} real PostgreSQL migration assertions; source tables, identifiers, timestamps, history, conversations and permissions preserved.`);
}finally{await platform.dispose();}
