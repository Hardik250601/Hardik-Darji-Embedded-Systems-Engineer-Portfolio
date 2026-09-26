// crm-edit-project.js
(function () {
  'use strict';

  let currentSlug = null;

  function init() {
    const form = document.getElementById('project-form');
    const status = document.getElementById('status-message');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    currentSlug = params.get('slug');
    if (!currentSlug) {
      window.crmGit.showMessage(status, 'No project specified!', 'bg-red-500');
      form.innerHTML = '';
      return;
    }
    load(form, status);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!currentSlug) return;
      window.crmGit.showMessage(status, 'Saving changes...', 'bg-yellow-500');
      try {
        const { content, sha } = await window.crmGit.loadContent();
        const idx = (content.projects || []).findIndex(p => p.slug === currentSlug);
        if (idx === -1) throw new Error('Could not find project to update.');

        const newTitle = document.getElementById('project-title').value;
        const newSlug = newTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        content.projects[idx] = {
          ...content.projects[idx],
          title: newTitle,
          slug: newSlug,
          short_summary: document.getElementById('project-short-summary').value,
          full_description: document.getElementById('project-description').value,
          github_link: document.getElementById('project-github').value,
          linkedin_link: document.getElementById('project-linkedin').value,
        };

        await window.crmGit.saveContent(content, sha, `CMS: Update project - ${newTitle}`);
        window.crmGit.showMessage(status, 'Project updated successfully!', 'bg-green-500');
        window.history.replaceState({}, '', `crm-edit-project.html?slug=${encodeURIComponent(newSlug)}`);
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
      const project = (content.projects || []).find(p => p.slug === currentSlug);
      if (!project) {
        window.crmGit.showMessage(status, 'Project not found!', 'bg-red-500');
        form.innerHTML = '';
        return;
      }
      form.innerHTML = `
        <div>
          <label for="project-title" class="block mb-1 text-sm font-medium text-gray-400">Project Name</label>
          <input type="text" id="project-title" class="w-full bg-gray-700 p-2 rounded" value="${esc(project.title)}" required>
        </div>
        <div>
          <label for="project-short-summary" class="block mb-1 text-sm font-medium text-gray-400">Short Summary</label>
          <textarea id="project-short-summary" class="w-full bg-gray-700 p-2 rounded h-20" required>${esc(project.short_summary || '')}</textarea>
        </div>
        <div>
          <label for="project-description" class="block mb-1 text-sm font-medium text-gray-400">Full Description</label>
          <textarea id="project-description" class="w-full bg-gray-700 p-2 rounded h-40" required>${esc(project.full_description || '')}</textarea>
        </div>
        <div>
          <label for="project-github" class="block mb-1 text-sm font-medium text-gray-400">GitHub Link</label>
          <input type="text" id="project-github" class="w-full bg-gray-700 p-2 rounded" value="${esc(project.github_link || '')}" required>
        </div>
        <div>
          <label for="project-linkedin" class="block mb-1 text-sm font-medium text-gray-400">LinkedIn Link (optional)</label>
          <input type="text" id="project-linkedin" class="w-full bg-gray-700 p-2 rounded" value="${esc(project.linkedin_link || '')}">
        </div>
        <p class="text-sm text-gray-400">Note: Image re-upload isn't supported here. To change images, re-create the project from the dashboard.</p>
        <button type="submit" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">Save Changes</button>
      `;
    } catch (error) {
      window.crmGit.showMessage(status, `Error loading project: ${error.message}`, 'bg-red-500');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
