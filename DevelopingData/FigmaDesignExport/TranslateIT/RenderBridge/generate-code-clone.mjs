import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];
const outputDir = process.argv[3] || path.resolve(process.cwd(), 'translateit-code-clone');

if (!inputPath) {
  console.error('Usage: node generate-code-clone.mjs payload.json ./output-dir');
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const layers = Array.isArray(payload.layers) ? payload.layers : [];
const sections = Array.isArray(payload.sections) ? payload.sections : [];

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value || 'section').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

function unique(items, fn, limit) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = fn(item);
    if (!key || seen.has(key) || (limit && out.length >= limit)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function textOf(layer) {
  return clean(layer.text || layer.name || '');
}

function cssColor(value, fallback = '') {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return fallback;
  const hex = raw.match(/#[\da-fA-F]{6}|#[\da-fA-F]{3}/);
  if (hex) return hex[0];
  const rgba = raw.match(/rgba?\(([^)]+)\)/);
  if (!rgba) return fallback;
  const parts = rgba[1].split(',').map((x) => parseFloat(x));
  if (parts.length < 3 || (parts.length >= 4 && parts[3] === 0)) return fallback;
  return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
}

function collectColors() {
  const colors = [];
  for (const layer of layers) {
    const style = layer.style || {};
    for (const value of [style.color, style.backgroundColor, style.borderTopColor, style.borderBottomColor]) {
      const color = cssColor(value);
      if (color && !colors.includes(color)) colors.push(color);
    }
  }
  return colors.slice(0, 12);
}

function sectionIntent(section, index) {
  if (section.role === 'header') return 'header';
  if (section.role === 'footer') return 'footer';
  const text = (section.layers || []).filter((l) => l.type === 'text').map(textOf).join(' ').toLowerCase();
  if (index === 1 || /hero|welcome|unlock|discover|introducing/.test(text)) return 'hero';
  if (/portfolio|project|gallery|work|case/.test(text)) return 'card-grid';
  if (/about|team|culture|mission/.test(text)) return 'content';
  return 'section';
}

function buildPlan() {
  const colors = collectColors();
  return {
    title: clean(payload.title || 'Website Clone'),
    url: payload.url || '',
    tokens: {
      colors,
      typography: unique(layers.filter((l) => l.type === 'text'), (l) => {
        const s = l.style || {};
        return [l.role, s.fontSize, s.fontWeight, s.color].join('|');
      }, 12).map((l) => ({ role: l.role || 'text', fontSize: (l.style || {}).fontSize || '', fontWeight: (l.style || {}).fontWeight || '', color: cssColor((l.style || {}).color, '') }))
    },
    sections: sections.map((section, index) => ({
      name: section.name || `Section ${index + 1}`,
      role: section.role || 'section',
      intent: sectionIntent(section, index),
      text: unique((section.layers || []).filter((l) => l.type === 'text'), (l) => textOf(l).toLowerCase(), 8).map(textOf),
      images: (section.layers || []).filter((l) => l.type === 'image').slice(0, 4).map((l) => ({ name: clean(l.name || 'Image'), rect: l.rect || {} })),
      componentCount: (section.components || []).length
    }))
  };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function renderSection(section, index) {
  const tag = section.intent === 'header' ? 'header' : section.intent === 'footer' ? 'footer' : 'section';
  const className = `section section-${slug(section.intent || section.name)}`;
  const title = section.text[0] || section.name || `Section ${index + 1}`;
  const body = section.text.slice(1, 5);
  const cards = body.length ? body : section.text.slice(0, 4);

  if (section.intent === 'header') {
    const links = section.text.slice(0, 8).map((text) => `<a href="#">${escapeHtml(text)}</a>`).join('\n        ');
    return `<header class="site-header">
      <div class="brand">${escapeHtml(plan.title)}</div>
      <nav>${links}</nav>
    </header>`;
  }

  if (section.intent === 'hero') {
    return `<section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(section.name)}</p>
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(body.join(' ') || 'Generated from the target website structure.')}</p>
        <a class="button" href="#">Explore</a>
      </div>
      <div class="hero-media"></div>
    </section>`;
  }

  if (section.intent === 'card-grid') {
    return `<section class="${className}">
      <div class="section-heading"><h2>${escapeHtml(title)}</h2></div>
      <div class="card-grid">
        ${cards.map((text, cardIndex) => `<article class="card"><div class="card-media"></div><h3>${escapeHtml(text)}</h3><p>Editable generated card ${cardIndex + 1}.</p></article>`).join('\n        ')}
      </div>
    </section>`;
  }

  if (section.intent === 'footer') {
    return `<footer class="site-footer">
      <p>${escapeHtml(title)}</p>
    </footer>`;
  }

  return `<${tag} class="${className}">
    <div class="section-heading"><h2>${escapeHtml(title)}</h2></div>
    <div class="content-block">
      ${body.map((text) => `<p>${escapeHtml(text)}</p>`).join('\n      ')}
    </div>
  </${tag}>`;
}

const plan = buildPlan();
const cssVars = plan.tokens.colors.map((color, index) => `  --color-${index + 1}: ${color};`).join('\n');
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(plan.title)}</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <main>
    ${plan.sections.map(renderSection).join('\n\n    ')}
  </main>
</body>
</html>
`;

const css = `:root {
${cssVars || '  --color-1: #111827;\n  --color-2: #f8fafc;\n  --color-3: #2563eb;'}
  --page: #f8fafc;
  --text: #111827;
  --muted: #64748b;
  --line: #e5e7eb;
  --radius: 24px;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--page); color: var(--text); }
