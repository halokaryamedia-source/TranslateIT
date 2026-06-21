import fs from 'node:fs';
import path from 'node:path';

const url = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const expectedVersion = 'Version 0.1 - Alpha';
const expectedBuild = 'strict-v5.1-single-engine';

const bridgeRoot = process.cwd();
const pluginRoot = path.resolve(bridgeRoot, '..', 'plugin');
const reportDir = path.join(bridgeRoot, 'reports');
const reportPath = path.join(reportDir, 'alpha-v5-final-readiness.latest.json');
const read = (file) => fs.readFileSync(path.join(pluginRoot, file), 'utf8');

const failures = [];
const warnings = [];

function requireText(name, text, marker) {
  if (!text.includes(marker)) failures.push(`${name} missing marker: ${marker}`);
}

const manifest = JSON.parse(read('manifest.json'));
const ui = read('ui.html');
const renderer = read('code.v5.strict.js');

if (manifest.main !== 'code.v5.strict.js') failures.push('manifest main is not code.v5.strict.js');
requireText('ui.html', ui, 'EXPECTED_BUILD');
requireText('ui.html', ui, 'strictV5Engine');
requireText('ui.html', ui, 'export-ui-package');
requireText('code.v5.strict.js', renderer, expectedBuild);
requireText('code.v5.strict.js', renderer, 'strictV5Engine');
requireText('code.v5.strict.js', renderer, 'exportJson');
requireText('code.v5.strict.js', renderer, '01 Source-Inspired Editable Clone / Main Output');
requireText('code.v5.strict.js', renderer, '02 Screenshot Reference / Pure Source');

const healthRes = await fetch(`${bridge}/health`);
const health = await healthRes.json();
if (!healthRes.ok || !health.ok) failures.push(`health failed: HTTP ${healthRes.status}`);
if (health.publicVersion !== expectedVersion) failures.push('health public version mismatch');
if (!String(health.adapter || '').includes('v5')) failures.push('health adapter is not V5');
if (!String(health.adapter || '').includes('enhanced')) failures.push('health adapter is not enhanced');
if (health.strictV5Engine !== true) failures.push('health strictV5Engine marker missing');
if (health.engineBuild !== expectedBuild) failures.push('health engineBuild mismatch');

const renderRes = await fetch(`${bridge}/render?url=${encodeURIComponent(url)}`);
const payload = await renderRes.json();
if (!renderRes.ok || !payload.ok) throw new Error(payload.error || `render HTTP ${renderRes.status}`);

const layout = payload.structuredLayout || {};
const images = Array.isArray(layout.images) ? layout.images : [];
const cards = Array.isArray(layout.cards) ? layout.cards : [];
const nav = Array.isArray(layout.header?.navLinks) ? layout.header.navLinks : [];
const footer = Array.isArray(layout.footer?.links) ? layout.footer.links : [];
const heroHeading = String(layout.hero?.heading || '').trim();
const heroBody = String(layout.hero?.body || '').trim();
const captured = images.filter((item) => item.image?.base64 && item.image.base64.length > 500).length;
const usefulImages = images.filter((item) => item.rect && item.rect.w * item.rect.h >= 8000).length;
const usefulCards = cards.filter((item) => String(item.title || '').trim().length >= 3).length;

if (payload.publicVersion !== expectedVersion) failures.push('payload public version mismatch');
if (!String(payload.adapter || '').includes('v5')) failures.push('payload adapter is not V5');
if (!String(payload.adapter || '').includes('enhanced')) failures.push('payload adapter is not enhanced');
if (payload.strictV5Engine !== true) failures.push('payload strictV5Engine marker missing');
if (payload.engineBuild !== expectedBuild) failures.push('payload engineBuild mismatch');
if (!payload.diagnostics?.v5Enhanced) failures.push('payload diagnostics.v5Enhanced missing');
if (!payload.diagnostics?.strictV5Engine) failures.push('payload diagnostics.strictV5Engine missing');
if (payload.diagnostics?.engineBuild !== expectedBuild) failures.push('payload diagnostics.engineBuild mismatch');
if (layout.visualProfile?.template !== 'source-inspired-editorial') failures.push('visual profile template mismatch');
if (heroHeading.length < 8) failures.push('hero heading too weak');
if (heroBody.length < 24) failures.push('hero body too weak');
if (nav.length < 3) failures.push('not enough nav links');
if (footer.length < 3) failures.push('not enough footer links');
if (images.length < 2) failures.push('not enough image candidates');
if (captured < 2) failures.push('not enough captured images');
if (usefulImages < 2) failures.push('not enough useful images');
if (cards.length < 2) failures.push('not enough cards');
if (usefulCards < 2) failures.push('not enough useful cards');

if (captured < images.length) warnings.push('some image candidates were not captured');
if (heroBody.length < 60) warnings.push('hero body is acceptable but short');

const checks = 28;
const score = Math.max(0, Math.round(((checks - failures.length) / checks) * 100));
const report = {
  publicVersion: expectedVersion,
  gate: 'alpha-v5-final-readiness',
  status: failures.length ? 'fail' : 'pass',
  score,
  readyForFigmaTest: failures.length === 0,
  activeBridge: 'start-alpha-v5.mjs',
  activeRenderer: manifest.main,
  expectedBuild,
  targetUrl: url,
  generatedAt: new Date().toISOString(),
  reportPath,
  metrics: {
    navLinks: nav.length,
    footerLinks: footer.length,
    imageCandidates: images.length,
    usefulImages,
    capturedImages: captured,
    cards: cards.length,
    usefulCards,
    heroHeadingLength: heroHeading.length,
    heroBodyLength: heroBody.length
  },
  warnings,
  failures
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
console.log(`Final readiness report saved to: ${reportPath}`);
if (failures.length) process.exitCode = 2;
