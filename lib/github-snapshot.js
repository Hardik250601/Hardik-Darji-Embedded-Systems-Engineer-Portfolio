// Commit the Neon-backed CMS content snapshot from a Vercel server function.
'use strict';

const OWNER = 'Hardik250601';
const REPO = 'Hardik-Darji-Embedded-Systems-Engineer-Portfolio';
const PATH = 'content.json';
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

async function commitContent(content, message) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    const error = new Error('GitHub server integration is not configured. Add GITHUB_TOKEN in Vercel.');
    error.code = 'GITHUB_NOT_CONFIGURED';
    throw error;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Hardik-Darji-Portfolio-CMS',
    'Content-Type': 'application/json',
  };
  const current = await fetch(API, { headers });
  let sha;
  if (current.ok) sha = (await current.json()).sha;
  else if (current.status !== 404) {
    const error = new Error(`GitHub snapshot lookup returned HTTP ${current.status}.`);
    error.code = 'GITHUB_API_ERROR';
    throw error;
  }

  const response = await fetch(API, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: String(message || 'CMS: Update portfolio content').slice(0, 200),
      content: Buffer.from(JSON.stringify(content, null, 2), 'utf8').toString('base64'),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!response.ok) {
    const error = new Error(`GitHub snapshot update returned HTTP ${response.status}.`);
    error.code = 'GITHUB_API_ERROR';
    throw error;
  }
  const result = await response.json();
  return { sha: result.content?.sha || null, commit: result.commit?.sha || null };
}

module.exports = { commitContent };
