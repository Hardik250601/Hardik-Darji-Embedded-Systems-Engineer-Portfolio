// Public read + authenticated CMS write API for Neon-backed portfolio content.
'use strict';

const { readContent, replaceContent } = require('../lib/neon-content');
const { isCmsAdmin } = require('../lib/cms-auth');

const MAX_BODY_BYTES = 2 * 1024 * 1024;

function respond(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
}

async function bodyOf(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += part.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body too large.');
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try { return respond(res, 200, await readContent()); }
    catch (error) {
      console.error('[content] Neon read failed:', error.code || error.message);
      const status = error.code === 'DATABASE_NOT_CONFIGURED' ? 503 : 503;
      return respond(res, status, { error: 'Content database is temporarily unavailable.' });
    }
  }
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'GET, PUT');
    return respond(res, 405, { error: 'Method not allowed.' });
  }
  if (!await isCmsAdmin(req)) return respond(res, 401, { error: 'CMS authentication failed. Reconnect with your GitHub token.' });
  try {
    const body = await bodyOf(req);
    const content = await replaceContent(body.content);
    return respond(res, 200, { ok: true, content });
  } catch (error) {
    const badRequest = /must be an object|must be an array|Invalid .* slug|Invalid .* entry|body too large|JSON/.test(error.message || '');
    console.error('[content] Neon write failed:', error.code || error.message);
    return respond(res, badRequest ? 400 : 503, {
      error: badRequest ? error.message : 'Could not save content to the database.',
    });
  }
};
