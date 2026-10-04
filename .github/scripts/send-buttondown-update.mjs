import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const apiKey = process.env.BUTTONDOWN_API_KEY;
const beforeSha = process.env.BEFORE_SHA;
const siteUrl = (process.env.SITE_URL || 'https://hardikdarjiportfolio.vercel.app').replace(/\/$/, '');

if (!apiKey) {
  console.warn('BUTTONDOWN_API_KEY is not configured. Skipping newsletter notification.');
  process.exit(0);
}

function readContentAtRevision(revision) {
  if (!revision || /^0+$/.test(revision)) return { projects: [], blogs: [] };
  try {
    return JSON.parse(execFileSync('git', ['show', `${revision}:content.json`], { encoding: 'utf8' }));
  } catch {
    return { projects: [], blogs: [] };
  }
}

const previous = readContentAtRevision(beforeSha);
const current = JSON.parse(readFileSync('content.json', 'utf8'));
const previousSlugs = new Set([
  ...(previous.projects || []).map(item => `project:${item.slug}`),
  ...(previous.blogs || []).map(item => `blog:${item.slug}`),
]);
const additions = [
  ...(current.projects || [])
    .filter(item => !previousSlugs.has(`project:${item.slug}`))
    .map(item => ({ ...item, kind: 'Project', url: `${siteUrl}/project-template.html?slug=${encodeURIComponent(item.slug)}` })),
  ...(current.blogs || [])
    .filter(item => !previousSlugs.has(`blog:${item.slug}`))
    .map(item => ({ ...item, kind: 'Blog post', url: `${siteUrl}/blog-template.html?slug=${encodeURIComponent(item.slug)}` })),
];

if (!additions.length) {
  console.log('No new projects or blog posts. No newsletter sent.');
  process.exit(0);
}

const cards = additions.map(item => `
  <article style="margin:0 0 24px;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
    <p style="color:#b45309;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:12px">${item.kind}</p>
    <h2 style="margin:8px 0;font-size:22px">${escapeHtml(item.title)}</h2>
    <p>${escapeHtml(item.short_summary || item.short_description || '')}</p>
    <a href="${item.url}" style="color:#b45309;font-weight:700">Read more</a>
  </article>`).join('\n');
const subject = additions.length === 1
  ? `New ${additions[0].kind.toLowerCase()}: ${additions[0].title}`
  : `New portfolio updates from Hardik Darji (${additions.length})`;
const body = `<!-- buttondown-editor-mode: fancy -->
<h1>New portfolio updates</h1>
<p>Hardik Darji has added new work to the portfolio.</p>
${cards}
<p style="color:#6b7280;font-size:12px">You are receiving this because you subscribed to portfolio updates.</p>`;

const response = await fetch('https://api.buttondown.com/v1/emails', {
  method: 'POST',
  headers: {
    Authorization: `Token ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ subject, body, status: 'about_to_send', email_type: 'public' }),
});

if (!response.ok) {
  const detail = await response.text();
  throw new Error(`Buttondown email creation failed (${response.status}): ${detail}`);
}

const email = await response.json();
console.log(`Buttondown email ${email.id || '(created)'} queued for ${additions.length} new item(s).`);

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
