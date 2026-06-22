function list(value) { return Array.isArray(value) ? value : []; }
function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function area(rect = {}) { return Math.max(0, n(rect.w) * n(rect.h)); }
function allLayers(plan = {}) {
  return list(plan.frames).flatMap((frame) => [
    ...list(frame.directChildren),
    ...list(frame.children),
    ...list(frame.groups).flatMap((group) => list(group.children))
  ]);
}
function totalArea(layers, kind) { return layers.filter((layer) => !kind || layer.kind === kind).reduce((sum, layer) => sum + area(layer.rect), 0); }
function scoreCoverage(value) { if (value < 0.08) return 12; if (value < 0.18) return 28; if (value < 0.75) return 72; if (value < 1.35) return 86; return 55; }
function status(score) { if (score >= 70) return 'pass'; if (score >= 45) return 'review'; return 'fail'; }
export function buildVisualFidelityPrecheckReport(payload) {
  const plan = payload?.figmaRenderPlan || {};
  const layers = allLayers(plan);
  const page = plan.page || payload?.cloneModel?.page || {};
  const pageArea = Math.max(1, n(page.width, 1440) * n(page.height, 1600));
  const layerArea = totalArea(layers);
  const textArea = totalArea(layers, 'text');
  const imageArea = totalArea(layers, 'image');
  const shapeArea = totalArea(layers, 'shape');
  const buttonArea = totalArea(layers, 'button');
  const coverage = layerArea / pageArea;
  const textLayers = layers.filter((layer) => layer.kind === 'text').length;
  const imageLayers = layers.filter((layer) => layer.kind === 'image').length;
  const buttonLayers = layers.filter((layer) => layer.kind === 'button').length;
  const shapeLayers = layers.filter((layer) => layer.kind === 'shape').length;
  const effects = layers.filter((layer) => layer.style?.backgroundGradient || layer.style?.boxShadow || n(layer.style?.borderWidth) > 0).length;
  const coverageScore = scoreCoverage(coverage);
  const contentScore = Math.min(100, textLayers * 4 + imageLayers * 6 + buttonLayers * 8 + shapeLayers * 2);
  const effectScore = Math.min(100, effects * 7);
  const geometryScore = plan.status === 'pass' ? 78 : 30;
  const score = Math.round(coverageScore * 0.35 + contentScore * 0.3 + effectScore * 0.15 + geometryScore * 0.2);
  return {
    version: 'visual-fidelity-precheck-v1',
    status: status(score),
    score,
    note: 'This is a structural visual precheck, not a real pixel-level comparison.',
    page: { width: n(page.width), height: n(page.height), pageArea },
    coverage: { totalLayerArea: Math.round(layerArea), coverageRatio: Number(coverage.toFixed(3)), textArea: Math.round(textArea), imageArea: Math.round(imageArea), shapeArea: Math.round(shapeArea), buttonArea: Math.round(buttonArea) },
    layers: { total: layers.length, text: textLayers, image: imageLayers, button: buttonLayers, shape: shapeLayers, effects },
    warnings: [
      coverage < 0.08 ? 'layer coverage is very low' : '',
      coverage > 1.35 ? 'layer coverage is too high and may indicate excessive overlap' : '',
      textLayers < 4 ? 'very few editable text layers' : '',
      imageLayers < 1 ? 'no editable image layers found' : '',
      buttonLayers < 1 ? 'no editable button layers found' : ''
    ].filter(Boolean)
  };
}
