function list(value) { return Array.isArray(value) ? value : []; }
function allLayers(plan = {}) {
  return list(plan.frames).flatMap((frame) => [
    ...list(frame.directChildren),
    ...list(frame.children),
    ...list(frame.groups).flatMap((group) => list(group.children))
  ]);
}
function count(items, fn) { return list(items).filter(fn).length; }
export function attachPluginRenderExpectations(payload) {
  const plan = payload.figmaRenderPlan || {};
  const layers = allLayers(plan);
  const expectations = {
    version: 'plugin-render-expectations-v1',
    renderer: 'figma-plugin-code-framework-editable',
    expected: {
      frames: list(plan.frames).length,
      groups: list(plan.frames).reduce((sum, frame) => sum + list(frame.groups).length, 0),
      layers: layers.length,
      text: count(layers, (layer) => layer.kind === 'text'),
      image: count(layers, (layer) => layer.kind === 'image'),
      button: count(layers, (layer) => layer.kind === 'button'),
      shape: count(layers, (layer) => layer.kind === 'shape'),
      gradientFills: count(layers, (layer) => !!layer.style?.backgroundGradient),
      shadows: count(layers, (layer) => !!layer.style?.boxShadow && layer.style.boxShadow !== 'none'),
      strokes: count(layers, (layer) => Number(layer.style?.borderWidth || 0) > 0),
      placeholders: count(layers, (layer) => layer.role === 'image-placeholder-surface'),
      warningLayers: count(layers, (layer) => list(layer.warnings).length > 0)
    },
    failurePolicy: 'layer-level-fallback-preferred-over-full-import-failure',
    reviewPriority: ['missing assets', 'placeholder images', 'duplicate text', 'visual fallback slices', 'card hierarchy', 'hero section accuracy']
  };
  return { ...payload, pluginRenderExpectations: expectations, diagnostics: { ...(payload.diagnostics || {}), pluginRenderExpectations: expectations.expected } };
}
