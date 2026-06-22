function pct(value) { return Math.max(0, Math.min(100, Math.round(Number(value) || 0))); }
function scoreRatio(value, target) { return pct((Number(value) || 0) / target * 100); }

export function scoreFigmaRenderQuality(payload = {}) {
  const plan = payload.figmaRenderPlan || {};
  const diagnostics = plan.diagnostics || {};
  const frames = plan.frames || [];
  const textLayers = Number(diagnostics.textLayers || 0);
  const imageLayers = Number(diagnostics.imageLayers || 0);
  const layerCount = Number(diagnostics.layers || 0);
  const emptyFrames = (diagnostics.emptyFrames || []).length || 0;
  const missingAssets = Number(diagnostics.missingAssets || 0);

  const scores = {
    renderPlan: plan.status === 'pass' ? 100 : 0,
    frameCoverage: frames.length >= 4 ? 100 : scoreRatio(frames.length, 4),
    editableText: textLayers >= 8 ? 100 : scoreRatio(textLayers, 8),
    editableImages: imageLayers >= 1 ? 100 : scoreRatio(imageLayers, 1),
    layerDensity: layerCount >= 12 ? 100 : scoreRatio(layerCount, 12),
    emptyFrames: emptyFrames === 0 ? 100 : 0,
    missingAssets: missingAssets === 0 ? 100 : 0
  };
  const total = Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.values(scores).length);
  const failures = [];
  if (scores.renderPlan < 100) failures.push('render plan not passing');
  if (scores.frameCoverage < 100) failures.push('not enough semantic frames');
  if (scores.editableText < 100) failures.push('not enough editable text layers');
  if (scores.emptyFrames < 100) failures.push('empty frames detected');
  if (scores.missingAssets < 100) failures.push('missing assets detected');

  return {
    version: 'figma-render-quality-score-v1',
    status: failures.length ? 'not-ready' : 'ready',
    score: total,
    threshold: 85,
    passesThreshold: total >= 85 && failures.length === 0,
    scores,
    failures
  };
}
