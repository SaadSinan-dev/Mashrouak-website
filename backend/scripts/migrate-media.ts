import {existsSync,readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {HTTPException} from 'hono/http-exception';
import {cloudinaryConfig,cloudinaryDelivery,destroyCloudinary,uploadCloudinary} from '../src/cloudinary';
import {createPostgresPool,PostgresDatabase} from '../src/database';
import {validateImage,type MediaRow} from '../src/media';
import {discoverLegacyMedia} from './legacy-media';
const backend=resolve(dirname(fileURLToPath(import.meta.url)),'..');
try{
 const {records}=discoverLegacyMedia(backend);
 console.log(`Historical local source: ${records.length} images; source databases and bytes remain read-only.`);
 if(records.length&&process.argv.includes('--apply')){
  const env={...parseEnv(readFileSync(resolve(backend,'.env'),'utf8')),...process.env};
  if(existsSync(resolve(backend,'.dev.vars')))throw new Error('Use backend/.env only; preserve and move any existing .dev.vars settings before migration.');
  if(!env.DATABASE_URL)throw new Error('DATABASE_URL is required');
  if(!['127.0.0.1','localhost','[::1]'].includes(new URL(env.DATABASE_URL).hostname)&&!process.argv.includes('--allow-remote'))throw new Error('Explicit --allow-remote required for intended destination');
  const config=cloudinaryConfig(env),pool=createPostgresPool(env.DATABASE_URL),db=new PostgresDatabase(pool);
  try{for(const {row:source,bytes,sha256}of records){
   const row=await db.prepare('SELECT * FROM media WHERE id=?').bind(source.id).first<MediaRow>();
   if(!row||row.object_key!==source.object_key||row.size!==source.size)throw new Error('Import and verify the intended D1 snapshot before transferring historical images');
   if(row.cloudinary_public_id){console.log(`Already migrated: ${row.id}; no duplicate upload.`);continue;}
   const image=await validateImage(new File([new Uint8Array(bytes).buffer],row.filename,{type:row.type}));
   const publicId=`${config.folder}/${row.id}/${crypto.randomUUID()}`;
   await db.prepare('INSERT INTO media_cleanup(public_id,not_before) VALUES(?,?)').bind(publicId,Date.now()+3600000).run();
   let uploaded=false;
   try{
    const asset=await uploadCloudinary(env,image.file,publicId);uploaded=true;
    const original=await cloudinaryDelivery(env,{cloudinary_public_id:publicId,cloudinary_version:asset.version,cloudinary_format:asset.format},false);
    if(createHash('sha256').update(new Uint8Array(await original.arrayBuffer())).digest('hex')!==sha256)throw new Error('Provider original does not match preserved source bytes');
    await db.atomic(async transaction=>{
     const changed=await transaction.prepare('UPDATE media SET cloudinary_asset_id=?,cloudinary_public_id=?,cloudinary_resource_type=?,cloudinary_delivery_type=?,cloudinary_version=?,cloudinary_format=?,cloudinary_secure_url=?,width=?,height=?,revision=revision+1,updated_at=now() WHERE id=? AND revision=? AND cloudinary_public_id IS NULL RETURNING id').bind(asset.asset_id,asset.public_id,asset.resource_type,asset.type,asset.version,asset.format,asset.secure_url,asset.width,asset.height,row.id,row.revision).first();
     if(!changed)throw new Error('Historical media changed concurrently; existing record is preserved');
     await transaction.prepare('DELETE FROM media_cleanup WHERE public_id=?').bind(publicId).run();
     await transaction.prepare("INSERT INTO audit_logs(id,actor_id,action,target_id,detail,created_at) VALUES(?,NULL,'media.migrate',?,?,now())").bind(crypto.randomUUID(),row.id,`original_sha256=${sha256}`).run();
    });
    console.log(`Migrated and verified original bytes: ${row.id}; ID, references, alt and creation time preserved.`);
   }catch(error){if(uploaded){try{await destroyCloudinary(env,publicId);await db.prepare('DELETE FROM media_cleanup WHERE public_id=?').bind(publicId).run();}catch{/* Durable native cleanup retries retained provider objects. */}}throw error;}
  }}finally{await pool.end();}
 }else if(records.length)console.log('After PostgreSQL import and Cloudinary configuration, run npm run media:migrate -w @mashrouak/backend. No source is modified.');
}catch(error){console.error(error instanceof HTTPException?error.message:error instanceof Error&&!/cloudinary|fetch|https?:|postgresql:/i.test(error.message)?error.message:'Migration failed; existing data and source bytes are preserved. Check configuration and connectivity.');process.exitCode=1;}
