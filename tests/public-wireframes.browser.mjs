import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";
import { seedEntries } from "../backend/src/seed-content.ts";

// Exercise the released bundle, including its HTML -> React -> WebGL handoff.
const server = await preview({ preview: { host: "127.0.0.1", port: 0, strictPort: false } });
const origin = "http://127.0.0.1:" + server.httpServer.address().port;
const browser = await chromium.launch();
const dir = "artifacts/wireframe-spacing";
const sections = [], figures = [], errors = [];
const content = { revision: 1, updatedAt: new Date().toISOString(),
  entries: seedEntries.map((v,i) => ({ ...v, id: "review-" + i, sort_order:v.order })) };
const feed = { version:1, projects:[{id:"sample",title:"Sample product",category:"web"},
  {id:"second",title:"Second product",category:"mobile"}] };

try {
  await mkdir(dir, {recursive:true});
  for (const [width,height,language] of [[320,640,"ar"],[375,812,"en"],[390,844,"ar"],[430,932,"en"],[640,880,"en"],[1440,900,"en"]]) {
    const ctx = await browser.newContext({viewport:{width,height}, colorScheme:language === "ar" ? "light":"dark"});
    await ctx.addInitScript(({language,feed}) => {
      localStorage.setItem("mashrouak-language",language);
      localStorage.setItem("portfolio-live:v2:portfolio-4b886:https://saad-dev-portfolio.netlify.app/.netlify/functions/public-projects", JSON.stringify(feed));
    }, {language,feed});
    const page = await ctx.newPage();
    page.on("pageerror", e => errors.push(e.message));
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await page.route("**/api/public/content*", async r => { await gate; await r.fulfill({json:content}); });
    await page.route("**/api/public/revision*", r => r.fulfill({json:{revision:1}}));
    await page.route("**/api/public/events", r => r.fulfill({status:204,body:""}));
    await page.route("**/.netlify/functions/public-projects", r => r.fulfill({json:feed,headers:{"access-control-allow-origin":"*"}}));
    await page.goto(origin, {waitUntil:"domcontentloaded"});
    const figure = page.locator(".hero-exhibit .hero-visual");
    await figure.waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await figure.locator("svg,canvas,.hero-node").count(),0);
    const heightBefore = (await figure.boundingBox()).height;
    const skeleton = page.locator(".sk-public-page");
    const still = await skeleton.locator(".skeleton").evaluateAll(items => items.filter(el => {
      const anim = getComputedStyle(el).animationName, sweep = getComputedStyle(el, "::after");
      return anim === "none" && (sweep.display === "none" || sweep.animationName === "none");
    }).map(el=>el.className));
    assert.deepEqual(still,[]);
    const copy = skeleton.locator("h1 .sk-copy").first();
    const opacity = await copy.evaluate(async el => {
      const animation = el.getAnimations()[0]; await animation.ready;
      animation.pause(); animation.currentTime = 0; const a=getComputedStyle(el).opacity;
      animation.currentTime = 950; return [a,getComputedStyle(el).opacity];
    });
    assert.notEqual(opacity[0],opacity[1]);
    await page.emulateMedia({reducedMotion:"reduce"});
    assert.equal(await copy.evaluate(el => el.getAnimations().length),0);
    await page.emulateMedia({reducedMotion:"no-preference"});
    release();
    await page.locator(".hero-visual[data-scene-state]").waitFor();
    await figure.scrollIntoViewIfNeeded();
    await figure.locator("canvas[data-motion=idle]").waitFor();
    assert.equal(await figure.locator("canvas").count(),1);
    assert.equal(await figure.locator("canvas").getAttribute("data-reveal"),"1.000");
    assert.equal((await figure.boundingBox()).height,heightBefore);
    await page.locator(".hero-exhibit").screenshot({path:dir+"/fig01-"+width+"-"+language+".png"});
    figures.push({width,language,height:heightBefore});
    if(width<=640) {
      for(const path of ["/","/services","/about","/process","/contact","/results","/work","/work/sample","/privacy","/terms"]) {
        if(path !== "/") await page.goto(origin+path,{waitUntil:"domcontentloaded"});
        await page.locator("html[data-app-route-ready=true]").waitFor();
        await page.evaluate(()=>document.fonts.ready);
        const bounds = await page.evaluate(() => {
          const main=document.querySelector("main");
          return [...main.querySelectorAll(":scope > section, :scope > .cms-slot > section"), document.querySelector(".site-footer")].map(el => {
            const inset = el.querySelector(":scope > .cta-section__inner") || el;
            const style = getComputedStyle(inset), box = el.getBoundingClientRect();
            return {name:el.classList[0],start:box.top,end:box.bottom,top:parseFloat(style.paddingTop),bottom:parseFloat(style.paddingBottom)};
          });
        });
        assert.ok(bounds.length>=2, path + " should contain a primary section and footer");
        if (path === "/") assert.deepEqual(bounds.slice(0,-1).map(s=>s.name),
          ["hero-section","challenges-section","services-section","projects-section","results-section","why-section","process-preview","faq-section","cta-section"]);
        for (const [i,s] of bounds.entries()) {
          assert.ok(s.end > s.start, path+" "+s.name);
          if(i) {
            const prev=bounds[i-1];
            assert.ok(s.start>=prev.end-1,path+" overlapping "+s.name);
            assert.ok(prev.bottom+s.top>=80,path+" crowded "+prev.name+" / "+s.name);
          }
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+" horizontal overflow");
        sections.push({width,path,bounds});
      }
    }
    await ctx.close();
  }
  assert.deepEqual(errors,[]);
  console.log("Passed:",figures.length,"FIG. 01 sizes;",sections.length,"mobile route/width combinations; normal and reduced loading motion.");
} finally {
  await writeFile(dir+"/verification.json", JSON.stringify({figures,sections,errors},null,2));
  await browser.close();
  await server.close();
}
