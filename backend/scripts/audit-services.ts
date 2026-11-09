import {existsSync} from 'node:fs';
import {createPostgresPool,PostgresDatabase} from '../src/database';
import {auditServicesCopy} from '../src/services-copy';
if(process.env.NODE_ENV!=='production'&&existsSync('.env'))process.loadEnvFile('.env');
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
if(!['localhost','127.0.0.1','[::1]'].includes(new URL(process.env.DATABASE_URL).hostname)&&!process.argv.includes('--allow-remote'))throw new Error('Explicit --allow-remote required for intended remote copy correction');
const pool=createPostgresPool(process.env.DATABASE_URL),db=new PostgresDatabase(pool);
try {const actor=await db.prepare("SELECT id FROM users WHERE role='owner' ORDER BY created_at LIMIT 1").first<{id:string}>();if(!actor)throw new Error('An existing owner is required for the correction audit');console.log(await auditServicesCopy(db,actor.id));}finally{await pool.end();}
