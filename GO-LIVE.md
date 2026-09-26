# GO-LIVE Quick Reference

**Target URL:** `https://hardikdarji921.github.io/Hardik-webpage/`

---

## 1. Push to GitHub (run in PowerShell)

```powershell
cd "C:\Users\AINHMD\OneDrive - Ammann Group\Desktop\all MY project data\Hardik Webpage"
git init
git add .
git commit -m "Initial commit: portfolio ready for GitHub Pages"
git branch -M main
git remote add origin https://github.com/Hardikdarji921/Hardik-webpage.git
git push -u origin main
```

---

## 2. Enable GitHub Pages

1. Open: https://github.com/Hardikdarji921/Hardik-webpage
2. **Settings** → **Pages** (left sidebar)
3. Source: **GitHub Actions**
4. Push to `main` and open the **Actions** tab
5. Wait for **Deploy to GitHub Pages** to complete, then open the published URL

---

## 3. Fix Contact Form (Formspree)

**Current issue:** Forms use `data-netlify="true"` — broken on GitHub Pages.

**Fix (2 min):**
1. Sign up at https://formspree.io (free)
2. Create form → copy ID (e.g., `x123abcd`)
3. Edit `index.html`, replace **both** form `action` attributes:
   ```html
   <!-- Line ~843 (contact form) -->
   <form action="https://formspree.io/f/x123abcd" method="POST">
   
   <!-- Line ~919 (newsletter) -->
   <form action="https://formspree.io/f/x123abcd" method="POST">
   ```
4. Add honeypot inside each form:
   ```html
   <input type="text" name="_gotcha" style="display:none">
   ```
5. `git add . && git commit -m "Fix forms for GitHub Pages" && git push`

---

## 4. Enable CMS (GitHub PAT)

**Current issue:** `crm-github.js` has placeholder token.

**Fix (3 min):**
1. Go to: https://github.com/settings/tokens?type=beta
2. **Generate new token (fine-grained)**
3. Name: `Hardik-webpage CMS`
4. Repo: **Only select repositories** → `Hardik-webpage`
5. Permissions → **Contents: Read and write**
6. **Generate token** → copy it
7. Edit `crm-github.js` line 20:
   ```js
   const GITHUB_TOKEN = 'ghp_YOUR_COPIED_TOKEN_HERE';
   ```
8. `git add . && git commit -m "Add CMS GitHub PAT" && git push`

---

## 5. Verify

| Test | URL |
|------|-----|
| Homepage | `https://hardikdarji921.github.io/Hardik-webpage/` |
| Projects | `.../projects.html` |
| Case study | `.../project-template.html?slug=ammann-data-logger-telematics` |
| CMS | `.../crm.html` |
| Contact form | Submit test message |
| All 3 themes | Toggle in navbar |

---

## 6. Optional: Custom Domain

1. Buy domain (e.g., `hardikdarji.dev`)
2. Repo **Settings → Pages → Custom domain** → enter domain
3. Add `CNAME` file to repo root:
   ```
   hardikdarji.dev
   ```
4. DNS at registrar: `CNAME @ hardikdarji921.github.io`
5. Enable **Enforce HTTPS** in Pages settings

---

## Files That Must Exist in Repo Root

- `.nojekyll` (0 bytes — already present)
- `index.html`
- `project-template.html`
- `styles.css`
- `app.js`
- `renderer.js`
- `content.json`
- `images/` folder with 9 SVGs

---

## One-Command Deploy (after initial setup)

```powershell
git add .; git commit -m "Update"; git push
```

GitHub Pages auto-rebuilds on every push to `main`.

---

## Need Help?

- Full guide: `DEPLOY.md`
- Issues audit: `PROJECT_AUDIT.md`
- CMS security: Move PAT to Cloudflare Worker (see `PROJECT_AUDIT.md` Phase 3)