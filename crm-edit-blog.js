// crm-edit-blog.js - loads an existing blog post into the edit form and saves it.
//
// Like the project editor, the slug is READ-ONLY: an earlier version rebuilt it
// from the title, which silently moved a published post's URL on every retitle.
(function () {
  'use strict';

  let currentSlug = null;

  function value(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val == null ? '' : String(val);
  }

  // content.json stores dates as YYYY-MM-DD, which is what <input type="date">
  // expects. Older entries were typed as free text ("October 28, 2025"), so
  // convert those rather than silently dropping the value.
  function toISODate(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
  }

  async function load(form, notice) {
    const esc = window.crmGit.esc;
    try {
      const { content } = await window.crmGit.loadContent();
      const blog = (content.blogs || []).find(b => b.slug === currentSlug);
      if (!blog) {
        window.crmGit.showMessage(document.getElementById('status-message'), 'Blog post not found!', 'bg-red-500');
        notice.textContent = 'Blog post not found. It may have been deleted or renamed.';
        return;
      }

      notice.innerHTML = `Editing <strong>${esc(blog.title)}</strong>`;
      form.classList.remove('hidden');

      document.getElementById('blog-slug').textContent = blog.slug;
      setValue('blog-title', blog.title);
      setValue('blog-date', toISODate(blog.date));
      setValue('blog-short-summary', blog.short_description);
      setValue('blog-content', blog.content);
    } catch (error) {
      window.crmGit.showMessage(document.getElementById('status-message'), `Error loading blog: ${error.message}`, 'bg-red-500');
    }
  }

  function init() {
    const form = document.getElementById('blog-form');
    const notice = document.getElementById('edit-notice');
    const status = document.getElementById('status-message');
    if (!form) return;

    currentSlug = new URLSearchParams(window.location.search).get('slug');
    if (!currentSlug) {
      window.crmGit.showMessage(status, 'No blog post specified!', 'bg-red-500');
      notice.textContent = 'No blog post selected.';
      return;
    }
    load(form, notice);

    const imageInput = document.getElementById('blog-images');
    const uploadButton = document.getElementById('blog-upload-images');
    if (imageInput && uploadButton) {
      uploadButton.addEventListener('click', async () => {
        const files = Array.from(imageInput.files || []);
        if (!files.length) {
          window.crmGit.showMessage(status, 'Choose one or more images first.', 'bg-red-500');
          return;
        }
        uploadButton.disabled = true;
        const label = uploadButton.textContent;
        uploadButton.textContent = 'Uploading...';
        try {
          const textarea = document.getElementById('blog-content');
          const start = textarea.selectionStart, end = textarea.selectionEnd;
          let html = '';
          for (const file of files) {
            const uploaded = await window.crmGit.uploadMedia(file, currentSlug);
            const alt = window.crmGit.esc(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
            html += `<figure>\n<img src="${window.crmGit.esc(uploaded.url)}" alt="${alt}" loading="lazy" class="w-full rounded-xl border border-gray-700">\n<figcaption class="text-sm text-gray-400 mt-2">${alt}</figcaption>\n</figure>\n`;
          }
          textarea.value = textarea.value.slice(0, start) + html + textarea.value.slice(end);
          textarea.focus();
          window.crmGit.showMessage(status, 'Images uploaded to Vercel Blob and inserted. Review alt text before saving.', 'bg-green-500');
          imageInput.value = '';
        } catch (error) {
          window.crmGit.showMessage(status, `Image upload failed: ${error.message}`, 'bg-red-500');
        } finally {
          uploadButton.disabled = false;
          uploadButton.textContent = label;
        }
      });
    }

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
        const idx = (content.blogs || []).findIndex(b => b.slug === currentSlug);
        if (idx === -1) throw new Error('Could not find blog post to update.');

        // Spread the original so any future fields survive an edit.
        content.blogs[idx] = {
          ...content.blogs[idx],
          slug: currentSlug,
          title: value('blog-title'),
          date: value('blog-date'),
          short_description: value('blog-short-summary'),
          content: document.getElementById('blog-content').value
        };

        await window.crmGit.saveContent(content, sha, `CMS: Update blog - ${content.blogs[idx].title}`);
        window.crmGit.showMessage(status, 'Blog post updated successfully!', 'bg-green-500');
      } catch (error) {
        window.crmGit.showMessage(status, `Error saving changes: ${error.message}`, 'bg-red-500');
      } finally {
        // Restore the label on failure too, not just success.
        if (submit) {
          submit.disabled = false;
          submit.textContent = label;
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
