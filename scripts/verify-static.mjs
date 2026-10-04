// verify-static.mjs - dependency-free static audit of the site:
//   1. every local href/src resolves to a file
//   2. every image path in content.json exists
//   3. no stale host/internal-doc references
//   4. no internal ?slug= links (canonical project-/blog- pages exist)
//   5. every og:image exists and is 1200x630
//   6. sitemap URLs resolve, cover all core pages, contain no ?slug=
//   7. every class used in HTML/JS resolves in the compiled CSS
//   8. manifest/icons exist (apple-touch-icon is 180x180)
//   9. per-entry og/twitter/canonical meta is baked into static pages
//  10. CMS targets the correct GitHub repository
//  11. data.js offline mirror stays in sync with content.json
//  12. every page's tags are balanced (no unclosed/unmatched elements)
//
//   npm run verify:static      # from the repo root
//   node scripts/verify-static.mjs /path/to/site
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || process.cwd());
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content.json'), 'utf8'));

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) pass++;
  else { fail++; failures.push(`${name}${detail ? ' :: ' + detail : ''}`); }
}
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = f => fs.existsSync(path.join(ROOT, f));

const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const jsFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.js'));

// ------------------------------------------------------------ 1. link integrity
{
  const bad = [];
  for (const file of htmlFiles) {
    const html = read(file);
    const attrs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/g)].map(m => m[1]);
    for (const raw of attrs) {
      if (/^(https?:|mailto:|tel:|data:|#|javascript:|\/\/)/i.test(raw)) continue;
      const clean = raw.split('#')[0].split('?')[0];
      if (!clean) continue;
      const target = path.join(ROOT, path.dirname(file), clean);
      if (!fs.existsSync(target)) bad.push(`${file} -> ${raw}`);
    }
  }
  check('links: every local href/src resolves', bad.length === 0, bad.join(' | '));
}

