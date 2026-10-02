// crm.js - unified "add content" handlers for crm.html.
//
// Both forms commit to content.json through the GitHub Contents API via
// window.crmGit. The token is supplied at runtime by the connect bar that
// crm-github.js mounts; nothing here needs to change when it rotates.

(function () {
  'use strict';

  // ---------- Helpers ----------

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]+/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function splitLines(value) {
    return String(value || '')
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
  }

  function splitList(value) {
    return String(value || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }

  function value(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function fileList(id) {
    const el = document.getElementById(id);
    return el && el.files ? el.files : [];
  }

  function todayISO() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  // ---------- Tabs ----------

  function initTabs() {
    const tabs = [
      { button: document.getElementById('tab-project'), panel: document.getElementById('panel-project') },
      { button: document.getElementById('tab-blog'), panel: document.getElementById('panel-blog') }
    ].filter(t => t.button && t.panel);

    tabs.forEach(tab => {
      tab.button.addEventListener('click', () => {
        tabs.forEach(other => {
          const active = other === tab;
          other.button.classList.toggle('is-active', active);
          other.button.setAttribute('aria-selected', String(active));
          other.panel.classList.toggle('is-active', active);
        });
      });
    });
  }

  // ---------- Character counters ----------

  function initCharCounters() {
    const pairs = [
      ['project-title', 'title-count'],
      ['project-short-summary', 'summary-count'],
      ['project-description', 'desc-count'],
      ['blog-title', 'blog-title-count'],
      ['blog-short-summary', 'blog-summary-count'],
      ['blog-content', 'blog-content-count']
    ];

    pairs.forEach(([inputId, countId]) => {
      const input = document.getElementById(inputId);
      const count = document.getElementById(countId);
      if (!input || !count) return;
      const max = parseInt(input.getAttribute('maxlength'), 10) || 0;

      const update = () => {
        const length = input.value.length;
        count.textContent = max ? `(${length}/${max} chars)` : `(${length} chars)`;
        count.classList.toggle('is-warning', max > 0 && length > max * 0.9);
      };

      input.addEventListener('input', update);
      update();
    });
  }

  // ---------- Slug preview ----------

  function initSlugPreview(titleId, slugId, previewId) {
    const title = document.getElementById(titleId);
    const slug = document.getElementById(slugId);
    const preview = document.getElementById(previewId);
    if (!title || !preview) return;

    const update = () => {
      const override = slug && slug.value.trim();
      const generated = slugify(title.value);
      preview.textContent = override || generated || 'generated-from-title';
    };

    title.addEventListener('input', update);
    if (slug) slug.addEventListener('input', update);
    update();
  }

  // ---------- Metric rows ----------

  function initMetricRows() {
    const container = document.getElementById('project-metrics-rows');
    const addButton = document.getElementById('add-metric');
    if (!container || !addButton) return;

    function addRow(key, val) {
      const row = document.createElement('div');
      row.className = 'metric-row';

      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.className = 'field-input';
      keyInput.placeholder = 'status';
      keyInput.value = key || '';
      keyInput.setAttribute('aria-label', 'Metric key');

      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.className = 'field-input';
      valueInput.placeholder = 'Completed';
      valueInput.value = val || '';
      valueInput.setAttribute('aria-label', 'Metric value');

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.className = 'bg-gray-700 hover:bg-red-700 text-gray-100 font-semibold px-3 py-2 rounded text-sm';
      remove.setAttribute('aria-label', 'Remove this metric');
      remove.addEventListener('click', () => row.remove());

      row.append(keyInput, valueInput, remove);
      container.appendChild(row);
    }

    addButton.addEventListener('click', () => addRow());
    addRow('status', '');
  }

  function collectMetrics() {
    const rows = document.querySelectorAll('#project-metrics-rows .metric-row');
    const metrics = {};
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      const key = inputs[0] ? inputs[0].value.trim() : '';
      const val = inputs[1] ? inputs[1].value.trim() : '';
      if (key && val) metrics[key] = val;
    });
    return metrics;
  }

  // ---------- Connection status ----------

  function initConnectionStatus() {
    const host = document.getElementById('crm-connection');
    if (!host) return;

    function render() {
      const connected = window.crmGit.hasToken();
      host.className = connected
        ? 'mt-6 p-4 rounded-lg border border-green-700 bg-green-900/30 text-sm text-green-300'
        : 'mt-6 p-4 rounded-lg border border-amber-700 bg-amber-900/20 text-sm text-amber-300';
      host.textContent = connected
        ? `Connected as ${window.crmGit.GITHUB_USERNAME}/${window.crmGit.GITHUB_REPO}. You can publish.`
        : 'Not connected. Paste a fine-grained token into the Connect to GitHub bar above to enable publishing.';
    }

    render();
    window.addEventListener('crm:token-changed', render);
  }

  // ---------- Image upload ----------

  async function uploadFile(file, slug, fileNameBase) {
    const fileExtension = file.name.split('.').pop();
    const filePath = `images/projects/${slug}/${fileNameBase}.${fileExtension}`;
    const fileContent = await window.crmGit.toBase64(file);
    const existingFile = await window.crmGit.getFile(filePath);
    const sha = existingFile ? existingFile.sha : null;
    await window.crmGit.updateFile(filePath, fileContent, sha, `CMS: Upload image for ${slug}`);
    return filePath;
  }

  // ---------- Project form ----------

  function initProjectForm() {
    const form = document.getElementById('project-form');
    const status = document.getElementById('status-message');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!window.crmGit.hasToken()) {
        window.crmGit.showMessage(status, 'Not connected to GitHub. Add your token in the bar at the top of the page.', 'bg-red-500');
        return;
      }

      const title = value('project-title');
      const slug = value('project-slug') || slugify(title);
      const submitButton = form.querySelector('button[type="submit"]');
      const originalLabel = submitButton.textContent;

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Publishing...';
      }
      window.crmGit.showMessage(status, 'Uploading images and publishing project...', 'bg-yellow-500');

      try {
        let mainImagePath = '';
        const supportiveImagePaths = [];

        const mainImageFile = fileList('project-main-image')[0];
        if (mainImageFile) {
          mainImagePath = await uploadFile(mainImageFile, slug, 'main');
        }

        const supportiveFiles = fileList('project-supportive-images');
        for (let i = 0; i < supportiveFiles.length; i++) {
          supportiveImagePaths.push(await uploadFile(supportiveFiles[i], slug, `support-${i + 1}`));
        }

        const metrics = collectMetrics();
        const problem = value('cs-problem');
        const architecture = value('cs-architecture');
        const outcomes = splitLines(value('cs-outcomes'));
        const roadmap = splitLines(value('cs-roadmap'));

        const project = {
          slug,
          title,
          short_summary: value('project-short-summary'),
          full_description: value('project-description'),
          main_image: mainImagePath,
          supportive_images: supportiveImagePaths
        };

        const techStack = splitList(value('project-tech'));
        if (techStack.length) project.tech_stack = techStack;
        if (Object.keys(metrics).length) project.metrics = metrics;

        if (problem || architecture || outcomes.length || roadmap.length) {
          project.case_study = {};
          if (problem) project.case_study.problem = problem;
          if (architecture) project.case_study.architecture = architecture;
          if (outcomes.length) project.case_study.outcomes = outcomes;
          if (roadmap.length) project.case_study.future_roadmap = roadmap;
        }

        const githubLink = value('project-github');
        if (githubLink) {
          project.github_link = githubLink;
          const blurb = value('project-github-blurb');
          if (blurb) project.github_blurb = blurb;
        }

        const linkedinLink = value('project-linkedin');
        if (linkedinLink) project.linkedin_link = linkedinLink;

        const demoLink = value('project-demo');
        if (demoLink) project.demo_link = demoLink;

        const { content, sha } = await window.crmGit.loadContent();
        if (!Array.isArray(content.projects)) content.projects = [];

        // Replace rather than duplicate if the slug is already in use.
        const existingIndex = content.projects.findIndex(item => item.slug === slug);
        if (existingIndex >= 0) {
          content.projects[existingIndex] = { ...content.projects[existingIndex], ...project };
        } else {
          content.projects.unshift(project);
        }

        await window.crmGit.saveContent(content, sha, `CMS: Add project - ${title}`);
        window.crmGit.showMessage(
          status,
          `Project published! View it at project-template.html?slug=${slug}`,
          'bg-green-500'
        );
        form.reset();
        if (submitButton) submitButton.textContent = originalLabel;
      } catch (error) {
        window.crmGit.showMessage(status, `Error: ${error.message}`, 'bg-red-500');
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  // ---------- Blog form ----------

  function initBlogForm() {
    const form = document.getElementById('blog-form');
    const status = document.getElementById('status-message');
    if (!form) return;

    const dateField = document.getElementById('blog-date');
    if (dateField && !dateField.value) dateField.value = todayISO();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!window.crmGit.hasToken()) {
        window.crmGit.showMessage(status, 'Not connected to GitHub. Add your token in the bar at the top of the page.', 'bg-red-500');
        return;
      }

      const title = value('blog-title');
      const slug = value('blog-slug') || slugify(title);
      const submitButton = form.querySelector('button[type="submit"]');
      const originalLabel = submitButton.textContent;

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Publishing...';
      }
      window.crmGit.showMessage(status, 'Publishing blog post...', 'bg-yellow-500');

      try {
        const post = {
          slug,
          title,
          date: value('blog-date'),
          short_description: value('blog-short-summary'),
          content: document.getElementById('blog-content').value
        };

        const { content, sha } = await window.crmGit.loadContent();
        if (!Array.isArray(content.blogs)) content.blogs = [];

        const existingIndex = content.blogs.findIndex(item => item.slug === slug);
        if (existingIndex >= 0) {
          content.blogs[existingIndex] = { ...content.blogs[existingIndex], ...post };
        } else {
          content.blogs.unshift(post);
        }

        await window.crmGit.saveContent(content, sha, `CMS: Add blog - ${title}`);
        window.crmGit.showMessage(
          status,
          `Blog post published! View it at blog-template.html?slug=${slug}`,
          'bg-green-500'
        );
        form.reset();
        if (dateField) dateField.value = todayISO();
        if (submitButton) submitButton.textContent = originalLabel;
      } catch (error) {
        window.crmGit.showMessage(status, `Error: ${error.message}`, 'bg-red-500');
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  // ---------- Boot ----------

  function init() {
    initTabs();
    initCharCounters();
    initSlugPreview('project-title', 'project-slug', 'project-slug-preview');
    initSlugPreview('blog-title', 'blog-slug', 'blog-slug-preview');
    initMetricRows();
    initConnectionStatus();
    initProjectForm();
    initBlogForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();