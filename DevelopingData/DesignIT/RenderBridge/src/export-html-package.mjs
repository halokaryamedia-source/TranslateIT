import fs from 'node:fs';
import path from 'node:path';

function esc(value) { return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function section(blueprint, type) { return (blueprint.sections || []).find((item) => item.type === type) || null; }
function child(sec, id) { return (sec?.children || []).find((item) => item.id === id) || {}; }
function imageMap(payload) { const out = new Map(); for (const asset of payload.cloneModel?.assets || []) if (asset.id) out.set(asset.id, asset); return out; }
function imageSrc(image, assets, index) { if (!image?.assetId || !assets.has(image.assetId)) return ''; return `./assets/images/image-${index}.png`; }
export function buildHtmlPackage(payload) {
  const blueprint = payload.designBlueprint || {};
  const assets = imageMap(payload);
  const header = section(blueprint, 'header');
  const hero = section(blueprint, 'hero');
  const cards = section(blueprint, 'content-grid');
  const footer = section(blueprint, 'footer');
  const nav = child(header, 'navigation').items || [];
  const heroCopy = child(hero, 'hero-copy');
  const heroMedia = child(hero, 'hero-media').images || [];
  const cardItems = cards?.children || [];
  const footerBrand = child(footer, 'footer-brand');
  const footerLinks = child(footer, 'footer-links').items || nav;
  const cssVars = (blueprint.tokens?.colors || []).map((token, index) => `  --color-${String(token.name || 'color-' + index).toLowerCase().replace(/[^a-z0-9]+/g, '-')}: ${token.value};`).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(blueprint.source?.title || 'Website')}</title>
  <link rel="stylesheet" href="./styles.css">
</head>
<body>
  <header class="site-header">
    <div class="brand">${esc(child(header, 'brand').text || blueprint.source?.title || 'Brand')}</div>
    <nav class="site-nav">${nav.map((item) => `<a href="#">${esc(item)}</a>`).join('')}</nav>
    <a class="button button-outline" href="#">${esc(child(header, 'header-cta').text || 'Contact')}</a>
  </header>
  <main>
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">${esc(heroCopy.eyebrow || '')}</p>
        <h1>${esc(heroCopy.title || 'Editable Website Title')}</h1>
        <p>${esc(heroCopy.body || '')}</p>
        <a class="button button-accent" href="#">${esc(heroCopy.cta || 'Explore')}</a>
      </div>
      <div class="hero-media">
        ${heroMedia.map((img, index) => imageSrc(img, assets, index + 1) ? `<img src="${imageSrc(img, assets, index + 1)}" alt="${esc(img.alt || '')}">` : '').join('\n        ')}
      </div>
    </section>
    <section class="work-grid">
      <div class="section-heading">
        <h2>Recent Works</h2>
        <p>Editable component section generated from the design blueprint.</p>
      </div>
      <div class="cards">
        ${cardItems.map((card, index) => `<article class="card">
          ${card.image && imageSrc(card.image, assets, index + 10) ? `<img src="${imageSrc(card.image, assets, index + 10)}" alt="${esc(card.image.alt || '')}">` : ''}
          <h3>${esc(card.title)}</h3>
          <p>${esc(card.body)}</p>
        </article>`).join('\n        ')}
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div>
      <strong>${esc(footerBrand.title || blueprint.source?.title || 'Brand')}</strong>
      <p>${esc(footerBrand.body || '')}</p>
    </div>
    <nav>${footerLinks.map((item) => `<a href="#">${esc(item)}</a>`).join('')}</nav>
  </footer>
</body>
</html>`;
  const css = `:root {
${cssVars || '  --color-primary: #087A4B;\n  --color-accent: #F5C84B;\n  --color-text: #111827;'}
  --space-section: 80px;
  --radius-card: 20px;
  --font-body: Inter, system-ui, sans-serif;
}
*{box-sizing:border-box}body{margin:0;font-family:var(--font-body);color:#111827;background:#fff}.site-header{height:88px;display:flex;align-items:center;justify-content:space-between;padding:0 56px;border-bottom:1px solid #e5e7eb}.brand{font-weight:800}.site-nav{display:flex;gap:28px}.site-nav a,.site-footer a{color:inherit;text-decoration:none;font-weight:600}.button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;border-radius:999px;text-decoration:none;font-weight:800}.button-outline{border:1px solid #d1d5db;color:#111827}.button-accent{background:#F5C84B;color:#111827}.hero{display:grid;grid-template-columns:1fr 1.35fr;gap:56px;padding:80px 56px;align-items:center}.eyebrow{color:#F59E0B;font-weight:800}.hero h1{font-size:56px;line-height:1.02;margin:0 0 24px}.hero p{font-size:18px;color:#475569;line-height:1.55}.hero-media{display:grid;grid-template-columns:1fr .62fr;gap:24px;align-items:center}.hero-media img,.card img{width:100%;height:100%;object-fit:cover;border-radius:18px}.hero-media img:first-child{min-height:480px}.hero-media img:last-child{min-height:380px}.work-grid{padding:80px 56px;background:#f8fafc}.section-heading h2{font-size:36px;margin:0 0 8px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:42px}.card{background:#fff;border:1px solid #e5e7eb;border-radius:var(--radius-card);padding:18px;box-shadow:0 12px 32px rgba(15,23,42,.06)}.card img{height:170px}.card h3{font-size:22px}.card p{color:#64748b;line-height:1.5}.site-footer{display:grid;grid-template-columns:1.5fr 1fr;gap:48px;padding:64px 56px;background:#087A4B;color:#fff}.site-footer p{color:#d1fae5}.site-footer nav{display:grid;gap:14px}@media(max-width:900px){.site-header,.hero,.site-footer{padding-left:24px;padding-right:24px}.hero,.cards,.site-footer{grid-template-columns:1fr}.hero h1{font-size:40px}.site-nav{display:none}}`;
  return { html, css, blueprint, assets: Array.from(assets.values()).filter((asset) => asset.base64 && asset.kind !== 'component-slice') };
}
export function writeHtmlPackage(payload, outDir) {
  const pack = buildHtmlPackage(payload);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'assets', 'images'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), pack.html, 'utf8');
  fs.writeFileSync(path.join(outDir, 'styles.css'), pack.css, 'utf8');
  fs.writeFileSync(path.join(outDir, 'design-blueprint.json'), JSON.stringify(pack.blueprint, null, 2), 'utf8');
  pack.assets.slice(0, 12).forEach((asset, index) => fs.writeFileSync(path.join(outDir, 'assets', 'images', `image-${index + 1}.png`), Buffer.from(asset.base64, 'base64')));
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), engine: 'translateit-core', engineBuild: 'alpha-clean-1', files: ['index.html', 'styles.css', 'design-blueprint.json'] }, null, 2), 'utf8');
  return outDir;
}
