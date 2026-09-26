# FINAL GO-LIVE CHECKLIST — One Document, Exact Steps

**Target:** `https://hardikmdarji.work.gd/`
**Repo:** `https://github.com/Hardikdarji921/Hardik-webpage`

---

## ✅ FILES TO EDIT (3 files, 4 changes total)

### 1. `index.html` — Fix Contact Form (2 changes)

**File:** `C:\Users\AINHMD\OneDrive - Ammann Group\Desktop\all MY project data\Hardik Webpage\index.html`

| Line | Find | Replace With |
|------|------|--------------|
| ~843 | `<form name="contact" method="POST" data-netlify="true" action="/?form-success=true" class="space-y-5">` | `<form name="contact" method="POST" action="https://formspree.io/f/YOUR_FORMSPREE_ID" class="space-y-5">` |
| ~844 | `<p class="hidden"><label>Don't fill this out: <input name="bot-field"></label></p>` | `<input type="text" name="_gotcha" style="display:none">` (add after line 843) |
| ~919 | `<form id="newsletter-form" name="newsletter" method="POST" data-netlify="true" action="/?form-success=true" class="space-y-2">` | `<form id="newsletter-form" name="newsletter" method="POST" action="https://formspree.io/f/YOUR_FORMSPREE_ID" class="space-y-2">` |
| ~920 | (after opening form tag) | `<input type="text" name="_gotcha" style="display:none">` (add after line 919) |

> **Get YOUR_FORMSPREE_ID:** Sign up at https://formspree.io → Create form → Copy ID (looks like `x123abcd`)

---

### 2. `crm-github.js` — Add GitHub PAT (1 change)

**File:** `C:\Users\AINHMD\OneDrive - Ammann Group\Desktop\all MY project data\Hardik Webpage\crm-github.js`

| Line | Find | Replace With |
|------|------|--------------|
| 20 | `const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE';` | `const GITHUB_TOKEN = 'ghp_YOUR_ACTUAL_TOKEN_HERE';` |

> **Get token:** https://github.com/settings/tokens?type=beta → Generate new token (fine-grained) → Repo: `Hardik-webpage` → Contents: Read & write → Copy token (starts with `ghp_`)

---

### 3. Create `CNAME` file (1 new file)

**File:** `C:\Users\AINHMD\OneDrive - Ammann Group\Desktop\all MY project data\Hardik Webpage\CNAME` (create new)

**Content:**
```
hardikmdarji.work.gd
```

---

## ✅ COMMANDS TO RUN (in PowerShell, in order)

```powershell
# 1. Open project folder
cd "C:\Users\AINHMD\OneDrive - Ammann Group\Desktop\all MY project data\Hardik Webpage"

# 2. Initialize git (if not already)
git init

# 3. Add all files (including new CNAME)
git add .

# 4. Commit
git commit -m "Go-live: Formspree forms, GitHub PAT, custom domain CNAME"

# 5. Set main branch
git branch -M main

# 6. Connect to GitHub (run ONCE)
git remote add origin https://github.com/Hardikdarji921/Hardik-webpage.git

# 7. Push
git push -u origin main
```

---

## ✅ GITHUB SETTINGS (3 clicks)

1. Open: https://github.com/Hardikdarji921/Hardik-webpage
2. **Settings** → **Pages** (left sidebar)
3. **Source:** "Deploy from a branch"
4. **Branch:** `main` / `/(root)` → **Save**
5. **Custom domain:** `hardikmdarji.work.gd` → **Save**
6. Wait for "DNS check passed" → **Enable Enforce HTTPS**

---

## ✅ DNS SETTINGS (at your DNS provider — work.gd)

| Type | Host/Name | Value/Target |
|------|-----------|--------------|
| **CNAME** | `@` | `hardikdarji921.github.io` |

> If `@` not allowed, use `hardikmdarji` as Host/Name

---

## ✅ VERIFY (after DNS propagates ~5-30 min)

| Test | URL | Expected |
|------|-----|----------|
| Home | `https://hardikmdarji.work.gd/` | Loads, 3D hero works |
| Projects | `https://hardikmdarji.work.gd/projects.html` | 3 cards visible |
| Case study | `https://hardikmdarji.work.gd/project-template.html?slug=ammann-data-logger-telematics` | Full case study |
| Contact form | Submit test message | Formspree email received |
| Newsletter | Submit test email | Formspree email received |
| CMS | `https://hardikmdarji.work.gd/crm.html` | Can add project |
| Themes | Toggle Amber/Dark/Light | All 3 work |
| Mobile | Resize browser | Responsive |

---

## 📋 QUICK COPY-PASTE SUMMARY

**Run this entire block in PowerShell:**

```powershell
cd "C:\Users\AINHMD\OneDrive - Ammann Group\Desktop\all MY project data\Hardik Webpage"
echo "hardikmdarji.work.gd" > CNAME
git init
git add .
git commit -m "Go-live: Formspree forms, GitHub PAT, custom domain CNAME"
git branch -M main
git remote add origin https://github.com/Hardikdarji921/Hardik-webpage.git
git push -u origin main
```

**Then edit these 2 files manually:**
1. `index.html` — Lines ~843, ~844, ~919, ~920 (replace Formspree ID)
2. `crm-github.js` — Line 20 (replace PAT)

**Then push again:**
```powershell
git add .; git commit -m "Formspree ID + PAT"; git push
```

**Then GitHub Settings → Pages → Custom domain: `hardikmdarji.work.gd` → Save → Enforce HTTPS**

**Then DNS: CNAME @ → hardikdarji921.github.io**

---

## ⚠️ DO NOT FORGET

- [ ] Formspree ID in `index.html` (2 forms)
- [ ] GitHub PAT in `crm-github.js:20`
- [ ] `CNAME` file committed
- [ ] GitHub Pages custom domain set
- [ ] DNS CNAME record added
- [ ] Enforce HTTPS enabled

---

**Done.** Site lives at `https://hardikmdarji.work.gd/`