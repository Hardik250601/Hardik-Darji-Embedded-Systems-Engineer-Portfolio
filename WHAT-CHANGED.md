# What Changed, What You Need To Do, And How The New Features Work

**Branch:** `fix/portfolio-audit-and-cms-overhaul`
**Date:** 2 October 2026

Everything in this branch is verified working (see *How this was tested* at the
bottom). Nothing here has been pushed or merged yet.

---

## Part 1 — What was broken, and what I fixed

### 1. Newsletter links were all dead — FIXED

`.github/scripts/send-brevo-update.mjs` hardcoded the GitHub user
`hardik250601`, but your account is `Hardikdarji921`. **Every "Read more" link
in every subscriber email returned 404.**

Now it uses a single `SITE_URL` constant (overridable by a workflow variable)
that matches the canonical URL in `index.html`.

### 2. Two case studies showed four blank cards — FIXED

`renderer.js` only knew four metric keys (`cost_reduction`,
`first_year_saving_inr`, `hardware_bom_inr`, `annual_spend_inr`). Your robot and
garbage-bin projects use completely different keys, so those pages rendered four
empty cards labelled *Cost reduction*, *Hardware BOM* etc.

Now **any** key/value pair in `metrics` renders. There is a label map for the
common ones, and unknown keys are prettified automatically. Short values render
as large stats; longer text renders smaller so it doesn't overflow. If a project
has no metrics at all, the strip hides itself.

All three case studies now show 6 populated cards.

### 3. The CMS would have handed your repo to any visitor — FIXED

This was the most serious issue. `README.md`, `DEPLOY.md`, `GO-LIVE.md` and
`FINAL-GO-LIVE.md` all instructed you to paste a live GitHub PAT into
`crm-github.js` and **commit it**. That publishes a write credential for your
repository to every visitor of `/crm.html`. It also contradicted your own
`.github/copilot-instructions.md`.

There is now **no token constant anywhere in the source**. See Part 4.

### 4. Your internal notes were published on a public URL — FIXED

`deploy.yml` uploaded the entire repository (`path: .`), so `/FINAL-GO-LIVE.md`
was live and contained
`C:\Users\AINHMD\OneDrive - Ammann Group\Desktop\...` — your Windows username
and your employer's name.

The deploy workflow now deletes the internal docs and the unused 2.7 MB profile
photo before uploading.

### 5. Social preview images never showed — FIXED

`og:image` pointed at an SVG. LinkedIn, X/Twitter and Facebook refuse to render
SVG, so shared links had no preview image.

`images/og-image.png` (1200×630) is now generated and both the Open Graph and
Twitter tags point at it.

### 6. A failed animation could take down the whole homepage — FIXED

`app.js` initialised every feature in one long chain with no error handling. If
`getContext('2d')` returned `null` — which happens in privacy modes and hardened
browsers — the constellation background threw, and **every feature after it
never initialised**: the latest-post cards, animated counters and scroll-reveal
animations all died silently.

Each initialiser is now isolated in its own `try/catch`, and both canvas setups
guard against a null context.

### 7. Editing a post could silently break its URL — FIXED

`crm-edit-project.js` and `crm-edit-blog.js` regenerated the slug from the title
on every save. Rename a project and its page URL changes without warning, and
every link you've shared breaks.

**Slugs are now read-only in the editor.** They can only be changed by editing
`content.json` deliberately.

### 8. The edit pages couldn't edit most of a project — FIXED

The edit pages only handled 5 fields. Metrics, tech stack, case study and images
were unreachable — you had to delete and re-create a project to change them.

Both editors now cover the **full schema**, matching the Add form.

### 9. Reading content required a token that wasn't needed — FIXED

`getFile()` demanded a token even for reads. But `content.json` is in a **public**
repository, so GitHub serves it with no authentication at all.

This meant *Manage Projects*, *Manage Blogs* and both edit pages were completely
unusable until you pasted a token — for no security benefit.

Now **reading works with no token** (read-only). Only publishing requires one.

### 10. Base64 decoding was fragile — FIXED

The GitHub API returns file contents as base64 **wrapped at 60 characters**.
The old decoder relied on the browser's `atob()` tolerating that whitespace,
which is not guaranteed outside forgiving browsers — it threw
`InvalidCharacterError`. Whitespace is now stripped before decoding.

### 11. The blog section was empty — FIXED

`content.json` had `blogs: []`, so `blogs.html`, the homepage "Latest post" card
and the footer list were all empty. Five full posts are now written (Part 3).

---

## Part 2 — What I deliberately did **not** do

| Thing | Why |
|---|---|
| Commit a token anywhere | The core bug. Never again. |
| Publish placeholder blog posts | `data.js` shipped 5 posts whose body read *"This is a placeholder post."* Publishing those to a job-seeking portfolio is worse than an empty section. |
| Add a Tailwind build step | Your `.github/copilot-instructions.md` forbids introducing a build step without reason, and it would change how the site deploys. Worth doing, but as its own decision. |
| Change your CV filename | It contains a space (`HardikDarji CV.pdf`). It works, but spaces break some email clients and link scrapers. Your call — see Part 3. |

