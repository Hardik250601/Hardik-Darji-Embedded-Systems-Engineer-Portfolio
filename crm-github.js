// crm-github.js - shared GitHub API helpers + utility functions for the CMS pages.
// Exposed as window.crmGit.

(function () {
  'use strict';

  // --- CONFIGURATION ---
  // ====================================================================
  // IMPORTANT: Replace the placeholder below with a fine-grained GitHub PAT
  // that has Contents: Read & write access ONLY to this repo.
  //
  // SECURITY WARNING: Because this token ships in the client-side JS file,
  // anyone who visits /crm.html can extract it. To minimise the blast radius:
  //   1. Use a fine-grained PAT scoped to a SINGLE repository.
  //   2. Set the PAT to expire (max 1 year).
  //   3. Restrict the PAT to "Contents: Read and write" only.
  //   4. Move this code to a serverless function (Cloudflare Worker /
  //      Netlify Function) and proxy the request server-side.
  // ====================================================================
  const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN_HERE';
  const GITHUB_USERNAME = 'Hardikdarji921';
  const GITHUB_REPO = 'Hardik-webpage';
  const CONTENT_FILE_PATH = 'content.json';

  // Modern Unicode-safe base64 helpers (the old btoa/unescape trick is
  // deprecated; these work in all current browsers).
  function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function fromBase64(b64) {
    return decodeURIComponent(escape(atob(b64)));
  }

  async function getFile(path) {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${path}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github+json' }
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Failed to fetch file: ${path}`);
    }
    return response.json();
  }

  async function updateFile(path, content, sha, message) {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${path}`;
    const isJson = typeof content === 'object';
    const encodedContent = isJson ? toBase64(JSON.stringify(content, null, 2)) : content;
    const body = { message, content: encodedContent };
    if (sha) body.sha = sha;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
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
    if (!fileData) {
      return { content: { projects: [], blogs: [] }, sha: null, missing: true };
    }
    const content = JSON.parse(fromBase64(fileData.content));
    return { content, sha: fileData.sha, missing: false };
  }

  async function saveContent(content, sha, message) {
    return updateFile(CONTENT_FILE_PATH, content, sha, message);
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

  window.crmGit = {
    getFile,
    updateFile,
    loadContent,
    saveContent,
    toBase64,
    toBase64File,
    showMessage,
    esc,
    CONTENT_FILE_PATH,
    GITHUB_USERNAME,
    GITHUB_REPO,
  };
})();
