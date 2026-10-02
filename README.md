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
├── content.json            # Source of truth for projects & blogs
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
├── package.json            # Build tooling only — the site itself has no runtime deps
├── images/                 # Static images, plus where the CMS uploads project images
│   └── og-image.png        # 1200x630 social preview (rendered from og-image.svg)
├── robots.txt              # Allows crawling; disallows the CMS pages
├── sitemap.xml             # All public URLs
├── favicon.svg
├── apple-touch-icon.png    # 180x180 home-screen icon (iOS ignores SVG)
├── manifest.json           # PWA manifest
├── hardik-darji.vcf        # vCard download
├── .vercelignore           # Keeps internal docs out of the Vercel deployment
└── README.md
```

Internal notes (not part of the site, excluded from both deployments):
`DEPLOY.md`, `GO-LIVE.md`, `FINAL-GO-LIVE.md`, `PROJECT_AUDIT.md`, `WHAT-CHANGED.md`.

## Hosting on Vercel

**Live at:** https://hardikdarjiportfolio.vercel.app/

This is a static site with **no build step**. Vercel serves the repository root as-is.

Vercel project settings:

| Setting | Value |
|---|---|
| Framework Preset | **Other** |
| Build Command | *leave empty* |
| Output Directory | `.` (repository root) |

No `vercel.json` is required. Vercel auto-deploys on every push to `main`, and serves `404.html` at the output root so the custom 404 page keeps working.

### GitHub Pages (secondary)

`.github/workflows/deploy.yml` also publishes the same branch to GitHub Pages. If Vercel is the only host you want, disable or delete that workflow — otherwise both sites are public.

That workflow deletes the internal planning docs and the unused profile photo before uploading, mirroring `.vercelignore`.

### What is never published
`.vercelignore` and the deploy strip step both keep these out of any public URL:
`README.md`, `DEPLOY.md`, `GO-LIVE.md`, `FINAL-GO-LIVE.md`, `PROJECT_AUDIT.md`,
`WHAT-CHANGED.md`, and `Hardik Profile PIC.png`. Several of them contain local
filesystem paths with a username and employer name — do not remove the exclusions.

### Path note
All links in this site are **relative** (`projects.html`, `blog-template.html?slug=...`, `images/...`), so the site works at a domain root, a Vercel subdomain, or a sub-path, with no configuration changes.

## CMS (content management)

The CMS lives at `crm.html`. It writes to `content.json` (and uploads images to `images/projects/...`) via the **GitHub Contents API**.

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

- **Slug** auto-generates from the title. Set it *before* adding images; image paths are built from it.
- **Metrics** accept any label/value pair. **Case study** outcomes and roadmap are one item per line.
- Re-submitting an existing slug **replaces** that entry rather than duplicating it.
- **Tech stack** is comma separated and renders as chips.
- **Add Testimonial** takes a quote, name, role and optional company. Only paste quotes a real person actually gave you. The tab warns that the CMS needs repository **write** permission for this, whereas the project and blog tabs can be used read-only.

`crm-projects.html` and `crm-blogs.html` list existing content with Edit / Delete. Both editors cover the full schema and **never change the slug**, so editing a published item cannot silently move its URL.

Publishing commits directly to `content.json`, which triggers a Vercel (and Pages) redeploy — allow 1-2 minutes to go live.

## Schema of content.json

```json
{
  "projects": [
    {
      "slug": "my-project",
      "title": "My Project",
      "short_summary": "One-line summary used on the listing card.",
      "full_description": "Long description shown on the detail page.",
      "main_image": "images/projects/my-project/main.png",
      "supportive_images": ["images/projects/my-project/support-1.png"],
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

`tailwind.css` is **committed**, so neither Vercel nor GitHub Pages needs an install or
build step — both just serve the static file. Two consequences:

- **If you edit any HTML, re-run `npm run build:css` and commit the result.** A new
  utility class will not exist in `tailwind.css` until you do, and it will silently render
  unstyled.
- If you add a *new page*, add its path to `content` in `tailwind.config.js`, or Tailwind
  will not scan it.

`styles.css` holds the hand-written component classes (`.btn-primary`, `.reveal`,
`.timeline`, `.skill-bar`, …). It is plain CSS with no `@apply`, so it needs no build.

## Notes
- The contact and newsletter forms use separate Formspree endpoints and submit asynchronously.
- New projects or blog posts added to `content.json` trigger `.github/workflows/brevo-notify.yml`, which sends a Brevo campaign to the configured subscriber list. It needs the `BREVO_API_KEY` and `BREVO_LIST_ID` Actions secrets; without them that workflow fails harmlessly and does not block the deploy. **Once set, every CMS publish emails the whole subscriber list.**
- The site URL used in those emails comes from the `SITE_URL` workflow variable, defaulting to the canonical URL.
- Tailwind is **not** on a CDN anymore. It is compiled to `tailwind.css` and committed — see [CSS build step](#css-build-step). If you add markup using a class that is not already in `tailwind.css`, rebuild before deploying.
- `data.js` mirrors the blog entries in `content.json` (same slugs, titles, dates and summaries) so `file://` previews do not show an empty blog section. Only opening paragraphs are duplicated; **keep it in sync when you edit a post.**
- `robots.txt` and `sitemap.xml` are deployed with the site. The CMS pages are disallowed from crawling and are marked `noindex` in their own HTML.
- `images/og-image.svg` is the editable source for the social preview; `images/og-image.png` is what the meta tags point at. See `FINAL-GO-LIVE.md` for how to re-render it — note that Inter must be available or the text silently disappears from the PNG.

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
