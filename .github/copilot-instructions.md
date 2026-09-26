# Repository Instructions

## Project shape

- This is a static portfolio site: HTML, CSS, and browser JavaScript.
- Do not introduce a build step or framework unless the task explicitly requires it.
- `content.json` is the source of truth for projects and blog posts; `data.js` provides the offline fallback.
- Keep URLs and asset paths relative so the site works at both a domain root and a GitHub Pages project path.
- The `crm*.html` and `crm*.js` files form the browser-based CMS and use the GitHub Contents API.

## Development and validation

- Preview locally with `python -m http.server 8000`, then open `http://localhost:8000/`.
- For content or template changes, check the homepage, project listing/detail pages, blog listing/detail pages, and the CMS pages in a browser.
- Preserve accessibility behavior already present, including semantic markup, ARIA labels, keyboard access, and reduced-motion handling.
- Keep changes focused and preserve the existing visual language and relative-link structure.
- Do not commit secrets. In particular, never add a real GitHub token to `crm-github.js` or any other client-side file.

## Editing conventions

- Prefer small, local edits that match the surrounding vanilla JavaScript and CSS style.
- Avoid unrelated formatting or generated-file churn.
- When changing `content.json`, preserve its schema and validate that it remains valid JSON.
