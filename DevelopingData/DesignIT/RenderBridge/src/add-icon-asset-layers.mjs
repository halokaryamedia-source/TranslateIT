function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function area(rect) { return Math.max(0, rect?.w || 0) * Math.max(0, rect?.h || 0); }
function sectionFor(asset, sections) { const r = asset.rect || {}; const cy = (r.y || 0) + (r.h || 0) / 2; return sections.find((section) => cy >= (section.rect?.y || 0) - 24 && cy <= (section.rect?.y || 0) + (section.rect?.h || 0) + 24) || sections[0] || null; }
function isIconAsset(asset) { return ['vector-image', 'svg-icon', 'logo-icon', 'icon-image'].includes(clean(asset.kind)); }
export function addIconAssetLayers(cloneModel) {
  const model = clone(cloneModel);
  const assets = Array.isArray(model.assets) ? model.assets : [];
  const sections = Array.isArray(model.sections) ? model.sections : [];
  const existingAssetIds = new Set((model.layers || []).map((layer) => layer.assetId).filter(Boolean));
  const layers = Array.isArray(model.layers) ? model.layers : [];
  let added = 0;
  const icons = assets.filter((asset) => isIconAsset(asset) && asset.rect && asset.base64 && !existingAssetIds.has(asset.id));
  for (const asset of icons) {
    if (area(asset.rect) < 100 || area(asset.rect) > 90000) continue;
    const section = sectionFor(asset, sections);
    const layer = {
      id: `icon-asset-${asset.rawIndex ?? added}`,
      type: 'image',
      role: asset.kind === 'logo-icon' ? 'logo-image' : 'icon-image',
      semanticRole: asset.kind === 'logo-icon' ? 'logo-image' : 'icon-image',
      name: `${asset.kind === 'logo-icon' ? 'Logo' : 'Icon'} / ${clean(asset.name).slice(0, 44) || added + 1}`,
      sectionId: section?.id || null,
      rect: asset.rect,
      originalRect: asset.rect,
      text: '',
      assetId: asset.id,
      alt: clean(asset.name),
      style: { color: '#111827', backgroundColor: '', fontSize: 0, fontWeight: 400, fontFamily: 'Inter', lineHeight: 0, letterSpacing: 0, textTransform: 'none', whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'normal', opacity: 1, overflow: 'hidden', borderRadius: 0, borderWidth: 0, borderColor: '', boxShadow: '', textAlign: 'left', position: '', zIndex: '0' },
      imageFit: { objectFit: 'contain', objectPosition: '50% 50%', naturalWidth: asset.naturalWidth || asset.width || asset.rect.w, naturalHeight: asset.naturalHeight || asset.height || asset.rect.h, renderedRatio: asset.rect.w && asset.rect.h ? asset.rect.w / asset.rect.h : 0, naturalRatio: asset.width && asset.height ? asset.width / asset.height : 0, aspectDrift: 0 },
      layout: { objectFit: 'contain', objectPosition: '50% 50%', clip: true },
      zIndex: asset.kind === 'logo-icon' ? 120 : 35,
      paintOrder: asset.kind === 'logo-icon' ? 120 + added : 35 + added,
      editable: true,
      groupPath: ['Page', section?.name || 'Unsectioned', asset.kind === 'logo-icon' ? '15 Logo' : '25 Icons'],
      sourceReason: 'captured-vector-icon-asset',
      confidence: 0.78,
      visualMatch: null
    };
    layers.push(layer);
    if (section) {
      section.layerIds = Array.isArray(section.layerIds) ? section.layerIds : [];
      section.layerIds.push(layer.id);
      section.contentLayerIds = Array.isArray(section.contentLayerIds) ? section.contentLayerIds : [];
      section.contentLayerIds.push(layer.id);
    }
    added += 1;
  }
  model.layers = layers;
  model.diagnostics = { ...(model.diagnostics || {}), iconAssetLayers: added };
  model.uiLibrary = { ...(model.uiLibrary || {}), iconAssetLayers: added ? 'captured-vector-icons-v1' : 'none' };
  return model;
}
