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
├── styles.css              # Small site-wide CSS
├── images/                 # Static images (and where the CMS uploads project images)
└── README.md
```

## Hosting on GitHub Pages

1. Create a new (or use existing) repository — for a personal page it should be named `<username>.github.io`. For a project page, the URL becomes `https://<username>.github.io/<repo>/`.
2. Push the contents of this folder to the `main` (or `master`) branch.
3. In the GitHub repo, go to **Settings → Pages** and set the source to **GitHub Actions**.
4. The included `.github/workflows/deploy.yml` deploys the site whenever `main` is updated.
5. Wait a minute. The site will be live.

### Path note
All links in this site are **relative** (`projects.html`, `blog-template.html?slug=...`, `images/...`). This means it works both at the root of a domain (`username.github.io/`) and under a project sub-path (`username.github.io/Hardik-webpage/`).

## CMS (content management)

The CMS lives at `crm.html`. It writes to `content.json` (and uploads images to `images/projects/...`) via the **GitHub Contents API**.

### One-time setup

1. **Generate a fine-grained GitHub PAT** (Settings → Developer settings → Personal access tokens → Fine-grained tokens).  
   - Resource owner: your account
   - Repository access: **Only select repositories** → choose the portfolio repo
   - Permissions: **Contents → Read and write**
   - Copy the token.
2. **Open `crm-github.js`** and replace `const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE';` with your token.
3. **Commit & push** the change.

### Security warning
Because the token is in a public JS file, anyone visiting `crm.html` can extract it. Mitigation:
- Use a **fine-grained PAT scoped to one repo** (not the broad `repo` scope).
- Delete / rotate the token regularly.
- If you outgrow this, move the CMS behind a small serverless function (Netlify Functions, Cloudflare Workers, etc.) that holds the secret server-side.

### Adding content
- Go to `https://<your-site>/crm.html`.
- Fill in the project or blog form and submit. The form commits directly to `content.json` on the repo. The next page load (or a hard refresh) will pick up the change.

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
      "metrics": { "duration": "3 mo", "status": "Completed" },
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
  ]
}
```

## Local development

Open `index.html` directly in a browser — the site uses `data.js` as a fallback if `content.json` can't be fetched (which is the case for `file://`). For a more accurate preview, run a tiny static server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Then visit http://localhost:8000/.

## Notes
- The contact and newsletter forms use FormSubmit's AJAX endpoint, which works with GitHub Pages and local static hosting. The first submission may require email activation from FormSubmit.
- Tailwind is loaded from a CDN for simplicity. For production, run Tailwind CLI to ship only the classes you use.

## Features

- **Real WebGL 3D hero** (Three.js): a 3D microchip sitting on a PCB with traces, solder pads, capacitors, SMD chips, resistors, and a crystal oscillator. Auto-orbits slowly, mouse parallax for interactive viewing. Falls back to a static SVG if WebGL is unavailable.
- **Three project case studies** (1 professional + 2 academic): the Ammann Data Logger & Telematics Platform (flagship), Remote-Controlled Multipurpose Robot (nRF24L01), and Smart Garbage Monitoring System (Arduino). Each has full architecture diagram, metrics, and a click-to-zoom lightbox for supportive images.
- **Initials avatar** next to the name with a slow rotating dashed ring.
- **Three theme modes** (Amber / Dark / Light) — toggleable, persisted in `localStorage`.
- **Custom animated cursor follower** (desktop only, respects reduced-motion).
- **Animated counters**, **scroll reveal**, **3D tilt on cards**, **3D rotating timeline** for experience.
- **Skill bars** with self-rated proficiency in each category.
- **Latest post / latest project** highlight cards that auto-populate from `content.json`.
- **"Now" status block** with live Ahmedabad local time + last-updated date.
- **Tools & platforms wordmark band**, **Beyond-code interests** section.
- **Open-to-work status pill** in the hero with pulsing green dot.
- **Achievements / credentials** section (4 stat cards with 3D tilt).
- **Floating back-to-top button**, **scroll progress bar** at top of page, **share-link buttons** per section, **URL hash sync** as you scroll.
- **Constellation background** + **hero particle cursor** (amber dots follow the mouse).
- **Marquee tag bar** between hero and summary.
- **vCard download** (`hardik-darji.vcf`) — recruiters can one-click add you to their address book.
- **GitHub link section** on every case study linking to your repository.
- **Full SEO**: JSON-LD `Person` schema, Open Graph, Twitter card, canonical URL, favicon, PWA manifest, robots, keywords.
- **Custom OG image** (1200×630 SVG) so the site previews nicely when shared on LinkedIn / Twitter.
- **Accessibility**: `prefers-reduced-motion` respected, focus management, ARIA labels, semantic HTML, screen-reader-friendly alt text, keyboard navigation.
- **CMS** at `/crm.html` writes directly to `content.json` via the GitHub API.
- **404 page** with the same theme.
