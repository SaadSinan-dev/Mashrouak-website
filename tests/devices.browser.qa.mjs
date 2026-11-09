import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
export async function deviceChecks(browser,origin='http://localhost:5173'){
 const checks=[],errors=[];await mkdir('artifacts/devices-qa',{recursive:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 const check=(value,label)=>{assert.ok(value,label);checks.push(label);};
 try{
 for(const language of ['ar','en'])for(const theme of ['light','dark']){
  await page.addInitScript(({language,theme})=>{localStorage.setItem('mashrouak-language',language);localStorage.setItem('mashrouak-theme',theme);},{language,theme});
  await page.goto(origin);await page.locator('.hero-visual[data-scene-state=ready]').waitFor();
  check(await page.locator('.product-scene canvas').count()===1,`${language}/${theme}: one genuine WebGL scene`);
  check(await page.locator('.hero-node').count()===0,`${language}/${theme}: no static fallback below ready scene`);
  const alpha=await page.locator('.product-scene canvas').evaluate(async canvas=>{
   canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:canvas.getBoundingClientRect().left+20,clientY:canvas.getBoundingClientRect().top+20}));
   return new Promise(resolve=>requestAnimationFrame(()=>{const gl=canvas.getContext('webgl2'),bytes=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);let clear=0,opaque=0;for(let i=3;i<bytes.length;i+=4){if(bytes[i]===0)clear++;if(bytes[i]===255)opaque++;}resolve({alpha:gl.getContextAttributes().alpha,clear,opaque,logo:canvas.dataset.logoAsset,background:getComputedStyle(canvas.parentElement.parentElement).backgroundColor});}));
  });
  check(alpha.alpha&&alpha.clear>100&&alpha.opaque>100&&alpha.background==='rgba(0, 0, 0, 0)',`${language}/${theme}: actual transparent pixels surround opaque modeled devices`);
  check(alpha.logo===`logo-horizontal${language==='en'?'-en':''}`,`${language}/${theme}: supplied language-specific logo loaded for both screen textures`);
  await page.locator('.hero-visual').screenshot({path:`artifacts/devices-qa/${language}-${theme}.png`});
 }
 await page.evaluate(()=>window.__deviceCanvas=document.querySelector('.product-scene canvas'));
 await page.locator('.preference-control--theme').first().click();
 await page.locator('canvas[data-theme=light]').waitFor();check(await page.evaluate(()=>window.__deviceCanvas===document.querySelector('.product-scene canvas')),'Theme adaptation retains the same renderer and canvas');
 await page.setViewportSize({width:390,height:844});await page.locator('.hero-visual').scrollIntoViewIfNeeded();await page.locator('.hero-visual').screenshot({path:'artifacts/devices-qa/mobile-en-light.png'});
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile 3D composition creates no horizontal overflow');
 const reduced=await browser.newContext({reducedMotion:'reduce'}),reducedPage=await reduced.newPage();await reducedPage.goto(origin);await reducedPage.locator('.hero-visual[data-scene-state=fallback]').waitFor();check(await reducedPage.locator('.product-scene canvas').count()===0,'Reduced motion uses a static fallback without creating a GPU renderer');await reduced.close();
 const failure=await browser.newContext();await failure.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:original.call(this,type,...args);};});const failurePage=await failure.newPage();await failurePage.goto(origin);await failurePage.locator('.hero-visual[data-scene-state=fallback]').waitFor();check(await failurePage.locator('.hero-node').count()>0&&await failurePage.locator('.product-scene canvas').count()===0,'Unsupported WebGL cleanly replaces the skeleton with a static fallback');await failure.close();
 check(!errors.length,'3D browser console has no uncaught errors: '+errors.join('; '));
 await writeFile('artifacts/devices-qa/results.json',JSON.stringify({checks,errors},null,2));return checks;
 }finally{await context.close();}
}
