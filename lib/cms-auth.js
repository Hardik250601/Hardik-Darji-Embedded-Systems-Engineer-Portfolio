// HMAC-signed, HttpOnly CMS sessions. The browser never receives the GitHub PAT.
'use strict';

const { createHmac, timingSafeEqual } = require('node:crypto');
const COOKIE = 'portfolio_cms_session';
const SESSION_SECONDS = 8 * 60 * 60;

function secret() { return process.env.CMS_SESSION_SECRET || ''; }

function signature(payload) {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function secureCookie(req) {
  const origin = String(req.headers?.origin || '');
  if (origin) {
    try {
      const parsed = new URL(origin);
      if (['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) return parsed.protocol === 'https:';
      return true;
    } catch { return true; }
  }
  return String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim() === 'https';
}

function issueSession(req, res) {
  if (!secret()) throw new Error('CMS_SESSION_SECRET is not configured.');
  const payload = Buffer.from(JSON.stringify({ sub: 'cms-admin', exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString('base64url');
  const value = `${payload}.${signature(payload)}`;
  const secure = secureCookie(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`);
}

function clearSession(req, res) {
  const secure = secureCookie(req) ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

function sessionFrom(req) {
  if (!secret()) return false;
  const raw = String(req.headers?.cookie || '');
  const entry = raw.split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`));
  if (!entry) return false;
  const value = entry.slice(COOKIE.length + 1);
  const dot = value.lastIndexOf('.');
  if (dot < 1) return false;
  const payload = value.slice(0, dot);
  const supplied = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(signature(payload));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.sub === 'cms-admin' && Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

async function isCmsAdmin(req) { return sessionFrom(req); }

module.exports = { isCmsAdmin, issueSession, clearSession, SESSION_SECONDS };
