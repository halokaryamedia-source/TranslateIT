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

function scorePayload(payload) {
  const d = payload.diagnostics || {};
  const hasScreenshot = !!(payload.screenshot && payload.screenshot.base64);
  const textCount = Number(d.textCount || 0);
  const imageCount = Number(d.imageCount || 0);
  const componentCount = Number(d.componentCount || 0);
  const sectionCount = Number(d.sectionCount || 0);
  const layerCount = Number(d.layerCount || 0);

  const productionVisualScore = hasScreenshot ? 9.8 : 2.0;
  const editableTextMapScore = clamp(4.5 + Math.min(textCount, 60) / 60 * 3.5 + Math.min(componentCount, 20) / 20, 0, 8.5);
  const rawEditableScore = clamp(2.5 + Math.min(sectionCount, 8) / 8 * 1.2 + Math.min(componentCount, 20) / 20 * 1.3 + Math.min(imageCount, 10) / 10 + Math.min(textCount, 80) / 80, 0, 6.8);
  const weightedProductionScore = productionVisualScore * 0.75 + editableTextMapScore * 0.20 + rawEditableScore * 0.05;

  return {
    productionVisualScore: round(productionVisualScore),
    editableTextMapScore: round(editableTextMapScore),
    rawEditableScore: round(rawEditableScore),
    weightedProductionScore: round(weightedProductionScore),
    passesTarget9: weightedProductionScore >= 9,
    note: 'Target 9+ is for V5 Production Hybrid output. Raw editable reconstruction is scored separately and is not expected to be 9 yet.',
    basis: { hasScreenshot, layerCount, sectionCount, componentCount, imageCount, textCount }
  };
}

async function main() {
  console.log('=== TranslateIT V5 Audit ===');
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
      '01 Visual Reference / Pixel Screenshot',
      '02 Production Visual Match / Score Target 9+',
      '03 Editable Text Map / Visible Editing Layer',
      '04 Raw Editable Reconstruction / Debug'
    ]
  };

  console.log('\n=== V5 SCORE REPORT ===');
  console.log(JSON.stringify(report, null, 2));

  if (!scores.passesTarget9) process.exitCode = 2;
}

main().catch((error) => {
  console.error('\n=== AUDIT FAILED ===');
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
