// Shared CMS helpers. Private GitHub credentials and session signing stay on
// the server; the browser only receives a short-lived HttpOnly session cookie.
(function () {
  'use strict';

  const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
  let authenticated = false;
  let sessionReady = false;
  const isAuthenticated = () => sessionReady && authenticated;

  async function checkSession() {
    try {
      const response = await fetch('/api/auth', { cache: 'no-store' });
      const result = await response.json();
      authenticated = Boolean(response.ok && result.authenticated);
    } catch { authenticated = false; }
    sessionReady = true;
    window.dispatchEvent(new CustomEvent('crm:session-ready'));
    return authenticated;
  }

  async function login(password) {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', password }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Sign-in failed (${response.status}).`);
    authenticated = true;
    return result;
  }

  async function logout() {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    if (!response.ok) throw new Error('Could not end the CMS session.');
    authenticated = false;
  }

  async function loadContent() {
    try {
      const response = await fetch('/api/content', { cache: 'no-store' });
      if (response.ok) return { content: await response.json(), sha: null, missing: false, source: 'neon' };
    } catch { /* use the committed static snapshot when the API is unavailable */ }
    try {
      const response = await fetch('content.json', { cache: 'no-store' });
      if (response.ok) return { content: await response.json(), sha: null, missing: false, source: 'snapshot' };
    } catch { /* show the empty-state CMS message */ }
    return { content: { projects: [], blogs: [], testimonials: [] }, sha: null, missing: true, source: 'snapshot' };
  }

  async function saveContent(content, _sha, message) {
    if (!isAuthenticated()) throw new Error('Sign in to the CMS to publish changes.');
    const response = await fetch('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, message }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) { authenticated = false; }
    if (!response.ok) throw new Error(result.error || `Content save failed (${response.status}).`);
    return { content: result.content, snapshot: result.snapshot };
  }

  async function uploadMedia(file, slug) {
    if (!file || file.size > MAX_IMAGE_BYTES) throw new Error('Choose an image no larger than 4 MB.');
    const response = await fetch(`/api/media?slug=${encodeURIComponent(slug)}`, {
      method: 'POST', headers: { 'Content-Type': file.type }, body: file,
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) authenticated = false;
    if (!response.ok) throw new Error(result.error || `Image upload failed (${response.status}).`);
    return result;
  }

  async function deleteMedia(url) {
    if (!url || !String(url).includes('.public.blob.vercel-storage.com/portfolio/')) return;
    const response = await fetch('/api/media', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) authenticated = false;
    if (!response.ok) throw new Error(result.error || 'Image deletion failed.');
  }

  const toBase64File = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  function showMessage(el, message, bgColor) {
    if (!el) return;
    el.textContent = message;
    el.className = `mt-4 p-4 rounded text-white ${bgColor}`;
    el.style.display = 'block';
  }

  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function mountConnectBar() {
    if (document.getElementById('crm-connect-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'crm-connect-bar';
    bar.className = 'bg-gray-900 border-b border-gray-700 px-6 py-4';
    bar.innerHTML = `
      <div class="max-w-4xl mx-auto flex flex-wrap items-center gap-3">
        <label for="crm-password-input" class="text-sm font-medium text-gray-300">
          CMS administrator sign-in
          <span class="block text-xs text-gray-500 font-normal">Your password is checked by the server. GitHub credentials never enter this page.</span>
        </label>
        <input id="crm-password-input" type="password" autocomplete="current-password" spellcheck="false"
               placeholder="CMS password" class="flex-1 min-w-[16rem] bg-gray-700 p-2 rounded text-sm">
        <button id="crm-login" type="button" class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded text-sm">Sign in</button>
        <button id="crm-logout" type="button" class="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-4 rounded text-sm">Sign out</button>
        <span id="crm-auth-status" class="text-xs text-gray-400" role="status">Checking sign-in…</span>
      </div>
      <p class="max-w-4xl mx-auto mt-2 text-xs text-gray-500">The signed session cookie is HttpOnly and expires after 8 hours.</p>`;
    document.body.insertBefore(bar, document.body.firstChild);
    const input = bar.querySelector('#crm-password-input');
    const status = bar.querySelector('#crm-auth-status');
    const loginButton = bar.querySelector('#crm-login');
    const logoutButton = bar.querySelector('#crm-logout');

    function refreshStatus() {
      if (!sessionReady) { status.textContent = 'Checking sign-in…'; return; }
      status.textContent = authenticated ? 'Signed in. Session lasts up to 8 hours.' : 'Not signed in.';
      status.className = `text-xs ${authenticated ? 'text-green-400' : 'text-amber-400'}`;
      loginButton.disabled = authenticated;
      input.disabled = authenticated;
      input.value = '';
      input.placeholder = authenticated ? 'Signed in' : 'CMS password';
    }
    window.addEventListener('crm:session-ready', refreshStatus);
    loginButton.addEventListener('click', async () => {
      if (!input.value) { status.textContent = 'Enter your CMS password.'; return; }
      loginButton.disabled = true; status.textContent = 'Signing in…';
      try { await login(input.value); refreshStatus(); window.location.reload(); }
      catch (error) { status.textContent = error.message; loginButton.disabled = false; input.focus(); }
    });
    logoutButton.addEventListener('click', async () => {
      logoutButton.disabled = true; status.textContent = 'Signing out…';
      try { await logout(); window.location.reload(); }
      catch (error) { status.textContent = error.message; logoutButton.disabled = false; }
    });
    input.addEventListener('keydown', event => { if (event.key === 'Enter') loginButton.click(); });
    refreshStatus();
  }

  window.crmGit = {
    loadContent, saveContent, uploadMedia, deleteMedia, toBase64File,
    showMessage, esc, isAuthenticated,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountConnectBar);
  else mountConnectBar();
  checkSession();
})();
