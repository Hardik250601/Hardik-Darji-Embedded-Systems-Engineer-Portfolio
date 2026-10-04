// verify-dom.mjs - loads every page of the site in jsdom, runs its real
// scripts (with a local-file fetch shim), and asserts the rendered output.
//
//   npm run verify:dom          # from the repo root
//   node scripts/verify-dom.mjs /path/to/site
//
// jsdom has no canvas/WebGL and no IntersectionObserver, so this doubles as a
// "degraded environment" test: every feature initialiser must either work or
// fail quietly without taking the page down (the init dispatcher isolates them,
// and canvas helpers must guard a null context).
import jsdomPkg from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const { JSDOM, ResourceLoader, VirtualConsole } = jsdomPkg;
const ROOT = path.resolve(process.argv[2] || process.cwd());
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content.json'), 'utf8'));

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) pass++;
  else { fail++; failures.push(`${name}${detail ? ' :: ' + detail : ''}`); }
}

// Only serve local files; block external (fonts/CDN) loads.
class LocalLoader extends ResourceLoader {
  fetch(url) {
    const u = new URL(url);
    if (u.protocol !== 'file:') return Promise.resolve(Buffer.from(''));
    let p = decodeURIComponent(u.pathname);
    if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(p)) p = p.slice(1);
    try {
      return Promise.resolve(fs.readFileSync(p));
    } catch {
      return Promise.resolve(Buffer.from(''));
    }
  }
}

function makeDom(file, { url } = {}) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const virtualConsole = new VirtualConsole();
  const jsErrors = [];
  virtualConsole.on('jsdomError', e => {
    // Canvas "not implemented" noise is expected in jsdom.
    if (/not implemented/i.test(String(e.message || e))) return;
    jsErrors.push(String(e.message || e));
  });
  virtualConsole.on('error', (...a) => jsErrors.push(a.map(String).join(' ')));
  virtualConsole.on('warn', (...a) => {
    const msg = a.map(String).join(' ');
    if (/\[app\]/.test(msg)) jsErrors.push(msg); // failed feature initialisers
  });

  const dom = new JSDOM(html, {
    url: url || ('file://' + path.join(ROOT, file)),
    runScripts: 'dangerously',
    resources: new LocalLoader(),
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      // jsdom has no fetch: serve local files relative to the site root.
      window.fetch = async (target) => {
        const rel = String(target).split('?')[0].replace(/^\.\//, '');
        const abs = path.join(ROOT, rel);
        try {
          const body = fs.readFileSync(abs, 'utf8');
          return {
            ok: true, status: 200,
            json: async () => JSON.parse(body),
            text: async () => body,
          };
        } catch {
          return { ok: false, status: 404, json: async () => { throw new Error('404'); }, text: async () => '' };
        }
      };
      // Minimal IO so reveal/scroll code paths do not crash.
      window.IntersectionObserver = class {
        constructor(cb) { this.cb = cb; }
        observe() {} unobserve() {} disconnect() {}
      };
      window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
      window.scrollTo = () => {};
      // getContext returns null (jsdom default) - the app must guard it.
    },
  });
  return { dom, jsErrors };
}

const settle = ms => new Promise(r => setTimeout(r, ms));

async function loadPage(file, opts = {}) {
  const { dom, jsErrors } = makeDom(file, opts);
  await new Promise(r => {
    if (dom.window.document.readyState === 'complete') r();
    else dom.window.addEventListener('load', r);
    setTimeout(r, 3000);
  });
  // Allow async DOMContentLoaded handlers (renderers await loadContent).
  await settle(400);
  return { win: dom.window, doc: dom.window.document, jsErrors, dom };
}

