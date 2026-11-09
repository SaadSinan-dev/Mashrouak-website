import {Hono} from 'hono';
import {HTTPException} from 'hono/http-exception';
import {z} from 'zod';
import {contentSchemas,entryInput,validatePublication,type ContentEntry,type ContentData} from '../../shared/schema';
import {authorize,hash} from './security';
import {decodeEntry} from './content';
import type {AppEnv} from './types';
const change=entryInput.extend({id:z.uuid()}).strict();
const changes=z.object({entries:z.array(change).min(1).max(100)}).strict();
const versions=z.object({entries:z.array(z.object({id:z.uuid(),version:z.number().int().min(1)}).strict()).min(1).max(100)}).strict();
type Row=Omit<ContentEntry,'draft'|'published'>&{draft:string;published:string|null};
export const visual=new Hono<AppEnv>();
visual.use('*',authorize(['owner','editor']));
visual.post('/save',async c=>{
 const input=changes.parse(await c.req.json());
 if(new Set(input.entries.map(entry=>entry.id)).size!==input.entries.length)throw new HTTPException(422,{message:'duplicate_entry'});
 const parsed=input.entries.map(entry=>({...entry,data:contentSchemas[entry.kind].parse(entry.data)}));
 const entries=await c.env.DB.atomic(async db=>{
  const output:ContentEntry[]=[];
  for(const entry of [...parsed].sort((a,b)=>a.id.localeCompare(b.id))){
   const previous=await db.prepare('SELECT * FROM content WHERE id=? AND version=? FOR UPDATE').bind(entry.id,entry.version).first<Row>();
   if(!previous)throw new HTTPException(409,{message:'version_conflict'});
   if(previous.kind!==entry.kind||(entry.kind==='settings'&&entry.slug!=='global'))throw new HTTPException(400,{message:'kind_cannot_change'});
   await db.prepare('INSERT INTO revisions(id,content_id,version,data,actor_id,created_at) VALUES(?,?,?,?,?,now())').bind(crypto.randomUUID(),entry.id,previous.version,previous.draft,c.get('user').id).run();
   const row=await db.prepare('UPDATE content SET draft=?,slug=?,sort_order=?,version=version+1,updated_at=now() WHERE id=? RETURNING *').bind(JSON.stringify(entry.data),entry.slug,entry.sort_order,entry.id).first<Row>();
   await db.prepare("INSERT INTO audit_logs(id,actor_id,action,target_id,detail,created_at) VALUES(?,?,'content.save',?,'Visual editor',now())").bind(crypto.randomUUID(),c.get('user').id,entry.id).run();
   output.push(decodeEntry(row!));
  }
  return output;
 });
 return c.json({entries});
});
visual.post('/publish',async c=>{
 const input=versions.parse(await c.req.json());
 if(new Set(input.entries.map(entry=>entry.id)).size!==input.entries.length)throw new HTTPException(422,{message:'duplicate_entry'});
 const result=await c.env.DB.atomic(async db=>{
  const privateMedia=await db.prepare("SELECT id FROM media WHERE visibility='private'").all<{id:string}>();
  const entries:ContentEntry[]=[];
  for(const entry of [...input.entries].sort((a,b)=>a.id.localeCompare(b.id))){
   const row=await db.prepare('SELECT * FROM content WHERE id=? AND version=? FOR UPDATE').bind(entry.id,entry.version).first<Row>();
   if(!row)throw new HTTPException(409,{message:'version_conflict'});
   const data=contentSchemas[row.kind].parse(JSON.parse(row.draft)) as ContentData;
   const problem=validatePublication(row.kind,data);
   if(problem)throw new HTTPException(422,{message:'publication_invalid'});
   if(privateMedia.results.some(media=>row.draft.includes(`/api/media/${media.id}`)))throw new HTTPException(422,{message:'private_evidence'});
   const committed=await db.prepare("UPDATE content SET published=draft,published_slug=slug,published_sort_order=sort_order,status='published',version=version+1,updated_at=now() WHERE id=? RETURNING *").bind(row.id).first<Row>();
   await db.prepare("INSERT INTO audit_logs(id,actor_id,action,target_id,detail,created_at) VALUES(?,?,'content.publish',?,'Visual editor',now())").bind(crypto.randomUUID(),c.get('user').id,row.id).run();
   entries.push(decodeEntry(committed!));
  }
  const publication=await db.prepare('WITH p AS (UPDATE publication_state SET revision=revision+1,updated_at=now() WHERE id=1 RETURNING revision,updated_at) SELECT revision,updated_at AS "updatedAt",pg_notify(?,revision::text) FROM p').bind(c.env.PUBLICATION_EVENTS?.channel??'mashrouak_publication').first<{revision:number;updatedAt:string}>();
  return {entries,publication};
 });
 return c.json(result);
});
visual.post('/preview',async c=>{
 const input=versions.parse(await c.req.json());
 const entries=await c.env.DB.atomic(async db=>{
  const rows=await db.prepare("SELECT * FROM content WHERE kind!='knowledge' ORDER BY sort_order,slug").all<Row>();
  for(const requested of input.entries)if(!rows.results.some(row=>row.id===requested.id&&row.version===requested.version))throw new HTTPException(409,{message:'version_conflict'});
  return rows.results.filter(row=>input.entries.some(entry=>entry.id===row.id)||(row.published&&row.status==='published')).map(row=>({id:row.id,kind:row.kind,slug:input.entries.some(entry=>entry.id===row.id)?row.slug:row.published_slug??row.slug,sort_order:input.entries.some(entry=>entry.id===row.id)?row.sort_order:row.published_sort_order??row.sort_order,data:JSON.parse(input.entries.some(entry=>entry.id===row.id)?row.draft:row.published!)}));
 });
 const token=crypto.randomUUID()+crypto.randomUUID();
 await c.env.DB.prepare('INSERT INTO preview_snapshots(token_hash,snapshot,actor_id,expires_at) VALUES(?,?,?,?)').bind(await hash(token),JSON.stringify(entries),c.get('user').id,Date.now()+900000).run();
 return c.json({token,expiresIn:900});
});
