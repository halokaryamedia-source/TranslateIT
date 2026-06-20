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

function key(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function uniqueCount(items, fn) {
  const seen = new Set();
  for (const item of items) {
    const value = fn(item);
    if (value) seen.add(value);
  }
  return seen.size;
}

function styleKey(layer) {
  const s = layer.style || {};
  return [layer.role || layer.type, s.fontSize || '', s.fontWeight || '', s.color || '', s.backgroundColor || '', s.borderRadius || ''].join('|');
}

function scorePayload(payload) {
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const components = [];
  for (const section of sections) for (const component of section.components || []) components.push(component);

  const hasScreenshot = !!(payload.screenshot && payload.screenshot.base64);
  const textLayers = layers.filter((layer) => layer.type === 'text');
  const imageLayers = layers.filter((layer) => layer.type === 'image');
  const boxLayers = layers.filter((layer) => layer.type === 'box');
  const buttonLayers = layers.filter((layer) => layer.role === 'button-bg' || layer.role === 'button-label');
  const linkCount = uniqueCount(textLayers.filter((layer) => layer.role === 'link'), (layer) => key(layer.text || layer.name));
  const headingCount = uniqueCount(textLayers.filter((layer) => layer.role === 'heading'), (layer) => key(layer.text || layer.name));
  const textStyleCount = uniqueCount(textLayers, styleKey);
  const strongComponentCount = components.filter((component) => (component.layers || []).length >= 2).length;

  const visualScore = hasScreenshot ? 9.3 : 2;
  const structureScore = clamp(2.5 + Math.min(sections.length, 6) / 6 * 2.2 + Math.min(strongComponentCount, 16) / 16 * 3.5 + Math.min(linkCount + headingCount, 10) / 10 * 1.8, 0, 9.4);
  const libraryScore = clamp(2 + Math.min(textStyleCount, 10) / 10 * 1.7 + Math.min(buttonLayers.length, 6) / 6 * 1.3 + Math.min(imageLayers.length, 8) / 8 * 1.3 + Math.min(sections.length, 6) / 6 * 1.4 + Math.min(strongComponentCount, 14) / 14 * 1.7, 0, 9.4);
  const editableScore = clamp(2.5 + Math.min(textLayers.length, 80) / 80 * 2.3 + Math.min(imageLayers.length, 8) / 8 * 1.4 + Math.min(boxLayers.length, 40) / 40 * 1.1 + Math.min(strongComponentCount, 16) / 16 * 2.5, 0, 9.3);
  const organizationScore = clamp(2 + Math.min(sections.length, 5) / 5 * 2 + Math.min(strongComponentCount, 12) / 12 * 2.8 + Math.min(textStyleCount, 8) / 8 * 1.7 + Math.min(linkCount + buttonLayers.length + imageLayers.length, 18) / 18 * 2, 0, 9.3);
  const finalScore = Math.min(visualScore, structureScore, libraryScore, editableScore, organizationScore);

  return {
    visualScore: round(visualScore),
    structureScore: round(structureScore),
    libraryScore: round(libraryScore),
    editableScore: round(editableScore),
    organizationScore: round(organizationScore),
    finalScore: round(finalScore),
    passesMinimum9Everywhere: finalScore >= 9,
    scoringRule: 'finalScore is the lowest category score. A high visual score cannot cover a weak structure score.',
    basis: {
      hasScreenshot,
      layerCount: layers.length,
      sectionCount: sections.length,
      componentCount: components.length,
      strongComponentCount,
      textLayerCount: textLayers.length,
      textStyleCount,
      linkCount,
      headingCount,
      buttonLayerCount: buttonLayers.length,
      imageLayerCount: imageLayers.length,
      boxLayerCount: boxLayers.length
    }
  };
}

async function main() {
  console.log('=== TranslateIT V7 Strict Audit ===');
  console.log(`Bridge: ${bridge}`);
  console.log(`Target: ${targetUrl}`);

  const health = await readJson(`${bridge}/health`, 15000);
  const payload = await readJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`, 180000);
  const scores = scorePayload(payload);

  console.log('\n=== V7 STRICT SCORE REPORT ===');
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    targetUrl,
    bridgeMode: health.mode,
    payloadMode: payload.mode,
    adapter: payload.adapter,
    title: payload.title,
    diagnostics: payload.diagnostics || {},
    scores
  }, null, 2));

  if (!scores.passesMinimum9Everywhere) process.exitCode = 2;
}

main().catch((error) => {
  console.error('\n=== AUDIT FAILED ===');
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
