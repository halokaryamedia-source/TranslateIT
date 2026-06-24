function list(value) { return Array.isArray(value) ? value : []; }
function allLayers(plan = {}) {
  return list(plan.frames).flatMap((frame) => [
    ...list(frame.directChildren),
    ...list(frame.children),
    ...list(frame.groups).flatMap((group) => list(group.children))
  ]);
}
function count(items, fn) { return list(items).filter(fn).length; }
export function buildFigmaImportSafetySummary(payload) {
  const layers = allLayers(payload?.figmaRenderPlan || {});
  const text = count(layers, (layer) => layer.kind === 'text');
  const image = count(layers, (layer) => layer.kind === 'image');
  const button = count(layers, (layer) => layer.kind === 'button');
  const shape = count(layers, (layer) => layer.kind === 'shape');
  const placeholders = count(layers, (layer) => layer.role === 'image-placeholder-surface' || list(layer.warnings).includes('downgraded-missing-image-to-placeholder'));
  const gradients = count(layers, (layer) => layer.style?.backgroundGradient);
  const shadows = count(layers, (layer) => layer.style?.boxShadow && layer.style.boxShadow !== 'none');
  const strokes = count(layers, (layer) => Number(layer.style?.borderWidth || 0) > 0);
  const risky = count(layers, (layer) => list(layer.warnings).length > 0);
  return {
    version: 'figma-import-safety-summary-v1',
    status: risky > 0 || placeholders > 0 ? 'review' : 'pass',
    expectedRender: { total: layers.length, text, image, button, shape },
    effects: { gradients, shadows, strokes },
    fallback: { placeholders, warningLayers: risky },
    pluginRisk: [
      placeholders ? `${placeholders} placeholder layer(s)` : '',
      risky ? `${risky} layer(s) with warnings` : '',
      payload?.figmaRenderPlan?.status !== 'pass' ? 'render plan is not pass' : ''
    ].filter(Boolean)
  };
}
