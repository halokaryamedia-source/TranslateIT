const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

const count = (value) => Array.isArray(value) ? value.length : 0;
const pct = (value) => Math.round(value * 100) / 100;

function analyze(payload) {
  const plan = payload.rebuildPlan || {};
  const tokens = plan.tokens || {};
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const components = sections.flatMap((section) => section.components || []);
  const textLayers = layers.filter((layer) => layer.type === 'text');
  const imageLayers = layers.filter((layer) => layer.type === 'image');
  const linkLayers = textLayers.filter((layer) => layer.role === 'link');

  const checks = {
    colorTokens: count(tokens.colors) >= 3,
    typographyTokens: count(tokens.typography) >= 3,
    spacingTokens: count(tokens.spacing) >= 6,
    radiusTokens: count(tokens.radius) >= 2,
    sectionComponents: count(plan.sections) >= 1,
    detectedComponents: components.length >= 1,
    mediaComponents: imageLayers.length >= 1,
    navigationCandidates: linkLayers.length >= 1 || count(plan.sections) >= 1,
    textContent: textLayers.length >= 3
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const score = pct((passed / total) * 10);
  const missing = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);

  return {
    publicVersion: 'Version 0.1 - Alpha',
    targetUrl,
    score,
    readiness: score >= 7 ? 'ui-library-ready-for-figma-check' : score >= 5 ? 'needs-library-polish' : 'not-ready',
    checks,
    missing,
    basis: {
      colors: count(tokens.colors),
      typography: count(tokens.typography),
      spacing: count(tokens.spacing),
      radius: count(tokens.radius),
      planSections: count(plan.sections),
      extractedSections: sections.length,
      detectedComponents: components.length,
      textLayers: textLayers.length,
      imageLayers: imageLayers.length,
      linkLayers: linkLayers.length
    },
    note: 'This checks whether the payload can support a clean UI Library. Figma visual validation is still required.'
  };
}

const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const report = analyze(payload);
console.log(JSON.stringify(report, null, 2));
if (report.score < 5) process.exitCode = 2;
