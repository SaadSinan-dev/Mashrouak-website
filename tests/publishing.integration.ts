import assert from 'node:assert/strict';
import {createTestPlatform} from './postgres-fixture';
import {hash} from '../backend/src/security';
import {auditServicesCopy} from '../backend/src/services-copy';
const platform=await createTestPlatform({seed:true});let checks=0;
const check=(value:unknown,label:string)=>{assert.ok(value,label);checks++;};
try{
 const owner=crypto.randomUUID(),token=crypto.randomUUID();await platform.db.prepare("INSERT INTO users(id,email,name,password_hash,role) VALUES(?,'visual-qa@example.test','QA','unused','owner')").bind(owner).run();await platform.db.prepare('INSERT INTO sessions VALUES(?,?,?)').bind(await hash(token),owner,Date.now()+3600000).run();
 async function request(path:string,body?:unknown,status=200){const response=await platform.dispatchFetch('http://localhost/api'+path,{method:body?'POST':'GET',headers:{Origin:body?'http://localhost:5174':'http://localhost:5173','X-Mashrouak-Request':'1','Content-Type':'application/json',...(body?{Cookie:`mashrouak_admin=${token}`}:{})},body:body?JSON.stringify(body):undefined});const json=await response.json() as any;assert.equal(response.status,status,JSON.stringify(json));checks++;return json;}
 let entries=(await platform.db.prepare('SELECT id,kind,slug,sort_order,version,draft,published FROM content ORDER BY kind,slug').all<any>()).results.map(entry=>({...entry,draft:JSON.parse(entry.draft),published:JSON.parse(entry.published)}));
 let service=entries.find(entry=>entry.kind==='services'),settings=entries.find(entry=>entry.kind==='settings');
 let revision=(await request('/public/content')).revision;
 for(let index=1;index<=3;index++){
  const text=`Repeated publication ${index}`,slug=service.slug+'-v'+index;
  const saved=await request('/admin/visual/save',{entries:[{id:service.id,kind:service.kind,slug,sort_order:index,version:service.version,data:{...service.draft,title:{ar:`نشر متكرر ${index}`,en:text}}}]});service=saved.entries[0];
  const isolated=await request('/public/content');check(isolated.revision===revision,'Saving draft does not advance public revision');check(!isolated.entries.some((entry:any)=>entry.slug===slug),'Draft route does not leak');check(!JSON.stringify(isolated).includes(text),'Draft heading remains private');
  const published=await request('/admin/visual/publish',{entries:[{id:service.id,version:service.version}]});service=published.entries[0];check(published.publication.revision>revision,'Each publication advances a committed revision');revision=published.publication.revision;
  const snapshot=await request('/public/content?min_revision='+revision);const publicEntry=snapshot.entries.find((entry:any)=>entry.id===service.id);check(publicEntry.data.title.en===text&&publicEntry.slug===slug&&publicEntry.sort_order===index,'Consecutive publications expose latest committed content, route and order');
 }
 const before=await platform.db.prepare('SELECT draft,version FROM content WHERE id=?').bind(service.id).first<any>();
 await request('/admin/visual/save',{entries:[{id:service.id,kind:'services',slug:service.slug,sort_order:0,version:service.version,data:{...service.draft,title:{ar:'تراجع',en:'Must roll back'}}},{id:settings.id,kind:'settings',slug:'global',sort_order:0,version:settings.version+100,data:settings.draft}]},409);
 const after=await platform.db.prepare('SELECT draft,version FROM content WHERE id=?').bind(service.id).first<any>();check(JSON.stringify(before)===JSON.stringify(after),'Multi-entry version conflict rolls back every earlier edit');
 const preview=await request('/admin/visual/preview',{entries:[{id:service.id,version:service.version}]});const privateSnapshot=await request('/preview/'+preview.token);check(privateSnapshot.entries.some((entry:any)=>entry.id===service.id),'Expiring preview includes selected saved drafts');
 await platform.db.prepare('UPDATE preview_snapshots SET expires_at=0').run();await request('/preview/'+preview.token,undefined,404);
 // Reproduce the reported typo plus an unrelated unpublished edit. Copy audit must not publish it.
 settings.draft.navigation[1].label.ar='خدمmnاتنا';settings.published.navigation[1].label.ar='خدمmnاتنا';settings.draft.footerText.ar='مسودة مستقلة لا تُنشر';
 await platform.db.prepare('UPDATE content SET draft=?,published=? WHERE id=?').bind(JSON.stringify(settings.draft),JSON.stringify(settings.published),settings.id).run();
 await auditServicesCopy(platform.db,owner,platform.env.PUBLICATION_EVENTS!.channel);
 const corrected=await platform.db.prepare('SELECT draft,published FROM content WHERE id=?').bind(settings.id).first<any>();check(JSON.parse(corrected.draft).navigation[1].label.ar==='خدماتنا'&&JSON.parse(corrected.published).navigation[1].label.ar==='خدماتنا','Reported Services typo corrected in draft and published navigation');check(JSON.parse(corrected.published).footerText.ar!=='مسودة مستقلة لا تُنشر','Copy audit preserves unrelated draft isolation');
 console.log(`PASS: ${checks} publishing/visual PostgreSQL regression assertions.`);
}finally{await platform.dispose();}
