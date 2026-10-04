// Neon-backed content store. content.json is used only for one-time seeding and
// as a static deployment snapshot; the live site reads this store first.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { neon } = require('@neondatabase/serverless');

const CONTENT_KINDS = ['projects', 'blogs', 'testimonials'];
const SEED_KEY = 'content-json-seed-v1';
let initPromise;

function getSql() {
  const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.POSTGRES_URL ||
    process.env.Hardik_portfolio_POSTGRES_URL || process.env.Hardik_portfolio_DATABASE_URL;
  if (!url) {
    const error = new Error('Neon database is not configured. Add DATABASE_URL in Vercel.');
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  return neon(url);
}

function getContentFile() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
}

function seedRows(content) {
  return CONTENT_KINDS.flatMap(kind => (Array.isArray(content[kind]) ? content[kind] : [])
    .map((data, sort_order) => ({
      kind,
      slug: String(data.slug || (kind === 'testimonials' ? slugify(data.name) : '') || `${kind}-${sort_order + 1}`),
      sort_order,
      data: data.slug ? data : { ...data, slug: String(slugify(data.name) || `${kind}-${sort_order + 1}`) },
    })));
}

function slugify(value) {
  return String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function initialize() {
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS portfolio_content (
    kind text NOT NULL,
    slug text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (kind, slug)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS portfolio_content_state (
    state_key text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;

  const initialRows = JSON.stringify(seedRows(getContentFile()));
  // The marker and seed rows are committed by one SQL statement. Concurrent
  // first requests cannot seed twice, and later deletes stay deleted.
  await sql`WITH claimed AS (
      INSERT INTO portfolio_content_state (state_key)
      VALUES (${SEED_KEY})
      ON CONFLICT (state_key) DO NOTHING
      RETURNING state_key
    ), seed_rows AS (
      SELECT item.value->>'kind' AS kind,
             item.value->>'slug' AS slug,
             (item.value->>'sort_order')::integer AS sort_order,
             item.value->'data' AS data
      FROM claimed
      CROSS JOIN jsonb_array_elements(${initialRows}::jsonb) AS item(value)
    )
    INSERT INTO portfolio_content (kind, slug, sort_order, data)
    SELECT kind, slug, sort_order, data FROM seed_rows
    ON CONFLICT (kind, slug) DO NOTHING`;
  return sql;
}

function readySql() {
  if (!initPromise) {
    initPromise = initialize().catch(error => {
      initPromise = null;
      throw error;
    });
  }
  return initPromise;
}

async function readContent() {
  const sql = await readySql();
  const rows = await sql`SELECT kind, data FROM portfolio_content
    WHERE kind = ANY(${CONTENT_KINDS}::text[])
    ORDER BY kind, sort_order, slug`;
  const content = { projects: [], blogs: [], testimonials: [] };
  for (const row of rows) content[row.kind].push(row.data);
  return content;
}

function normalizeContent(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('Content must be an object.');
  }
  const result = {};
  for (const kind of CONTENT_KINDS) {
    if (!Array.isArray(content[kind])) throw new Error(`The ${kind} field must be an array.`);
    result[kind] = content[kind].map((item, index) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`Invalid ${kind} entry ${index + 1}.`);
      const slug = String(item.slug || (kind === 'testimonials' ? slugify(item.name) : '')).trim();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Invalid ${kind} slug at entry ${index + 1}.`);
      return { kind, slug, sort_order: index, data: item.slug ? item : { ...item, slug } };
    });
  }
  return result;
}

async function replaceContent(content) {
  const normalized = normalizeContent(content);
  const sql = await readySql();
  const rows = JSON.stringify(CONTENT_KINDS.flatMap(kind => normalized[kind]));
  await sql`WITH incoming AS MATERIALIZED (
      SELECT item.value->>'kind' AS kind,
             item.value->>'slug' AS slug,
             (item.value->>'sort_order')::integer AS sort_order,
             item.value->'data' AS data
      FROM jsonb_array_elements(${rows}::jsonb) AS item(value)
    ), removed AS (
      DELETE FROM portfolio_content current
      WHERE current.kind = ANY(${CONTENT_KINDS}::text[])
        AND NOT EXISTS (
          SELECT 1 FROM incoming
          WHERE incoming.kind = current.kind AND incoming.slug = current.slug
        )
      RETURNING 1
    ), upserted AS (
      INSERT INTO portfolio_content (kind, slug, sort_order, data, updated_at)
      SELECT kind, slug, sort_order, data, now() FROM incoming
      ON CONFLICT (kind, slug) DO UPDATE
        SET sort_order = EXCLUDED.sort_order,
            data = EXCLUDED.data,
            updated_at = now()
      RETURNING 1
    )
    SELECT (SELECT count(*) FROM upserted) AS saved,
           (SELECT count(*) FROM removed) AS removed`;
  return readContent();
}

module.exports = { CONTENT_KINDS, readContent, replaceContent, normalizeContent };
