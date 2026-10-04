#!/usr/bin/env node
/**
 * Regenerates feed.xml (RSS 2.0) from content.json.
 *
 * The feed points at the generated per-post pages (blog-<slug>.html) rather
 * than the ?slug= template URLs, matching sitemap.xml: those static files are
 * the only variants whose titles and descriptions are readable without
 * JavaScript, which is what feed readers and aggregators fetch.
 *
 * Usage: npm run build:rss
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = process.env.SITE_URL || 'https://hardikmdarji.vercel.app';

const AUTHOR = 'Hardik Darji';
const AUTHOR_URL = `${SITE_URL}/`;
const LANGUAGE = 'en-us';

// Use a literal em dash. HTML entities like `&mdash;` are NOT part of XML 1.0's
// predefined entity set and make a strict feed parser reject the whole file.
const TITLE_SUFFIX = ' \u2014 Embedded Systems Blog';

/**
 * XML 1.0 forbids most control characters outright, and unescaped &, < or >
 * make the whole feed unparseable. Strip the illegal ones, then escape the
 * three reserved characters.
 */
function xmlText(value) {
  return String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Atom requires an RFC 3339 timestamp; content.json dates are plain YYYY-MM-DD. */
function toRfc3339(date) {
  const raw = String(date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return '';
  return `${raw.slice(0, 10)}T00:00:00+00:00`;
}

/** A valid RFC 822 date is mandatory for RSS 2.0. */
function toRfc822(date) {
  const rfc3339 = toRfc3339(date);
  if (!rfc3339) return '';
  const parsed = new Date(rfc3339);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toUTCString();
}

const content = JSON.parse(readFileSync(join(ROOT, 'content.json'), 'utf8'));
const blogs = Array.isArray(content.blogs) ? content.blogs : [];

// Newest first, then drop any entry with no usable date so we never emit an
// <item> that fails validation in a strict feed reader.
const items = blogs
  .filter(b => b && b.slug && toRfc822(b.date))
  .sort((a, b) => (toRfc3339(b.date) > toRfc3339(a.date) ? 1 : -1));

if (items.length === 0) {
  console.warn('feed.xml: no dated blog posts found; sitemap/blogs may be out of sync.');
}

// feed-level <lastBuildDate> uses the newest post, falling back to the build
// time so the feed is never emitted with an invalid date.
const newest = items.length ? toRfc822(items[0].date) : new Date().toUTCString();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xmlText(`${AUTHOR}${TITLE_SUFFIX}`)}</title>
    <link>${xmlText(`${SITE_URL}/blogs.html`)}</link>
    <description>${xmlText('Notes on embedded C, CAN and J1939, real-time debugging, and firmware performance from a senior embedded engineer.')}</description>
    <language>${LANGUAGE}</language>
    <managingEditor>${xmlText(`${AUTHOR} (hmdarji921@gmail.com)`)}</managingEditor>
    <webMaster>${xmlText(`${AUTHOR} (hmdarji921@gmail.com)`)}</webMaster>
    <lastBuildDate>${xmlText(newest)}</lastBuildDate>
    <atom:link href="${xmlText(`${SITE_URL}/feed.xml`)}" rel="self" type="application/rss+xml"/>
${items
  .map(
    (b) => `    <item>
      <title>${xmlText(b.title)}</title>
      <link>${xmlText(`${SITE_URL}/blog-${b.slug}.html`)}</link>
      <guid isPermaLink="true">${xmlText(`${SITE_URL}/blog-${b.slug}.html`)}</guid>
      <pubDate>${xmlText(toRfc822(b.date))}</pubDate>
      <description>${xmlText(b.short_description || '')}</description>
      <author>${xmlText(`${AUTHOR} (hmdarji921@gmail.com)`)}</author>
    </item>`
  )
  .join('\n')}
  </channel>
</rss>
`;

writeFileSync(join(ROOT, 'feed.xml'), xml);
console.log(`feed.xml rewritten with ${items.length} item(s).`);