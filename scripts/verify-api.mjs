// Offline contract checks for api/subscribe.js. Buttondown fetch is stubbed;
// no network request or live subscriber is created.
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(process.argv[2] || process.cwd());
const handler = require(path.join(ROOT, 'api', 'subscribe.js'));
let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) pass++;
  else { fail++; failures.push(`${name}${detail ? ` :: ${detail}` : ''}`); }
}

function makeReq(method, body, ip = '10.0.0.1') {
  return { method, body, headers: { 'x-forwarded-for': ip }, socket: { remoteAddress: ip } };
}
function makeRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.setHeader = (key, value) => { res.headers[key] = value; };
  res.end = body => { res.body = body; return res; };
  return res;
}
async function run(method, body, ip) {
  const res = makeRes();
  await handler(makeReq(method, body, ip), res);
  return { status: res.statusCode, data: res.body ? JSON.parse(res.body) : null, headers: res.headers };
}

const originalFetch = globalThis.fetch;
const originalKey = process.env.BUTTONDOWN_API_KEY;
process.env.BUTTONDOWN_API_KEY = 'test-key';
let lastRequest;
globalThis.fetch = async (url, options) => {
  lastRequest = { url, options };
  return { ok: true, status: 201, json: async () => ({ id: 'test-subscriber', type: 'unactivated' }) };
};

try {
  const method = await run('GET', undefined, '10.1.0.1');
  check('GET -> 405 and Allow: POST', method.status === 405 && method.headers.Allow === 'POST');

  for (const [n, email] of ['', 'not-an-email', 'a@b', 'a b@c.com', `${'x'.repeat(260)}@example.com`].entries()) {
    const result = await run('POST', { email }, `10.1.1.${n + 1}`);
    check(`invalid email #${n + 1} -> 400`, result.status === 400);
  }

  const bot = await run('POST', { email: 'bot@example.com', company: 'bot' }, '10.1.2.1');
  check('honeypot -> ignored without provider request', bot.status === 200 && bot.data.status === 'ignored');

  const added = await run('POST', { email: '  Person@Example.com ', name: 'Person' }, '10.1.3.1');
  const sent = JSON.parse(lastRequest.options.body);
  check('valid address -> 200', added.status === 200);
  check('reports confirmation required for double opt-in', added.data.status === 'confirmation_required');
  check('uses Buttondown subscriber API', lastRequest.url === 'https://api.buttondown.com/v1/subscribers');
  check('normalizes email and enables safe collision handling', sent.email_address === 'person@example.com' &&
    lastRequest.options.headers['X-Buttondown-Collision-Behavior'] === 'add');
  check('passes name and visitor IP', sent.notes === 'Name: Person' && sent.ip_address === '10.1.3.1');

  globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({ detail: 'invalid subscriber' }) });
  const rejected = await run('POST', { email: 'blocked@example.com' }, '10.1.4.1');
  check('provider validation error -> 400 without exposing details', rejected.status === 400 &&
    !JSON.stringify(rejected.data).includes('invalid subscriber'));

  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ detail: 'secret details' }) });
  const unavailable = await run('POST', { email: 'api@example.com' }, '10.1.5.1');
  check('provider auth error -> generic 503', unavailable.status === 503 &&
    !JSON.stringify(unavailable.data).includes('secret details'));

  delete process.env.BUTTONDOWN_API_KEY;
  const unconfigured = await run('POST', { email: 'unset@example.com' }, '10.1.6.1');
  check('missing key -> 503 so the form can fall back', unconfigured.status === 503);
  process.env.BUTTONDOWN_API_KEY = 'test-key';

  const statuses = [];
  globalThis.fetch = async () => ({ ok: true, status: 201, json: async () => ({ id: 'test-subscriber', type: 'regular' }) });
  for (let i = 0; i < 6; i++) {
    const result = await run('POST', { email: `rl${i}@example.com` }, '10.1.7.7');
    statuses.push(result.status);
  }
  check('rate limit allows five requests then returns 429',
    statuses.slice(0, 5).every(status => status === 200) && statuses[5] === 429, statuses.join(','));

  const { normalizeContent } = require(path.join(ROOT, 'lib', 'neon-content.js'));
  const normalized = normalizeContent({
    projects: [{ slug: 'test-project', title: 'Test Project' }],
    blogs: [{ slug: 'test-blog', title: 'Test Blog' }],
    testimonials: [{ name: 'Jane Doe', quote: 'A useful test.' }],
  });
  check('Neon content validation accepts projects and blogs',
    normalized.projects[0].slug === 'test-project' && normalized.blogs[0].slug === 'test-blog');
  check('Neon content validation assigns testimonial slug',
    normalized.testimonials[0].slug === 'jane-doe' && normalized.testimonials[0].data.slug === 'jane-doe');
  let invalidSlugRejected = false;
  try {
    normalizeContent({ projects: [{ slug: '../bad', title: 'Bad' }], blogs: [], testimonials: [] });
  } catch { invalidSlugRejected = true; }
  check('Neon content validation rejects unsafe slugs', invalidSlugRejected);

  const contentApi = require(path.join(ROOT, 'api', 'content.js'));
  const mediaApi = require(path.join(ROOT, 'api', 'media.js'));
  async function runApi(handler, method, body, headers = {}) {
    const response = makeRes();
    await handler({ method, body, headers, url: '/api/test' }, response);
    return { status: response.statusCode, data: response.body ? JSON.parse(response.body) : null };
  }
  const contentDenied = await runApi(contentApi, 'PUT', { content: { projects: [], blogs: [], testimonials: [] } });
  const mediaDenied = await runApi(mediaApi, 'POST', null, { 'content-type': 'image/png' });
  check('Neon content writes require CMS authentication', contentDenied.status === 401);
  check('Blob uploads require CMS authentication', mediaDenied.status === 401);
} finally {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.BUTTONDOWN_API_KEY;
  else process.env.BUTTONDOWN_API_KEY = originalKey;
}

console.log(`\nverify-api: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const failure of failures) console.log('  x ' + failure);
}
process.exit(fail ? 1 : 0);
