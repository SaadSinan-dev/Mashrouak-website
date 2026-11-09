import {existsSync} from 'node:fs';
import {createPostgresPool} from '../src/database';
import {migratePostgres} from '../src/migrations';
if(process.env.NODE_ENV!=='production'&&existsSync('.env'))process.loadEnvFile('.env');
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
const pool=createPostgresPool(process.env.DATABASE_URL);
try{await migratePostgres(pool);console.log('PostgreSQL migrations are current.');}
catch{console.error('PostgreSQL migration failed. Existing data was not reset.');process.exitCode=1;}
finally{await pool.end();}
