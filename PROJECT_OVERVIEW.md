# Portfolio Project Overview

Internal engineering notes for the Hardik Darji portfolio. The public site is a
multi-page HTML/CSS/JavaScript application hosted on Vercel. The build generates
static project and blog pages so shared links and search crawlers receive useful
HTML before JavaScript runs.

## Stack and deployment

- Frontend: HTML, CSS, and vanilla JavaScript.
- CSS: Tailwind CSS plus `styles.css`; Vercel runs `npm run build`.
- Content: Neon Postgres is the live store for projects, blog posts, and testimonials.
- Media: Vercel Blob stores uploaded public images; content records hold their URLs.
- CMS: `/crm.html` uses a short-lived, tab-local GitHub token. API writes are
  authenticated by checking the token's GitHub account against the portfolio owner.
- Static generation: committed `content.json` is the initial Neon seed and snapshot
  from which Vercel generates static entry pages, OG images, sitemap, and RSS feed.
- Newsletter: `api/subscribe.js` integrates with Buttondown when its API key is set;
  otherwise the browser form can fall back to Formspree.

## Content flow

`content.json` has `projects`, `blogs`, and `testimonials` arrays. The first
successful Neon API read creates the required tables and seeds them once from this
file. A seed marker prevents removed records from reappearing on later reads.

The public site fetches `/api/content` first and falls back to bundled content if
the database is unavailable. The CMS saves content to Neon, then commits the same
content to `content.json` through GitHub. That commit triggers Vercel's build,
which produces canonical static pages and metadata from the snapshot. If updating
GitHub fails after Neon has saved, the CMS reports that partial result; retry the
publish to refresh the deployment snapshot.

Images uploaded through the CMS are sent to `/api/media`, stored in the project's
public Blob store, and referenced by URL in content. Uploads support JPG, PNG,
WebP, GIF, and AVIF files up to 4 MB. Hand-authored static images can remain in
the repository.

## Vercel environment

Connect both Neon and Vercel Blob to Production and Preview. Neon integration
variables may be prefixed by the integration name; `lib/neon-content.js`
recognizes `Hardik_portfolio_POSTGRES_URL`, `Hardik_portfolio_DATABASE_URL`,
`DATABASE_URL`, `NEON_DATABASE_URL`, and `POSTGRES_URL`. Blob must provide
`BLOB_READ_WRITE_TOKEN`. Secrets belong in Vercel environment settings, never in
the repository. Redeploy after changing environment variables.

## CMS use

1. Create a fine-grained GitHub token scoped to this repository with Contents
   read/write permission.
2. Open `/crm.html` or start `py -3 run_cms.py` locally and connect the token.
   The Python launcher serves the same CMS board and proxies its Neon/Blob API
   calls to Vercel; it binds only to `127.0.0.1`. The token stays in this browser tab's
   session storage and is not saved in the repository or Neon.
3. Add or edit projects, blog posts, and testimonials. Use the image picker to
   upload public images to Blob. Review image alt text in blog HTML. Use the
   Preview Draft buttons before publishing; add comma-separated tags to let
   visitors filter project and blog listings. Project supporting images render
   together as a gallery on each project detail page.
4. Save. Neon updates immediately; the GitHub snapshot commit triggers a Vercel
   rebuild for static pages, social previews, RSS, and sitemap.

## Useful commands

```bash
npm install
npm run build
npm run verify
```

Build inputs and API helpers must not be excluded by `.vercelignore`. Keep
`content.json`, `data.js`, and static generated pages synchronized by running the
build when the snapshot changes.
