# Hardik Darji - Portfolio Website

Personal portfolio for **Hardik Darji**, Senior Engineer specializing in embedded systems and CAN protocol at Ammann India.

## Structure

```
.
├── index.html              # Homepage (hero, summary, skills, experience, projects, blogs, contact)
├── projects.html           # All projects grid
├── blogs.html              # All blog posts grid
├── project-template.html   # Single project detail (loads from content.json)
├── blog-template.html      # Single blog post (loads from content.json)
│
├── app.js                  # Shared client logic: mobile menu, canvas, scroll-spy, content loader
├── data.js                 # Offline fallback for content.json
├── content.json            # Seed/snapshot used to generate static pages at build time
├── renderer.js             # Hydrates project-template.html
├── blog-renderer.js        # Hydrates blog-template.html
│
├── crm.html                # CMS dashboard
├── crm-projects.html       # CMS: list/delete projects
├── crm-blogs.html          # CMS: list/delete blogs
├── crm-edit-project.html   # CMS: edit a project
├── crm-edit-blog.html      # CMS: edit a blog post
├── crm.js                  # CMS: add project / blog
├── crm-projects.js         # CMS: list & delete projects
├── crm-blogs.js            # CMS: list & delete blogs
├── crm-edit-project.js     # CMS: edit project
├── crm-edit-blog.js        # CMS: edit blog
├── crm-github.js           # CMS: shared GitHub API helpers
├── crm-header.html         # CMS shared header fragment
├── crm-nav.html            # CMS shared nav fragment
│
├── styles.css              # Small site-wide CSS (also defines .btn-primary etc.)
├── src/tailwind.css        # Tailwind entry point (@tailwind directives)
├── tailwind.config.js      # Content globs — must list every page that uses Tailwind
├── tailwind.css            # GENERATED, minified, and committed (see build below)
├── scripts/                # Build tooling (not published)
│   ├── generate-og.mjs     # Per-project/per-post social image + static page generator
│   ├── generate-rss.mjs    # Rewrites feed.xml (RSS 2.0) from content.json
│   └── generate-sitemap.mjs# Rewrites sitemap.xml from content.json
├── package.json            # Build tooling and Neon/Blob serverless dependencies
├── api/content.js          # Neon-backed content API
├── api/media.js            # Vercel Blob image upload/delete API
├── lib/neon-content.js     # Neon database access and initial seed logic
├── images/                 # Static images; CMS uploads new media to Vercel Blob
│   ├── og-image.png        # 1200x630 social preview (rendered from og-image.svg)
│   └── og/<slug>.png       # GENERATED: one social preview per project / blog post
├── project-<slug>.html     # GENERATED: canonical project page with static OG tags
├── blog-<slug>.html        # GENERATED: canonical blog page with static OG tags
├── robots.txt              # Allows crawling; disallows the CMS pages
├── sitemap.xml             # All public URLs
├── favicon.svg
├── apple-touch-icon.png    # 180x180 home-screen icon (iOS ignores SVG)
├── manifest.json           # PWA manifest
├── hardik-darji.vcf        # vCard download
├── .vercelignore           # Keeps internal docs and build scripts out of the deployment
└── README.md
```

Internal planning notes (`DEPLOY.md`, `GO-LIVE.md`, `FINAL-GO-LIVE.md`,
`PROJECT_AUDIT.md`, `WHAT-CHANGED.md`) have been **deleted from the repository** —
they contained local filesystem paths and employer details and this is a public
repo. They remain recoverable from git history if you need them.

## Hosting on Vercel

**Live at:** https://hardikmdarji.vercel.app/

Vercel runs `npm run build` before serving the repository root. This rebuilds CSS,
static project/blog pages, OG images, sitemap, and RSS feed from `content.json`.
Vercel also runs the `/api/content` and `/api/media` serverless functions.

Vercel project settings:

| Setting | Value |
|---|---|
| Framework Preset | **Other** |
| Build Command | `npm run build` |
| Output Directory | `.` (repository root) |

No `vercel.json` is required. Vercel auto-deploys on every push to `main`, and serves `404.html` at the output root so the custom 404 page keeps working.

### GitHub Pages — disabled

Vercel is the only host. `.github/workflows/deploy.yml` used to publish the same
branch to GitHub Pages, but **that workflow has been removed** so a push to `main`
deploys to Vercel alone rather than publishing the site at a second public URL.