// -------------------------------------- 2. content.json image paths exist
{
  const missing = [];
  for (const p of content.projects) {
    for (const img of [p.main_image, ...(p.supportive_images || [])]) {
      if (img && !/^(?:https?:)?\/\//i.test(img) && !exists(img)) missing.push(`${p.slug}: ${img}`);
    }
  }
  for (const blog of content.blogs || []) {
    for (const match of String(blog.content || '').matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
      const src = match[1];
      if (/^(?:https?:|data:|\/\/)/i.test(src)) continue;
      if (!exists(src)) missing.push(`${blog.slug}: ${src}`);
    }
  }
  check('content: all project and blog image paths exist', missing.length === 0, missing.join(' | '));
}

// ------------------------------------------------- 3. no stale references
{
  const patterns = [
    'github.io', 'cdn.tailwindcss.com', 'DEPLOY.md', 'GO-LIVE.md',
    'FINAL-GO-LIVE.md', 'PROJECT_AUDIT.md', 'WHAT-CHANGED.md',
    'Hardikdarji921', 'AINHMD',
  ];
  const docNames = ['DEPLOY.md', 'GO-LIVE.md', 'FINAL-GO-LIVE.md', 'PROJECT_AUDIT.md', 'WHAT-CHANGED.md'];
  const scan = [...htmlFiles, ...jsFiles, 'README.md', 'robots.txt', 'sitemap.xml', 'manifest.json', 'content.json'];
  const hits = [];
  for (const f of scan) {
    let text;
    try { text = read(f); } catch { continue; }
    for (const p of patterns) {
      if (!text.includes(p)) continue;
      // README deliberately documents that the internal docs were deleted.
      if (f === 'README.md' && docNames.includes(p)) continue;
      hits.push(`${f}: ${p}`);
    }
  }
  check('stale: no old-host/old-doc references', hits.length === 0, hits.join(' | '));
}

// -------------------------------------- 4. no internal ?slug= links remain
{
  const hits = [];
  for (const file of [...htmlFiles, ...jsFiles]) {
    // CMS admin pages legitimately pass ?slug= to their own edit screens.
    if (/^crm/.test(file)) continue;
    const text = read(file);
    for (const m of text.matchAll(/\b(?:href|location\.href\s*=|window\.location\s*=)\s*[=(]\s*[`'"]([^`'"]*\?slug=)/gi)) {
      hits.push(`${file}: ${m[1]}`);
    }
  }
  check('links: no internal ?slug= hrefs', hits.length === 0, hits.join(' | '));
}

// ----------------------------------------------- 5. OG images exist + size
function pngSize(buf) {
  // IHDR is always the first chunk: width/height at bytes 16..24.
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
{
  const bad = [];
  const allOg = [];
  for (const file of htmlFiles) {
    const html = read(file);
    for (const m of html.matchAll(/<meta property="og:image" content="[^"]*?\/(images\/(?:og\/[^"/]+|og-image)\.png)">/g)) {
      allOg.push({ file, rel: m[1] });
    }
  }
  for (const { file, rel } of allOg) {
    if (!exists(rel)) { bad.push(`${file}: missing ${rel}`); continue; }
    const { w, h } = pngSize(fs.readFileSync(path.join(ROOT, rel)));
    if (w !== 1200 || h !== 630) bad.push(`${file}: ${rel} is ${w}x${h}`);
  }
  check('og: every og:image exists at 1200x630', bad.length === 0, bad.join(' | '));
  const expectedOg = (content.projects || []).length + (content.blogs || []).length + 1;
  check('og: one og:image reference per entry plus homepage',
    allOg.length === expectedOg, `got ${allOg.length}, expected ${expectedOg}`);
}

// -------------------------------------------------------- 6. sitemap audit
{
  const xml = read('sitemap.xml');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const missing = urls.filter(u => {
    const rel = new URL(u).pathname.replace(/^\//, '');
    return !exists(rel);
  });
  check('sitemap: every URL resolves to a file', missing.length === 0, missing.join(' | '));
  const expected = [
    '', 'projects.html', 'blogs.html',
    ...content.projects.map(p => `project-${p.slug}.html`),
    ...content.blogs.map(b => `blog-${b.slug}.html`),
  ];
  const have = new Set(urls.map(u => new URL(u).pathname.replace(/^\//, '')));
  const absent = expected.filter(e => !have.has(e));
  check('sitemap: all core pages present', absent.length === 0, absent.join(' | '));
  check('sitemap: no ?slug= URLs', !xml.includes('?slug='));
  check('sitemap: one URL per core page and content entry', urls.length === expected.length, `got ${urls.length}, expected ${expected.length}`);
  const robots = read('robots.txt');
  check('robots: references sitemap', robots.includes('sitemap.xml'));
}

// ------------------------------------- 7. class resolution (HTML + JS literals)
{
  const css = read('tailwind.css') + '\n' + read('styles.css') + '\n' +
    htmlFiles.map(f => {
      const html = read(f);
      return [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    }).join('\n');

  // Parse real selectors: split rules on '{', selector lists on ',',
  // split compounds on combinators (outside brackets), drop pseudo parts,
  // split classes, unescape (".hover\:x" -> "hover:x").
  const declared = new Set();
  const unescapeCss = s => s.replace(/\\(.)/g, '$1');
  const firstCompound = sel => {
    let out = '';
    for (let i = 0; i < sel.length; i++) {
      const c = sel[i];
      if (c === '\\') { out += c + (sel[i + 1] || ''); i++; continue; }
      if (c === ':' || c === '>' || c === '+' || c === '~' || /\s/.test(c)) break;
      out += c;
    }
    return out;
  };
  const classesOf = compound => {
    if (!compound.startsWith('.')) return [];
    const parts = [];
    let cur = '';
    for (let i = 0; i < compound.length; i++) {
      const c = compound[i];
      if (c === '\\') { cur += c + (compound[i + 1] || ''); i++; continue; }
      if (c === '.') { if (cur) parts.push(cur); cur = ''; continue; }
      cur += c;
    }
    if (cur) parts.push(cur);
    return parts.filter(Boolean).map(unescapeCss);
  };
  const compoundsOf = sel => {
    const out = [];
    let cur = '', depth = 0;
    for (let i = 0; i < sel.length; i++) {
      const c = sel[i];
      if (c === '\\') { cur += c + (sel[i + 1] || ''); i++; continue; }
      if (c === '[' || c === '(') depth++;
      if (c === ']' || c === ')') depth = Math.max(0, depth - 1);
      if (depth === 0 && (c === '>' || c === '+' || c === '~' || /\s/.test(c))) {
        if (cur) { out.push(cur); cur = ''; }
        continue;
      }
      cur += c;
    }
    if (cur) out.push(cur);
    return out;
  };
  for (const m of css.matchAll(/([^{}]+)\{/g)) {
    const prelude = m[1].trim();
    if (!prelude || prelude.startsWith('@')) continue; // at-rules are not selectors
    for (const sel of prelude.split(',')) {
      for (const compound of compoundsOf(sel.trim())) {
        for (const cls of classesOf(firstCompound(compound))) declared.add(cls);
      }
    }
  }

  const used = new Set();
  const addTokens = value => {
    const stripped = value.replace(/\$\{[^}]*\}/g, ' '); // drop ${...} interpolations
    for (const t of stripped.split(/\s+/)) if (t) used.add(t);
  };
  for (const file of htmlFiles) {
    const html = read(file);
    for (const m of html.matchAll(/class="([^"]+)"/g)) addTokens(m[1]);
  }
  // Literal class strings emitted from JS template code (class="...").
  for (const file of jsFiles) {
    const js = read(file);
    for (const m of js.matchAll(/class="([^"]+)"/g)) addTokens(m[1]);
    for (const m of js.matchAll(/className\s*=\s*'([^']+)'/g)) addTokens(m[1]);
    // Named class arrays, e.g. const accents = ['text-emerald-400', ...]
    for (const m of js.matchAll(/(?:accents|classNames|classes|cls)\s*=\s*\[([^\]]+)\]/g)) {
      for (const s of m[1].matchAll(/'([^']+)'|"([^"]+)"/g)) {
        addTokens(s[1] || s[2] || '');
      }
    }
  }

  // Classes used only as JS hooks (querySelector/matches/closest) are
  // markers; their visible styling comes from the utility classes beside them.
  const hookClasses = new Set();
  for (const file of jsFiles) {
    const js = read(file);
    for (const m of js.matchAll(/(?:matches|closest|querySelector(?:All)?)\(\s*['"`]([^'"`]+)['"`]/g)) {
      for (const c of m[1].matchAll(/\.([A-Za-z][\w-]*)/g)) hookClasses.add(c[1]);
    }
  }

  const missing = [...used].filter(c => !declared.has(c) && !hookClasses.has(c));
  check('css: every used class resolves', missing.length === 0,
    `${missing.length} unresolved: ` + missing.slice(0, 40).join(', '));
}

// ------------------------------------------------------ 8. manifest / icons
{
  const manifest = JSON.parse(read('manifest.json'));
  const iconOk = (manifest.icons || []).every(i => exists(i.src));
  check('manifest: icons exist', iconOk, JSON.stringify(manifest.icons));
  check('icons: favicon.svg present', exists('favicon.svg'));
  check('icons: apple-touch-icon.png present', exists('apple-touch-icon.png'));
  if (exists('apple-touch-icon.png')) {
    const { w, h } = pngSize(fs.readFileSync(path.join(ROOT, 'apple-touch-icon.png')));
    check('icons: apple-touch-icon is 180x180', w === 180 && h === 180, `${w}x${h}`);
  }
}

// ------------------------------------------ 9. per-entry meta completeness
{
  const bad = [];
  for (const p of content.projects) {
    const f = `project-${p.slug}.html`;
    const html = read(f);
    for (const need of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:image']) {
      if (!html.includes(`property="${need}"`) && !html.includes(`name="${need}"`)) bad.push(`${f}: ${need}`);
    }
    if (!html.includes(`<link rel="canonical" href="https://hardikmdarji.vercel.app/${f}"`)) bad.push(`${f}: canonical`);
    if (!html.includes(`data-slug="${p.slug}"`)) bad.push(`${f}: data-slug`);
  }
  for (const b of content.blogs) {
    const f = `blog-${b.slug}.html`;
    const html = read(f);
    for (const need of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:image']) {
      if (!html.includes(`property="${need}"`) && !html.includes(`name="${need}"`)) bad.push(`${f}: ${need}`);
    }
    if (!html.includes(`<link rel="canonical" href="https://hardikmdarji.vercel.app/${f}"`)) bad.push(`${f}: canonical`);
    if (!html.includes(`data-slug="${b.slug}"`)) bad.push(`${f}: data-slug`);
  }
  const index = read('index.html');
  check('index: has og:image', /property="og:image" content="[^"]*og-image\.png"/.test(index));
  check('index: has canonical', index.includes('<link rel="canonical" href="https://hardikmdarji.vercel.app/"'));
  check('entries: full meta present', bad.length === 0, bad.join(' | '));
}

// --------------------------------------------------- 10. CMS repo constants
{
  const cmsFiles = ['crm.js', 'crm-github.js', 'crm-projects.js', 'crm-blogs.js', 'crm-edit-blog.js', 'crm-edit-project.js'];
  const bad = [];
  for (const f of cmsFiles) {
    if (!exists(f)) continue;
    const text = read(f);
    if (text.includes('Hardikdarji921')) bad.push(`${f}: old owner`);
  }
  check('cms: no old repo references', bad.length === 0, bad.join(' | '));
  const crm = read('crm-github.js');
  check('cms: targets correct repo',
    crm.includes("GITHUB_USERNAME = 'Hardik250601'") &&
    crm.includes("GITHUB_REPO = 'Hardik-Darji-Embedded-Systems-Engineer-Portfolio'"));
}

// ------------------------------------------- 11. data.js mirror in sync
// data.js is the file:// offline fallback. Each mirror entry must be exactly
// the real post's leading content (everything before its first <h2>), so the
// offline preview can never contradict content.json.
{
  const vm = { window: {} };
  // Evaluate in a private scope; data.js only assigns window.allBlogPosts.
  new Function('window', read('data.js'))(vm.window);
  const mirror = vm.window.allBlogPosts;
  const bad = [];
  if (!Array.isArray(mirror)) {
    bad.push('window.allBlogPosts missing');
  } else {
    if (mirror.length !== content.blogs.length) bad.push(`count ${mirror.length} != ${content.blogs.length}`);
    for (const b of content.blogs) {
      const m = mirror.find(x => x.slug === b.slug);
      if (!m) { bad.push(`${b.slug}: missing`); continue; }
      for (const k of ['title', 'short_description', 'date']) {
        if (m[k] !== b[k]) bad.push(`${b.slug}: ${k} drift`);
      }
      const head = (m.content || '').split('<p><em>')[0];
      const idx = b.content.indexOf('<h2>');
      const expected = idx === -1 ? b.content : b.content.slice(0, idx);
      if (head !== expected) bad.push(`${b.slug}: content prefix drift`);
    }
  }
  check('data.js: offline mirror in sync with content.json', bad.length === 0, bad.join(' | '));
}

// ------------------------------------------------- 12. structural well-formedness
// A stray regex over the HTML once emptied the text of every
// <p class="section-eyebrow"> (their copy legitimately starts with "//") and
// left those <p> tags unclosed. Every other check still passed, so balance is
// asserted here: the scanner tracks the open-tag stack and reports the first
// mismatched pair or leftover open tag per page.
{
  // Elements that never have a closing tag, plus SVG paint primitives that are
  // self-closing in practice. Treating these as paired would create false
  // mismatches on every page.
  const VOID_LIKE = new Set([
    'meta', 'link', 'img', 'br', 'hr', 'input', 'area', 'base', 'col',
    'embed', 'source', 'track', 'wbr',
    // SVG paint primitives (self-closing in the markup)
    'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'stop',
    'ellipse', 'image', 'use',
  ]);

  function scanBalance(html) {
    const stack = [];
    const problems = [];
    // Tags only: strip comments and script/style bodies so their contents are
    // never mistaken for markup, then neutralise escaped angle brackets so an
    // entity like "&lt;pre&gt;" can never be read as a tag. Blanking the
    // entity's brackets (rather than testing at match time) keeps genuine
    // closing tags that merely follow an entity intact.
    const stripped = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/&lt;/g, '  ')
      .replace(/&gt;/g, '  ');
    const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
    let m;
    while ((m = tagRe.exec(stripped)) !== null) {
      const [full, closing, name, selfClose] = m;
      const tag = name.toLowerCase();
      if (VOID_LIKE.has(tag) || selfClose === '/') continue;
      if (closing === '/') {
        if (!stack.length) { problems.push(`stray </${tag}> near "${full}"`); continue; }
        if (stack[stack.length - 1] !== tag) {
          problems.push(`</${tag}> closes <${stack[stack.length - 1]}>`);
          // Recover so one bad tag does not cascade into dozens of errors.
          const idx = stack.lastIndexOf(tag);
          if (idx === -1) continue;
          stack.length = idx;
        } else {
          stack.pop();
        }
      } else {
        stack.push(tag);
      }
    }
    if (stack.length) problems.push(`unclosed <${stack[stack.length - 1]}>`);
    return problems;
  }

  for (const file of fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort()) {
    const html = read(file);
    const problems = scanBalance(html);
    check(`${file}: tags balanced`, problems.length === 0, problems.slice(0, 3).join(' | '));
  }

  // Guard the regression directly: the section eyebrow copy starts with "//",
  // so a future "strip JS comments" pass over the HTML must not eat it.
  const idx = read('index.html');
  check(
    'index.html: section eyebrow copy survives comment-stripping',
    (idx.match(/class="section-eyebrow[^"]*">\s*\/\/\s*\S/g) || []).length >= 8,
    `found ${(idx.match(/class="section-eyebrow[^"]*">\s*\/\/\s*\S/g) || []).length}`
  );
}

/* ====================================================================
   13. PRINT STYLESHEET + IMAGE ALT TEXT
   Recruiters print this page constantly. The print rules are easy to lose
   in a redesign, and a print stylesheet that lets .reveal sections stay at
   opacity 0 produces a blank page. Both are asserted here.
   ==================================================================== */
{
  const css = read('styles.css');
  const idx = read('index.html');
  const printBlocks = css.match(/@media\s+print\s*\{/g) || [];
  check('print: a print stylesheet exists', printBlocks.length >= 1, `found ${printBlocks.length}`);

  // The rules that actually matter when the page is printed.
  const printRules = [
    ['reveal content is forced visible', /\.reveal[\s\S]{0,200}?opacity:\s*1\s*!important/],
    ['canvas layers are hidden', /#constellation-canvas[\s\S]{0,200}?display:\s*none\s*!important/],
    ['backgrounds are flattened', /background(?:-image)?:\s*(?:transparent|#fff\w*)\s*!important/],
    ['print colour palette is overridden', /--fg-1:\s*#111827/],
    ['external links print their URL', /a\[href\^="http"\]::after[\s\S]{0,200}?attr\(href\)/],
  ];
  for (const [label, re] of printRules) {
    check(`print: ${label}`, re.test(css));
  }

  // The identity block only exists to be shown on paper.
  check('print: identity block present in index.html', idx.includes('class="print-header"'));
  check(
    'print: identity block is hidden on screen',
    /\.print-header\s*\{\s*display:\s*none/.test(css)
  );

  // Decorative layers that print badly if left in: fixed full-viewport boxes
  // are re-painted on every page, and hover-only controls reserve blank space.
  check('print: decorative orbs hidden', /\.orb\s*\{\s*display:\s*none\s*!important/.test(css));
  check('print: share links hidden', /\.section-anchor \.share-link\s*\{\s*display:\s*none\s*!important/.test(css));
}

/* ====================================================================
   13c. INTERNAL DOCS STAY UNPUBLISHED
   Root-level Markdown here is internal engineering notes: pending work,
   environment-variable names, and known gaps. README.md is ignored for a
   different reason (it is not site content). Either way, neither may be
   served publicly, so a new internal doc cannot be added without noticing.
   ==================================================================== */
{
  const ignore = read('.vercelignore');
  const ignoreLines = ignore.split('\n').map(l => l.trim());
  const mdFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.md'));

  const published = mdFiles.filter(f => !ignoreLines.includes(f));
  check(
    `deploy: every root .md is excluded from publish (${mdFiles.length} files)`,
    published.length === 0,
    `would be published: ${published.join(', ')}`
  );

  // The overview doc is the one carrying pending-work and env detail.
  if (mdFiles.includes('PROJECT_OVERVIEW.md')) {
    check('deploy: PROJECT_OVERVIEW.md is gitignored from publish', ignoreLines.includes('PROJECT_OVERVIEW.md'));
  }
}

/* ====================================================================
   13b. BUILT-WITH SECTION
   The site advertises its own stack. It must never claim a frontend
   framework: there is none in package.json, so naming one would be false.
   ==================================================================== */
{
  const idxHtml = read('index.html');
  check('built-with: section present', idxHtml.includes('id="built-with"'));
  check('built-with: all four stack cards rendered',
    (idxHtml.match(/Frontend<\/p>|Styling<\/p>|Backend<\/p>|Hosting<\/p>/g) || []).length >= 4);

  // Only the literal "No React, Vue or Angular" disclaimer may mention a
  // framework; any other mention would be a claim the site cannot back.
  const claimed = [...idxHtml.matchAll(/>([^<]*\b(?:React|Vue|Angular|Next\.js)\b[^<]*)</g)]
    .map(m => m[1].trim())
    .filter(text => !/^No React/i.test(text));
  check('built-with: claims no frontend framework', claimed.length === 0, claimed.join(' | '));
}

/* ====================================================================
   14. IMAGE ALT TEXT
   Cards are rendered by app.js / renderer.js, so a static-HTML grep misses
   them entirely. Every <img> emitted from JS or HTML must carry a non-empty
   alt attribute.
   ==================================================================== */
{
  const sources = fs
    .readdirSync(ROOT)
    .filter(f => /\.(html|js)$/.test(f))
    .sort();

  const offenders = [];
  let total = 0;
  for (const file of sources) {
    const src = read(file);
    for (const tag of src.match(/<img\b[^>]*>/g) || []) {
      // An <img src=""> is a placeholder that JS fills in before it is ever
      // displayed (the lightbox shell in renderer.js). There is no image to
      // describe yet, so it is exempt.
      if (/\bsrc=""/.test(tag)) continue;
      total += 1;
      const alt = tag.match(/\balt="([^"]*)"/);
      // An empty alt is only correct for a purely decorative image; none of
      // the images on this site are decorative, so treat it as a failure.
      if (!alt || !alt[1].trim()) offenders.push(`${file}: ${tag.slice(0, 80)}`);
    }
  }
  check(
    `alt: all ${total} <img> tags have descriptive alt text`,
    offenders.length === 0,
    offenders.slice(0, 3).join(' | ')
  );
}

/* ====================================================================
   15. RSS FEED
   ==================================================================== */
if (fs.existsSync(path.join(ROOT, 'feed.xml'))) {
  const feed = read('feed.xml');
  const content = JSON.parse(read('content.json'));
  const items = feed.match(/<item>/g) || [];
  check('feed: one item per dated blog post', items.length === (content.blogs || []).length,
    `feed ${items.length} vs content ${(content.blogs || []).length}`);

  // XML 1.0 only predefines amp/lt/gt/quot/apos. HTML entities such as
  // &mdash; make strict parsers reject the document.
  const badEntities = (feed.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+);)[a-zA-Z]+;/g) || []);
  check('feed: no non-XML entities', badEntities.length === 0, badEntities.slice(0, 3).join(' '));

  check('feed: declares RSS 2.0', /<rss[^>]*version="2\.0"/.test(feed));
  check('feed: every item has a pubDate', (feed.match(/<pubDate>/g) || []).length === items.length);

  // Item links must resolve to real files, or subscribers hit 404s.
  const broken = [];
  for (const m of feed.matchAll(/<link>(https?:\/\/[^<]*?)\/blog-([^<]+)<\/link>/g)) {
    if (!fs.existsSync(path.join(ROOT, `blog-${m[2]}`))) broken.push(m[2]);
  }
  check('feed: every item link resolves to a file', broken.length === 0, broken.join(', '));

  check('feed: linked from index.html', read('index.html').includes('application/rss+xml'));
  check('feed: linked from blogs.html', read('blogs.html').includes('application/rss+xml'));
} else {
  check('feed: feed.xml exists', false, 'run npm run build:rss');
}

console.log(`\nverify-static: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  x ' + f);
}
process.exit(fail ? 1 : 0);
