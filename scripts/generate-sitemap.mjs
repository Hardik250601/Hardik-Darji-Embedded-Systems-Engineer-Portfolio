#!/usr/bin/env node
/**
 * Regenerates sitemap.xml from content.json plus the static per-entry pages.
 *
 * The per-entry URLs (project-<slug>.html / blog-<slug>.html) are the canonical
 * ones - they are the only variants whose social meta tags work without
 * JavaScript. The ?slug= template URLs are deliberately NOT listed.
 *
 * Usage: npm run build:sitemap
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = process.env.SITE_URL || 'https://hardikdarjiportfolio.vercel.app';

const content = JSON.parse(readFileSync(join(ROOT, 'content.json'), 'utf8'));

const STATIC_PAGES = [
  { loc: '/', priority: '1.0', freq: 'weekly' },
  { loc: '/projects.html', priority: '0.9', freq: 'weekly' },
  { loc: '/blogs.html', priority: '0.9', freq: 'weekly' },
];

const urls = [...STATIC_PAGES];

for (const p of content.projects || []) {
  urls.push({ loc: `/project-${p.slug}.html`, lastmod: p.date || '', priority: '0.8', freq: 'monthly' });
}
for (const b of content.blogs || []) {
  urls.push({ loc: `/blog-${b.slug}.html`, lastmod: b.date || '', priority: '0.7', freq: 'monthly' });
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

writeFileSync(join(ROOT, 'sitemap.xml'), xml);
console.log(`sitemap.xml rewritten with ${urls.length} URLs.`);