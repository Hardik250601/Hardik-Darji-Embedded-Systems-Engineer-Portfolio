# Deployment Guide — GitHub Pages

This guide walks through deploying the portfolio to **GitHub Pages** at:

```
https://hardikdarjiportfolio.vercel.app/
```

---

## Prerequisites

- A GitHub account (you have: `Hardik250601`)
- Git installed locally
- This project folder: `C:\Users\AINHMD\OneDrive - Ammann Group\Desktop\all MY project data\Hardik Webpage`

---

## Step 1: Create the Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `Hardik-webpage`
3. Public (required for free GitHub Pages)
4. **Do NOT** initialize with README, .gitignore, or license
5. Click **Create repository**

---

## Step 2: Push the Code

Open PowerShell in the project folder:

```powershell
cd "C:\Users\AINHMD\OneDrive - Ammann Group\Desktop\all MY project data\Hardik Webpage"

git init
git add .
git commit -m "Initial commit: portfolio ready for GitHub Pages"
git branch -M main
git remote add origin https://github.com/Hardik250601/Hardik-Darji-Embedded-Systems-Engineer-Portfolio.git
git push -u origin main
```

---

## Step 3: Enable GitHub Pages

1. Go to the repo: https://github.com/Hardik250601/Hardik-Darji-Embedded-Systems-Engineer-Portfolio
2. Click **Settings** (top-right tab)
3. In the left sidebar, click **Pages** (under "Code and automation")
4. Under **Build and deployment**, set **Source** to **GitHub Actions**
5. Open the **Actions** tab and confirm the `Deploy to GitHub Pages` workflow runs successfully

Wait 1–2 minutes. The site will be live at:
```
https://hardikdarjiportfolio.vercel.app/
```

---

## Step 4: Verify

- Open the URL above
- Check all 3 themes (Amber/Dark/Light) toggle works
- Test the 3D hero (WebGL) loads
- Click through all 3 case studies
- Test the contact and newsletter forms through Formspree
- Test CMS at `/crm.html` (requires GitHub PAT — see below)

---

## Required Post-Deploy Configuration

### 1. Contact and Newsletter Forms (Formspree)

The forms are configured with separate Formspree endpoints:

1. Newsletter: `https://formspree.io/f/xgaengoz`
2. Contact: `https://formspree.io/f/xjyvankq`
3. Submit a test from the live site and verify each submission in the matching Formspree dashboard.

### 2. CMS GitHub token

The CMS (`/crm.html`) writes to `content.json` via the GitHub API. It needs a **fine-grained Personal Access Token**, supplied at runtime — there is nothing to commit:

1. Go to https://github.com/settings/tokens?type=beta
2. Click **Generate new token (fine-grained)**
3. Token name: `Hardik-webpage CMS`
4. Expiration: 90 days (or 1 year)
5. Resource owner: `Hardik250601`
6. Repository access: **Only select repositories** → `Hardik-webpage`
7. Permissions → **Contents: Read and write**
8. Click **Generate token**
9. Copy the token
10. Open `.../crm.html` and paste it into the **Connect to GitHub** bar at the top of the page

The token is held in `sessionStorage` for that tab only and is cleared when the tab closes.

**Security note:** Do not paste the token into a committed file. An earlier version of this repo did exactly that, which exposed repo write access to every visitor of `/crm.html`. For a stronger model, move the GitHub API calls behind GitHub OAuth plus a Cloudflare Worker / Netlify Function (see the "CMS security" section of `README.md`).

### 3. Brevo notifications

The `Notify Brevo subscribers` workflow sends a campaign when a new project or blog slug is added to `content.json`. Configure these GitHub Actions secrets before adding new content:

- `BREVO_API_KEY`: Brevo API key
- `BREVO_LIST_ID`: `3`

The sender email `hmdarji921@gmail.com` must be verified in Brevo.

---

## Optional: Custom Domain

1. Buy a domain (e.g., `hardikdarji.dev`)
2. Vercel project → **Settings → Domains** → add the domain
3. Configure DNS at your registrar, using the values Vercel shows:
   - Type: `CNAME`
   - Name: `@` (apex) or `www`
   - Value: `cname.vercel-dns.com`
4. Wait for DNS verification (up to 24h); Vercel then issues the TLS certificate
5. Update the canonical URL, Open Graph / Twitter image URLs, JSON-LD
   `url` / `image`, `robots.txt`, `sitemap.xml`, the portfolio URL in
   `hardik-darji.vcf`, and the `SITE_URL` default in
   `.github/scripts/send-brevo-update.mjs`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 404 on case study pages | Ensure `project-template.html` is in repo root (it is) |
| Styles not loading | Hard-refresh (Ctrl+Shift+R); check browser console for CSP errors |
| 3D hero blank | WebGL not supported — SVG fallback should show automatically |
| CMS "Failed to fetch" | Check PAT is valid and has Contents:write permission |
| FormSubmit activation pending | Approve the activation email sent to `hmdarji921@gmail.com`, then submit again |

---

## CI/CD (Optional but Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - uses: actions/deploy-pages@v4
```

This auto-deploys on every push to `main`.

---

## Quick Checklist Before Going Live

- [ ] Repository created and code pushed
- [ ] GitHub Pages enabled on `main` branch
- [ ] Site loads at `https://hardikdarjiportfolio.vercel.app/`
- [ ] FormSubmit activation completed after the first form submission
- [ ] GitHub PAT added to `crm-github.js`
- [ ] `.nojekyll` file present in root (it is)
- [ ] All 3 themes toggle correctly
- [ ] All 3 case studies accessible
- [ ] Contact form submits successfully
- [ ] CMS saves a test project

---

## File Structure on GitHub Pages

```
Hardik-webpage/
├── index.html
├── projects.html
├── blogs.html
├── project-template.html
├── blog-template.html
├── 404.html
├── crm.html
├── crm-*.html/js
├── styles.css
├── app.js
├── renderer.js
├── blog-renderer.js
├── data.js
├── content.json
├── manifest.json
├── hardik-darji.vcf
├── HardikDarji CV.pdf
├── favicon.svg
├── .nojekyll
├── .gitignore
├── images/
│   ├── project-telematics-hardware.svg
│   ├── project-telematics-architecture.svg
│   ├── project-telematics-dashboard.svg
│   ├── project-robot.svg
│   ├── project-robot-arch.svg
│   ├── project-garbage.svg
│   ├── project-garbage-arch.svg
│   ├── og-image.svg
│   ├── favicon.svg
│   └── placeholder-project.svg
├── PROJECT_AUDIT.md
└── DEPLOY.md
```

All paths in the codebase are **relative** — they work correctly under the subpath `/Hardik-webpage/`.