// ---------------------------------------------------------------- index.html
{
  const { doc, jsErrors } = await loadPage('index.html');
  check('index: page title', /Hardik Darji/i.test(doc.title), doc.title);

  const projLinks = [...doc.querySelectorAll('#featured-projects-grid a[href^="project-"]')];
  check('index: 3 featured project cards', projLinks.length === 3, `got ${projLinks.length}`);
  check('index: featured project links target static pages',
    projLinks.every(a => /^project-[a-z0-9-]+\.html$/.test(a.getAttribute('href'))),
    projLinks.map(a => a.getAttribute('href')).join(','));

  const blogLinks = [...doc.querySelectorAll('#blogs-container a[href^="blog-"]')];
  check('index: 3 blog cards', blogLinks.length === 3, `got ${blogLinks.length}`);
  check('index: blog links target static pages',
    blogLinks.every(a => /^blog-[a-z0-9-]+\.html$/.test(a.getAttribute('href'))),
    blogLinks.map(a => a.getAttribute('href')).join(','));

  check('index: latest blog card wired', doc.getElementById('latest-blog-card')?.getAttribute('href') === `blog-${content.blogs[0].slug}.html`,
    doc.getElementById('latest-blog-card')?.getAttribute('href'));
  check('index: latest project card wired', doc.getElementById('latest-project-card')?.getAttribute('href') === `project-${content.projects[0].slug}.html`,
    doc.getElementById('latest-project-card')?.getAttribute('href'));

  const tSec = doc.getElementById('testimonials');
  check('index: testimonials section exists', !!tSec);
  check('index: testimonials hidden while empty', !!tSec?.classList.contains('hidden') &&
    !(doc.getElementById('testimonials-grid')?.innerHTML || '').trim(),
    `hidden=${tSec?.classList.contains('hidden')}`);

  check('index: role-fit section present', !!doc.getElementById('role-fit'));
  check('index: hero heading present', !!doc.querySelector('h1'));
  check('index: footer recent posts list filled', (doc.getElementById('recent-blogs-footer')?.children.length || 0) === 3,
    `got ${doc.getElementById('recent-blogs-footer')?.children.length}`);
  check('index: GitHub profile link present', [...doc.querySelectorAll('a')].some(a => (a.href || '').includes('github.com/Hardik250601')));
  check('index: static case-study links use canonical pages',
    [...doc.querySelectorAll('a[href*="project-template.html"]')].length === 0);

  // Newsletter: primary path is the same-origin /api/subscribe endpoint
  // (Buttondown); the Formspree action stays on the form as the fallback
  // for hosts without a function runtime, and a hidden honeypot input guards
  // the endpoint against bots.
  const nlForm = doc.getElementById('newsletter-form');
  check('index: newsletter form present', !!nlForm);
  check('index: newsletter keeps Formspree fallback action',
    !!nlForm && /formspree\.io/.test(nlForm.getAttribute('action') || ''),
    nlForm && nlForm.getAttribute('action'));
  const honeypot = nlForm && nlForm.querySelector('input[name="company"]');
  check('index: newsletter honeypot present and hidden',
    !!honeypot && honeypot.classList.contains('hidden') && honeypot.getAttribute('tabindex') === '-1');
  check('index: newsletter status element present', !!doc.getElementById('newsletter-status'));
  check('index: no JS errors', jsErrors.length === 0, jsErrors.join(' | '));
}

// ------------------------------------------------------------ projects.html
{
  const { doc, jsErrors } = await loadPage('projects.html');
  const cards = [...doc.querySelectorAll('#projects-grid a[href^="project-"]')];
  check('projects: 3 cards rendered', cards.length === 3, `got ${cards.length}`);
  check('projects: no JS errors', jsErrors.length === 0, jsErrors.join(' | '));
}

// ---------------------------------------------------------------- blogs.html
{
  const { doc, jsErrors } = await loadPage('blogs.html');
  const links = [...doc.querySelectorAll('a[href^="blog-"]')];
  check('blogs: blog links match content', links.length === content.blogs.length, `got ${links.length}, expected ${content.blogs.length}`);
  check('blogs: links target static pages',
    links.every(a => /^blog-[a-z0-9-]+\.html$/.test(a.getAttribute('href'))));
  check('blogs: no JS errors', jsErrors.length === 0, jsErrors.join(' | '));
}