---

## Part 3 — ⚠️ What **you** need to do

### Required before the CMS works

1. **Create a fine-grained token** —
   <https://github.com/settings/tokens?type=beta>
   - Resource owner: your account
   - Repository access: **Only select repositories** → `Hardik-webpage`
   - Permissions: **Contents → Read and write**
   - Shortest expiry that works

2. **Paste it into the "Connect to GitHub" bar** at the top of `/crm.html`.
   Nothing is committed. It lives in that browser tab only.

### Required before newsletters work

3. **Set two GitHub Actions secrets** (Settings → Secrets and variables →
   Actions):
   - `BREVO_API_KEY`
   - `BREVO_LIST_ID`

   Until then that workflow shows a red X. **Harmless** — it does not block the
   Pages deploy.

   ⚠️ **Once these are set, every CMS publish sends a real email to your whole
   subscriber list.** While you are still iterating, either leave the secret
   unset or edit `content.json` directly and push.

### Recommended

4. **Read the five blog posts before they go live.** I wrote them in your voice
   using the technologies already in your portfolio, but I have no access to
   your actual experience on those specific topics. They are technically sound
   drafts about your field — not your field notes.

5. **Optional — rename the CV.** `HardikDarji CV.pdf` → `hardik-darji-cv.pdf`
   (5 references across `index.html` and `blogs.html`). Spaces in filenames
   break some email clients.

6. **Optional — custom domain.** See section 6 of `GO-LIVE.md`. If you add one,
   update the canonical URL, OG tags, `robots.txt` and `sitemap.xml` too — they
   all hardcode the current address.

### To merge this branch

```bash
git checkout main
git merge fix/portfolio-audit-and-cms-overhaul
git push
```
The Pages deploy triggers automatically on push to `main`.

---

## Part 4 — How the new features work

### The Connect to GitHub bar

Appears automatically at the top of every CMS page.

- **How it works:** the token is stored in `sessionStorage`, scoped to that one
  browser tab, and discarded when the tab closes. It is never written to the
  repository.
- **Read vs write:** browsing your existing content needs **no token** at all
  (the repo is public). Only publishing requires one. If you submit without a
  token you get a clear "Not connected" message rather than an error.
- **Long term:** the CMS code is isolated behind `window.crmGit`
  (`getFile` / `updateFile`). Swapping to GitHub OAuth + a small serverless
  proxy that holds the credential server-side is a contained change.

### Add Project / Add Blog Post (`/crm.html`)

Two tabs, one page.

- **Slug** auto-generates from the title as you type. Set it *before* adding
  images — image paths are built from the slug.
- **Metrics** — click **+ Add metric** per row. Any key works.
- **Case Study** — Outcomes and Roadmap are one item per line.
- **Re-adding the same slug replaces** the entry instead of creating a duplicate.
- **Publishing commits to `content.json`**, which triggers the Pages rebuild
  (allow 1–2 minutes) and the Brevo workflow.

### Edit Project / Edit Blog Post

Reached from *Manage Projects* / *Manage Blogs*.

- Covers the **full schema** — metrics, tech stack, case study, all links.
- **Images:** existing ones are kept. You can optionally replace the main image
  or append more supportive images.
- **Slug is read-only**, so editing can never move a published page.

### What happens when you publish

```
CMS publish
   └─> commit content.json to main
         ├─> Deploy to GitHub Pages   (live in ~1-2 min)
         └─> Brevo campaign email     (only if secrets are set)
```

---

## Part 5 — New files

| File | Purpose |
|---|---|
| `images/og-image.png` | 1200×630 social preview (PNG, because platforms ignore SVG) |
| `robots.txt` | Allows crawling; disallows the CMS pages |
| `sitemap.xml` | All 11 public URLs (3 projects, 5 blogs, 3 pages) |
| `WHAT-CHANGED.md` | This document |

`images/og-image.svg` remains the editable source. To re-render after editing
it, see section 2 of `FINAL-GO-LIVE.md` — **and read the font warning there**;
without Inter installed, the text vanishes from the PNG silently.

---

## How this was tested

Not just by reading the code. Every page was loaded in a real DOM with its
scripts executed, against the real `content.json`, with the GitHub Contents API
emulated faithfully (absolute URLs, line-wrapped base64):

- **32/32 checks pass**, no runtime errors
- Homepage cards, all 5 blog posts, all 3 case studies, unknown-slug handling
- CMS: connect bar, tabs, live slug preview, char counters, metric rows,
  both editors loading full data, writes correctly blocked without a token,
  slug surviving a retitle
- Null-canvas regression test for the `app.js` fix
- Preview server confirmed serving every page and asset with **no redirects**

All 11 JavaScript files pass `node --check`.

**Not verified:** live GitHub publishing (needs your token), the Brevo send, and
visual rendering — fonts, the Three.js hero and the WebGL fallback need a real
browser. Give the preview a click-through before you merge.