If you ever want Pages back, restore the workflow from git history and re-enable
Pages in the repository settings. Note that the deploy strip step it carried
(deleting the internal docs before upload) is now Vercel's responsibility alone —
`.vercelignore` is the single source of truth for what is published.

### What is never published
`.vercelignore` keeps these out of any public URL: `README.md`, the former
internal planning docs, `Hardik Profile PIC.png`, and all build tooling
(`.github/`, internal docs, `node_modules/`, and `.og-cache/`). Build inputs,
serverless functions, and shared helpers must remain available to Vercel's build.

The planning docs are **also no longer in the repository** — see the structure
note above. The `.vercelignore` entries are kept as a safety net in case they are
restored. Do not remove them: they exist because those files carried local
filesystem paths and an employer name in a public repo.

### Path note
All links in this site are **relative** (`projects.html`, `project-<slug>.html`,
`blog-<slug>.html`, `images/...`), so the site works at a domain root, a Vercel
subdomain, or a sub-path, with no configuration changes.

## CMS (content management)

The CMS lives at `crm.html`. It saves projects, blogs, and testimonials to **Neon**,
uploads images to **Vercel Blob**, then commits a content snapshot to `content.json`
through the GitHub Contents API. The snapshot lets Vercel rebuild static SEO pages,
social previews, the sitemap, and RSS feed after each CMS save.

### Setup

1. **Generate a fine-grained GitHub PAT** (Settings → Developer settings → Personal access tokens → Fine-grained tokens).
   - Resource owner: **`Hardik250601`** (your account)
   - Repository access: **Only select repositories** → **`Hardik-Darji-Embedded-Systems-Engineer-Portfolio`**
- Permissions → Repository permissions → **Contents**: **Read and write**
   - Set the shortest expiry that works (max 1 year)
2. **Open `/crm.html`.** A "Connect to GitHub" bar appears at the top of the page.
3. **Paste the token into that bar** and press Connect.

The repository the CMS targets is configured at the top of `crm-github.js`
(`GITHUB_USERNAME` / `GITHUB_REPO`). It must match the repository you granted the
token access to, or every read and write will fail.

There is **no token stored in this repository** and nothing to commit. The token is kept in `sessionStorage` for the current browser tab only and is discarded when the tab closes. Press "Disconnect" to drop it immediately.

### Run the same CMS locally

On Windows, double-click `run_cms.bat`, or open PowerShell in the project folder
and run:

```powershell
py -3 run_cms.py
```

It opens `http://127.0.0.1:8765/crm.html` with the same CMS board. No Python
packages need installing. The local server binds to this computer only and
forwards `/api/content` and `/api/media` to the portfolio's Vercel APIs, so
publishes still save to Neon/Blob and create a GitHub snapshot that triggers the
site rebuild. Connect your GitHub token in the board; it stays in that browser
tab's session storage. Leave the console window open while using the board and
press **Ctrl+C** there when finished.

**Reading needs no token.** The repository is public, so listing and editing
existing content works before you connect. Only publishing requires one.

> **Why not a token in the source?** Earlier versions of this repo instructed you to paste the PAT into `crm-github.js` and commit it. That publishes a live write credential for the repository to every visitor of `/crm.html`. Never commit a token here — `.github/copilot-instructions.md` forbids it too.

### CMS security

Even with a session-scoped token, the CMS pages are served publicly, so:

- Always use a **fine-grained PAT scoped to this single repo** (never the broad `repo` scope).
- Give it the **shortest expiry that works** and rotate it.
- Prefer working against a local server (`python -m http.server`) rather than the public URL.

**Longer term:** replace the pasted token with GitHub OAuth plus a small serverless proxy that holds the credential server-side, so the browser never handles a repo-wide secret. All CMS I/O is already isolated behind `window.crmGit` (`getFile` / `updateFile`), so swapping the transport is a contained change.

### Adding and editing content

`crm.html` has three tabs — **Add Project**, **Add Blog Post** and **Add Testimonial**:

- **Slug** auto-generates from the title. Set it *before* adding images; Blob files are grouped by this slug.
- **Metrics** accept any label/value pair. **Case study** outcomes and roadmap are one item per line.
- Re-submitting an existing slug **replaces** that entry rather than duplicating it.
- **Tech stack** is comma separated and renders as chips.
- **Add Testimonial** takes a quote, name, role and optional company. Only paste quotes a real person actually gave you. The tab warns that the CMS needs repository **write** permission for this, whereas the project and blog tabs can be used read-only.

