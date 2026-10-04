# Portfolio — Complete Project Reference

**Internal engineering document.** This file is **not published** — it is listed in
`.vercelignore` alongside the other internal notes. Everything below describes the
repository as it stands at commit `47f11fc`.

---

## 1. What this project is

A personal portfolio and blog for **Hardik Darji**, Senior Embedded Software Engineer
at Ammann India (off-highway construction machinery). The audience is two groups at
once, and that tension drives most design decisions:

| Audience | What they need |
|---|---|
| **Hiring engineers and recruiters** | Scan for CAN/J1939, Embedded C, HYDAC TTC, CANTATA. Print to PDF. Find a CV. |
| **Peers reading the blog** | Read five posts on J1939, CAN, debugging, and firmware performance. |

It is a **static site with one serverless function**. There is no framework, no
bundler, and no SSR. The build produces files; Vercel serves files.

### Non-goals

- No dashboard, login, or user accounts.
- No CMS database as the source of truth (see §5 — content is a JSON file).
- No client-side router. Multi-page navigation, by design.

---

## 2. Technology stack

Verified against `package.json`; do not report a framework that isn't there.

| Layer | Technology | Notes |
|---|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript | **No React/Vue/Angular/Next.** Zero runtime browser deps. |
| Styling | Tailwind CSS 3.4 + hand-written `styles.css` | Tailwind compiles to a committed `tailwind.css`; `styles.css` holds what utilities can't express. |
| Backend | Node.js (one Vercel-style function) | `api/subscribe.js` only. |
| Newsletter | Buttondown API | Subscriber list and automated new-content emails; free plan covers the first 100 subscribers. Personal email signup works; custom sending domain is optional. |
| Database | MongoDB Atlas | Optional one-way content mirror only. |
| Hosting | **Vercel** (not Freebuff hosting) | No build command; static files served from repo root. |
| Build tooling | `@resvg/resvg-js`, `tailwindcss` | devDependencies only. |
| Test tooling | `jsdom` | devDependency. |
| Runtime dep | `mongodb` | The *only* `dependencies` entry. |

**Design decision worth keeping:** `tailwind.css` is generated **and committed**. Vercel
therefore needs no build step to serve the site, and a static audit works from a plain
file checkout. The cost is that `tailwind.config.js` content globs must list every page
using Tailwind, and `tailwind.css` must be rebuilt after adding classes.

---

## 3. Repository layout

```
.
├── index.html              Homepage — every section lives here
├── projects.html           Project grid (JS-rendered)
├── blogs.html              Blog grid (JS-rendered)
├── project-template.html   Hydrated by renderer.js via ?slug=
├── blog-template.html      Hydrated by blog-renderer.js via ?slug=
│
├── project-<slug>.html     GENERATED — canonical project page, static OG tags
├── blog-<slug>.html        GENERATED — canonical blog page, static OG tags
│
├── app.js                  All client behaviour (feature dispatcher, §4)
├── renderer.js             Hydrates project pages
├── blog-renderer.js        Hydrates blog pages
├── data.js                 Offline mirror of content.json for file:// viewing
├── content.json            SOURCE OF TRUTH for projects/blogs/testimonials
│
├── crm*.html, crm*.js      Private CMS (§6)
│
├── styles.css              Hand-written site-wide CSS + @media print block
├── src/tailwind.css        Tailwind entry (@tailwind directives)
├── tailwind.config.js      Content globs — must list every Tailwind page
├── tailwind.css            GENERATED, minified, COMMITTED
│
├── api/subscribe.js        Buttondown newsletter signup endpoint
├── lib/mongodb.js          Shared Atlas connection (cached on globalThis)
│
├── scripts/                Build + verification tooling (never published)
├── feed.xml                GENERATED — RSS 2.0
├── sitemap.xml             GENERATED — 11 URLs
├── robots.txt              Blocks /crm*.html, points at sitemap
└── images/                 Static art + images/og/<slug>.png (GENERATED)
```

---

## 4. How the client works

`app.js` exposes a small API (`window.app`: `loadContent`, `escapeHtml`,
`formatDate`, `projectCard`, `blogCard`, `blogListItem`, `setTheme`) and runs every
feature through a **dispatcher list** near the bottom of the file.

