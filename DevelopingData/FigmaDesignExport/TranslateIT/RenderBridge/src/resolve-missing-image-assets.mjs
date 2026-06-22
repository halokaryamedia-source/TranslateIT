function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function area(rect = {}) { return Math.max(0, (rect.w || 0) * (rect.h || 0)); }
function overlapArea(a = {}, b = {}) { const x = Math.max(0, Math.min((a.x || 0) + (a.w || 0), (b.x || 0) + (b.w || 0)) - Math.max(a.x || 0, b.x || 0)); const y = Math.max(0, Math.min((a.y || 0) + (a.h || 0), (b.y || 0) + (b.h || 0)) - Math.max(a.y || 0, b.y || 0)); return x * y; }
function overlapRatio(a, b) { const o = overlapArea(a, b); return o / Math.max(1, Math.min(area(a), area(b))); }
function isImageLayer(layer) { return layer?.type === 'image'; }
function isTinyVisual(layer) { const a = area(layer.rect); return a > 0 && a < 1800; }
function bestAssetFor(layer, assets) { let best = null; for (const asset of assets || []) { if (!asset.base64 || !asset.rect) continue; if (asset.kind === 'component-slice' && area(layer.rect) < 12000) continue; const score = overlapRatio(layer.rect, asset.rect); if (!best || score > best.score) best = { asset, score }; } return best && best.score >= 0.62 ? best.asset : null; }
export function resolveMissingImageAssets(cloneModel) {
  const model = clone(cloneModel);
  const assets = model.assets || [];
  const existing = new Set(assets.map((asset) => asset.id));
  let assigned = 0;
  let dropped = 0;
  let placeholder = 0;
  const layers = [];
  for (const layer of model.layers || []) {
    if (!isImageLayer(layer)) { layers.push(layer); continue; }
    if (layer.assetId && existing.has(layer.assetId)) { layers.push(layer); continue; }
    const match = bestAssetFor(layer, assets);
    if (match) { layers.push({ ...layer, assetId: match.id, alt: layer.alt || match.name || '', imageFit: { ...(layer.imageFit || {}), objectFit: match.objectFit || layer.imageFit?.objectFit || 'cover', objectPosition: match.objectPosition || layer.imageFit?.objectPosition || '50% 50%' }, layout: { ...(layer.layout || {}), objectFit: match.objectFit || layer.layout?.objectFit || 'cover', objectPosition: match.objectPosition || layer.layout?.objectPosition || '50% 50%' }, sourceReason: `${layer.sourceReason || 'image'} + resolved-missing-asset` }); assigned += 1; continue; }
    if (isTinyVisual(layer) || ['logo-image', 'icon-image'].includes(layer.role)) { dropped += 1; continue; }
    layers.push({ ...layer, type: 'shape', role: 'image-placeholder-surface', semanticRole: 'image-placeholder-surface', assetId: null, style: { ...(layer.style || {}), backgroundColor: layer.style?.backgroundColor || '#F1F5F9', borderColor: layer.style?.borderColor || '#E2E8F0', borderWidth: layer.style?.borderWidth || 1 }, sourceReason: `${layer.sourceReason || 'image'} + placeholder-missing-asset` });
    placeholder += 1;
  }
  model.layers = layers;
  model.diagnostics = { ...(model.diagnostics || {}), missingImageAssetsResolved: assigned, missingImageLayersDropped: dropped, missingImagePlaceholders: placeholder };
  model.uiLibrary = { ...(model.uiLibrary || {}), missingAssetPolicy: 'assign-nearest-asset-or-safe-placeholder-v1' };
  return model;
}
