// lib/mongodb.js - shared MongoDB Atlas connection for the serverless
// functions in api/. The client is cached on `global` so warm function
// invocations reuse one connection pool instead of reconnecting per request.
//
// Requires the MONGODB_URI environment variable (Atlas connection string).
// Nothing here throws at import time: tools that only serve static files
// (preview, static audits) must keep working without the secret.
const { MongoClient } = require('mongodb');

// Persist the cache on globalThis so it survives module reloads in dev and
// is shared across warm invocations in serverless environments.
const cache = (globalThis.__portfolioMongo = globalThis.__portfolioMongo || {
  clientPromise: null,
  indexPromise: null,
});

/**
 * Connect and resolve the configured database.
 * Throws an error with `code = 'NO_URI'` when MONGODB_URI is not set, so the
 * caller can distinguish "not configured yet" (503) from a real DB failure.
 */
async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    const err = new Error('MONGODB_URI is not configured');
    err.code = 'NO_URI';
    throw err;
  }

  if (!cache.clientPromise) {
    cache.clientPromise = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      appName: 'portfolio-newsletter',
    }).connect();
  }
  // If a previous connect attempt failed, allow the next request to retry.
  let client;
  try {
    client = await cache.clientPromise;
  } catch (err) {
    cache.clientPromise = null;
    throw err;
  }
  return client.db(process.env.MONGODB_DB || 'portfolio');
}

/**
 * Resolve the subscribers collection, ensuring the unique email index.
 */
async function getSubscribers() {
  const db = await getDb();
  const collection = db.collection('subscribers');

  // Unique index on email makes duplicate subscriptions impossible even
  // under concurrent upserts. Failure to build it must not fail a subscribe
  // (e.g. stray pre-existing duplicates) - it is retried on a later call.
  if (!cache.indexPromise) {
    cache.indexPromise = collection
      .createIndex({ email: 1 }, { unique: true })
      .catch(err => {
        cache.indexPromise = null;
        console.error('[subscribe] could not ensure unique email index:', err.message);
      });
  }
  await cache.indexPromise;

  return collection;
}

module.exports = { getDb, getSubscribers };