Each initialiser is wrapped in try/catch, so a failing feature logs a warning and
takes nothing else down. This is deliberate and load-bearing: `verify-dom` runs the
real scripts inside jsdom, which has **no canvas, no WebGL and no
IntersectionObserver**. Quiet degradation is therefore a tested property, not a hope.

Features: `theme`, `themeToggle`, `mobileMenu`, `constellation`, `scrollSpy`,
`forms`, `homeSections`, `testimonials`, `tilt`, `counters`, `reveal`, `backToTop`,
`hashSync`, `heroParticles`, `nowBlock`.

**Theming** is a `data-theme` attribute on `<html>` (`amber` default, plus `dark` and
`light`) driving CSS custom properties defined in `styles.css`. The choice persists to
`localStorage` inside try/catch, so private-browsing mode degrades instead of throwing.

---

## 5. Content model

`content.json` is the single source of truth:

```
{ projects: [...], blogs: [...], testimonials: [] }
```

A project carries `slug`, `title`, `short_summary`, `main_image`, `supportive_images`,
`full_description`, `github_link`, `github_blurb`, `linkedin_link`, `demo_link`,
`tech_stack`, `metrics`, `case_study`.

### Why JSON and not a database

Social crawlers (Facebook, X, LinkedIn) fetch raw HTML and **do not execute
JavaScript**. Anything set at runtime is invisible to them. So each entry is baked
into a generated static HTML file with real `<title>`, `<meta>` and `og:` tags. Atlas
is a downstream mirror for browsing, never the source — see `sync-content.mjs`, which
is deliberately **one-way**.

### Current coverage (gap — see §9)

| Field | Populated |
|---|---|
| `github_link` | **0 / 3** |
| `demo_link` | **0 / 3** |
| everything else | 3 / 3 |

The CMS (`crm-github.js`) writes through the **GitHub API**, committing directly to
`content.json` — not to a database. The GitHub token is supplied at runtime and held in
`sessionStorage`; there is deliberately no token constant in the file.

---

## 6. CMS architecture

Five private pages (`crm.html`, `crm-projects.html`, `crm-blogs.html`,
`crm-edit-project.html`, `crm-edit-blog.html`), all `Disallow`ed in `robots.txt`.

Flow: authenticate → edit form → commit `content.json` via GitHub API → **rebuild
required** (OG images, static pages, sitemap, feed) → push.

**Consequence worth stating plainly:** a CMS publish does *not* regenerate the derived
artifacts automatically. They are regenerated by `npm run build` locally and committed.
This is the single biggest source of content drift in the project.

---

## 7. Build pipeline

```bash
npm run build       # build:css → build:og → build:sitemap → build:rss
```

| Step | Tool | Produces |
|---|---|---|
| `build:css` | tailwindcss | minified `tailwind.css` (committed) |
| `build:og` | generate-og.mjs | `images/og/<slug>.png` (1200×630) + the static `project-*.html` / `blog-*.html` pages |
| `build:sitemap` | generate-sitemap.mjs | `sitemap.xml`, 11 URLs |
| `build:rss` | generate-rss.mjs | `feed.xml`, 5 items |

The build is **deterministic** — a clean rebuild reproduces committed output byte for
byte, verified via `git status` after `npm run build`.

Supporting commands: `build:sitemap` / `build:rss` individually, `sync:content`
(one-way mirror to Atlas, `-- --prune` for orphans), `watch:css`.

---

## 8. Verification

```bash
npm run verify       # static (67) → api (35) → dom (105) = 207 checks
```

| Suite | Count | What it covers |
|---|---|---|
| `verify:static` | 67 | Link resolution, image paths, OG dimensions, sitemap/feed validity, CSS class resolution, **tag balance per page**, print-CSS rules, alt-text coverage, a guard that the Built-With section never claims a framework, and a guard that internal Markdown is never published. |
| `verify:api` | 35 | Subscribe endpoint incl. validation, rate limiting, honeypot, and **deliberate DB-failure stubs** asserting 503 with no internals leaked. |
| `verify:dom` | 105 | Every page loaded in jsdom with its **real** scripts, asserting rendered output and graceful degradation. |

`[subscribe] database error: ECONNREFUSED` in the output is **expected** — it is an
injected stub proving the endpoint degrades correctly, not a failure.

