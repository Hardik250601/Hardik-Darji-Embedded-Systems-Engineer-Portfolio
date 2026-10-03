// verify-api.mjs - unit tests for api/subscribe.js.
//
// The MongoDB helper is stubbed through the CommonJS require cache, so these
// tests run with no database, no network and no MONGODB_URI. They cover the
// request contract the browser relies on (status codes and JSON shapes),
// input validation, the honeypot, upsert semantics, and rate limiting.
//
//   npm run verify:api
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(process.argv[2] || process.cwd());

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) pass++;
  else { fail++; failures.push(`${name}${detail ? ' :: ' + detail : ''}`); }
}

// ---- stub lib/mongodb.js via the require cache --------------------------
const libPath = require.resolve(path.join(ROOT, 'lib', 'mongodb.js'));
let updateCalls = [];
let stubImpl = async () => ({
  updateOne: async (...args) => {
    updateCalls.push(args);
    return { upsertedCount: 1, matchedCount: 0 };
  },
});
require.cache[libPath] = {
  id: libPath,
  filename: libPath,
  loaded: true,
  exports: { getSubscribers: () => stubImpl() },
  children: [],
  paths: [],
};

const handler = require(path.join(ROOT, 'api', 'subscribe.js'));

// ---- tiny node-style req/res mocks --------------------------------------
function makeReq(method, body, ip = '10.0.0.1') {
  return {
    method,
    body,
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
  };
}
function makeRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.end = b => { res.body = b; return res; };
  return res;
}
async function run(method, body, ip) {
  updateCalls = [];
  const res = makeRes();
  await handler(makeReq(method, body, ip), res);
  return {
    status: res.statusCode,
    data: res.body ? JSON.parse(res.body) : null,
    updates: updateCalls,
    allow: res.headers.Allow,
  };
}

// ---- 1. method handling --------------------------------------------------
{
  const r = await run('GET', undefined, '10.0.1.1');
  check('GET -> 405', r.status === 405, `got ${r.status}`);
  check('405 advertises Allow: POST', r.allow === 'POST', String(r.allow));
  const head = await run('HEAD', undefined, '10.0.1.2');
  check('HEAD -> 405', head.status === 405, `got ${head.status}`);
}

// ---- 2. validation -------------------------------------------------------
for (const bad of ['', 'not-an-email', 'a@b', 'a b@c.com', 'x'.repeat(300) + '@e.com']) {
  const r = await run('POST', { email: bad }, '10.0.2.1');
  check(`invalid email ${JSON.stringify(bad.slice(0, 20))} -> 400`, r.status === 400, `got ${r.status}`);
  check('  400 performs no write', r.updates.length === 0);
}
{
  const r = await run('POST', {}, '10.0.2.2');
  check('missing email -> 400', r.status === 400, `got ${r.status}`);
}

// ---- 3. honeypot ---------------------------------------------------------
{
  const r = await run('POST', { email: 'bot@example.com', company: 'Totally a human' }, '10.0.3.1');
  check('honeypot filled -> 200', r.status === 200, `got ${r.status}`);
  check('honeypot reports ignored', r.data && r.data.status === 'ignored', JSON.stringify(r.data));
  check('honeypot stores nothing', r.updates.length === 0);
}

