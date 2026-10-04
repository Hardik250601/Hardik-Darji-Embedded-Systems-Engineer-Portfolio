// Password login for the portfolio CMS. A signed HttpOnly cookie is returned;
// GitHub credentials remain server-side in Vercel environment variables.
'use strict';

const { createHash, timingSafeEqual } = require('node:crypto');
const { isCmsAdmin, issueSession, clearSession, SESSION_SECONDS } = require('../lib/cms-auth');

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 8;
const attempts = globalThis.__cmsLoginAttempts || (globalThis.__cmsLoginAttempts = new Map());

function respond(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += part.length;
    if (size > 4096) throw new Error('Request body too large.');
    chunks.push(part);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function hash(value) { return createHash('sha256').update(String(value)).digest(); }
function equalSecret(a, b) { return timingSafeEqual(hash(a), hash(b)); }

function rateLimited(req) {
  const ip = String(req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter(time => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) { attempts.set(ip, recent); return true; }
  recent.push(now);
  attempts.set(ip, recent);
  return false;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const authenticated = await isCmsAdmin(req);
    return respond(res, 200, { authenticated, sessionSeconds: authenticated ? SESSION_SECONDS : 0 });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return respond(res, 405, { error: 'Method not allowed.' });
  }

  let body;
  try { body = await readBody(req); }
  catch { return respond(res, 400, { error: 'Invalid request.' }); }

  if (body.action === 'logout') {
    clearSession(req, res);
    return respond(res, 200, { authenticated: false });
  }
  if (body.action !== 'login') return respond(res, 400, { error: 'Invalid action.' });

  const configuredPassword = process.env.CMS_ADMIN_PASSWORD || '';
  if (!configuredPassword || !process.env.CMS_SESSION_SECRET) {
    return respond(res, 503, { error: 'CMS login is not configured on the server. Set CMS_ADMIN_PASSWORD and CMS_SESSION_SECRET in Vercel.' });
  }
  if (rateLimited(req)) return respond(res, 429, { error: 'Too many login attempts. Wait 15 minutes and try again.' });

  const password = typeof body.password === 'string' ? body.password : '';
  if (!equalSecret(password, configuredPassword)) return respond(res, 401, { error: 'Incorrect CMS password.' });
  try {
    issueSession(req, res);
    return respond(res, 200, { authenticated: true, sessionSeconds: SESSION_SECONDS });
  } catch (error) {
    console.error('[cms-auth] Could not create session:', error.message);
    return respond(res, 503, { error: 'Could not start a CMS session.' });
  }
};
