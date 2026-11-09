import {readFile} from 'node:fs/promises';
import {createTestPlatform} from './postgres-fixture';
import {passwordHash} from '../backend/src/security';
const platform=await createTestPlatform({http:true,port:8790,seed:true});
const credentials=JSON.parse(await readFile('artifacts/browser-account.json','utf8'));
await platform.db.prepare('INSERT INTO users(id,email,name,password_hash,role) VALUES(?,?,?,?,?)').bind(credentials.id,credentials.email,'Browser QA',await passwordHash(credentials.password),'owner').run();
console.log('Isolated real PostgreSQL UI verification API ready at http://127.0.0.1:8790');
process.on('SIGINT',()=>void platform.dispose().finally(()=>process.exit(0)));