// ------------------------------------------------------- static project pages
for (const p of content.projects) {
  const file = `project-${p.slug}.html`;
  const { doc, jsErrors } = await loadPage(file);
  check(`${file}: data-slug matches`, doc.body.dataset.slug === p.slug, doc.body.dataset.slug);
  const h1 = doc.getElementById('project-title');
  check(`${file}: title hydrated`, !!h1 && h1.textContent.trim() === p.title, h1?.textContent);
  check(`${file}: document.title hydrated`, doc.title.startsWith(p.title), doc.title);
  check(`${file}: tech chips rendered`, (doc.getElementById('project-tech')?.children.length || 0) > 0);
  check(`${file}: description rendered`, (doc.getElementById('project-description')?.children.length || 0) > 0);
  const meta = m => doc.querySelector(`meta[property="${m}"]`)?.getAttribute('content');
  check(`${file}: og:title baked`, meta('og:title') === p.title, meta('og:title'));
  check(`${file}: og:image baked`, /^https:\/\/hardikmdarji\.vercel\.app\/images\/og\/.+\.png$/.test(meta('og:image') || ''), meta('og:image'));
  check(`${file}: twitter:card baked`, doc.querySelector('meta[name="twitter:card"]')?.content === 'summary_large_image');
  check(`${file}: canonical baked`, (doc.querySelector('link[rel="canonical"]')?.href || '').endsWith(`/${file}`),
    doc.querySelector('link[rel="canonical"]')?.href);
  // A null github_link must hide the section, not leave a dead button.
  const ghSection = doc.getElementById('project-github-section');
  check(`${file}: github section hidden when no link`, !!ghSection?.classList.contains('hidden'),
    `hidden=${ghSection?.classList.contains('hidden')}`);
  check(`${file}: demo link hidden when no link`, !!doc.getElementById('project-demo-link')?.classList.contains('hidden'));
  check(`${file}: no JS errors`, jsErrors.length === 0, jsErrors.join(' | '));
}

// ---------------------------------------------------------- static blog pages
for (const b of content.blogs) {
  const file = `blog-${b.slug}.html`;
  const { doc, jsErrors } = await loadPage(file);
  check(`${file}: data-slug matches`, doc.body.dataset.slug === b.slug, doc.body.dataset.slug);
  const h1 = doc.getElementById('blog-title');
  check(`${file}: title hydrated`, !!h1 && h1.textContent.trim() === b.title, h1?.textContent);
  const bodyEl = doc.getElementById('blog-content');
  check(`${file}: content rendered`, (bodyEl?.children.length || 0) >= 3, `children=${bodyEl?.children.length}`);
  check(`${file}: date rendered`, (doc.getElementById('blog-date')?.textContent || '').trim().length > 0);
  const meta = m => doc.querySelector(`meta[property="${m}"]`)?.getAttribute('content');
  check(`${file}: og:title baked`, meta('og:title') === b.title, meta('og:title'));
  check(`${file}: og:image baked`, /^https:\/\/hardikmdarji\.vercel\.app\/images\/og\/.+\.png$/.test(meta('og:image') || ''), meta('og:image'));
  check(`${file}: canonical baked`, (doc.querySelector('link[rel="canonical"]')?.href || '').endsWith(`/${file}`),
    doc.querySelector('link[rel="canonical"]')?.href);
  check(`${file}: no JS errors`, jsErrors.length === 0, jsErrors.join(' | '));
}

// ---------------------------------------------- legacy ?slug= query variant
{
  const { doc } = await loadPage('project-template.html', {
    url: 'file://' + path.join(ROOT, 'project-template.html') + '?slug=' + content.projects[0].slug,
  });
  await settle(300);
  const h1 = doc.getElementById('project-title');
  check('project-template.html?slug=: still hydrates', !!h1 && h1.textContent.trim() === content.projects[0].title, h1?.textContent);
}
{
  const { doc } = await loadPage('blog-template.html', {
    url: 'file://' + path.join(ROOT, 'blog-template.html') + '?slug=' + content.blogs[0].slug,
  });
  await settle(300);
  const h1 = doc.getElementById('blog-title');
  check('blog-template.html?slug=: still hydrates', !!h1 && h1.textContent.trim() === content.blogs[0].title, h1?.textContent);
}

// ----------------------------------------------------------------- 404 page
{
  const { doc, jsErrors } = await loadPage('404.html');
  check('404: renders', /404/.test(doc.body.textContent));
  check('404: home link present', !!doc.querySelector('a[href="index.html"]'));
  check('404: no JS errors', jsErrors.length === 0, jsErrors.join(' | '));
}

console.log(`\nverify-dom: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  x ' + f);
}
// jsdom rAF timers keep the loop alive; exit explicitly.
process.exit(fail ? 1 : 0);
