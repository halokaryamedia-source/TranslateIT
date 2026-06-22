function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function list(value) { return Array.isArray(value) ? value : []; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function short(value, limit = 44) { return clean(value).slice(0, limit); }
function nameLayer(layer) {
  if (layer.kind === 'button') return 'Button / ' + (short(layer.component?.label || layer.text || layer.name) || 'CTA');
  if (layer.kind === 'text') return 'Text / ' + (short(layer.text || layer.name) || 'Body');
  if (layer.kind === 'image') return 'Image / ' + (short(layer.name || layer.assetId) || 'Media');
  if (layer.kind === 'shape') return 'Shape / ' + (short(layer.name) || 'Surface');
  return short(layer.name) || 'Layer';
}
export function applyLayerNamePass(figmaRenderPlan) {
  const plan = clone(figmaRenderPlan);
  let renamed = 0;
  const rename = (layer) => { const name = nameLayer(layer); if (name !== layer.name) renamed += 1; return { ...layer, name }; };
  plan.frames = list(plan.frames).map((frame) => ({
    ...frame,
    directChildren: list(frame.directChildren).map(rename),
    children: list(frame.children).map(rename),
    groups: list(frame.groups).map((group) => ({ ...group, children: list(group.children).map(rename) }))
  }));
  plan.diagnostics = { ...(plan.diagnostics || {}), layerNamePass: true, renamedLayers: renamed };
  return plan;
}
