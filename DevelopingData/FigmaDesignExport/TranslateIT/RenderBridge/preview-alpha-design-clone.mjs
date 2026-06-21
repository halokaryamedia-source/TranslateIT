import fs from 'node:fs';
import path from 'node:path';

const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const output = path.resolve(process.cwd(), 'alpha-design-clone-preview.html');

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

function esc(value) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function clean(value, max = 160) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function intent(section) {
  const raw = String(section.templateIntent || section.intent || '').toLowerCase();
  if (raw.includes('header')) return 'header';
  if (raw.includes('hero')) return 'hero';
  if (raw.includes('gallery') || raw.includes('grid')) return 'gallery';
  if (raw.includes('footer')) return 'footer';
  return 'content';
}

function texts(section) {
  const values = (section.layers || [])
    .filter((layer) => layer.type === 'text')
    .map((layer) => clean(layer.text || layer.name, 180))
    .filter(Boolean);
  return [...new Set(values)].slice(0, 8);
}

function imageCount(section) {
  return (section.layers || []).filter((layer) => layer.type === 'image').length;
}

function renderSection(section, index) {
  const type = intent(section);
  const t = texts(section);
  const heading = esc(t[0] || section.name || `Section ${index + 1}`);
  const body = esc(t.slice(1, 5).join(' ') || 'Editable generated content placeholder.');
  const media = imageCount(section) ? '<div class="media">Image detected</div>' : '<div class="media muted">Media placeholder</div>';

  if (type === 'header') {
    const nav = (t.slice(1, 6).length ? t.slice(1, 6) : ['Home', 'About', 'Projects', 'Contact']).map((item) => `<span>${esc(clean(item, 20))}</span>`).join('');
    return `<section class="block header"><strong>${heading}</strong><nav>${nav}</nav><button>Contact</button></section>`;
  }
  if (type === 'hero') {
    return `<section class="block hero"><div><small>${esc(section.name || 'Hero')}</small><h1>${heading}</h1><p>${body}</p><button>Explore</button></div>${media}</section>`;
  }
  if (type === 'gallery') {
    const cards = [0, 1, 2].map((i) => `<article><div class="thumb">${imageCount(section) ? 'Image' : 'Media'}</div><h3>${esc(t[i + 1] || `Card ${i + 1}`)}</h3><p>Editable card description.</p></article>`).join('');
    return `<section class="block gallery"><h2>${heading}</h2><div class="cards">${cards}</div></section>`;
  }
  if (type === 'footer') {
    return `<section class="block footer"><h3>${heading}</h3><p>${body}</p></section>`;
  }
  return `<section class="block content"><div><small>${esc(section.name || 'Content')}</small><h2>${heading}</h2><p>${body}</p></div>${media}</section>`;
}

const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const plan = payload.rebuildPlan || {};
const sections = Array.isArray(plan.sections) && plan.sections.length ? plan.sections : payload.sections || [];

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>TranslateIT Alpha Design Clone Preview</title>
<style>
body{margin:0;background:#0b1020;color:#111827;font-family:Inter,Segoe UI,Arial,sans-serif}.wrap{max-width:1280px;margin:0 auto;padding:40px}.top{color:#f8fafc;margin-bottom:24px}.top p{color:#94a3b8}.block{background:#fff;border:1px solid #e5e7eb;border-radius:28px;margin:24px 0;padding:32px;box-shadow:0 18px 50px rgba(15,23,42,.14)}.header{display:flex;align-items:center;gap:32px}.header nav{display:flex;gap:22px;flex:1;color:#64748b}.hero,.content{display:grid;grid-template-columns:1.2fr .8fr;gap:44px;align-items:center}.hero h1{font-size:56px;line-height:1;margin:12px 0}.content h2,.gallery h2{font-size:34px;margin:10px 0}.block p{color:#64748b;line-height:1.6}.media,.thumb{background:#e5e7eb;border-radius:22px;min-height:220px;display:grid;place-items:center;color:#64748b;font-weight:700}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}.cards article{background:#f8fafc;border:1px solid #e5e7eb;border-radius:22px;padding:18px}.thumb{min-height:120px}.footer{background:#0f172a;color:#f8fafc}.footer p{color:#cbd5e1}button{border:0;background:#2563eb;color:#fff;border-radius:999px;padding:12px 22px;font-weight:800}.muted{background:#f1f5f9}@media(max-width:800px){.hero,.content,.cards{grid-template-columns:1fr}.header{align-items:flex-start;flex-direction:column}}
</style>
</head>
<body><main class="wrap"><div class="top"><h1>TranslateIT Version 0.1 - Alpha Preview</h1><p>${esc(targetUrl)} · This preview is only for catching obvious layout issues before Figma validation.</p></div>${sections.map(renderSection).join('\n')}</main></body></html>`;

fs.writeFileSync(output, html, 'utf8');
console.log(JSON.stringify({ ok: true, output, sections: sections.length, mode: payload.mode, adapter: payload.adapter, diagnostics: payload.diagnostics }, null, 2));
