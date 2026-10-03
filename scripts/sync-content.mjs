// sync-content.mjs - one-way mirror of content.json into MongoDB Atlas.
//
// content.json stays the SOURCE OF TRUTH for the site: the static pages, OG
// images and sitemap are all generated from it, and social crawlers need that
// baked HTML. This script additionally mirrors the same data into Atlas
// (collections `projects`, `blogs`, `testimonials`, keyed by `slug`) so the
// content is queryable/browsable there. Nothing in the site reads these
// collections back - re-run this after editing content.json.
//
//   npm run sync:content            upsert everything, report orphans
//   npm run sync:content -- --prune delete Atlas docs whose slug is gone
//
// Exits non-zero unless every entry is present in Atlas afterwards.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(process.argv[2] || process.cwd());
const PRUNE = process.argv.includes('--prune');

if (!process.env.MONGODB_URI) {
  console.error('sync:content FAILED - MONGODB_URI is not set');
  process.exit(1);
}

const { getDb } = require(path.join(ROOT, 'lib', 'mongodb.js'));
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content.json'), 'utf8'));

// Which top-level content keys map to which Atlas collection.
const MIRRORS = [
  { key: 'projects', collection: 'projects' },
  { key: 'blogs', collection: 'blogs' },
  { key: 'testimonials', collection: 'testimonials' },
];

let failures = 0;
const fail = msg => { failures++; console.error('  x ' + msg); };

const db = await getDb();
const syncedAt = new Date();

for (const { key, collection: name } of MIRRORS) {
  const entries = Array.isArray(content[key]) ? content[key] : [];
  const collection = db.collection(name);

  // Slugs are the identity of an entry - enforce uniqueness so a bad sync
  // can never silently duplicate content.
  await collection.createIndex({ slug: 1 }, { unique: true });

  const slugs = new Set();
  for (const entry of entries) {
    if (!entry || !entry.slug) { fail(`${name}: entry without slug`); continue; }
    slugs.add(entry.slug);
    await collection.updateOne(
      { slug: entry.slug },
      { $set: { ...entry, syncedAt } },
      { upsert: true }
    );
  }

  // Orphans: present in Atlas but no longer in content.json.
  const all = await collection.find({}, { projection: { slug: 1 } }).toArray();
  const orphans = all.map(d => d.slug).filter(s => !slugs.has(s));
  if (orphans.length) {
    if (PRUNE) {
      const res = await collection.deleteMany({ slug: { $in: orphans } });
      console.log(`${name}: pruned ${res.deletedCount} orphan(s): ${orphans.join(', ')}`);
    } else {
      console.log(`${name}: ${orphans.length} orphan(s) in Atlas not in content.json: ${orphans.join(', ')} (re-run with -- --prune to remove)`);
    }
  }

  // Verify: every entry must exist in Atlas after the upsert.
  let found = 0;
  for (const slug of slugs) {
    if (await collection.findOne({ slug }, { projection: { _id: 1 } })) found++;
    else fail(`${name}: ${slug} missing after sync`);
  }
  const count = await collection.countDocuments();
  console.log(`${name}: ${found}/${slugs.size} entries verified, collection holds ${count} document(s)`);
}

try {
  if (globalThis.__portfolioMongo?.clientPromise) {
    (await globalThis.__portfolioMongo.clientPromise).close();
  }
} catch { /* best effort */ }

if (failures) {
  console.error(`\nsync:content FAILED (${failures} problem(s))`);
  process.exit(1);
}
console.log('\nsync:content OK - Atlas now mirrors content.json');
