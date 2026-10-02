import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const apiKey = process.env.BREVO_API_KEY;
const listId = Number(process.env.BREVO_LIST_ID || 3);
const beforeSha = process.env.BEFORE_SHA;
const senderEmail = process.env.BREVO_SENDER_EMAIL || 'hmdarji921@gmail.com';
const senderName = process.env.BREVO_SENDER_NAME || 'Hardik Darji';
// Must match the repo owner used in index.html (canonical/og:url) and crm-github.js.
const SITE_URL = process.env.SITE_URL || 'https://hardikdarjiportfolio.vercel.app';

if (!apiKey) throw new Error('BREVO_API_KEY is not configured');
if (!Number.isInteger(listId)) throw new Error('BREVO_LIST_ID must be an integer');

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
  ...(previous.blogs || []).map(item => `blog:${item.slug}`)
]);
const addedProjects = (current.projects || []).filter(item => !previousSlugs.has(`project:${item.slug}`));
const addedBlogs = (current.blogs || []).filter(item => !previousSlugs.has(`blog:${item.slug}`));
const additions = [
  ...addedProjects.map(item => ({ ...item, kind: 'Project', url: `${SITE_URL}/project-template.html?slug=${encodeURIComponent(item.slug)}` })),
  ...addedBlogs.map(item => ({ ...item, kind: 'Blog post', url: `${SITE_URL}/blog-template.html?slug=${encodeURIComponent(item.slug)}` }))
];

if (!additions.length) {
  console.log('No new projects or blog posts. No Brevo campaign sent.');
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
const htmlContent = `
<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111827;max-width:680px;margin:0 auto;padding:24px">
<h1>New portfolio updates</h1><p>Hardik Darji has added new work to the portfolio.</p>${cards}
<p style="color:#6b7280;font-size:12px">You are receiving this because you subscribed to the Hardik Darji portfolio newsletter.</p>
</body></html>`;

const response = await fetch('https://api.brevo.com/v3/emailCampaigns', {
  method: 'POST',
  headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({
    name: `Portfolio update ${new Date().toISOString()}`,
    subject,
    sender: { name: senderName, email: senderEmail },
    type: 'classic',
    htmlContent,
    recipients: { listIds: [listId] },
    header: subject,
    footer: 'You received this email because you subscribed to the portfolio newsletter.'
  })
});
if (!response.ok) throw new Error(`Brevo campaign creation failed (${response.status}): ${await response.text()}`);
const campaign = await response.json();

const sendResponse = await fetch(`https://api.brevo.com/v3/emailCampaigns/${campaign.id}/sendNow`, {
  method: 'POST',
  headers: { 'api-key': apiKey, Accept: 'application/json' }
});
if (!sendResponse.ok) throw new Error(`Brevo campaign send failed (${sendResponse.status}): ${await sendResponse.text()}`);
console.log(`Brevo campaign ${campaign.id} sent for ${additions.length} new item(s).`);

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
