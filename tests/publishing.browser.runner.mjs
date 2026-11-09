import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {createTestPlatform} from './postgres-fixture.ts';
import {hash} from '../backend/src/security.ts';
// Real Hono HTTP, PostgreSQL transactions, and two independent applications.
const platform=await createTestPlatform({http:true,seed:true});
const proxy={'/api':{target:platform.origin,changeOrigin:false}};
const publicVite=await createServer({configFile:'vite.config.ts',server:{host:'127.0.0.1',port:0,strictPort:false,proxy}});
const adminVite=await createServer({root:'admin-dashboard',configFile:'admin-dashboard/vite.config.ts',server:{host:'127.0.0.1',port:0,strictPort:false,proxy}});
const checks=[],errors=[];let browser;
const check=(value,label)=>{assert.ok(value,label);checks.push(label);};
try {
 await publicVite.listen();await adminVite.listen();
 const publicOrigin=`http://localhost:${publicVite.httpServer.address().port}`,adminOrigin=`http://localhost:${adminVite.httpServer.address().port}`;
 platform.env.PUBLIC_ORIGIN=publicOrigin;platform.env.ADMIN_ORIGIN=adminOrigin;
 const owner=crypto.randomUUID(),token=crypto.randomUUID();
 await platform.db.prepare("INSERT INTO users(id,email,name,password_hash,role) VALUES(?,'publish-qa@example.test','Publishing QA','unused','owner')").bind(owner).run();
 await platform.db.prepare('INSERT INTO sessions VALUES(?,?,?)').bind(await hash(token),owner,Date.now()+3600000).run();
 browser=await chromium.launch({headless:true});
 const adminContext=await browser.newContext({viewport:{width:1440,height:1000}}),normalContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await adminContext.addCookies([{name:'mashrouak_admin',value:token,domain:'localhost',path:'/api'}]);
 await adminContext.addInitScript(()=>localStorage.setItem('mashrouak-admin-language','en'));
 const admin=await adminContext.newPage(),normal=await normalContext.newPage();
 for(const page of [admin,normal]){page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.url().includes('/api/')&&response.status()>=400)errors.push(`${response.status()} ${new URL(response.url()).pathname}`);});}
 await normal.goto(publicOrigin+'/services');await normal.locator('#websites h2').waitFor();
 await admin.goto(adminOrigin+'/content/services');await admin.locator('.table-title').first().click();
 const title=admin.locator('.editor-bilingual').first().locator('textarea').first();
 let revision=0;
 for(let index=1;index<=3;index++){
  const value=`اختبار النشر المتكرر ${index}`;
  await title.fill(value);
  const save=admin.waitForResponse(response=>response.url().includes('/api/admin/content/')&&response.request().method()==='PUT');
  await admin.getByRole('button',{name:'Save draft',exact:true}).click();
  assert.equal((await save).status(),200);
  const draftSnapshot=await (await fetch(platform.origin+'/api/public/content')).json();
  check(draftSnapshot.entries.find(entry=>entry.slug==='websites').data.title.ar!==value,`Publication ${index}: saved draft stays private through API`);
  check(await normal.locator('#websites h2').textContent()!==value,`Publication ${index}: draft stays private in existing browser`);
  await admin.getByText('Unpublished changes',{exact:true}).waitFor();
  const publication=admin.waitForResponse(response=>response.url().endsWith('/publish')&&response.request().method()==='POST');
  await admin.getByRole('button',{name:'Publish',exact:true}).click();
  const response=await publication,payload=await response.json();assert.equal(response.status(),200);
  check(payload.publication.revision>revision,`Publication ${index}: committed revision increases`);revision=payload.publication.revision;
  const apiResponse=await fetch(platform.origin+`/api/public/content?min_revision=${revision}`),snapshot=await apiResponse.json();
  check(snapshot.entries.find(entry=>entry.slug==='websites').data.title.ar===value,`Publication ${index}: authoritative public API matches committed snapshot`);
  check(apiResponse.headers.get('cdn-cache-control')==='no-store',`Publication ${index}: dynamic CDN policy prevents stale snapshots`);
  await normal.locator('#websites h2').filter({hasText:value}).waitFor({timeout:10000});
  checks.push(`Publication ${index}: existing public browser receives latest heading without refresh`);
  await normal.reload();await normal.locator('#websites h2').filter({hasText:value}).waitFor();checks.push(`Publication ${index}: page refresh preserves latest heading`);
  const fresh=await browser.newContext({reducedMotion:'reduce'}),page=await fresh.newPage();
  await page.goto(publicOrigin+'/services');await page.locator('#websites h2').filter({hasText:value}).waitFor();checks.push(`Publication ${index}: fresh private browser sees latest heading`);await fresh.close();
 }
 await title.fill('مسودة سرية لا تُنشر');await admin.getByRole('button',{name:'Save draft',exact:true}).click();await admin.getByText('Unpublished changes',{exact:true}).waitFor();
 await normal.reload();await normal.locator('#websites h2').waitFor();check((await normal.locator('#websites h2').textContent())==='اختبار النشر المتكرر 3','Final unpublished draft stays invisible after refresh');
 const fresh=await browser.newContext({reducedMotion:'reduce'}),page=await fresh.newPage();await page.goto(publicOrigin+'/services');await page.locator('#websites h2').filter({hasText:'اختبار النشر المتكرر 3'}).waitFor();checks.push('Final unpublished draft stays invisible in fresh private browser');await fresh.close();
 check(!errors.length,'Dashboard/public console and API responses have no errors: '+errors.join('; '));
 await mkdir('artifacts/publishing-qa',{recursive:true});await admin.screenshot({path:'artifacts/publishing-qa/dashboard-unpublished.png',fullPage:true});await normal.screenshot({path:'artifacts/publishing-qa/public-third-publication.png',fullPage:true});
 await writeFile('artifacts/publishing-qa/results.json',JSON.stringify({checks,errors,revision},null,2));
 console.log(`PASS: ${checks.length} publishing browser checks across three consecutive edits/publications; real Node.js/PostgreSQL, isolated content.`);
} finally {await browser?.close();await platform.dispose();await publicVite.close();await adminVite.close();}
