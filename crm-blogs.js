// crm-blogs.js - list / delete / link to edit
(function () {
  'use strict';

  function init() {
    const list = document.getElementById('blog-list');
    const status = document.getElementById('status-message');
    if (!list) return;

    load();

    list.addEventListener('click', async (event) => {
      const target = event.target;
      if (target.matches('.edit-btn')) {
        const slug = target.dataset.slug;
        window.location.href = `crm-edit-blog.html?slug=${encodeURIComponent(slug)}`;
      } else if (target.matches('.delete-btn')) {
        const slug = target.dataset.slug;
        if (!slug) return;
        if (!confirm(`Delete blog post "${slug}"?`)) return;
        try {
          window.crmGit.showMessage(status, 'Deleting blog post...', 'bg-yellow-500');
          const { content, sha } = await window.crmGit.loadContent();
          content.blogs = (content.blogs || []).filter(b => b.slug !== slug);
          await window.crmGit.saveContent(content, sha, `CMS: Delete blog - ${slug}`);
          window.crmGit.showMessage(status, 'Blog post deleted successfully!', 'bg-green-500');
          load();
        } catch (error) {
          window.crmGit.showMessage(status, `Error deleting blog post: ${error.message}`, 'bg-red-500');
        }
      }
    });
  }

  async function load() {
    const list = document.getElementById('blog-list');
    const status = document.getElementById('status-message');
    const esc = window.crmGit.esc;
    try {
      const { content, missing } = await window.crmGit.loadContent();
      if (missing) {
        list.innerHTML = '<p class="text-gray-400">content.json is missing. Add a blog post from the dashboard to create it.</p>';
        return;
      }
      const blogs = content.blogs || [];
      if (blogs.length === 0) {
        list.innerHTML = '<p class="text-gray-400">No blog posts yet. Add one from the dashboard.</p>';
        return;
      }
      list.innerHTML = blogs.map(b => `
        <div class="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
          <div>
            <h3 class="text-xl font-bold">${esc(b.title)}</h3>
            <p class="text-sm text-gray-400">${esc(b.date || '')}</p>
          </div>
          <div class="space-x-2">
            <button data-slug="${esc(b.slug)}" class="edit-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Edit</button>
            <button data-slug="${esc(b.slug)}" class="delete-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      window.crmGit.showMessage(status, `Error loading blogs: ${error.message}`, 'bg-red-500');
      console.error(error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
