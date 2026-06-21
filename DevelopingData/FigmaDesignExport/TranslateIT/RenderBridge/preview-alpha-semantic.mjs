import fs from 'node:fs';
import path from 'node:path';

const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const output = path.resolve(process.cwd(), 'alpha-semantic-preview.html');

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

function safeText(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replace(/\s+/g, ' ')
    .trim();
}

function cut(value, max = 160) {
  const text = safeText(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function sectionText(section, index, fallback) {
  const items = Array.isArray(section.priorityText) ? section.priorityText : [];
  return cut((items[index] && items[index].text) || fallback, 220);
}

function render(section, index) {
  const type = String(section.templateIntent || 'content');
  const heading = sectionText(section, 0, section.name || `Section ${index + 1}`);
  const body = sectionText(section, 1, 'Editable generated content placeholder.');
  const risk = section.overflowRisk ? '<p class="risk">Overflow risk detected. Content was intentionally truncated.</p>' : '';
  const meta = `<p class="meta">${cut(section.suggestedLayout || type, 50)} / ${cut(section.density || 'normal', 20)}</p>`;

  if (type === 'header') {
    return `<section class="block header"><strong>${heading}</strong><span>Navigation</span><button>Contact</button></section>`;
  }
  if (type === 'hero') {
    return `<section class="block split"><div>${meta}<h1>${heading}</h1><p>${body}</p><button>Explore</button>${risk}</div><div class="media">Media</div></section>`;
  }
  if (type === 'gallery') {
    return `<section class="block"><div>${meta}<h2>${heading}</h2>${risk}</div><div class="cards"><article>Card 1</article><article>Card 2</article><article>Card 3</article></div></section>`;
  }
  if (type === 'footer') {
    return `<section class="block footer"><h3>${heading}</h3><p>${body}</p>${risk}</section>`;
  }
  return `<section class="block split"><div>${meta}<h2>${heading}</h2><p>${body}</p>${risk}</div><div class="media">Media</div></section>`;
}

const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const plan = payload.rebuildPlan || {};
const sections = Array.isArray(plan.sections) ? plan.sections : [];
const hints = plan.qualityHints || {};

const html = `<!doctype html><html><head><meta charset="utf-8"><title>TranslateIT Alpha Semantic Preview</title><style>
body{margin:0;background:#0b1020;font-family:Arial,sans-serif;color:#111827}.wrap{max-width:1280px;margin:auto;padding:40px}.top{color:white}.summary{background:#111827;color:#cbd5e1;border:1px solid #334155;border-radius:18px;padding:16px;margin:18px 0}.block{background:white;border:1px solid #e5e7eb;border-radius:28px;margin:24px 0;padding:32px;box-shadow:0 18px 50px rgba(15,23,42,.14)}.split{display:grid;grid-template-columns:1.2fr .8fr;gap:44px;align-items:center}.header{display:flex;align-items:center;justify-content:space-between}.media{background:#e5e7eb;border-radius:22px;min-height:220px;display:grid;place-items:center;color:#64748b;font-weight:700}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.cards article{background:#f8fafc;border:1px solid #e5e7eb;border-radius:20px;padding:40px 20px;text-align:center}.footer{background:#0f172a;color:#f8fafc}.footer p{color:#cbd5e1}.meta{color:#2563eb;font-size:12px;font-weight:700}.risk{display:inline-block;background:#fee2e2;color:#991b1b;border-radius:999px;padding:7px 10px;font-size:12px;font-weight:700}button{border:0;background:#2563eb;color:#fff;border-radius:999px;padding:12px 22px;font-weight:800}@media(max-width:800px){.split,.cards{grid-template-columns:1fr}.header{align-items:flex-start;flex-direction:column;gap:16px}}
</style></head><body><main class="wrap"><div class="top"><h1>TranslateIT Version 0.1 - Alpha Semantic Preview</h1><p>${cut(targetUrl, 120)}</p></div><div class="summary">Sections: ${sections.length} | Overflow risk: ${hints.overflowRiskCount || 0} | Dense sections: ${hints.denseSectionCount || 0} | Component blueprints: ${(plan.componentBlueprints || []).length}</div>${sections.map(render).join('\n')}</main></body></html>`;

fs.writeFileSync(output, html, 'utf8');
console.log(JSON.stringify({ ok: true, output, sections: sections.length, publicVersion: payload.publicVersion, mode: payload.mode, adapter: payload.adapter, diagnostics: payload.diagnostics, qualityHints: hints }, null, 2));
