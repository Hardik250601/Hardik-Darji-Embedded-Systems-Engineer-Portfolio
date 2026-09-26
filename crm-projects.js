// crm-projects.js - list / delete / link to edit
(function () {
  'use strict';

  function init() {
    const list = document.getElementById('project-list');
    const status = document.getElementById('status-message');
    if (!list) return;

    load();

    // Event delegation - no inline onclick, so no XSS via slug.
    list.addEventListener('click', async (event) => {
      const target = event.target;
      if (target.matches('.edit-btn')) {
        const slug = target.dataset.slug;
        window.location.href = `crm-edit-project.html?slug=${encodeURIComponent(slug)}`;
      } else if (target.matches('.delete-btn')) {
        const slug = target.dataset.slug;
        if (!slug) return;
        if (!confirm(`Delete project "${slug}"? This cannot be undone.`)) return;
        try {
          window.crmGit.showMessage(status, 'Deleting project...', 'bg-yellow-500');
          const { content, sha } = await window.crmGit.loadContent();
          content.projects = (content.projects || []).filter(p => p.slug !== slug);
          await window.crmGit.saveContent(content, sha, `CMS: Delete project - ${slug}`);
          window.crmGit.showMessage(status, 'Project deleted successfully!', 'bg-green-500');
          load();
        } catch (error) {
          window.crmGit.showMessage(status, `Error deleting project: ${error.message}`, 'bg-red-500');
        }
      }
    });
  }

  async function load() {
    const list = document.getElementById('project-list');
    const status = document.getElementById('status-message');
    const esc = window.crmGit.esc;
    try {
      const { content, missing } = await window.crmGit.loadContent();
      if (missing) {
        list.innerHTML = '<p class="text-gray-400">content.json is missing. Add a project from the dashboard to create it.</p>';
        return;
      }
      const projects = content.projects || [];
      if (projects.length === 0) {
        list.innerHTML = '<p class="text-gray-400">No projects yet. Add one from the dashboard.</p>';
        return;
      }
      list.innerHTML = projects.map(p => `
        <div class="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
          <div>
            <h3 class="text-xl font-bold">${esc(p.title)}</h3>
            <p class="text-sm text-gray-400">${esc(p.slug)}</p>
          </div>
          <div class="space-x-2">
            <button data-slug="${esc(p.slug)}" class="edit-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Edit</button>
            <button data-slug="${esc(p.slug)}" class="delete-btn bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      window.crmGit.showMessage(status, `Error loading projects: ${error.message}`, 'bg-red-500');
      console.error(error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