// ---- 4. happy path: normalization + upsert shape -------------------------
{
  const r = await run('POST', { email: '  Subscriber@Example.COM ', name: 'Hardik' }, '10.0.4.1');
  check('valid email -> 200', r.status === 200, `got ${r.status}`);
  check('reports subscribed', r.data && r.data.status === 'subscribed', JSON.stringify(r.data));
  check('single upsert issued', r.updates.length === 1, `got ${r.updates.length}`);
  const [filter, update, options] = r.updates[0] || [];
  check('email lowercased+trimmed in filter', filter && filter.email === 'subscriber@example.com', JSON.stringify(filter));
  check('upsert option set', options && options.upsert === true, JSON.stringify(options));
  check('$set keeps lastSeenAt + name',
    update && update.$set && !!update.$set.lastSeenAt && update.$set.name === 'Hardik',
    JSON.stringify(update && update.$set));
  check('$setOnInsert stamps createdAt + source',
    update && update.$setOnInsert && !!update.$setOnInsert.createdAt && update.$setOnInsert.source === 'newsletter',
    JSON.stringify(update && update.$setOnInsert));
}
{
  // Duplicate subscription: same email, no name this time.
  stubImpl = async () => ({
    updateOne: async (...args) => {
      updateCalls.push(args);
      return { upsertedCount: 0, matchedCount: 1 };
    },
  });
  const r = await run('POST', { email: 'subscriber@example.com' }, '10.0.4.2');
  check('existing email -> 200 already_subscribed', r.status === 200 && r.data.status === 'already_subscribed',
    `${r.status} ${JSON.stringify(r.data)}`);
  stubImpl = async () => ({
    updateOne: async (...args) => {
      updateCalls.push(args);
      return { upsertedCount: 1, matchedCount: 0 };
    },
  });
}

// ---- 5. body parsing variants -------------------------------------------
{
  const r = await run('POST', 'email=string%40body.com&name=String', '10.0.5.1');
  check('urlencoded string body -> 200', r.status === 200 && r.data.status === 'subscribed',
    `${r.status} ${JSON.stringify(r.data)}`);
}
{
  const r = await run('POST', JSON.stringify({ email: 'json@body.com' }), '10.0.5.2');
  check('JSON string body -> 200', r.status === 200 && r.data.status === 'subscribed',
    `${r.status} ${JSON.stringify(r.data)}`);
}
{
  // Request that is an async-iterable stream with .pipe (no pre-parsed body).
  const stream = Readable.from(['email=stream%40body.com']);
  const streamReq = Object.assign(stream, { method: 'POST', headers: { 'x-forwarded-for': '10.0.5.4' }, socket: { remoteAddress: '10.0.5.4' } });
  const res = makeRes();
  await handler(streamReq, res);
  const data = res.body ? JSON.parse(res.body) : null;
  check('stream body -> 200', res.statusCode === 200 && data && data.status === 'subscribed',
    `${res.statusCode} ${JSON.stringify(data)}`);
}

// ---- 6. database failure modes ------------------------------------------
{
  stubImpl = async () => {
    const e = new Error('MONGODB_URI is not configured');
    e.code = 'NO_URI';
    throw e;
  };
  const r = await run('POST', { email: 'nc@example.com' }, '10.0.6.1');
  check('missing MONGODB_URI -> 503', r.status === 503, `got ${r.status}`);
  check('  message says not configured', /not configured/i.test(r.data && r.data.error || ''), JSON.stringify(r.data));
  stubImpl = async () => { throw new Error('ECONNREFUSED'); };
  const r2 = await run('POST', { email: 'db@example.com' }, '10.0.6.2');
  check('DB unreachable -> 503', r2.status === 503, `got ${r2.status}`);
  check('  generic message, no internals', /temporarily unavailable/i.test(r2.data && r2.data.error || '') &&
    !/ECONNREFUSED/.test(JSON.stringify(r2.data)), JSON.stringify(r2.data));
  stubImpl = async () => ({
    updateOne: async (...args) => {
      updateCalls.push(args);
      return { upsertedCount: 1 };
    },
  });
}

// ---- 7. rate limiting (dedicated IP, runs last) --------------------------
{
  const ip = '10.0.7.7';
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    const r = await run('POST', { email: `rl${i}@example.com` }, ip);
    statuses.push(r.status);
  }
  check('first five allowed', statuses.slice(0, 5).every(s => s === 200), statuses.join(','));
  check('sixth blocked with 429', statuses[5] === 429, `got ${statuses[5]}`);
  const other = await run('POST', { email: 'other@example.com' }, '10.0.7.8');
  check('other IPs unaffected', other.status === 200, `got ${other.status}`);
}

console.log(`\nverify-api: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  x ' + f);
}
process.exit(fail ? 1 : 0);
