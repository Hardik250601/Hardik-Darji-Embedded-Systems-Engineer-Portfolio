#!/usr/bin/env node
/**
 * Generates one social-preview image (1200x630 PNG) per project and blog post,
 * plus a static HTML page per entry.
 *
 * WHY STATIC HTML: Facebook / X / LinkedIn crawlers fetch the raw HTML and do
 * NOT execute JavaScript. This site renders everything from content.json in the
 * browser, so meta tags injected at runtime are invisible to them - a shared
 * project link would show no preview image at all. Each entry therefore also
 * gets a real .html file with its meta tags baked in, which crawlers can read.
 *
 * Usage:  npm run build:og
 *
 * Fonts are cached in .og-cache/ (gitignored) and downloaded on first run.
 * Without them resvg silently renders no text at all, so the script fails loudly
 * if a font file is missing rather than emitting a blank image.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = process.env.SITE_URL || 'https://hardikmdarji.vercel.app';
const FONT_DIR = join(ROOT, '.og-cache', 'fonts');
const OG_DIR = join(ROOT, 'images', 'og');

const FONTS = [
  { file: 'Inter-SemiBold.ttf', weight: 600 },
  { file: 'Inter-Bold.ttf', weight: 700 },
  { file: 'Inter-ExtraBold.ttf', weight: 800 },
];

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const attr = (s) => esc(s).replace(/\n/g, ' ');

// ---------------------------------------------------------------------------
// Text measurement. resvg has no measuring API, so approximate Inter's advance
// widths per character. Deliberately over-estimates slightly: a line that is
// slightly narrower than the box looks fine, one that overflows does not.
// ---------------------------------------------------------------------------
const NARROW = "iljtfIr.,:;'!|()[]{}-";
const WIDE = 'mwMW@%';
const UPPER = /[A-Z0-9]/;

function charWidth(ch) {
  if (NARROW.includes(ch)) return 0.34;
  if (WIDE.includes(ch)) return 0.92;
  if (ch === ' ') return 0.28;
  if (UPPER.test(ch)) return 0.68;
  return 0.55;
}
function measure(text, size) {
  let w = 0;
  for (const ch of text) w += charWidth(ch) * size;
  // Safety factor: the per-char table above is an approximation and measured
  // ~3% under on real Inter. Without this, long lines render past the margin.
  return w * 1.06;
}
function wrap(text, size, maxWidth, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, size) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  // If we ran out of room, ellipsise the final line rather than let it spill.
  if (lines.length === maxLines) {
    const consumed = lines.join(' ').split(/\s+/).length;
    if (consumed < words.length) {
      let last = lines[maxLines - 1];
      while (last.length > 1 && measure(`${last}...`, size) > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.trimEnd()}...`;
    }
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Font acquisition
// ---------------------------------------------------------------------------
function ensureFonts() {
  const missing = FONTS.filter((f) => !existsSync(join(FONT_DIR, f.file)));
  if (!missing.length) return FONTS.map((f) => join(FONT_DIR, f.file));

  mkdirSync(FONT_DIR, { recursive: true });
  console.log('Downloading Inter (first run only)...');
  const archive = 'https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip';
  if (process.platform === 'win32') {
    const psPath = (value) => `'${value.replace(/'/g, "''")}'`;
    const fontDir = psPath(FONT_DIR);
    const command = `$ErrorActionPreference = 'Stop'; Set-Location ${fontDir}; ` +
      `Invoke-WebRequest -Uri '${archive}' -OutFile 'inter.zip'; ` +
      `New-Item -ItemType Directory -Force -Path 'ex' | Out-Null; ` +
      `& tar.exe -xf 'inter.zip' -C 'ex'; if ($LASTEXITCODE -ne 0) { throw 'Could not extract Inter font archive' }; ` +
      `Copy-Item 'ex/extras/ttf/Inter-SemiBold.ttf','ex/extras/ttf/Inter-Bold.ttf','ex/extras/ttf/Inter-ExtraBold.ttf' -Destination '.'; ` +
      `Remove-Item 'ex','inter.zip' -Recurse -Force`;
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { stdio: 'inherit' });
  } else {
    execFileSync(
      'bash',
      ['-c', `set -e
        cd "${FONT_DIR}"
        curl -sfL -o inter.zip ${archive}
        unzip -o -q inter.zip -d ex
        cp ex/extras/ttf/Inter-SemiBold.ttf ex/extras/ttf/Inter-Bold.ttf ex/extras/ttf/Inter-ExtraBold.ttf .
        rm -rf ex inter.zip`],
      { stdio: 'inherit' }
    );
  }
  const stillMissing = FONTS.filter((f) => !existsSync(join(FONT_DIR, f.file)));
  if (stillMissing.length) {
    throw new Error(
      `Fonts missing after download: ${stillMissing.map((f) => f.file).join(', ')}. ` +
        'resvg would render the image with no text at all.'
    );
  }
  return FONTS.map((f) => join(FONT_DIR, f.file));
}

// ---------------------------------------------------------------------------
// SVG card
// ---------------------------------------------------------------------------
function card({ eyebrow, title, subtitle, meta }) {
  const LEFT = 80;
  const MAX_W = 1040;
  const titleLines = wrap(title, 62, MAX_W, 3);
  const subLines = wrap(subtitle, 26, MAX_W, 2);

  let y = 190;
  const titleSvg = titleLines
    .map((line, i) => `<text x="${LEFT}" y="${y + i * 74}" font-size="62" font-weight="800" fill="#ffffff">${esc(line)}</text>`)
    .join('\n    ');
  y += (titleLines.length - 1) * 74;

  const ruleY = y + 62;
  const subSvg = subLines
    .map((line, i) => `<text x="${LEFT}" y="${ruleY + 62 + i * 38}" font-size="26" font-weight="500" fill="#d1d5db">${esc(line)}</text>`)
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/><stop offset="60%" stop-color="#111827"/><stop offset="100%" stop-color="#030712"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fbbf24"/><stop offset="50%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fbbf24" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>

  <g fill="none" stroke="#fbbf24" stroke-opacity="0.15" stroke-width="1.5">
    <path d="M0 60 L260 60 L260 140 L420 140"/>
    <path d="M1200 570 L940 570 L940 490 L780 490"/>
    <path d="M1200 120 L1120 120 L1120 200 L1040 200"/>
  </g>
  <g fill="#fbbf24" opacity="0.4">
    <circle cx="260" cy="60" r="3"/><circle cx="940" cy="570" r="3"/><circle cx="1120" cy="120" r="3"/>
  </g>

  <g font-family="Inter, Arial, sans-serif">
    <text x="${LEFT}" y="110" font-size="20" font-weight="600" fill="#9ca3af" letter-spacing="6">${esc(eyebrow)}</text>

    ${titleSvg}

    <rect x="${LEFT}" y="${ruleY - 34}" width="120" height="5" rx="2.5" fill="url(#gold)"/>

    ${subSvg}

    <text x="${LEFT}" y="576" font-size="19" font-weight="600" fill="#9ca3af">Hardik Darji  ·  Embedded Systems Engineer</text>
    <text x="1120" y="576" font-size="19" font-weight="500" fill="#6b7280" text-anchor="end">${esc(meta)}</text>
  </g>
</svg>`;
}

function render(svg, fontFiles) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  }).render().asPng();
  return png;
}

// ---------------------------------------------------------------------------
// Static page generation
// ---------------------------------------------------------------------------
function metaTags({ title, description, url, image }) {
  const full = `${SITE_URL}${url}`;
  return `    <title>${esc(title)} - Hardik Darji</title>
    <link rel="canonical" href="${esc(full)}">
    <meta name="description" content="${attr(description)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Hardik Darji - Embedded Systems Engineer">
    <meta property="og:title" content="${attr(title)}">
    <meta property="og:description" content="${attr(description)}">
    <meta property="og:url" content="${esc(full)}">
    <meta property="og:image" content="${esc(SITE_URL + image)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:alt" content="${attr(description)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${attr(title)}">
    <meta name="twitter:description" content="${attr(description)}">
    <meta name="twitter:image" content="${esc(SITE_URL + image)}">
    <meta name="twitter:image:alt" content="${attr(description)}">`;
}

function buildPage(templatePath, { title, description, url, image, slug }) {
  let html = readFileSync(templatePath, 'utf8');
  // The stock <title> is the first one in <head>; replace it with the full block.
  html = html.replace(/<title>[\s\S]*?<\/title>/, metaTags({ title, description, url, image }));
  html = html.replace(/<meta name="description" content="[^"]*">/, '');
  // Let the renderer know which entry to load without a query string.
  html = html.replace(/<body([^>]*)>/, `<body$1 data-slug="${attr(slug)}">`);
  return html;
}

// ---------------------------------------------------------------------------
function main() {
  const fontFiles = ensureFonts();
  mkdirSync(OG_DIR, { recursive: true });

  const content = JSON.parse(readFileSync(join(ROOT, 'content.json'), 'utf8'));
  const entries = [];

  for (const p of content.projects || []) {
    entries.push({
      kind: 'project',
      slug: p.slug,
      eyebrow: '// PROJECT CASE STUDY',
      title: p.title,
      subtitle: p.short_summary || '',
      meta: (p.tech_stack || []).slice(0, 3).join('  ·  ') || 'Embedded Systems',
      file: `project-${p.slug}.html`,
      template: 'project-template.html',
      path: `/project-${p.slug}.html`,
    });
  }
  for (const b of content.blogs || []) {
    entries.push({
      kind: 'blog',
      slug: b.slug,
      eyebrow: '// BLOG',
      title: b.title,
      subtitle: b.short_description || '',
      meta: b.date || '',
      file: `blog-${b.slug}.html`,
      template: 'blog-template.html',
      path: `/blog-${b.slug}.html`,
    });
  }

  const written = [];
  for (const e of entries) {
    const image = `/images/og/${e.slug}.png`;
    const svg = card(e);
    writeFileSync(join(OG_DIR, `${e.slug}.png`), render(svg, fontFiles));
    writeFileSync(join(OG_DIR, `${e.slug}.svg`), svg);

    const description = e.subtitle || e.title;
    writeFileSync(
      join(ROOT, e.file),
      buildPage(join(ROOT, e.template), {
        title: e.title,
        description,
        url: e.path,
        image,
        slug: e.slug,
      })
    );
    written.push({ ...e, image, path: e.path, file: e.file });
    console.log(`  ${e.kind.padEnd(7)} ${e.file}`);
  }

  // The homepage preview is a hand-authored SVG with its own layout (name,
  // contact details, status pill), so it is not generated from content.json -
  // but it still needs rasterising, and doing it here means one command keeps
  // every social image in sync instead of leaving the homepage one to go stale.
  const homeSvg = join(ROOT, 'images', 'og-image.svg');
  if (existsSync(homeSvg)) {
    writeFileSync(join(ROOT, 'images', 'og-image.png'), render(readFileSync(homeSvg, 'utf8'), fontFiles));
    console.log('  homepage images/og-image.png');
    written.push({ slug: '__homepage__', image: '/images/og-image.png', path: '/', file: null, kind: 'home' });
  } else {
    console.warn('  WARNING: images/og-image.svg missing - homepage social preview not rebuilt.');
  }

  // Manifest consumed by the sitemap/verification step.
  writeFileSync(join(ROOT, '.og-cache', 'entries.json'), JSON.stringify(written, null, 2));
  console.log(`\nGenerated ${written.length} images and ${written.length - (existsSync(homeSvg) ? 1 : 0)} static pages.`);
  console.log('Now run: npm run build:sitemap');
}

main();
