# Go-Live Status

> **This file used to be a "final go-live checklist".** It targeted a custom
> domain that was never configured and instructed committing a live GitHub PAT
> into `crm-github.js`, which would have published repo write access to every
> visitor of `/crm.html`. Both are fixed — see `GO-LIVE.md` for the current,
> accurate procedure.

**Live URL:** https://hardikdarjiportfolio.vercel.app/

**Hosting:** Vercel (static, no build step). `.vercelignore` keeps the internal
planning docs out of the deployment, mirroring the strip step in
`.github/workflows/deploy.yml`.

Vercel project settings — **Framework Preset:** Other, **Build Command:** leave
empty, **Output Directory:** `.` (the repository root). No `vercel.json` is
required for that, and adding one is optional.

`.github/workflows/deploy.yml` also still deploys to GitHub Pages. If Vercel is
the only live host you want, disable that workflow or delete it; otherwise both
hosts will be published from the same branch.

Vercel serves `404.html` at the output root for unmatched routes, so the custom
404 page keeps working.

---

## Current state

| Item | Status |
|------|--------|
| GitHub Pages deployment | Live via `.github/workflows/deploy.yml` on every push to `main` |
| Contact form (Formspree) | Configured — `xjyvankq` |
| Newsletter form (Formspree) | Configured — `xgaengoz` |
| Brevo campaign automation | Wired to `content.json` changes; needs `BREVO_API_KEY` + `BREVO_LIST_ID` secrets |
| CMS (`crm.html`) | Working; token is entered at runtime, never committed |
| Blog section | Empty — `content.json` has `blogs: []` |
| Custom domain | **Not configured** (no `CNAME` file) |
| `og:image` | PNG at `images/og-image.png` (1200x630), rendered from the SVG source |

---

## Remaining work

1. **Write the blog posts.** `content.json` has an empty `blogs` array, so
   `blogs.html` shows an honest empty state and the homepage hides the
   "Latest post" card. Add posts via `crm.html`, or edit `content.json`
   directly. `data.js` holds five placeholder posts for `file://` previews
   only — they are intentionally not published.

2. **Regenerate the PNG social preview when the SVG changes.**
   `images/og-image.svg` is the editable source of truth; `images/og-image.png`
   is what the `og:image` / `twitter:image` tags point at, because most social
   platforms refuse to render SVG. After editing the SVG, re-render it:

   ```bash
   npx @resvg/resvg-js-cli --fit-width 1200 images/og-image.svg images/og-image.png
   ```

   The artwork uses **Inter** at weights 500/600/800. If Inter is not installed
   system-wide, point the renderer at the font files explicitly, otherwise the
   text silently disappears from the output:

   ```bash
   npx @resvg/resvg-js-cli \
     --no-system-font \
     --font-dir ./fonts \
     --font-default-family "Inter" --font-sans-serif-family "Inter" \
     --fit-width 1200 images/og-image.svg images/og-image.png
   ```

   Always check the result is **1200x630** and visibly non-blank before pushing.

3. **Set the Brevo secrets** (only if you want campaign emails):
   `Settings → Secrets and variables → Actions` → `BREVO_API_KEY`,
   `BREVO_LIST_ID`.

4. **Optional: custom domain.** See section 6 of `GO-LIVE.md`. If you add one,
   update the canonical URL, Open Graph tags, `robots.txt` and `sitemap.xml`
   at the same time — they all hardcode the current address.

---

## Repo hygiene

`deploy.yml` deletes `README.md`, `DEPLOY.md`, `GO-LIVE.md`,
`FINAL-GO-LIVE.md`, `PROJECT_AUDIT.md` and the unused profile photo before
uploading the site artifact, so internal notes (which contain local filesystem
paths and employer details) are never served at public URLs.