New checks are expected to be **mutation-tested** (deliberately break the thing,
confirm exit 1) rather than assumed to work.

---

## 9. Pending work — needs real content from Hardik

Nothing here can be fabricated; each needs information only the site owner has.

| # | Item | Status | Impact |
|---|---|---|---|
| 1 | `github_link` for all 3 projects | **0/3** | Embedded hiring screens GitHub. Biggest gap. |
| 2 | `demo_link` for all 3 projects | **0/3** | Same. |
| 3 | `testimonials` | **0 entries** | Section auto-hides entirely. |
| 4 | Atlas password rotation | open | Credential hygiene, not a code change. |

Projects awaiting links: `ammann-data-logger-telematics`,
`remote-controlled-multipurpose-robot`, `smart-garbage-monitoring`.

---

## 10. Environment and deployment alignment

### ⚠️ Hosting mismatch — the most important item here

`freebuff-deploy status` reports **no deployments**, and `freebuff-deploy env list`
reports **no production variables**. That is not a misconfiguration: **this site is
hosted on Vercel, not on Freebuff-managed hosting.**

Consequence: setting `MONGODB_URI` via `freebuff-deploy env set` would do nothing.
The optional `sync:content` script runs locally from `.env.local`; it does not need
a production Vercel variable.

### Current newsletter behaviour

Newsletter signup is sent to Buttondown using `BUTTONDOWN_API_KEY`. If the key is
absent or the service is unavailable, `api/subscribe.js` returns **503** and
`app.js` falls back to the Formspree endpoint. MongoDB is only used by the
optional content mirror (`npm run sync:content`).

### Buttondown configuration

Required in Vercel for newsletter signups and as a GitHub Actions secret for
new-project and new-post notifications. Buttondown's first 100 subscribers are
free; a business email or custom sending domain is not required.

### `MONGODB_URI`

Used locally in `.env.local` (gitignored) by `npm run sync:content`. Newsletter
signup no longer depends on MongoDB; this variable is not needed in Vercel.

### Alignment checklist

- [x] README documents Vercel as the host and GitHub Pages as disabled
- [x] `.vercelignore` excludes internal docs, `scripts/`, `src/`, build tooling
- [x] `package.json` + lockfile retained for local tooling; `api/subscribe.js` uses the built-in Fetch API
- [x] `robots.txt` blocks `/crm*.html`
- [ ] `BUTTONDOWN_API_KEY` added to **Vercel** and GitHub Actions
- [ ] Vercel redeployed after setting the newsletter key
- [ ] Existing subscriber list exported from the old Atlas `subscribers` collection and imported into Buttondown, if needed

---

## 11. Known limitations

1. **No visual verification has been performed.** `freebuff-preview` was unavailable
   for all work on the print stylesheet, the RSS feed, and the Built-With section. All
   three are asserted structurally, not visually. A print-preview screenshot is the
   outstanding verification step.
2. **The CMS does not rebuild derived artifacts** (§6) — the main drift risk.
3. **`tailwind.config.js` content globs are a manual list.** A new Tailwind-using page
   that isn't listed silently ships unstyled.
4. **Atlas is one-way.** Edits made directly in Atlas are overwritten by the next sync.
5. **Search engine / filter features on grid pages** are client-side only over 3 and 5
   items respectively — not worth complexity yet.
6. **Custom domain not configured.** All canonical/OG/sitemap/feed URLs are hardcoded
   to `https://hardikdarjiportfolio.vercel.app`. Adding a domain means updating all of
   them, ideally from a single constant.

---

## 12. Conventions for future work

- **Never** hand-edit `tailwind.css` — run `npm run build:css`.
- **Never** hand-edit files in `images/og/` or the generated `project-*.html` /
  `blog-*.html` — they are build output.
- **Never** hardcode `https://hardikdarjiportfolio.vercel.app` in a new file; reuse an
  existing constant/pattern.
- Any new `<img>` must have **descriptive** alt text (enforced by `verify:static`). An
  empty `alt` is only acceptable on a genuinely decorative image, and there are none.
- Any new content-hiding or animated rule must be accounted for in the `@media print`
  block, or the site will print blank.
- Run `npm run verify` before committing; mutation-test any new check.
- The **GitHub token for the CMS is never committed** — runtime entry only, held in
  `sessionStorage`.
