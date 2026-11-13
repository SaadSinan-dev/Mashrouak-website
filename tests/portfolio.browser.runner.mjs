import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const base = process.env.SITE_URL || 'http://localhost:5173';
const browser = await chromium.launch({ headless: true });
const sampleFeed = { version: 1, projects: [
  { id: 'featured', title: 'Featured Product', titleAr: 'المنتج المميز', shortDescription: 'A clear product introduction.', category: 'web', featured: true, order: 1, images: ['https://example.com/broken.jpg'], technologies: ['React', 'TypeScript'], liveUrl: 'https://example.com', githubUrl: '' },
  { id: 'mobile', title: 'Mobile Project', shortDescription: 'A mobile experience.', category: 'mobile', order: 2, images: [], technologies: ['Flutter'] },
  { id: 'third', title: 'Third Project', category: 'web', order: 3, images: [], technologies: [] },
] };
const feed = process.env.PORTFOLIO_FEED_FIXTURE ? JSON.parse(readFileSync(process.env.PORTFOLIO_FEED_FIXTURE, 'utf8')) : sampleFeed;
const content = { revision: 1, updatedAt: new Date().toISOString(), entries: [
  { kind: 'pages', slug: 'home', data: { sections: [], seoTitle: { ar: 'الرئيسية', en: 'Home' }, seoDescription: { ar: '', en: '' } } },
  { kind: 'pages', slug: 'work', data: { sections: [], seoTitle: { ar: 'الأعمال', en: 'Work' }, seoDescription: { ar: '', en: '' } } },
] };
try {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', (error) => console.error('Browser error:', error.message));
    if (process.env.PORTFOLIO_FEED_FIXTURE) page.on('response', (response) => { if (response.request().resourceType() === 'image' && !response.ok()) console.error('Image status:', response.status(), new URL(response.url()).hostname); });
    if (process.env.PORTFOLIO_FEED_FIXTURE) page.on('requestfailed', (request) => { if (request.resourceType() === 'image') console.error('Image failed:', request.failure()?.errorText, new URL(request.url()).hostname); });
    await page.route('**/api/public/content*', (route) => route.fulfill({ json: content }));
    await page.route('**/api/public/revision', (route) => route.fulfill({ json: { revision: 1 } }));
    await page.route('**/api/public/events', (route) => route.fulfill({ status: 204, body: '' }));
    await page.route('**/.netlify/functions/public-projects', (route) => route.fulfill({ json: feed, headers: { 'access-control-allow-origin': '*' } }));
    await page.route('https://example.com/broken.jpg', (route) => route.abort());
    await page.goto(`${base}/work`);
    try { await page.locator('.showcase-card h3').first().waitFor({ timeout: 20000 }); }
    catch (error) { console.error('Page state:', (await page.locator('body').innerText()).slice(0, 900)); throw error; }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    if (overflow) throw new Error(`Horizontal overflow at ${width}px`);
    if (await page.locator('.showcase-card').count() !== feed.projects.length) throw new Error(`Project count mismatch at ${width}px`);
    if (process.env.PORTFOLIO_FEED_FIXTURE) {
      try { await page.locator('.showcase-card .smart-image__asset.is-loaded').first().waitFor({ timeout: 20000 }); }
      catch (error) { console.error('First image:', (await page.locator('.showcase-card .smart-image').first().evaluate((node) => node.outerHTML)).slice(0, 700)); throw error; }
      for (const card of await page.locator('.showcase-card').all()) await card.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    if (width === 1440) await page.screenshot({ path: 'artifacts/portfolio-work-desktop.png', fullPage: true });
    if (width === 390) await page.screenshot({ path: 'artifacts/portfolio-work-mobile.png', fullPage: true });
    await page.goto(`${base}/work/${feed.projects[0].id}`);
    await page.locator('.showcase-detail-hero h1').waitFor();
    if (await page.locator('.showcase-detail-body').count() !== 1) throw new Error(`Project detail missing at ${width}px`);
    await context.close();
  }
  for (const scenario of ['empty', 'error']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.route('**/api/public/content*', (route) => route.fulfill({ json: content }));
    await page.route('**/api/public/revision', (route) => route.fulfill({ json: { revision: 1 } }));
    await page.route('**/api/public/events', (route) => route.fulfill({ status: 204, body: '' }));
    await page.route('**/.netlify/functions/public-projects', async (route) => {
      if (scenario === 'empty') { await new Promise((resolve) => setTimeout(resolve, 600)); await route.fulfill({ json: { version: 1, projects: [] } }); }
      else await route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    });
    await page.goto(`${base}/work`);
    if (scenario === 'empty') { await page.locator('.showcase-status[aria-busy="true"]').waitFor(); await page.getByText('لا توجد مشاريع منشورة حالياً.').waitFor({ timeout: 20000 }); }
    else await page.locator('.showcase-status button').waitFor({ timeout: 20000 });
    await context.close();
  }
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    let unavailable = false;
    await page.route('**/api/public/content*', (route) => route.fulfill({ json: content }));
    await page.route('**/api/public/revision', (route) => route.fulfill({ json: { revision: 1 } }));
    await page.route('**/api/public/events', (route) => route.fulfill({ status: 204, body: '' }));
    await page.route('**/.netlify/functions/public-projects', (route) => unavailable ? route.fulfill({ status: 503, json: { error: 'Unavailable' } }) : route.fulfill({ json: feed }));
    await page.goto(`${base}/work`);
    await page.locator('.showcase-card').first().waitFor();
    await page.evaluate(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('mashrouak:portfolio-projects:v1:')) { const saved = JSON.parse(localStorage.getItem(key)); saved.fetchedAt = 0; localStorage.setItem(key, JSON.stringify(saved)); } });
    unavailable = true;
    await page.reload();
    await page.getByText('تعذّر التحديث. تُعرض آخر نسخة محفوظة.').waitFor({ timeout: 20000 });
    if (await page.locator('.showcase-card').count() !== feed.projects.length) throw new Error('Last successful feed was not retained');
    await context.close();
  }
  console.log('Portfolio pages passed at 1440px, 768px and 390px; detail routes, broken images, loading, empty, error and saved fallback states render.');
} finally { await browser.close(); }
