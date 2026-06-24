const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(value * 10) / 10;
}

async function readJson(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 120000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch (_) {}
    if (!response.ok) throw new Error(`HTTP ${response.status}\n${payload?.error || text}`);
    return payload || {};
  } finally {
    clearTimeout(timer);
  }
}

function uniqueText(layers, role) {
  const seen = new Set();
  return layers.filter((layer) => {
    if (role && layer.role !== role) return false;
    const key = String(layer.text || layer.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scorePayload(payload) {
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const components = [];
  sections.forEach((section) => (section.components || []).forEach((component) => components.push(component)));

  const textLayers = layers.filter((layer) => layer.type === 'text');
  const imageLayers = layers.filter((layer) => layer.type === 'image');
  const links = uniqueText(textLayers, 'link');
  const headings = uniqueText(textLayers, 'heading');
  const buttons = layers.filter((layer) => layer.role === 'button-bg' || layer.role === 'button-label');

  const hasScreenshot = !!(payload.screenshot && payload.screenshot.base64);

  const visualAnchorScore = hasScreenshot ? 9.4 : 2;
  const structureDepthScore = clamp(3 + Math.min(sections.length, 6) / 6 * 3 + Math.min(components.length, 18) / 18 * 3, 0, 9.2);
  const uiLibraryDepthScore = clamp(
    2 +
    Math.min(links.length, 6) / 6 * 1.2 +
    Math.min(headings.length, 6) / 6 * 1.2 +
    Math.min(buttons.length, 6) / 6 * 1.2 +
    Math.min(imageLayers.length, 6) / 6 * 1.2 +
    Math.min(sections.length, 6) / 6 * 1.1 +
    Math.min(components.length, 12) / 12 * 1.1,
    0,
    9
  );
  const editableCoverageScore = clamp(2.5 + Math.min(textLayers.length, 70) / 70 * 3 + Math.min(components.length, 18) / 18 * 2 + Math.min(imageLayers.length, 8) / 8 * 1.5, 0, 9);
  const overallV6Score = Math.min(visualAnchorScore, structureDepthScore, uiLibraryDepthScore, editableCoverageScore);

  return {
    visualAnchorScore: round(visualAnchorScore),
    structureDepthScore: round(structureDepthScore),
    uiLibraryDepthScore: round(uiLibraryDepthScore),
    editableCoverageScore: round(editableCoverageScore),
    overallV6Score: round(overallV6Score),
    passesAllMinimum9: visualAnchorScore >= 9 && structureDepthScore >= 9 && uiLibraryDepthScore >= 9 && editableCoverageScore >= 9,
    basis: {
      hasScreenshot,
      layers: layers.length,
      sections: sections.length,
      components: components.length,
      textLayers: textLayers.length,
      uniqueLinks: links.length,
      uniqueHeadings: headings.length,
      buttonSignals: buttons.length,
      imageLayers: imageLayers.length
    },
    note: 'V6 audit does not allow screenshot-only success. Overall score is the minimum of visual, structure, UI library depth, and editable coverage.'
  };
}

async function main() {
  console.log('=== TranslateIT V6 Structured UI Library Audit ===');
  console.log(`Bridge: ${bridge}`);
  console.log(`Target: ${targetUrl}`);

  const health = await readJson(`${bridge}/health`, 15000);
  console.log('\n=== HEALTH ===');
  console.log(JSON.stringify(health, null, 2));

  const payload = await readJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`, 180000);
  const scores = scorePayload(payload);
  const report = {
    generatedAt: new Date().toISOString(),
    targetUrl,
    bridgeMode: health.mode,
    payloadMode: payload.mode,
    adapter: payload.adapter,
    title: payload.title,
    diagnostics: payload.diagnostics || {},
    scores,
    expectedFigmaFrames: [
      '01 Production Page / Structured Pixel Match',
      '02 UI Library / Extracted Design System',
      '03 Structured Editable Page / Component-Based',
      '04 Extraction Audit / Score Summary'
    ]
  };

  console.log('\n=== V6 SCORE REPORT ===');
  console.log(JSON.stringify(report, null, 2));

  if (!scores.passesAllMinimum9) process.exitCode = 2;
}

main().catch((error) => {
  console.error('\n=== AUDIT FAILED ===');
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
