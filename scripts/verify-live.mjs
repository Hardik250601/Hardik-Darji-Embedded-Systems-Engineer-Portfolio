// verify-live.mjs - end-to-end test of the newsletter pipeline against the
// real MongoDB Atlas cluster. Unlike verify:api (stubbed, offline), this one
// needs MONGODB_URI; it SKIPS with exit 0 when the variable is not set and
// must fully pass when it is.
//
// Flow: real api/subscribe handler -> real Atlas write -> assert document,
// timestamps and the unique email index -> re-subscribe (dedupe) -> REMOVE
// the test document so the database is left exactly as it was found.
//
//   npm run verify:live
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(process.argv[2] || process.cwd());

if (!process.env.MONGODB_URI) {
  console.log('verify-live: SKIPPED - MONGODB_URI is not set');
  process.exit(0);
}

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail = '') {
  if (cond) pass++;
  else { fail++; failures.push(`${name}${detail ? ' :: ' + detail : ''}`); }
}

const TEST_EMAIL = 'verify-live-test@portfolio.test';
const TEST_NAME = 'Verify Live';

// Real handler + real lib (no stubs).
const handler = require(path.join(ROOT, 'api', 'subscribe.js'));
const { getSubscribers } = require(path.join(ROOT, 'lib', 'mongodb.js'));

function makeReq(body, ip = '10.9.9.1') {
  return { method: 'POST', body, headers: { 'x-forwarded-for': ip }, socket: { remoteAddress: ip } };
}
function makeRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.end = b => { res.body = b; return res; };
  return res;
}
async function post(body, ip) {
  const res = makeRes();
  await handler(makeReq(body, ip), res);
  return { status: res.statusCode, data: res.body ? JSON.parse(res.body) : null };
}

const mongo = (globalThis.__portfolioMongo = globalThis.__portfolioMongo || {
  clientPromise: null,
  indexPromise: null,
});

try {
  const collection = await getSubscribers();

  // Idempotent reruns: clear any leftover marker from a previous run.
  await collection.deleteMany({ email: TEST_EMAIL });

  // 1. subscribe through the real handler
  const first = await post({ email: TEST_EMAIL, name: TEST_NAME }, '10.9.9.1');
  check('subscribe -> 200', first.status === 200, `${first.status} ${JSON.stringify(first.data)}`);
  check('reports subscribed', first.data && first.data.status === 'subscribed', JSON.stringify(first.data));

  // 2. document stored with the expected shape
  const doc = await collection.findOne({ email: TEST_EMAIL });
  check('document persisted', !!doc);
  if (doc) {
    check('email stored lowercased', doc.email === TEST_EMAIL, String(doc.email));
    check('name stored', doc.name === TEST_NAME, String(doc.name));
    check('source stamped', doc.source === 'newsletter', String(doc.source));
    check('createdAt is a Date', doc.createdAt instanceof Date, typeof doc.createdAt);
    check('lastSeenAt is a Date', doc.lastSeenAt instanceof Date, typeof doc.lastSeenAt);
  }

  // 3. unique email index exists
  const indexes = await collection.indexes();
  const emailIdx = indexes.find(i => i.key && i.key.email === 1);
  check('unique email index present', !!emailIdx && emailIdx.unique === true,
    JSON.stringify(emailIdx));

  // 4. re-subscribe dedupes instead of duplicating
  const second = await post({ email: TEST_EMAIL.toUpperCase() }, '10.9.9.2');
  check('re-subscribe -> 200 already_subscribed',
    second.status === 200 && second.data && second.data.status === 'already_subscribed',
    `${second.status} ${JSON.stringify(second.data)}`);
  const count = await collection.countDocuments({ email: TEST_EMAIL });
  check('exactly one document after dedupe', count === 1, `count=${count}`);
} catch (err) {
  check('live connection succeeded', false, String(err && err.message || err));
} finally {
  // 5. leave the database exactly as found
  try {
    const collection = await getSubscribers();
    await collection.deleteMany({ email: TEST_EMAIL });
    const left = await collection.countDocuments({ email: TEST_EMAIL });
    check('test document removed', left === 0, `left=${left}`);
  } catch (err) {
    check('cleanup succeeded', false, String(err && err.message || err));
  }
  // Close the pooled client so the process can exit.
  try {
    if (mongo.clientPromise) (await mongo.clientPromise).close();
  } catch { /* best effort */ }
}

console.log(`\nverify-live: ${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log('  x ' + f);
}
process.exit(fail ? 1 : 0);
