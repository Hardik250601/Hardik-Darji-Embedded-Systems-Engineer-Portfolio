// In-place, non-publishing preview for the add/edit CMS forms.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const field = id => $(id)?.value.trim() || '';
  const tags = id => field(id).split(',').map(s => s.trim()).filter(Boolean);
  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeImage = value => /^(https:\/\/|blob:|data:image\/|images\/)/i.test(String(value || '')) ? String(value) : '';

  function safeArticle(source) {
    const parsed = new DOMParser().parseFromString(source || '', 'text/html');
    const allowed = new Set(['H2','H3','P','UL','OL','LI','PRE','CODE','FIGURE','FIGCAPTION','IMG','A','STRONG','EM','B','I','BLOCKQUOTE','BR']);
    const copy = node => {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
      if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
      if (!allowed.has(node.tagName)) return document.createDocumentFragment();
      const out = document.createElement(node.tagName.toLowerCase());
      if (node.tagName === 'IMG') {
        const src = node.getAttribute('src') || '';
        if (!/^(https:\/\/|blob:|data:image\/)/i.test(src)) return document.createDocumentFragment();
        out.setAttribute('src', src);
        out.setAttribute('alt', node.getAttribute('alt') || 'Article image');
        out.loading = 'lazy'; out.className = 'max-h-[32rem] w-auto max-w-full rounded-xl border border-gray-700';
      }
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        if (/^(https:\/\/|mailto:)/i.test(href)) { out.href = href; out.rel = 'noopener noreferrer'; }
      }
      if (node.tagName !== 'IMG') node.childNodes.forEach(child => out.append(copy(child)));
      return out;
    };
    const root = document.createElement('div');
    parsed.body.childNodes.forEach(child => root.append(copy(child)));
    return root;
  }

  function show(kind) {
    const isProject = kind === 'project';
    const title = field(isProject ? 'project-title' : 'blog-title') || 'Untitled draft';
    const summary = field(isProject ? 'project-short-summary' : 'blog-short-summary');
    const labels = tags(isProject ? 'project-tags' : 'blog-tags');
    const date = field('blog-date');
    const titleBlock = `<p class="text-amber-300 text-xs uppercase tracking-[.25em] mb-3">Draft preview · ${isProject ? 'Project' : 'Blog'}</p><h1 class="text-4xl md:text-5xl font-bold text-white mb-4">${esc(title)}</h1>${date ? `<p class="text-gray-400 mb-6">${esc(date)}</p>` : ''}<p class="text-lg text-gray-300 leading-relaxed">${esc(summary)}</p><div class="flex flex-wrap gap-2 mt-5">${labels.map(tag => `<span class="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm text-amber-200">${esc(tag)}</span>`).join('')}</div>`;
    let body;
    if (isProject) {
      const old = window.crmEditingProject || {};
      const mainFile = $('project-main-image')?.files?.[0];
      const main = mainFile ? URL.createObjectURL(mainFile) : safeImage(old.main_image);
      const supportFiles = Array.from($('project-supportive-images')?.files || []).map(file => URL.createObjectURL(file));
      const gallery = [...(old.supportive_images || []).map(safeImage), ...supportFiles];
      const images = [main, ...gallery].filter(Boolean);
      body = `<div class="mt-8 grid gap-4 sm:grid-cols-2">${images.map((src, i) => `<img class="w-full rounded-2xl border border-gray-700 object-cover" src="${esc(src)}" alt="${esc(title)} image ${i + 1}">`).join('')}</div><section class="mt-10"><h2 class="text-2xl font-bold text-amber-300 mb-3">About this project</h2><div class="space-y-4 text-gray-300 leading-relaxed">${field('project-description').split(/\n\n+/).filter(Boolean).map(p => `<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('')}</div></section><p class="mt-8 text-gray-400">${esc(field('project-tech'))}</p>`;
    } else {
      body = `<article class="prose prose-invert max-w-none mt-10 space-y-5 leading-relaxed text-gray-300">${safeArticle(field('blog-content')).innerHTML}</article>`;
    }
    let modal = $('crm-preview-modal');
    if (!modal) {
      modal = document.createElement('div'); modal.id = 'crm-preview-modal';
      modal.innerHTML = `<div class="crm-preview-backdrop" role="presentation"><section class="crm-preview-shell" role="dialog" aria-modal="true" aria-labelledby="crm-preview-title"><header><strong id="crm-preview-title">Preview Draft</strong><button type="button" data-close aria-label="Close preview">Close ×</button></header><div data-content></div></section></div>`;
      const style = document.createElement('style');
      style.textContent = '#crm-preview-modal{position:fixed;inset:0;z-index:9999}.crm-preview-backdrop{position:absolute;inset:0;background:#030712eF;display:grid;place-items:center;padding:1rem}.crm-preview-shell{width:min(100%,1000px);max-height:94vh;overflow:auto;background:#0b1220;color:#f3f4f6;border:1px solid #374151;border-radius:1rem;box-shadow:0 25px 80px #0009}.crm-preview-shell header{position:sticky;top:0;z-index:1;display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;background:#111827;border-bottom:1px solid #374151}.crm-preview-shell header button{background:#374151;border-radius:.5rem;padding:.5rem 1rem}.crm-preview-article{padding:2rem clamp(1.25rem,5vw,4rem)}.crm-preview-article h2{color:#fbbf24;font-size:1.5rem;font-weight:700;margin:1.5rem 0 .75rem}.crm-preview-article h3{font-size:1.25rem;font-weight:700;margin:1.25rem 0 .5rem}.crm-preview-article p{margin:.75rem 0}.crm-preview-article ul,.crm-preview-article ol{margin-left:1.5rem}.crm-preview-article ul{list-style:disc}.crm-preview-article ol{list-style:decimal}.crm-preview-article pre{padding:1rem;background:#111827;border-radius:.5rem;overflow:auto}.crm-preview-article a{color:#fbbf24;text-decoration:underline}';
      document.head.append(style); document.body.append(modal);
      modal.addEventListener('click', event => { if (event.target === modal || event.target.closest('[data-close]')) modal.remove(); });
      document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('crm-preview-modal')) $('crm-preview-modal').remove(); });
    }
    modal.querySelector('[data-content]').innerHTML = `<main class="crm-preview-article"><div>${titleBlock}</div>${body}</main>`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('preview-project')?.addEventListener('click', () => show('project'));
    $('preview-blog')?.addEventListener('click', () => show('blog'));
  });
})();