a { color: inherit; text-decoration: none; }
main { width: min(1180px, calc(100vw - 32px)); margin: 0 auto; }
.site-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 24px 0; }
.brand { font-weight: 800; letter-spacing: -0.03em; }
nav { display: flex; flex-wrap: wrap; gap: 18px; color: var(--muted); font-size: 14px; }
.hero { min-height: 640px; display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 40px; align-items: center; padding: 64px 0; }
.hero h1 { font-size: clamp(42px, 7vw, 84px); line-height: 0.94; letter-spacing: -0.07em; margin: 0 0 24px; }
.hero p { color: var(--muted); font-size: 18px; line-height: 1.7; max-width: 620px; }
.eyebrow { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 800; }
.button { display: inline-flex; align-items: center; justify-content: center; margin-top: 16px; min-height: 44px; padding: 0 20px; border-radius: 999px; background: var(--color-3, #2563eb); color: white; font-weight: 700; }
.hero-media, .card-media { min-height: 360px; border-radius: var(--radius); background: linear-gradient(135deg, var(--color-2, #eef2ff), var(--color-3, #2563eb)); border: 1px solid var(--line); }
.section { padding: 72px 0; }
.section-heading h2 { font-size: clamp(28px, 4vw, 52px); letter-spacing: -0.05em; margin: 0 0 28px; }
.content-block { display: grid; gap: 16px; color: var(--muted); font-size: 17px; line-height: 1.7; max-width: 780px; }
.card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.card { background: white; border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; }
.card-media { min-height: 180px; margin-bottom: 18px; }
.card h3 { margin: 0 0 8px; font-size: 18px; }
.card p { color: var(--muted); line-height: 1.6; }
.site-footer { padding: 48px 0; border-top: 1px solid var(--line); color: var(--muted); }
@media (max-width: 800px) {
  .site-header, .hero { grid-template-columns: 1fr; flex-direction: column; align-items: flex-start; }
  .card-grid { grid-template-columns: 1fr; }
}
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'project.json'), JSON.stringify(plan, null, 2));
fs.writeFileSync(path.join(outputDir, 'index.html'), html);
fs.writeFileSync(path.join(outputDir, 'styles.css'), css);
fs.writeFileSync(path.join(outputDir, 'README.md'), `# ${plan.title}\n\nGenerated by TranslateIT Code Clone prototype.\n\nSource: ${payload.url || ''}\n\nThis is a clean editable scaffold, not a pixel-perfect code clone.\n`);

console.log(JSON.stringify({ ok: true, outputDir, files: ['project.json', 'index.html', 'styles.css', 'README.md'], sections: plan.sections.length }, null, 2));
