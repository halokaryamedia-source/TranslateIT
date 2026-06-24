import fs from 'node:fs/promises';
import path from 'node:path';

function num(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function scoreBool(value, points) { return value ? points : 0; }
function read(obj, dotted, fallback = 0) { return dotted.split('.').reduce((cur, key) => cur && cur[key] !== undefined ? cur[key] : undefined, obj) ?? fallback; }
function pct(value) { return Math.round(clamp(value, 0, 100)); }
function band(score, spread = 4) { const low = Math.max(0, score - spread); const high = Math.min(100, score + spread); return `${low}-${high}%`; }
function estimate(payload) {
  const m = payload.productionExportManifest || {};
  const n = payload.diagnostics?.nativeUsefulness || {};
  const render = payload.figmaRenderPlan || {};
  const auto = payload.figmaAutoLayoutPlan || {};
  const manifest = payload.productionExportManifest || {};
  const editableRatio = num(read(m, 'summary.editableRatio', 0));
  const missingAssets = num(read(m, 'figma.missingAssets', 0));
  const visualBlocks = num(read(m, 'summary.visualBlocks', 0));
  const renderPass = render.status === 'pass';
  const manifestOk = manifest.status === 'ready-for-controlled-test';
  const imagePass = payload.imageAssetProcessingPlan?.status === 'pass';
  const visualReady = payload.visualComparePlan?.status === 'ready';
  const autoGroups = num(read(auto, 'diagnostics.autoLayoutGroups', 0));
  const cardGroups = num(read(auto, 'diagnostics.cardGroups', 0));
  const duplicateTextRemoved = num(n.duplicateTextRemoved, 0);
  const core = 52 + scoreBool(renderPass, 10) + scoreBool(imagePass, 8) + scoreBool(!!payload.cloneModel, 7) + scoreBool(!!payload.figmaRenderPlan, 5) + scoreBool(!!payload.productionExportManifest, 6) - Math.min(8, missingAssets * 2);
  const editable = 35 + editableRatio * 0.28 + scoreBool(renderPass, 6) + scoreBool(cardGroups > 0, 4) - Math.min(10, visualBlocks * 1.5) - Math.min(12, missingAssets * 3);
  const layerTree = 42 + scoreBool(cardGroups > 0, 8) + scoreBool(autoGroups > 0, 4) + Math.min(6, duplicateTextRemoved) + scoreBool(!!payload.productionExportManifest, 5) - Math.min(6, visualBlocks);
  const visual = 22 + scoreBool(renderPass, 7) + scoreBool(imagePass, 5) + scoreBool(visualReady, 7) + Math.min(10, num(n.gradientLayers, 0) + num(n.surfaceShadowLayers, 0) + num(n.backgroundImages, 0)) - Math.min(15, missingAssets * 3) - Math.min(12, visualBlocks * 1.2);
  const internal = (core * 0.25) + (editable * 0.28) + (layerTree * 0.2) + (visual * 0.27);
  const production = internal * 0.48 + scoreBool(manifestOk, 6) + scoreBool(visualReady, 5) - Math.min(12, missingAssets * 2) - Math.min(10, visualBlocks);
  return {
    version: 'honest-production-readiness-v1',
    source: payload.source ? { title: payload.source.title, url: payload.source.url || payload.source.finalUrl } : null,
    measured: true,
    note: 'Percentages are calculated from generated payload diagnostics. They still require visual review in Figma before release decisions.',
    scores: {
      coreEngineArchitecture: { score: pct(core), band: band(pct(core)) },
      editableFigmaOutput: { score: pct(editable), band: band(pct(editable)) },
      layerTreeUsability: { score: pct(layerTree), band: band(pct(layerTree)) },
      visualFidelity: { score: pct(visual), band: band(pct(visual), 6) },
      internalAlphaReadiness: { score: pct(internal), band: band(pct(internal), 5) },
      productionPublicReadiness: { score: pct(production), band: band(pct(production), 6) }
    },
    blockers: [
      missingAssets ? `${missingAssets} missing image asset(s)` : '',
      visualBlocks ? `${visualBlocks} visual fallback block(s)` : '',
      !renderPass ? 'figma render plan is not pass' : '',
      !visualReady ? 'visual compare is not ready or not measured' : '',
      payload.figmaAutoLayoutPlan?.diagnostics?.absoluteFrames ? `${payload.figmaAutoLayoutPlan.diagnostics.absoluteFrames} absolute frame(s) remain` : ''
    ].filter(Boolean),
    manifestRisk: manifest.risk || null
  };
}
async function main() {
  const input = process.argv[2] || path.join(process.cwd(), 'reports', 'translateit-payload.json');
  const output = process.argv[3] || path.join(process.cwd(), 'reports', 'translateit-honest-production-readiness.json');
  const raw = await fs.readFile(input, 'utf8');
  const payload = JSON.parse(raw);
  const result = estimate(payload);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exit(1); });
export { estimate as evaluateHonestProductionReadiness };
