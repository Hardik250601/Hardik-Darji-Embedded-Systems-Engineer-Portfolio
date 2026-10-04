// crm-github.js - shared GitHub API helpers + utility functions for the CMS pages.
// Exposed as window.crmGit.
//
// SECURITY MODEL
// ====================================================================
// There is deliberately NO token constant in this file.
//
// The CMS runs entirely in the browser and writes to content.json through
// the GitHub Contents API. An earlier version asked you to paste a
// fine-grained PAT directly into this file and commit it -- which published
// a live write credential for the repo to every visitor of /crm.html.
//
// Instead the token is supplied at runtime and held in sessionStorage, so
// it exists only in your own tab, is dropped when the tab closes, and can
// never be committed by accident.
//
// Use a FINE-GRAINED PAT scoped to this single repository with only
// "Contents: Read and write". Rotate it periodically.
//
// If you later want multi-device access without re-entering a token, move
// this call behind GitHub OAuth + a small serverless proxy that holds the
// credential server-side. See README.md ("CMS security").
// ====================================================================

(function () {
  'use strict';

  // --- CONFIGURATION (non-secret) ---
  const GITHUB_USERNAME = 'Hardik250601';
  const GITHUB_REPO = 'Hardik-Darji-Embedded-Systems-Engineer-Portfolio';
  const CONTENT_FILE_PATH = 'content.json';
  const TOKEN_STORAGE_KEY = 'crm_github_token';

  // --- Token handling (session-only, never persisted to the repo) ---

  function getToken() {
    let token = '';
    try {
      token = sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
    } catch (e) {
      // sessionStorage can throw in private browsing / sandboxed frames.
      token = '';
    }
    if (!token) {
      throw new Error(
        'Not connected to GitHub yet. Enter a fine-grained token in the ' +
        '"Connect to GitHub" bar at the top of this page.'
      );
    }
    return token;
  }

  function setToken(token) {
    const trimmed = String(token || '').trim();
    if (!trimmed) return false;
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, trimmed);
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearToken() {
    try {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) { /* nothing to clear */ }
  }

  function hasToken() {
    try {
      return Boolean(sessionStorage.getItem(TOKEN_STORAGE_KEY));
    } catch (e) {
      return false;
    }
  }

  // Reading content.json from a PUBLIC repo needs no credential at all --
  // the GitHub Contents API serves it unauthenticated. Only writes do.
  // So the listing and edit pages stay usable (read-only) before you connect,
  // and getToken() is only invoked on the write path.
  function readHeaders() {
    const headers = { 'Accept': 'application/vnd.github+json' };
    let token = '';
    try {
      token = sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
    } catch (e) {
      token = '';
    }
    if (token) headers['Authorization'] = `token ${token}`;
    return headers;
  }

  // Modern Unicode-safe base64 helpers (the old btoa/unescape trick is
  // deprecated; these work in all current browsers).
  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function fromBase64(b64) {
    // GitHub returns file contents as base64 wrapped at 60 characters. Strip the
    // line breaks before decoding: browsers tolerate this in atob(), but other
    // runtimes throw InvalidCharacterError on the whitespace.
    const clean = String(b64 == null ? '' : b64).replace(/\s+/g, '');
    return decodeURIComponent(escape(atob(clean)));
  }

  function apiUrl(path) {
    return `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${path}`;
  }

  async function getFile(path) {
    const response = await fetch(apiUrl(path), { headers: readHeaders() });
    if (response.status === 404) return null;
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        hasToken()
          ? 'GitHub rejected the token (401/403). Check it has "Contents: Read and write" access to ' +
            `${GITHUB_USERNAME}/${GITHUB_REPO}.`
          : `Could not read ${GITHUB_USERNAME}/${GITHUB_REPO} (403). If the repository is private, ` +
            'connect a token that has access to it.'
      );
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch file: ${path}`);
    }
    return response.json();
  }

  async function updateFile(path, content, sha, message) {
    const isJson = typeof content === 'object';
    const encodedContent = isJson ? toBase64(JSON.stringify(content, null, 2)) : content;
    const body = { message, content: encodedContent };
    if (sha) body.sha = sha;
    const response = await fetch(apiUrl(path), {
      method: 'PUT',
      headers: {
        'Authorization': `token ${getToken()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error (${response.status})`);
    }
    return response.json();
  }

  async function loadContent() {
    const fileData = await getFile(CONTENT_FILE_PATH);
    try {
      const response = await fetch('/api/content', { cache: 'no-store' });
      if (response.ok) {
        return { content: await response.json(), sha: fileData ? fileData.sha : null, missing: false, source: 'neon' };
      }
    } catch (e) { /* allow read-only fallback to the repository snapshot */ }
    if (!fileData) {
      return { content: { projects: [], blogs: [], testimonials: [] }, sha: null, missing: true, source: 'github' };
    }
    const content = JSON.parse(fromBase64(fileData.content));
    return { content, sha: fileData.sha, missing: false, source: 'github' };
  }

  async function saveContent(content, sha, message) {
    const response = await fetch('/api/content', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Neon content save failed (${response.status}).`);
    try {
      return await updateFile(CONTENT_FILE_PATH, content, sha, message);
    } catch (error) {
      throw new Error(`Saved to Neon, but the GitHub snapshot could not be updated: ${error.message}`);
    }
  }

  async function uploadMedia(file, slug) {
    if (!file || file.size > 4 * 1024 * 1024) throw new Error('Choose an image no larger than 4 MB.');
    const response = await fetch(`/api/media?slug=${encodeURIComponent(slug)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': file.type },
      body: file,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Image upload failed (${response.status}).`);
    return result;
  }

  async function deleteMedia(url) {
    if (!url || !String(url).includes('.public.blob.vercel-storage.com/portfolio/')) return;
    const response = await fetch('/api/media', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || 'Image deletion failed.');
    }
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

  // Safe HTML escape for use inside innerHTML templates.
  function esc(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Connect bar -----------------------------------------------------
  // Mounted automatically on any page that loads this script, so every CMS
  // page gets it without extra markup.

  function mountConnectBar() {
    if (document.getElementById('crm-connect-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'crm-connect-bar';
    bar.className = 'bg-gray-900 border-b border-gray-700 px-6 py-4';
    bar.innerHTML = `
      <div class="max-w-4xl mx-auto flex flex-wrap items-center gap-3">
        <label for="crm-token-input" class="text-sm font-medium text-gray-300">
          Connect to GitHub
          <span class="block text-xs text-gray-500 font-normal">
            Fine-grained token &middot; Contents: Read and write &middot;
            ${esc(GITHUB_USERNAME)}/${esc(GITHUB_REPO)}
          </span>
        </label>
        <input id="crm-token-input" type="password" autocomplete="off" spellcheck="false"
               placeholder="github_pat_..."
               class="flex-1 min-w-[16rem] bg-gray-700 p-2 rounded text-sm">
        <button id="crm-token-save" type="button"
                class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded text-sm">
          Connect
        </button>
        <button id="crm-token-clear" type="button"
                class="bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-4 rounded text-sm">
          Disconnect
        </button>
        <span id="crm-token-status" class="text-xs text-gray-400" role="status"></span>
      </div>
      <p class="max-w-4xl mx-auto mt-2 text-xs text-gray-500">
        Stored in this browser tab only (sessionStorage) and cleared when you close it.
        It is never written to the repository.
      </p>`;

    document.body.insertBefore(bar, document.body.firstChild);

    const input = bar.querySelector('#crm-token-input');
    const status = bar.querySelector('#crm-token-status');

    function refreshStatus() {
      if (!hasToken()) {
        status.textContent = 'Not connected.';
        status.className = 'text-xs text-amber-400';
      } else {
        status.textContent = 'Connected for this tab.';
        status.className = 'text-xs text-green-400';
        input.value = '';
        input.type = 'password';
        input.placeholder = 'Connected';
      }
    }

    bar.querySelector('#crm-token-save').addEventListener('click', () => {
      if (setToken(input.value)) {
        refreshStatus();
        // Re-dispatch so any CMS page re-runs its load with the new token.
        window.dispatchEvent(new CustomEvent('crm:token-changed'));
        window.location.reload();
      } else {
        status.textContent = 'Could not store the token in this browser.';
        status.className = 'text-xs text-red-400';
      }
    });

    bar.querySelector('#crm-token-clear').addEventListener('click', () => {
      clearToken();
      refreshStatus();
    });

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') bar.querySelector('#crm-token-save').click();
    });

    refreshStatus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountConnectBar);
  } else {
    mountConnectBar();
  }

  window.crmGit = {
    getFile,
    updateFile,
    loadContent,
    saveContent,
    uploadMedia,
    deleteMedia,
    toBase64,
    toBase64File,
    showMessage,
    esc,
    getToken,
    setToken,
    clearToken,
    hasToken,
    CONTENT_FILE_PATH,
    GITHUB_USERNAME,
    GITHUB_REPO
  };
})();
