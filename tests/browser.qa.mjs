import assert from 'node:assert/strict';

const PUBLIC='http://localhost:5173';
const ADMIN='http://localhost:5174';
export const routes=['/','/services','/work','/work/syrian-menu','/work/pet-corner','/work/mashwarak','/results','/about','/process','/contact','/privacy','/terms','/not-a-page'];

export async function publicMatrix(page,language,theme,widths) {
  await page.bringToFront();
  const results=[];
  await page.goto(PUBLIC);
  await page.evaluate(({language,theme})=>{localStorage.setItem('mashrouak-language',language);localStorage.setItem('mashrouak-theme',theme);},{language,theme});
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of widths) {
    await page.setViewportSize({width,height:900});
    for(const route of routes) {
      await page.goto(PUBLIC+route);
      await page.locator('main h1').waitFor();
      await page.locator('main [aria-busy=true]').waitFor({state:'detached'});
      await page.evaluate(()=>document.fonts.ready);
      const state=await page.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,theme:document.documentElement.dataset.theme,overflow:document.documentElement.scrollWidth-innerWidth}));
      assert.equal(state.lang,language,route);assert.equal(state.dir,language==='ar'?'rtl':'ltr',route);assert.equal(state.theme,theme,route);assert.ok(state.overflow<=1,`${route}: ${width}px overflow ${state.overflow}`);
      results.push({route,width,language,theme,overflow:state.overflow});
    }
  }
  return results;
}

// Gates real API calls until the test observes their wireframe. No product timers.
export async function skeletonCheck(page,{route='/work',api='/public/content',selector='.sk-public-page',loaded='.portfolio-grid',geometry='.page-hero',loadedGeometry=geometry,language='ar',theme='light',width=1440}={}) {
  await page.bringToFront();
  const origin=route.startsWith('admin:')?ADMIN:PUBLIC; route=route.replace(/^admin:/,'');
  await page.goto(origin);
  await page.evaluate(({language,theme,admin})=>{localStorage.setItem(admin?'mashrouak-admin-language':'mashrouak-language',language);localStorage.setItem(admin?'mashrouak-admin-theme':'mashrouak-theme',theme);},{language,theme,admin:origin===ADMIN});
  await page.setViewportSize({width,height:900});
  let release;const gate=new Promise(resolve=>release=resolve);
  let started;const requestStarted=new Promise(resolve=>started=resolve);
  const pattern=`**/api${api}*`;
  const handler=async intercepted=>{started();await gate;await intercepted.continue().catch(()=>{});};
  await page.route(pattern,handler);
  try {
    await page.goto(origin+route);
    await requestStarted;
    await page.locator(selector).first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    assert.ok(await page.locator('[aria-busy=true]').count(),'Loading is accessible');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(overflow<=1,`Skeleton overflows by ${overflow}`);
    const before=geometry?await page.locator(geometry).first().boundingBox():null;
    const animation=await page.locator('.skeleton').first().evaluate(el=>getComputedStyle(el,'::after').animationName);
    const reduced=await page.evaluate(()=>matchMedia('(prefers-reduced-motion:reduce)').matches);
    if(reduced)assert.equal(animation,'none','Reduced motion disables shimmer');
    release();
    await page.locator(selector).first().waitFor({state:'detached'});
    await page.locator(loaded).first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    const after=loadedGeometry?await page.locator(loadedGeometry).first().boundingBox():null;
    const delta=before&&after?Math.abs(before.height-after.height):null;
    if(delta!==null)assert.ok(delta<=2,`Replacement changes height by ${delta}px`);
    return {route,language,theme,width,before,after,delta,reduced};
  } finally {release();await page.unroute(pattern,handler);}
}

export async function failureAndRefresh(page) {
  await page.bringToFront();
  let failed=true;
  const pattern='**/api/public/content';
  const handler=route=>failed?route.fulfill({status:503,contentType:'application/json',body:'{"error":"server_error"}'}):route.continue();
  await page.route(pattern,handler);
  try {
    await page.goto(PUBLIC+'/work');await page.locator('.resource-error').waitFor();
    assert.equal(await page.locator('main [aria-busy=true]').count(),0,'Failure terminates skeleton');
    failed=false;await page.locator('.resource-error button').click();await page.locator('main [aria-busy=true]').waitFor({state:'detached'});await page.locator('.project-card').first().waitFor();
    const count=await page.locator('.project-card').count();
    failed=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.locator('.content-refresh-error').waitFor();
    assert.equal(await page.locator('.project-card').count(),count,'Refresh preserves loaded content');
    assert.equal(await page.locator('main [aria-busy=true]').count(),0,'Background refresh does not replace content');
    failed=false;await page.locator('.content-refresh-error button').click();await page.locator('.content-refresh-error').waitFor({state:'detached'});
    return {initialFailure:true,retry:true,backgroundPreserved:true};
  } finally {await page.unroute(pattern,handler);}
}

export async function emptyState(page) {
  await page.bringToFront();
  const pattern='**/api/public/content';
  await page.route(pattern,async route=>{const response=await route.fetch();const data=await response.json();data.entries=data.entries.filter(entry=>entry.kind!=='projects');await route.fulfill({response,json:data});});
  try {await page.goto(PUBLIC+'/work');await page.locator('.portfolio-empty').waitFor();assert.equal(await page.locator('main [aria-busy=true]').count(),0);return {empty:true};}
  finally {await page.unroute(pattern);}
}

export async function adminMatrix(page,language,theme,widths) {
  await page.bringToFront();
  await page.goto(ADMIN);await page.locator('.admin-shell').waitFor();
  await page.evaluate(({language,theme})=>{localStorage.setItem('mashrouak-admin-language',language);localStorage.setItem('mashrouak-admin-theme',theme);},{language,theme});
  const result=[];
  for(const width of widths) {
    await page.setViewportSize({width,height:900});
    for(const route of ['/','/content/pages','/content/services','/content/projects','/content/results','/settings','/media','/inbox','/content/knowledge','/users','/audit','/account']) {
      await page.goto(ADMIN+route);await page.locator('.admin-shell').waitFor();await page.locator('main h1').waitFor();await page.locator('main [aria-busy=true]').waitFor({state:'detached'});await page.evaluate(()=>document.fonts.ready);
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,`${route} ${width}px overflow ${overflow}`);result.push({route,width,language,theme});
    }
  }
  return result;
}
