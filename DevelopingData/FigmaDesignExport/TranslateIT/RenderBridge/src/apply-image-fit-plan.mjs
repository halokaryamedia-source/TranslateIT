function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function list(value) { return Array.isArray(value) ? value : []; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function fitMode(value) {
  const fit = clean(value);
  if (fit === 'contain' || fit === 'scale-down') return 'FIT';
  if (fit === 'fill' || fit === 'stretch') return 'STRETCH';
  return 'FILL';
}
function imagePlan(layer) {
  const st = layer.style || {};
  return {
    version: 'image-fit-plan-v1',
    scaleMode: fitMode(st.objectFit || layer.imageFit?.objectFit),
    objectFit: clean(st.objectFit || layer.imageFit?.objectFit || 'cover'),
    objectPosition: st.objectPosition || layer.imageFit?.objectPosition || '50% 50%',
    preserveAspectIntent: fitMode(st.objectFit || layer.imageFit?.objectFit) !== 'STRETCH'
  };
}
function mapLayer(layer) {
  if (layer.kind !== 'image') return layer;
  return { ...layer, imageFitPlan: imagePlan(layer), style: { ...(layer.style || {}), objectFit: layer.style?.objectFit || layer.imageFit?.objectFit || 'cover', objectPosition: layer.style?.objectPosition || layer.imageFit?.objectPosition || '50% 50%' } };
}
export function applyImageFitPlan(figmaRenderPlan) {
  const plan = clone(figmaRenderPlan);
  let imageLayers = 0;
  const visit = (layer) => { if (layer.kind === 'image') imageLayers += 1; return mapLayer(layer); };
  plan.frames = list(plan.frames).map((frame) => ({
    ...frame,
    directChildren: list(frame.directChildren).map(visit),
    children: list(frame.children).map(visit),
    groups: list(frame.groups).map((group) => ({ ...group, children: list(group.children).map(visit) }))
  }));
  plan.diagnostics = { ...(plan.diagnostics || {}), imageFitPlan: true, imageFitLayers: imageLayers };
  return plan;
}
