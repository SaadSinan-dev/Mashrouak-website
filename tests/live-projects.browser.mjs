// Start the demo emulators and the three development servers as described in the runbook.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const assets =
  process.env.PORTFOLIO_ASSETS_DIR ||
  resolve('../../Saad/portfolio-new/portfolio/src/assets/projects');
const base = 'http://127.0.0.1';
const db =
  base + ':8188/v1/projects/demo-projects/databases/(default)/documents';
const email = randomUUID() + '@example.test',
  password = randomUUID();
const login = await fetch(
  base + ':9198/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  },
);
const { localId } = await login.json();
assert(localId);
const granted = await fetch(db + '/users/' + localId, {
  method: 'PATCH',
  headers: {
    Authorization: 'Bearer owner',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ fields: { role: { stringValue: 'admin' } } }),
});
assert.equal(granted.status, 200);
const browser = await chromium.launch();
try {
  const admin = await browser.newPage(),
    portfolio = await browser.newPage(),
    mash = await browser.newPage();
  for (const page of [portfolio, mash, admin])
    page.on('pageerror', (err) => console.error(err.message));
  const pages = [portfolio, mash];
  const mockPage = (slug) => ({
    kind: 'pages',
    slug,
    data: {
      sections: [],
      seoTitle: { ar: '', en: '' },
      seoDescription: { ar: '', en: '' },
    },
  });
  await mash
    .context()
    .route('**/api/public/content*', (r) =>
      r.fulfill({
        json: {
          revision: 1,
          updatedAt: new Date().toISOString(),
          entries: [mockPage('work'), mockPage('home')],
        },
      }),
    );
  await mash
    .context()
    .route('**/api/public/events', (r) => r.fulfill({ status: 204 }));
  await mash
    .context()
    .route('**/api/public/revision', (r) =>
      r.fulfill({ json: { revision: 1 } }),
    );
  let image = 0;
  await admin.route('https://api.cloudinary.com/**', (r) =>
    r.fulfill({
      json: { secure_url: 'https://preview.example/' + ++image + '.png' },
    }),
  );
  let desktopScreenshot;
  for (const page of pages) {
    await page.context().route('https://preview.example/**', (route) => {
      const portrait = route.request().url().endsWith('1.png');
      return route.fulfill(
        portrait
          ? { contentType: 'image/png', path: resolve(assets, 'project2.png') }
          : { contentType: 'image/png', body: desktopScreenshot },
      );
    });
  }
  await mash
    .context()
    .route('**/.netlify/functions/public-projects', (route) =>
      route.fulfill({ status: 503, body: '' }),
    );
  await Promise.all([
    portfolio.goto(base + ':7282/#work'),
    mash.goto(base + ':7283/work'),
    admin.goto(base + ':7281/admin/login'),
  ]);
  await admin.locator('[type=email]').fill(email);
  await admin.locator('[type=password]').fill(password);
  await admin.locator('[type=submit]').click();
  await admin.waitForURL('**/admin', { timeout: 15000 }).catch(() => {});
  await admin.goto(base + ':7281/admin/projects');
  await admin
    .getByRole('heading', { name: 'Manage work', exact: true })
    .first()
    .waitFor();
  desktopScreenshot = await admin.screenshot();
  await admin.goto(base + ':7281/admin/projects/new');
  const title = 'Realtime ' + randomUUID().slice(0, 8);
  await admin.getByLabel(/^Title/).fill(title);
  await admin
    .getByLabel('Short description', { exact: false })
    .first()
    .fill('First description');
  await admin
    .locator('input[type=file]')
    .setInputFiles(
      ['1', '2'].map((n) => ({
        name: n + '.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
          'base64',
        ),
      })),
    );
  const saved = Date.now();
  await admin.getByRole('button', { name: 'Create project' }).click();
  await admin.waitForURL('**/admin/projects');
  const committed = Date.now();
  const headings = (name) =>
    pages.map((page) =>
      page.getByRole('heading', { name, exact: true }).first(),
    );
  await Promise.all(
    headings(title).map((loc) => loc.waitFor({ timeout: 20000 })),
  );
  console.log(
    'Create visible on both pages in',
    Date.now() - saved,
    'ms from submit,',
    Date.now() - committed,
    'ms after dashboard success',
  );
  const card = mash.locator('.showcase-card').filter({ hasText: title });
  await card.scrollIntoViewIfNeeded();
  await card.locator('[data-shape=phone] img').waitFor();
  await card.locator('.device-controls button').last().click();
  await card.locator('[data-shape=browser] img').waitFor();
  const href = await card.locator('h3 a').getAttribute('href');
  const id = href.split('/').pop();
  assert.equal((await fetch(db + '/projects/' + id)).status, 403);
  const detail = await mash.context().newPage(),
    home = await mash.context().newPage();
  await detail.goto(base + ':7283' + href);
  await home.goto(base + ':7283/');
  await Promise.all([
    detail.locator('h1').filter({ hasText: title }).waitFor(),
    home.locator('.showcase-card h3').filter({ hasText: title }).waitFor(),
  ]);
  await portfolio
    .locator('.project-card')
    .filter({ hasText: title })
    .getByRole('button', { name: 'Case study' })
    .click();
  const edit = () => admin.goto(base + ':7281/admin/projects/' + id + '/edit');
  const save = async () => {
    await admin.getByRole('button', { name: 'Save changes' }).click();
    await admin.waitForURL('**/admin/projects');
  };
  await edit();
  await admin.getByLabel(/^Title/).fill(title + ' updated');
  await admin
    .getByLabel(/^Short description/)
    .fill('Project overview in real time');
  await admin
    .getByLabel(/^Full description/)
    .fill('The saved description is live.');
  await admin
    .getByLabel(/^Arabic short description/)
    .fill('تجربة عربية متزامنة');
  await admin.getByLabel(/^Live URL/).fill('https://example.com/demo');
  await admin.getByLabel(/^GitHub URL/).fill('https://github.com/example/demo');
  await admin.getByLabel('Add technology').fill('Flutter');
  await admin.getByLabel('Add technology').press('Enter');
  await admin.getByLabel(/Display order/).fill('0');
  await admin.getByLabel(/^Featured/).check();
  await admin.getByRole('button', { name: 'Make cover' }).first().click();
  await save();
  await Promise.all([
    portfolio
      .getByRole('dialog')
      .getByRole('heading', { name: title + ' updated' })
      .waitFor(),
    detail
      .locator('h1')
      .filter({ hasText: title + ' updated' })
      .waitFor(),
    home
      .locator('.showcase-card h3')
      .filter({ hasText: title + ' updated' })
      .waitFor(),
  ]);
  await portfolio
    .getByRole('dialog')
    .getByText('The saved description is live.', { exact: true })
    .waitFor();
  await detail
    .locator('.showcase-detail-body__description')
    .filter({ hasText: 'The saved description is live.' })
    .waitFor();
  await card.getByText('Flutter', { exact: true }).waitFor();
  await card.getByText('تجربة عربية متزامنة', { exact: true }).waitFor();
  await card.locator('a[href="https://example.com/demo"]').waitFor();
  await portfolio
    .getByRole('dialog')
    .locator('img[src$="2.png"]')
    .first()
    .waitFor();
  await portfolio.keyboard.press('Escape');
  await mash.context().setOffline(true);
  await edit();
  await admin.getByLabel(/^Title/).fill(title + ' online');
  await save();
  await headings(title + ' online')[0].waitFor();
  assert.equal(await card.locator('h3').innerText(), title + ' updated');
  await mash.context().setOffline(false);
  await headings(title + ' online')[1].waitFor();
  await mkdir('artifacts/live-work', { recursive: true });
  for (const language of ['ar', 'en']) {
    for (const [site, page] of [
      ['mash', mash],
      ['portfolio', portfolio],
    ]) {
      await page.setViewportSize({ width: 1440, height: 900 });
      if ((await page.locator('html').getAttribute('lang')) !== language) {
        const toggle =
          site === 'mash'
            ? '.preference-control--language:visible'
            : 'button[aria-label^="Switch to "]:visible';
        await page.locator(toggle).first().click();
      }
      assert.equal(
        await page.locator('html').getAttribute('dir'),
        language === 'ar' ? 'rtl' : 'ltr',
      );
      for (const width of [1920, 1440, 1280, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const preview = page
          .locator(site === 'mash' ? '.showcase-card' : '.project-card')
          .filter({ hasText: title });
        assert.equal(await preview.count(), 1);
        await preview.scrollIntoViewIfNeeded();
        const frame = preview.locator('.device-stage');
        const target = width < 500 ? 'phone' : 'browser';
        if ((await frame.getAttribute('data-shape')) !== target)
          await frame.locator('.device-controls button').last().click();
        await preview.locator('[data-shape=' + target + '] img').waitFor();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          site + ' overflows at ' + width,
        );
        await page.screenshot({
          path:
            'artifacts/live-work/' +
            site +
            '-' +
            language +
            '-' +
            width +
            '.png',
        });
      }
    }
  }
  await edit();
  await admin.getByLabel('Visibility').selectOption('private');
  await save();
  await Promise.all(
    headings(title + ' online').map((loc) =>
      loc.waitFor({ state: 'detached' }),
    ),
  );
  assert.equal(
    (
      await fetch(db + '/publicProjects/' + id, {
        headers: { Authorization: 'Bearer owner' },
      })
    ).status,
    404,
  );
  await detail.locator('.showcase-detail-hero').waitFor({ state: 'detached' });
  await edit();
  await admin.getByLabel('Visibility').selectOption('public');
  await save();
  await Promise.all(headings(title + ' online').map((loc) => loc.waitFor()));
  await admin
    .locator('.project-admin-row')
    .filter({ hasText: title })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await admin
    .getByRole('button', { name: 'Delete project', exact: true })
    .click();
  await Promise.all(
    headings(title + ' online').map((loc) =>
      loc.waitFor({ state: 'detached' }),
    ),
  );
  console.log(
    'Passed admin create, edit, cover change, live detail, homepage, disconnect/reconnect, private, republish, delete and six viewport sizes.',
  );
} finally {
  await browser.close();
}
