// crm.js - Add new project / blog post handlers.
(function () {
  'use strict';

  function init() {
    const projectForm = document.getElementById('project-form');
    const blogForm = document.getElementById('blog-form');
    const status = document.getElementById('status-message');
    if (!projectForm || !blogForm) return;

    // --- Project form ---
    projectForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      window.crmGit.showMessage(status, 'Publishing project...', 'bg-yellow-500');

      try {
        const projectTitle = document.getElementById('project-title').value;
        const projectSlug = projectTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        let mainImagePath = '';
        let supportiveImagePaths = [];

        const mainImageFile = document.getElementById('project-main-image').files[0];
        if (mainImageFile) {
          mainImagePath = await uploadFile(mainImageFile, projectSlug, 'main');
        }
        const supportiveImageFiles = document.getElementById('project-supportive-images').files;
        for (let i = 0; i < supportiveImageFiles.length; i++) {
          supportiveImagePaths.push(await uploadFile(supportiveImageFiles[i], projectSlug, `support-${i + 1}`));
        }

        const { content, sha } = await window.crmGit.loadContent();
        if (!content.projects) content.projects = [];

        content.projects.unshift({
          slug: projectSlug,
          title: projectTitle,
          short_summary: document.getElementById('project-short-summary').value,
          full_description: document.getElementById('project-description').value,
          main_image: mainImagePath,
          supportive_images: supportiveImagePaths,
          github_link: document.getElementById('project-github').value,
          github_blurb: 'Source code and schematics for this project — see my GitHub for embedded firmware examples.',
          linkedin_link: document.getElementById('project-linkedin').value
        });

        await window.crmGit.saveContent(content, sha, `CMS: Add project - ${projectTitle}`);
        window.crmGit.showMessage(status, 'Project published successfully!', 'bg-green-500');
        projectForm.reset();
      } catch (error) {
        window.crmGit.showMessage(status, `Error: ${error.message}. Check console.`, 'bg-red-500');
      }
    });

    // --- Blog form ---
    blogForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      window.crmGit.showMessage(status, 'Publishing blog post...', 'bg-yellow-500');

      try {
        const blogTitle = document.getElementById('blog-title').value;
        const blogSlug = blogTitle.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const { content, sha } = await window.crmGit.loadContent();
        if (!content.blogs) content.blogs = [];

        content.blogs.unshift({
          slug: blogSlug,
          title: blogTitle,
          date: document.getElementById('blog-date').value,
          short_description: document.getElementById('blog-short-summary').value,
          content: document.getElementById('blog-content').value,
        });

        await window.crmGit.saveContent(content, sha, `CMS: Add blog - ${blogTitle}`);
        window.crmGit.showMessage(status, 'Blog post published successfully!', 'bg-green-500');
        blogForm.reset();
      } catch (error) {
        window.crmGit.showMessage(status, `Error: ${error.message}. Check console.`, 'bg-red-500');
      }
    });
  }

  async function uploadFile(file, slug, fileNameBase) {
    const fileExtension = file.name.split('.').pop();
    const filePath = `images/projects/${slug}/${fileNameBase}.${fileExtension}`;
    const fileContent = await window.crmGit.toBase64(file);
    const existingFile = await window.crmGit.getFile(filePath);
    const sha = existingFile ? existingFile.sha : null;
    await window.crmGit.updateFile(filePath, fileContent, sha, `CMS: Upload image for ${slug}`);
    return filePath; // Store repo-relative path; renderers prefix as needed
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
