# GO-LIVE Quick Reference

**Target URL:** `https://hardikdarjiportfolio.vercel.app/`

**Hosting:** Vercel, serving the repository root as static files with no build
step. Vercel auto-deploys on every push to `main`. Internal docs are excluded
via `.vercelignore`.

> `.github/workflows/deploy.yml` still publishes the same branch to GitHub
> Pages. If Vercel is the only host you want, disable that workflow.

---

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: portfolio ready for GitHub Pages"
git branch -M main
git remote add origin https://github.com/Hardik250601/Hardik-Darji-Embedded-Systems-Engineer-Portfolio.git
git push -u origin main
```

---

## 2. Enable GitHub Pages

1. Open: https://github.com/Hardik250601/Hardik-Darji-Embedded-Systems-Engineer-Portfolio
2. **Settings** → **Pages** (left sidebar)
3. Source: **GitHub Actions**
4. Push to `main` and open the **Actions** tab
5. Wait for **Deploy to GitHub Pages** to complete, then open the published URL

---

## 3. Test Contact Forms

The contact and newsletter forms use Formspree and are already configured for GitHub Pages.

**Test:** Submit both forms and verify the submissions in the Formspree dashboards.

---

## 4. Enable CMS (GitHub token)

**Nothing to commit.** The CMS takes the token at runtime — there is no token constant in the source.

1. Go to: https://github.com/settings/tokens?type=beta
2. **Generate new token (fine-grained)**
3. Name: `Hardik-webpage CMS`
4. Repo: **Only select repositories** → `Hardik-webpage`
5. Permissions → **Contents: Read and write**
6. Set an expiry date (max 1 year)
7. **Generate token** → copy it
8. Open `.../crm.html` and paste it into the **Connect to GitHub** bar at the top of the page

The token lives in `sessionStorage` for that browser tab only and disappears when you close the tab. Never add it to a committed file — that is what the old setup did, and it exposed repo write access to every visitor of `/crm.html`.

---

## 5. Verify

| Test | URL |
|------|-----|
| Homepage | `https://hardikdarjiportfolio.vercel.app/` |
| Projects | `.../projects.html` |
| Case study | `.../project-template.html?slug=ammann-data-logger-telematics` |
| CMS | `.../crm.html` |
| Contact form | Submit test message |
| All 3 themes | Toggle in navbar |

---

## 6. Optional: Custom Domain

**Not currently configured.** The site is served from
`https://hardikdarjiportfolio.vercel.app/` on a Vercel subdomain.

If you add a domain later:
1. Register a domain you control
2. Vercel project → **Settings → Domains** → add the domain
3. DNS at the registrar, per the values Vercel shows you:
   - Type: `CNAME`
   - Name: `@` (apex) or `www`
   - Value: `cname.vercel-dns.com`
4. Wait for DNS verification, then Vercel provisions the TLS certificate

Then update, in the same commit: the canonical URL, the Open Graph and Twitter
image URLs, the JSON-LD `url` / `image`, `robots.txt`, `sitemap.xml`, the
`URL;TYPE=Portfolio` line in `hardik-darji.vcf`, and the `SITE_URL` default in
`.github/scripts/send-brevo-update.mjs`. Otherwise social previews and newsletter
links will keep pointing at the Vercel subdomain.

---

## Files That Must Exist in Repo Root

- `.nojekyll` (0 bytes — already present)
- `index.html`
- `project-template.html`
- `styles.css`
- `app.js`
- `data.js`
- `renderer.js`
- `content.json`
- `robots.txt`
- `sitemap.xml`
- `images/` folder with the project SVGs

Internal docs (`README.md`, `DEPLOY.md`, `GO-LIVE.md`, `FINAL-GO-LIVE.md`, `PROJECT_AUDIT.md`) and the unused profile photo are stripped by `deploy.yml` before the site is uploaded.

---

## One-Command Deploy (after initial setup)

```bash
git add . && git commit -m "Update" && git push
```

GitHub Pages auto-rebuilds on every push to `main`.

---

## Need Help?

- Full guide: `DEPLOY.md`
- Issues audit: `PROJECT_AUDIT.md`
- CMS security: see the "CMS security" section of `README.md`