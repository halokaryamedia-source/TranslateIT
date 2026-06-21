const target = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

const response = await fetch(`${bridge}/render?url=${encodeURIComponent(target)}`);
const payload = await response.json();
if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);

const layout = payload.structuredLayout || {};
const images = Array.isArray(layout.images) ? layout.images : [];
const cards = Array.isArray(layout.cards) ? layout.cards : [];
const navLinks = Array.isArray(layout.header?.navLinks) ? layout.header.navLinks : [];
const footerLinks = Array.isArray(layout.footer?.links) ? layout.footer.links : [];
const capturedImages = images.filter((item) => item.image?.base64 && item.image.base64.length > 500).length;

const checks = {
  structuredLayout: !!payload.structuredLayout,
  adapterStructured: String(payload.adapter || '').includes('structured'),
  heroHeading: String(layout.hero?.heading || '').trim().length >= 8,
  navLinks: navLinks.length >= 3,
  imageCandidates: images.length >= 2,
  capturedImages: capturedImages >= 2,
  cards: cards.length >= 2,
  footerLinks: footerLinks.length >= 3
};

const failed = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
const report = {
  publicVersion: payload.publicVersion,
  gate: 'alpha-v5-structured-model-quality',
  status: failed.length ? 'fail' : 'pass',
  adapter: payload.adapter,
  heroHeading: layout.hero?.heading || '',
  navLinks: navLinks.length,
  imageCandidates: images.length,
  capturedImages,
  cards: cards.length,
  footerLinks: footerLinks.length,
  failed
};

console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 2;
