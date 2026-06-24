const url = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

const res = await fetch(`${bridge}/render?url=${encodeURIComponent(url)}`);
const payload = await res.json();
if (!res.ok || !payload.ok) throw new Error(payload.error || `HTTP ${res.status}`);

const images = Array.isArray(payload.structuredLayout?.images) ? payload.structuredLayout.images : [];
const captured = images.filter((item) => item.image && item.image.base64 && item.image.base64.length > 500).length;
const report = {
  publicVersion: payload.publicVersion,
  adapter: payload.adapter,
  rendererInput: payload.structuredLayout ? 'structuredLayout' : 'missing',
  imageCandidates: images.length,
  capturedImages: captured,
  heroHeading: payload.structuredLayout?.hero?.heading || '',
  cards: Array.isArray(payload.structuredLayout?.cards) ? payload.structuredLayout.cards.length : 0,
  pass: captured >= Math.min(2, images.length)
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 2;
