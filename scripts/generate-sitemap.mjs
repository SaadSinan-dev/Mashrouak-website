import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readEnvFile(filePath) {
  try {
    const contents = await readFile(filePath, 'utf8');
    const line = contents.split(/\r?\n/).find((entry) => /^\s*VITE_SITE_URL\s*=/.test(entry));
    return line ? line.replace(/^\s*VITE_SITE_URL\s*=\s*/, '').trim().replace(/^['"]|['"]$/g, '') : '';
  } catch {
    return '';
  }
}

const envOrigin = process.env.VITE_SITE_URL || process.env.SITE_URL || await readEnvFile('.env.local') || await readEnvFile('.env') || '';
const origin = envOrigin.trim().replace(/\/$/, '');
const publicDirectory = resolve('public');
const routes = [
  '/', '/services', '/work', '/work/syrian-menu', '/work/pet-corner', '/work/mashwarak',
  '/about', '/process', '/contact', '/privacy', '/terms',
];

await mkdir(publicDirectory, { recursive: true });

if (!origin) {
  const emptySitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n';
  await writeFile(resolve(publicDirectory, 'sitemap.xml'), emptySitemap, 'utf8');
  await writeFile(resolve(publicDirectory, 'robots.txt'), 'User-agent: *\nAllow: /\n', 'utf8');
  console.warn('VITE_SITE_URL is not configured. Wrote an empty sitemap and robots.txt without a Sitemap directive. Set the production origin and run npm run sitemap again.');
} else {
  const entries = routes.map((route) => `  <url><loc>${origin}${route}</loc></url>`).join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
  await writeFile(resolve(publicDirectory, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(resolve(publicDirectory, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, 'utf8');
  console.info(`Generated sitemap for ${routes.length} routes at ${origin}.`);
}