`crm-projects.html` and `crm-blogs.html` list existing content with Edit / Delete. Both editors cover the full schema and **never change the slug**, so editing a published item cannot silently move its URL.

Publishing updates Neon and the GitHub snapshot. The GitHub commit triggers a Vercel
build; allow a minute or two for the static pages and content API to reflect the update.

## Schema of content.json

```json
{
  "projects": [
    {
      "slug": "my-project",
      "title": "My Project",
      "short_summary": "One-line summary used on the listing card.",
      "full_description": "Long description shown on the detail page.",
      "main_image": "https://<blob-url>",
      "supportive_images": ["https://<blob-url>"],
      "github_link": "https://github.com/...",
      "github_blurb": "Source code and schematics for this project live on my GitHub.",
      "linkedin_link": "https://linkedin.com/...",
      "tech_stack": ["ESP32", "C", "CAN"],
      "metrics": { "cost_reduction": "90%+", "status": "Completed" },
      "case_study": {
        "problem": "...",
        "architecture": "...",
        "outcomes": ["..."],
        "future_roadmap": ["..."]
      }
    }
  ],
  "blogs": [
    {
      "slug": "my-post",
      "title": "My Post",
      "date": "2025-05-03",
      "short_description": "Short summary used on listing cards.",
      "content": "<p>Full HTML content of the post.</p>"
    }
  ],
  "testimonials": [
    {
      "quote": "What the colleague actually said.",
      "name": "Their Name",
      "role": "Team Lead",
      "company": "Optional"
    }
  ]
}
```

`testimonials` is optional and currently empty. The homepage section renders only when
this array has entries, so leaving it empty means no empty heading appears. Add quotes
through the CMS (**Add Testimonial** tab) or edit the array directly — **never invent
them**; they must be something a real person actually said.

## Newsletter (Buttondown setup pending)

