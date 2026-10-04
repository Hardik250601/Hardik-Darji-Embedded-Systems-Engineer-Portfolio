// Authenticated image upload/delete API backed by a public Vercel Blob store.
'use strict';

const { put, del } = require('@vercel/blob');
const { isCmsAdmin } = require('../lib/cms-auth');

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MIME_EXT = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function respond(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
}

function safeSlug(value) {
  const slug = String(value || '').toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : '';
}

async function readBinary(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += part.length;
    if (size > MAX_IMAGE_BYTES) throw new Error('Images must be 4 MB or smaller.');
    chunks.push(part);
  }
  return Buffer.concat(chunks);
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
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

module.exports = async (req, res) => {
  if (!await isCmsAdmin(req)) return respond(res, 401, { error: 'Your CMS session expired. Sign in again.' });
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return respond(res, 503, { error: 'Vercel Blob is not configured. Add a Blob store to this Vercel project.' });

  if (req.method === 'POST') {
    const slug = safeSlug(new URL(req.url, 'https://portfolio.invalid').searchParams.get('slug'));
    const contentType = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
    const extension = MIME_EXT[contentType];
    if (!slug) return respond(res, 400, { error: 'A valid content slug is required.' });
    if (!extension) return respond(res, 415, { error: 'Use a JPG, PNG, WebP, GIF, or AVIF image.' });
    try {
      const data = await readBinary(req);
      if (!data.length) return respond(res, 400, { error: 'Choose an image to upload.' });
      const blob = await put(`portfolio/${slug}/${crypto.randomUUID()}.${extension}`, data, {
        access: 'public',
        addRandomSuffix: false,
        contentType,
        token,
      });
      return respond(res, 201, { url: blob.url, pathname: blob.pathname, contentType, size: data.length });
    } catch (error) {
      console.error('[media] upload failed:', error.message);
      return respond(res, error.message.includes('4 MB') ? 413 : 503, {
        error: error.message.includes('4 MB') ? error.message : 'Image upload failed. Check the Vercel Blob store configuration.',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const body = await readJson(req);
      const url = new URL(String(body.url || ''));
      const storeId = process.env.BLOB_STORE_ID;
      const expectedHost = storeId ? `${storeId}.public.blob.vercel-storage.com` : '';
      if (url.protocol !== 'https:' || !expectedHost || url.hostname !== expectedHost || !url.pathname.startsWith('/portfolio/')) {
        return respond(res, 400, { error: 'Only portfolio images from this public Blob store can be deleted.' });
      }
      await del(url.toString(), { token });
      return respond(res, 200, { ok: true });
    } catch (error) {
      console.error('[media] delete failed:', error.message);
      return respond(res, 400, { error: 'Could not delete that portfolio image.' });
    }
  }
  res.setHeader('Allow', 'POST, DELETE');
  return respond(res, 405, { error: 'Method not allowed.' });
};
module.exports.config = { api: { bodyParser: false } };
