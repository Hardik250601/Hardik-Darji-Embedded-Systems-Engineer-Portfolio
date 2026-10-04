// Newsletter signup endpoint backed by Buttondown's subscriber API.
// Configure BUTTONDOWN_API_KEY in the Vercel environment.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LEN = 254;
const MAX_NAME_LEN = 100;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const hits = (globalThis.__subscribeHits = globalThis.__subscribeHits || new Map());

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(time => now - time < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); }
    catch { return Object.fromEntries(new URLSearchParams(req.body)); }
  }
  if (typeof req.pipe === 'function') {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      size += buffer.length;
      if (size > 4096) throw new Error('Request body too large');
      chunks.push(buffer);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};
    try { return JSON.parse(raw); }
    catch { return Object.fromEntries(new URLSearchParams(raw)); }
  }
  return {};
}

function respond(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(data));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respond(res, 405, { error: 'Method not allowed' });
  }

  const ip = String(
    (req.headers && req.headers['x-forwarded-for']) ||
      (req.socket && req.socket.remoteAddress) || 'unknown'
  ).split(',')[0].trim();

  if (rateLimited(ip)) {
    return respond(res, 429, { error: 'Too many attempts. Please wait a few minutes and try again.' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return respond(res, 400, { error: 'Request body is too large or invalid.' });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim().slice(0, MAX_NAME_LEN);
  if (String(body.company || '').trim()) return respond(res, 200, { ok: true, status: 'ignored' });
  if (!email || email.length > MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    return respond(res, 400, { error: 'Please enter a valid email address.' });
  }

  const apiKey = process.env.BUTTONDOWN_API_KEY;
  if (!apiKey) {
    return respond(res, 503, { error: 'Subscription service is not configured yet.' });
  }

  try {
    const response = await fetch('https://api.buttondown.com/v1/subscribers', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Buttondown-Collision-Behavior': 'add',
      },
      body: JSON.stringify({
        email_address: email,
        ...(name ? { notes: `Name: ${name}` } : {}),
        ...(ip !== 'unknown' ? { ip_address: ip } : {}),
      }),
    });

    if (!response.ok) {
      // Do not expose vendor details or credentials to the browser.
      if (response.status === 400 || response.status === 422) {
        const detail = await response.json().catch(() => ({}));
        console.error(`[subscribe] Buttondown rejected signup (${response.status}):`, detail.message || 'validation error');
        return respond(res, 400, { error: 'This email address could not be subscribed.' });
      }
      console.error(`[subscribe] Buttondown returned HTTP ${response.status}`);
      return respond(res, 503, { error: 'Subscription service is temporarily unavailable.' });
    }

    const result = await response.json().catch(() => ({}));
    if (!result.id) {
      console.error('[subscribe] Buttondown did not confirm signup creation.');
      return respond(res, 503, { error: 'Subscription service is temporarily unavailable.' });
    }
    const status = result.type === 'unactivated' ? 'confirmation_required' : 'subscribed';
    return respond(res, 200, { ok: true, status });
  } catch (err) {
    console.error('[subscribe] Buttondown request failed:', err && err.message);
    return respond(res, 503, { error: 'Subscription service is temporarily unavailable.' });
  }
};
