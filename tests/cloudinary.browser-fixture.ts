import { createTestPlatform } from './postgres-fixture';
import {hash} from '../backend/src/security';
export async function createMediaBrowserFixture(adminOrigin='http://localhost:5174',port=0) {
 const platform=await createTestPlatform({http:true,port,adminOrigin});
 const userId=crypto.randomUUID(),token=crypto.randomUUID();
 await platform.db.prepare("INSERT INTO users(id,email,name,password_hash,role) VALUES(?,'media-qa@example.test','Media QA','unused','owner')").bind(userId).run();
 await platform.db.prepare('INSERT INTO sessions VALUES(?,?,?)').bind(await hash(token),userId,Date.now()+3600000).run();
 return {platform,token,provider:platform.provider,origin:platform.origin};
}
