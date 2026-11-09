import {existsSync} from 'node:fs';
import {createPostgresPool,PostgresDatabase} from '../src/database';
import {seedPostgres} from '../src/seed-content';
if(process.env.NODE_ENV!=='production'&&existsSync('.env'))process.loadEnvFile('.env');
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
const host=new URL(process.env.DATABASE_URL).hostname;
if(!['localhost','127.0.0.1','[::1]'].includes(host)&&!process.argv.includes('--production'))throw new Error('Use --production explicitly when seeding a remote PostgreSQL database. Existing records remain unchanged.');
const pool=createPostgresPool(process.env.DATABASE_URL);
try{const result=await seedPostgres(new PostgresDatabase(pool));console.log(`Imported ${result?.inserted_count??0} original illustrative content records. Existing records and administrator accounts were preserved.`);}
finally{await pool.end();}
