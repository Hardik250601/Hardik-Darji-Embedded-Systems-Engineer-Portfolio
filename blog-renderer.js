// blog-renderer.js - hydrates blog-template.html from content.json
// Note: blog content from content.json is treated as HTML (CMS allows it).
// Only admins with the GitHub token can publish, so we keep the innerHTML behavior,
// but we still render title/date via textContent to be safe.
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  // Generated per-post pages (blog-<slug>.html) carry the slug on <body>, because
  // social crawlers read those files directly and cannot run JavaScript.
  const blogSlug = params.get('slug') || document.body.dataset.slug;

  const main = document.querySelector('main');
  if (!blogSlug) {
    main.innerHTML = '<h1 class="text-center text-red-400 mt-12">No blog post specified.</h1>';
    return;
  }

  let data;
  try {
    data = await window.app.loadContent();
  } catch (e) {
    main.innerHTML = '<h1 class="text-center text-red-400 mt-12">Could not load blog post.</h1>';
    return;
  }

  const blog = (data.blogs || []).find(b => b.slug === blogSlug);
  if (!blog) {
    main.innerHTML = '<h1 class="text-center text-red-400 mt-12">Blog post not found.</h1>';
    return;
  }

  document.title = `${blog.title} - Hardik Darji`;

  const titleEl = document.getElementById('blog-title');
  const dateEl = document.getElementById('blog-date');
  const contentEl = document.getElementById('blog-content');

  if (titleEl) titleEl.textContent = blog.title;
  if (dateEl) dateEl.textContent = `Posted on ${window.app.formatDate(blog.date)}`;
  if (contentEl) contentEl.innerHTML = blog.content || '<p>No content.</p>';
});
