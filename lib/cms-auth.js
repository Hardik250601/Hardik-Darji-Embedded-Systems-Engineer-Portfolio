// Validate the GitHub fine-grained token already entered into the private CMS
// browser tab. The token is never stored in Neon or logged by this function.
'use strict';

const CMS_GITHUB_LOGIN = 'Hardik250601';

async function isCmsAdmin(req) {
  const header = req.headers && req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return false;
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${match[1]}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Hardik-Darji-Portfolio-CMS',
      },
    });
    if (!response.ok) return false;
    const user = await response.json();
    return String(user.login || '').toLowerCase() === CMS_GITHUB_LOGIN.toLowerCase();
  } catch {
    return false;
  }
}

module.exports = { isCmsAdmin };
