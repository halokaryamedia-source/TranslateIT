function list(value) { return Array.isArray(value) ? value : []; }
function allLayers(plan = {}) { return list(plan.frames).flatMap((frame) => list(frame.directChildren).concat(list(frame.children), list(frame.groups).flatMap((group) => list(group.children)))); }
function count(items, fn) { return list(items).filter(fn).length; }
export function buildComponentSummary(payload) {
  const plan = payload?.figmaRenderPlan || {};
  const layers = allLayers(plan);
  const groups = list(plan.frames).flatMap((frame) => list(frame.groups));
  return {
    version: 'component-summary-v1',
    status: layers.length ? 'ready' : 'missing',
    summary: {
      layers: layers.length,
      buttons: count(layers, (layer) => layer.kind === 'button'),
      cards: count(groups, (group) => group.role === 'card-component' || group.layout?.component === 'card'),
      text: count(layers, (layer) => layer.kind === 'text'),
      images: count(layers, (layer) => layer.kind === 'image'),
      shapes: count(layers, (layer) => layer.kind === 'shape'),
      logos: count(layers, (layer) => /logo/i.test(layer.role || layer.name || '')),
      icons: count(layers, (layer) => /icon/i.test(layer.role || layer.name || ''))
    }
  };
}
