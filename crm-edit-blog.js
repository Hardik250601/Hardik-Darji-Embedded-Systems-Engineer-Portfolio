// crm-edit-blog.js
(function () {
  'use strict';

  let currentSlug = null;

  function init() {
    const form = document.getElementById('blog-form');
    const status = document.getElementById('status-message');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    currentSlug = params.get('slug');
    if (!currentSlug) {
      window.crmGit.showMessage(status, 'No blog post specified!', 'bg-red-500');
      return;
    }
    load(form, status);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!currentSlug) return;
      window.crmGit.showMessage(status, 'Saving changes...', 'bg-yellow-500');
      try {
        const { content, sha } = await window.crmGit.loadContent();
        const idx = (content.blogs || []).findIndex(b => b.slug === currentSlug);
        if (idx === -1) throw new Error('Could not find blog post to update.');

        const newTitle = document.getElementById('blog-title').value;
        const newSlug = newTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        content.blogs[idx] = {
          slug: newSlug,
          title: newTitle,
          date: document.getElementById('blog-date').value,
          short_description: document.getElementById('blog-short-summary').value,
          content: document.getElementById('blog-content').value,
        };

        await window.crmGit.saveContent(content, sha, `CMS: Update blog - ${newTitle}`);
        window.crmGit.showMessage(status, 'Blog post updated successfully!', 'bg-green-500');
        window.history.replaceState({}, '', `crm-edit-blog.html?slug=${encodeURIComponent(newSlug)}`);
        currentSlug = newSlug;
      } catch (error) {
        window.crmGit.showMessage(status, `Error saving changes: ${error.message}`, 'bg-red-500');
      }
    });
  }

  async function load(form, status) {
    const esc = window.crmGit.esc;
    try {
      const { content } = await window.crmGit.loadContent();
      const blog = (content.blogs || []).find(b => b.slug === currentSlug);
      if (!blog) {
        window.crmGit.showMessage(status, 'Blog post not found!', 'bg-red-500');
        return;
      }
      form.innerHTML = `
        <div>
          <label for="blog-title" class="block mb-1 text-sm font-medium text-gray-400">Blog Title</label>
          <input type="text" id="blog-title" class="w-full bg-gray-700 p-2 rounded" value="${esc(blog.title)}" required>
        </div>
        <div>
          <label for="blog-date" class="block mb-1 text-sm font-medium text-gray-400">Date (e.g., October 28, 2025)</label>
          <input type="text" id="blog-date" class="w-full bg-gray-700 p-2 rounded" value="${esc(blog.date || '')}" required>
        </div>
        <div>
          <label for="blog-short-summary" class="block mb-1 text-sm font-medium text-gray-400">Short Summary (for list pages)</label>
          <textarea id="blog-short-summary" class="w-full bg-gray-700 p-2 rounded h-24" required>${esc(blog.short_description || '')}</textarea>
        </div>
        <div>
          <label for="blog-content" class="block mb-1 text-sm font-medium text-gray-400">Full Blog Content (supports HTML tags)</label>
          <textarea id="blog-content" class="w-full bg-gray-700 p-2 rounded h-64" required>${esc(blog.content || '')}</textarea>
        </div>
        <button type="submit" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">Save Changes</button>
      `;
    } catch (error) {
      window.crmGit.showMessage(status, `Error loading blog: ${error.message}`, 'bg-red-500');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