The signup endpoint is prepared for **[Buttondown](https://buttondown.com/pricing)**,
but the account review and API key are not complete, so Buttondown is not active
yet. Until `BUTTONDOWN_API_KEY` is configured in Vercel, the browser falls back
to the newsletter form's Formspree action. Buttondown accepts personal email
accounts; a business email and custom sending domain are optional.

```
index.html #newsletter-form
   │  POST /api/subscribe  (application/x-www-form-urlencoded)
   ▼
api/subscribe.js  ──►  Buttondown subscriber API
   └─ 404/405/5xx ──► falls back to the Formspree action on the form
```

**Setup:**

1. Create a Buttondown account with your personal email and confirm the
   verification email. A custom sending domain is optional.
2. After the account is approved, create an API key and add it to the Vercel
   project as `BUTTONDOWN_API_KEY`.
3. Redeploy Vercel after adding the environment variable.

The endpoint normalizes email addresses, silently drops the hidden `company`
honeypot, and rate-limits per IP (5 per 10 minutes, best effort per warm
instance). New subscribers receive Buttondown's double opt-in confirmation.

**Existing subscribers:** import only subscribers who have consented, preserving
their unsubscribe state.

The endpoint returns `400` for invalid addresses, `429` for rate limits, and
`503` when Buttondown is not configured or unavailable. In those service-error
cases the browser falls back to the form's Formspree action.

> **Where content and images live:** Neon is the live store for projects, blog
> posts, and testimonials. `/api/content` reads it for the site and CMS. On the
> first database read, the API seeds Neon once from `content.json`; the CMS then
> updates Neon and commits a JSON snapshot to GitHub. Vercel rebuilds the static
> entry pages and social images from that snapshot so direct links and crawlers
> see complete HTML. Vercel Blob stores uploaded image files, and Neon/content
> snapshots store their public URLs. Keep `content.json` as the deployment seed
> and static-page input; it is not the live runtime content source.

### Neon and Vercel Blob setup

Connect the project's Neon database and a **public** Vercel Blob store to the
Vercel project for Production and Preview. Neon provides the database URL
environment variable; the content API recognizes the integration's
`Hardik_portfolio_POSTGRES_URL` / `Hardik_portfolio_DATABASE_URL` names and the
standard `DATABASE_URL` / `POSTGRES_URL` names. Blob must provide
`BLOB_READ_WRITE_TOKEN`. Do not paste these values into source files. After
connecting or changing environment variables, redeploy the project.

The CMS image picker accepts JPG, PNG, WebP, GIF, and AVIF images up to 4 MB.
Uploaded files are public so they can display on portfolio pages. The server
limits upload and delete operations to an authenticated GitHub account matching
the portfolio owner.

## Local development

Open `index.html` directly in a browser — the site falls back to `data.js` if `content.json` can't be fetched (which is the case for `file://`). For a more accurate preview, run a static server:

```bash
# Python
python -m http.server 8000

# Node
npx http-server . -a 0.0.0.0 -p 8000
```

Then visit http://localhost:8000/.

## CSS build step

Tailwind is compiled **ahead of time**, not loaded from a CDN, so first paint no longer
waits on a runtime compiler.

```bash
npm install          # once, installs only Tailwind
npm run build:css    # regenerates tailwind.css (minified)
npm run watch:css    # optional: rebuild on save while editing markup
```

`tailwind.css` is **committed**, so Vercel needs no install or build step — it just
serves the static file. Two consequences:

- **If you edit any HTML, re-run `npm run build:css` and commit the result.** A new
  utility class will not exist in `tailwind.css` until you do, and it will silently render
  unstyled.
- If you add a *new page*, add its path to `content` in `tailwind.config.js`, or Tailwind
  will not scan it.

`styles.css` holds the hand-written component classes (`.btn-primary`, `.reveal`,
`.timeline`, `.skill-bar`, …). It is plain CSS with no `@apply`, so it needs no build.

## Social preview images (OG)

Every project and blog post gets its own 1200×630 preview image at
`images/og/<slug>.png`, so a shared link shows that entry's title instead of the
homepage card. `npm run build:og` generates them.

```bash
npm run build            # css + og images + sitemap + rss
npm run build:og         # just the images and static pages
npm run build:sitemap    # just sitemap.xml
npm run build:rss        # just feed.xml
```

### Printing

`styles.css` ends with an `@media print` block, and `index.html` carries a
`.print-header` identity block that is hidden on screen and shown only on paper.
The block flattens the dark theme onto white, hides the canvas layers, the
marquee and the footer, forces `.reveal` sections to `opacity: 1` (otherwise
unscrolled sections print blank), and appends external URLs after links so a
printed or saved-to-PDF CV is still actionable.

`verify:static` asserts the rules that actually matter, so a redesign cannot
silently drop them.

### RSS feed

`feed.xml` is a generated RSS 2.0 feed of the blog posts, linked from
`index.html` and `blogs.html` via `<link rel="alternate">`. Items point at the
static `blog-<slug>.html` pages for the same reason the sitemap does: those are
the only URLs whose titles and descriptions are readable without JavaScript.
Regenerate it with `npm run build:rss` after publishing a post.

**Social crawlers do not run JavaScript.** Facebook, X and LinkedIn fetch raw
HTML, so meta tags set at runtime are invisible to them. Because this site renders
everything from `content.json` in the browser, each entry also gets a **generated
static page** — `project-<slug>.html` and `blog-<slug>.html` — with its `og:` tags
baked into the HTML and the slug on `<body data-slug>`. Those are the canonical
URLs, they are what the sitemap lists, and all listing links point at them.
`project-template.html?slug=…` still works for older shared links and sets a
canonical tag back to the static page.

**After adding or renaming a project or post, run `npm run build` and commit the
result** — otherwise the new entry has no preview image and is missing from the
sitemap. Inter is downloaded on first run into `.og-cache/` (gitignored); without
it the renderer silently produces images with no text, so the script fails loudly
instead.

Each PNG has its editable SVG source saved next to it in `images/og/`. To restyle
the card, change the `card()` function in `scripts/generate-og.mjs` and re-run the
build — the SVGs are outputs, not inputs.

## Verification

Two committed check suites guard the site — run them after any content, markup
or script change:

```bash
npm run verify            # both suites
npm run verify:static     # dependency-free static audit (22 checks)
npm run verify:dom        # renders every page in jsdom (101 checks)
```

- **verify:static** asserts that every local `href`/`src` resolves, every
  `og:image` exists at 1200×630, the sitemap covers all 11 URLs with no
  `?slug=` entries, every class used in HTML/JS exists in the compiled CSS
  (or is a deliberate JS hook), the CMS targets this repository, and the
  `data.js` offline mirror is a byte-exact prefix of each post in
  `content.json`.
- **verify:dom** loads each page in jsdom with its real scripts and asserts
  the rendered result: cards hydrate from `content.json`, static entry pages
  pick their slug up from `<body data-slug>`, empty sections (testimonials,
  GitHub/demo buttons for null links) stay hidden, and no feature
  initialiser throws — jsdom has no canvas/WebGL, so this also proves every
  animation degrades gracefully when a 2D context cannot be created.

## Notes
- The contact and newsletter forms submit asynchronously. The **contact** form posts to its Formspree endpoint. The **newsletter** form posts to `/api/subscribe`; Buttondown signup requires `BUTTONDOWN_API_KEY`, and the browser falls back to Formspree if the service is not configured or available.
- `.github/workflows/build-and-verify.yml` runs the site build and static, API, and DOM checks on pushes and pull requests to `main`. Newsletter update emails are not configured.
- Tailwind is **not** on a CDN anymore. It is compiled to `tailwind.css` and committed — see [CSS build step](#css-build-step). If you add markup using a class that is not already in `tailwind.css`, rebuild before deploying.
- `data.js` mirrors the blog entries in `content.json` (same slugs, titles, dates and summaries) so `file://` previews do not show an empty blog section. Only the opening content (everything before the post's first `<h2>`) is duplicated; **keep it in sync when you edit a post** — `npm run verify:static` fails if it drifts.
- `robots.txt` and `sitemap.xml` are deployed with the site. The CMS pages are disallowed from crawling and are marked `noindex` in their own HTML.
- `images/og-image.svg` is the editable source for the homepage social preview; `images/og-image.png` is what the meta tags point at. **All nine social images** (homepage + 8 entries) are re-rendered by `npm run build:og` — note that Inter must be available or the text silently disappears from the PNG.

## Features

- **Real WebGL 3D hero** (Three.js): a 3D microchip sitting on a PCB with traces, solder pads, capacitors, SMD chips, resistors, and a crystal oscillator. Auto-orbits slowly, mouse parallax for interactive viewing. Falls back to a static SVG if WebGL is unavailable.
- **Three project case studies** (1 professional + 2 academic): the Ammann Data Logger & Telematics Platform (flagship), Remote-Controlled Multipurpose Robot (nRF24L01), and Smart Garbage Monitoring System (Arduino). Each has a full architecture diagram, a metrics strip driven by whatever keys the project defines, and a click-to-zoom lightbox for supportive images.
- **Initials avatar** next to the name with a slow rotating dashed ring.
- **Three theme modes** (Amber / Dark / Light) — toggleable, persisted in `localStorage`.
- **Custom animated cursor follower** (desktop only, respects reduced-motion).
- **Animated counters**, **scroll reveal**, **3D tilt on cards**, **3D rotating timeline** for experience.
- **Skill bars** with self-rated proficiency in each category.
- **Latest post / latest project** highlight cards that auto-populate from `content.json`.
- **"Now" status block** with live Ahmedabad local time + last-updated date.
- **Tools & platforms wordmark band**, **Beyond-code interests** section.
- **"What colleagues say" testimonials section** — data-driven from `content.json.testimonials` and hidden entirely while that array is empty. Add real quotes via the CMS.
- **"Target role" role-fit block** high on the page, stating who the site is for and what you are looking for, with CTAs to contact and résumé.
- **Open-to-work status pill** in the hero with pulsing green dot.
- **Achievements / credentials** section (4 stat cards with 3D tilt).
- **Floating back-to-top button**, **scroll progress bar** at top of page, **share-link buttons** per section, **URL hash sync** as you scroll.
- **Constellation background** + **hero particle cursor** (amber dots follow the mouse).
- **Marquee tag bar** between hero and summary.
- **vCard download** (`hardik-darji.vcf`) — recruiters can one-click add you to their address book.
- **GitHub link section** on every case study linking to your repository.
- **Full SEO**: JSON-LD `Person` schema, Open Graph, Twitter card, canonical URL, favicon, PWA manifest, robots, keywords.
- **Custom OG image** (1200×630 PNG, rendered from an SVG source) so the site previews on LinkedIn / X / Facebook, which ignore SVG.
- **Five technical blog posts** on Embedded C, CAN/J1939, real-time debugging and performance work, auto-populated from `content.json`.
- **Accessibility**: `prefers-reduced-motion` respected, focus management, ARIA labels, semantic HTML, screen-reader-friendly alt text, keyboard navigation.
- **CMS** at `/crm.html` writes directly to `content.json` via the GitHub API. Reading needs no credential; only publishing does.
- **404 page** with the same theme.
