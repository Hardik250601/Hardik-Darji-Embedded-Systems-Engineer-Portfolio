// api/subscribe.js - newsletter subscribe endpoint (Vercel-style Node function,
// also runnable on any host that mounts api/ as functions).
//
// POST email -> upsert into MongoDB Atlas `portfolio.subscribers`
//   - unique index on `email`; duplicates update `lastSeenAt` instead of
//     creating a second document
//   - honeypot field silently accepted (bots are not stored)
//   - best-effort per-instance rate limiting
//
// The browser falls back to the existing Formspree endpoint whenever this
// function is absent (404/405), unconfigured (503), or failing (5xx), so a
// subscriber is never lost while MongoDB is being set up.
//
// Status codes: 200 ok | 400 invalid input | 405 wrong method |
//               429 rate limited | 503 not configured / DB unreachable
const { getSubscribers } = require('../lib/mongodb');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LEN = 254;
const MAX_NAME_LEN = 100;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_MAX = 5; // per IP per warm instance (best effort)

// Per-instance rate-limit store; survives on warm invocations only.
const hits = (globalThis.__subscribeHits = globalThis.__subscribeHits || new Map());

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

// Accepts parsed bodies (Vercel parses JSON/urlencoded), raw strings, or an
// unread stream - so the function works on hosts that do not pre-parse.
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return Object.fromEntries(new URLSearchParams(req.body));
    }
  }
  if (typeof req.pipe === 'function') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8').slice(0, 4096);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return Object.fromEntries(new URLSearchParams(raw));
    }
  }
  return {};
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const ip = String(
    (req.headers && req.headers['x-forwarded-for']) ||
      (req.socket && req.socket.remoteAddress) ||
      'unknown'
  ).split(',')[0].trim();

  if (rateLimited(ip)) {
    res.statusCode = 429;
    return res.end(
      JSON.stringify({ error: 'Too many attempts. Please wait a few minutes and try again.' })
    );
  }

  const body = await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim().slice(0, MAX_NAME_LEN);
  const honeypot = String(body.company || '').trim();

  // Bot trap: report success without storing anything.
  if (honeypot) {
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, status: 'ignored' }));
  }

  if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Please enter a valid email address.' }));
  }

  try {
    const collection = await getSubscribers();
    const now = new Date();
    const result = await collection.updateOne(
      { email },
      {
        $set: { email, lastSeenAt: now, ...(name ? { name } : {}) },
        $setOnInsert: { createdAt: now, source: 'newsletter' },
      },
      { upsert: true }
    );
    const status = result.upsertedCount ? 'subscribed' : 'already_subscribed';
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, status }));
  } catch (err) {
    if (err && err.code === 'NO_URI') {
      res.statusCode = 503;
      return res.end(JSON.stringify({ error: 'Subscription service is not configured yet.' }));
    }
    console.error('[subscribe] database error:', err && err.message);
    res.statusCode = 503;
    return res.end(JSON.stringify({ error: 'Subscription service is temporarily unavailable.' }));
  }
};
