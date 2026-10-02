// crm-edit-project.js - loads an existing project into the full edit form and
// saves it back to content.json.
//
// The slug is READ-ONLY here. An earlier version regenerated it from the title,
// which silently changed a project's public URL whenever it was renamed.
// Renaming a project must never move the page.
(function () {
  'use strict';

  let currentSlug = null;
  let existingProject = null;

  function value(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val == null ? '' : String(val);
  }

  function splitList(val) {
    return String(val || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  function splitLines(val) {
    return String(val || '').split('\n').map(s => s.trim()).filter(Boolean);
  }

  // ---------- Metric rows ----------

  function metricRowsHost() {
    return document.getElementById('project-metrics-rows');
  }

  function addMetricRow(container, key, val) {
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
    valueInput.value = val == null ? '' : String(val);
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

  function collectMetrics() {
    const container = metricRowsHost();
    if (!container) return null;
    const metrics = {};
    container.querySelectorAll('.metric-row').forEach(row => {
      const inputs = row.querySelectorAll('input');
      const key = inputs[0] ? inputs[0].value.trim() : '';
      const val = inputs[1] ? inputs[1].value.trim() : '';
      if (key && val) metrics[key] = val;
    });
    return Object.keys(metrics).length ? metrics : null;
  }

  // ---------- Images ----------

  async function uploadFile(file, slug, base) {
    const ext = file.name.split('.').pop();
    const path = `images/projects/${slug}/${base}.${ext}`;
    const body = await window.crmGit.toBase64(file);
    const existing = await window.crmGit.getFile(path);
    const sha = existing ? existing.sha : null;
    await window.crmGit.updateFile(path, body, sha, `CMS: Upload image for ${slug}`);
    return path;
  }

  // ---------- Load ----------

  async function load(form, notice) {
    const esc = window.crmGit.esc;
    try {
      const { content } = await window.crmGit.loadContent();
      const project = (content.projects || []).find(p => p.slug === currentSlug);
      if (!project) {
        window.crmGit.showMessage(document.getElementById('status-message'), 'Project not found!', 'bg-red-500');
        notice.textContent = 'Project not found. It may have been deleted or renamed.';
        return;
      }
      existingProject = project;

      notice.innerHTML = `Editing <strong>${esc(project.title)}</strong>`;
      form.classList.remove('hidden');

      document.getElementById('project-slug').textContent = project.slug;
      setValue('project-title', project.title);
      setValue('project-short-summary', project.short_summary);
      setValue('project-description', project.full_description);
      setValue('project-tech', (project.tech_stack || []).join(', '));
      setValue('project-github', project.github_link);
      setValue('project-github-blurb', project.github_blurb);
      setValue('project-linkedin', project.linkedin_link);
      setValue('project-demo', project.demo_link);

      const cs = project.case_study || {};
      setValue('cs-problem', cs.problem);
      setValue('cs-architecture', cs.architecture);
      setValue('cs-outcomes', (cs.outcomes || []).join('\n'));
      setValue('cs-roadmap', (cs.future_roadmap || []).join('\n'));

      const container = metricRowsHost();
      container.innerHTML = '';
      const metrics = project.metrics || {};
      const keys = Object.keys(metrics);
      if (keys.length) keys.forEach(k => addMetricRow(container, k, metrics[k]));
      else addMetricRow(container, '', '');

      document.getElementById('current-main-image').textContent = project.main_image || 'none';
      const list = document.getElementById('current-supportive-images');
      list.innerHTML = '';
      const supportive = project.supportive_images || [];
      if (!supportive.length) {
        list.innerHTML = '<li>none</li>';
      } else {
        supportive.forEach(img => {
          const li = document.createElement('li');
          li.textContent = img;
          list.appendChild(li);
        });
      }
    } catch (error) {
      window.crmGit.showMessage(document.getElementById('status-message'), `Error loading project: ${error.message}`, 'bg-red-500');
    }
  }

  // ---------- Save ----------

  function init() {
    const form = document.getElementById('project-form');
    const notice = document.getElementById('edit-notice');
    const status = document.getElementById('status-message');
    if (!form) return;

    const addButton = document.getElementById('add-metric');
    if (addButton) {
      addButton.addEventListener('click', () => {
        const container = metricRowsHost();
        if (container) addMetricRow(container, '', '');
      });
    }

    currentSlug = new URLSearchParams(window.location.search).get('slug');
    if (!currentSlug) {
      window.crmGit.showMessage(status, 'No project specified!', 'bg-red-500');
      notice.textContent = 'No project selected.';
      return;
    }
    load(form, notice);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!currentSlug) return;

      if (!window.crmGit.hasToken()) {
        window.crmGit.showMessage(status, 'Not connected to GitHub. Add your token in the bar at the top of the page.', 'bg-red-500');
        return;
      }

      const submit = form.querySelector('button[type="submit"]');
      const label = submit ? submit.textContent : '';
      if (submit) { submit.disabled = true; submit.textContent = 'Saving...'; }
      window.crmGit.showMessage(status, 'Saving changes...', 'bg-yellow-500');

      try {
        const { content, sha } = await window.crmGit.loadContent();
        const idx = (content.projects || []).findIndex(p => p.slug === currentSlug);
        if (idx === -1) throw new Error('Could not find project to update.');

        const base = content.projects[idx];

        // Images: keep existing unless a replacement is supplied.
        let mainImage = base.main_image || '';
        const mainFile = document.getElementById('project-main-image').files[0];
        if (mainFile) mainImage = await uploadFile(mainFile, currentSlug, 'main');

        const supportive = Array.isArray(base.supportive_images) ? base.supportive_images.slice() : [];
        const extraFiles = document.getElementById('project-supportive-images').files;
        for (let i = 0; i < extraFiles.length; i++) {
          supportive.push(await uploadFile(extraFiles[i], currentSlug, `support-${supportive.length + i + 1}`));
        }

        const techStack = splitList(value('project-tech'));
        const metrics = collectMetrics();
        const problem = value('cs-problem');
        const architecture = value('cs-architecture');
        const outcomes = splitLines(value('cs-outcomes'));
        const roadmap = splitLines(value('cs-roadmap'));

        // Rebuild the entry but keep the slug and any unknown keys intact.
        const updated = { ...base, main_image: mainImage, supportive_images: supportive };
        updated.title = value('project-title');
        updated.short_summary = value('project-short-summary');
        updated.full_description = value('project-description');
        updated.slug = currentSlug;

        if (techStack.length) updated.tech_stack = techStack; else delete updated.tech_stack;
        if (metrics) updated.metrics = metrics; else delete updated.metrics;

        if (problem || architecture || outcomes.length || roadmap.length) {
          updated.case_study = { ...(base.case_study || {}) };
          if (problem) updated.case_study.problem = problem; else delete updated.case_study.problem;
          if (architecture) updated.case_study.architecture = architecture; else delete updated.case_study.architecture;
          if (outcomes.length) updated.case_study.outcomes = outcomes; else delete updated.case_study.outcomes;
          if (roadmap.length) updated.case_study.future_roadmap = roadmap; else delete updated.case_study.future_roadmap;
          if (!Object.keys(updated.case_study).length) delete updated.case_study;
        } else {
          delete updated.case_study;
        }

        const github = value('project-github');
        if (github) updated.github_link = github; else delete updated.github_link;
        const blurb = value('project-github-blurb');
        if (blurb) updated.github_blurb = blurb; else delete updated.github_blurb;
        const linkedin = value('project-linkedin');
        if (linkedin) updated.linkedin_link = linkedin; else delete updated.linkedin_link;
        const demo = value('project-demo');
        if (demo) updated.demo_link = demo; else delete updated.demo_link;

        content.projects[idx] = updated;

        await window.crmGit.saveContent(content, sha, `CMS: Update project - ${updated.title}`);
        window.crmGit.showMessage(status, 'Project updated successfully!', 'bg-green-500');
        existingProject = updated;
        load(form, notice);
        if (submit) submit.textContent = label;
      } catch (error) {
        window.crmGit.showMessage(status, `Error saving changes: ${error.message}`, 'bg-red-500');
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();