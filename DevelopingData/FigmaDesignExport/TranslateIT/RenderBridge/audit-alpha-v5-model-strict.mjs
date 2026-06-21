const url = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const res = await fetch(`${bridge}/render?url=${encodeURIComponent(url)}`);
const payload = await res.json();
if (!res.ok || !payload.ok) throw new Error(payload.error || `HTTP ${res.status}`);

const layout = payload.structuredLayout || {};
const images = Array.isArray(layout.images) ? layout.images : [];
const cards = Array.isArray(layout.cards) ? layout.cards : [];
const nav = Array.isArray(layout.header?.navLinks) ? layout.header.navLinks : [];
const footer = Array.isArray(layout.footer?.links) ? layout.footer.links : [];
const heroHeading = String(layout.hero?.heading || '').trim();
const heroBody = String(layout.hero?.body || '').trim();
const captured = images.filter((x) => x.image?.base64 && x.image.base64.length > 500).length;
const usefulCards = cards.filter((x) => String(x.title || '').trim().length >= 3).length;
const usefulImages = images.filter((x) => x.rect && x.rect.w * x.rect.h >= 8000).length;

const failures = [];
if (payload.publicVersion !== 'Version 0.1 - Alpha') failures.push('wrong public version');
if (!String(payload.adapter || '').includes('structured')) failures.push('adapter is not structured');
if (!layout.type) failures.push('layout type missing');
if (heroHeading.length < 8) failures.push('weak hero heading');
if (heroBody.length < 24) failures.push('weak hero body');
if (nav.length < 3) failures.push('weak nav links');
if (images.length < 2) failures.push('weak image candidates');
if (usefulImages < 2) failures.push('weak useful images');
if (captured < 2) failures.push('weak captured images');
if (cards.length < 2) failures.push('weak cards');
if (usefulCards < 2) failures.push('weak useful cards');
if (footer.length < 3) failures.push('weak footer links');

const total = 12;
const passed = total - failures.length;
const report = {
  gate: 'alpha-v5-strict-model',
  status: failures.length ? 'fail' : 'pass',
  score: Math.round((passed / total) * 100),
  adapter: payload.adapter,
  heroHeading,
  heroBodyLength: heroBody.length,
  navLinks: nav.length,
  images: images.length,
  usefulImages,
  capturedImages: captured,
  cards: cards.length,
  usefulCards,
  footerLinks: footer.length,
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
