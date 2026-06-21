const url = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const expectedBuild = 'strict-v5.1-single-engine';

const res = await fetch(`${bridge}/render?url=${encodeURIComponent(url)}`);
const payload = await res.json();
if (!res.ok || !payload.ok) throw new Error(payload.error || `HTTP ${res.status}`);

const images = Array.isArray(payload.structuredLayout?.images) ? payload.structuredLayout.images : [];
const captured = images.filter((item) => item.image && item.image.base64 && item.image.base64.length > 500).length;
const failures = [];
if (payload.publicVersion !== 'Version 0.1 - Alpha') failures.push('wrong public version');
if (!String(payload.adapter || '').includes('v5')) failures.push('adapter is not V5');
if (!String(payload.adapter || '').includes('enhanced')) failures.push('adapter is not enhanced');
if (payload.strictV5Engine !== true) failures.push('strictV5Engine marker missing');
if (payload.engineBuild !== expectedBuild) failures.push('wrong engine build');
if (!payload.diagnostics?.v5Enhanced) failures.push('v5 enhanced marker missing');
if (!payload.diagnostics?.strictV5Engine) failures.push('diagnostics strictV5Engine missing');
if (payload.diagnostics?.engineBuild !== expectedBuild) failures.push('diagnostics wrong engine build');
if (!payload.structuredLayout) failures.push('structuredLayout missing');
if (images.length < 2) failures.push('not enough image candidates');
if (captured < Math.min(2, images.length)) failures.push('not enough captured images');

const report = {
  publicVersion: payload.publicVersion,
  gate: 'alpha-v5-media-capture',
  status: failures.length ? 'fail' : 'pass',
  adapter: payload.adapter,
  strictV5Engine: !!payload.strictV5Engine,
  engineBuild: payload.engineBuild || null,
  v5Enhanced: !!payload.diagnostics?.v5Enhanced,
  imageCandidates: images.length,
  capturedImages: captured,
  heroHeading: payload.structuredLayout?.hero?.heading || '',
  cards: Array.isArray(payload.structuredLayout?.cards) ? payload.structuredLayout.cards.length : 0,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
