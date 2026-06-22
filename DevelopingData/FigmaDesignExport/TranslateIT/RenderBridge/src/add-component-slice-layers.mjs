function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function area(rect) { return Math.max(0, rect?.w || 0) * Math.max(0, rect?.h || 0); }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function sectionFor(asset, sections) {
  const r = asset.rect || {};
  const cy = (r.y || 0) + (r.h || 0) / 2;
  return sections.find((section) => cy >= (section.rect?.y || 0) - 24 && cy <= (section.rect?.y || 0) + (section.rect?.h || 0) + 24) || sections[0] || null;
}
export function addComponentSliceLayers(cloneModel) {
  const model = clone(cloneModel);
  const assets = Array.isArray(model.assets) ? model.assets : [];
  const sections = Array.isArray(model.sections) ? model.sections : [];
  const existingAssetIds = new Set((model.layers || []).map((layer) => layer.assetId).filter(Boolean));
  const slices = assets.filter((asset) => asset.kind === 'component-slice' && asset.rect && asset.base64 && !existingAssetIds.has(asset.id));
  const layers = Array.isArray(model.layers) ? model.layers : [];
  let added = 0;
  for (const asset of slices) {
    if (area(asset.rect) < 14000) continue;
    const section = sectionFor(asset, sections);
    const layer = {
      id: `component-slice-${asset.rawIndex ?? added}`,
      type: 'image',
      role: 'component-slice',
      name: `Component Slice / ${clean(asset.name).slice(0, 44) || added + 1}`,
      sectionId: section?.id || null,
      rect: asset.rect,
      originalRect: asset.rect,
      text: '',
      assetId: asset.id,
      alt: clean(asset.name),
      style: { color: '#111827', backgroundColor: '', fontSize: 0, fontWeight: 400, fontFamily: 'Inter', lineHeight: 0, letterSpacing: 0, textTransform: 'none', whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'normal', opacity: 1, overflow: 'hidden', borderRadius: 0, textAlign: 'left', position: '', zIndex: '-2' },
      imageFit: { objectFit: 'fill', objectPosition: '50% 50%', naturalWidth: asset.naturalWidth || asset.width || asset.rect.w, naturalHeight: asset.naturalHeight || asset.height || asset.rect.h, renderedRatio: asset.rect.w && asset.rect.h ? asset.rect.w / asset.rect.h : 0, naturalRatio: asset.width && asset.height ? asset.width / asset.height : 0, aspectDrift: 0 },
      layout: { objectFit: 'fill', objectPosition: '50% 50%', clip: true },
      zIndex: -9000 + added,
      paintOrder: -9000 + added,
      editable: true,
      sourceReason: 'component-slice-visual-block',
      confidence: 0.82,
      visualMatch: null
    };
    layers.push(layer);
    if (section) {
      section.layerIds = Array.isArray(section.layerIds) ? section.layerIds : [];
      section.layerIds.push(layer.id);
    }
    added += 1;
  }
  model.layers = layers;
  model.diagnostics = { ...(model.diagnostics || {}), componentSliceLayers: added, hybridEditableMode: added > 0 ? 'component-slices-plus-editable-text' : 'editable-text-and-assets-only' };
  model.uiLibrary = { ...(model.uiLibrary || {}), hybridEditableMode: 'component-slices-plus-editable-text', screenshotReferenceOnly: true };
  return model;
}
