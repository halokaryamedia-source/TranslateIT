function list(value) { return Array.isArray(value) ? value : []; }
function count(items, fn) { return list(items).filter(fn).length; }
function allRenderLayers(plan = {}) {
  return list(plan.frames).flatMap((frame) => [
    ...list(frame.directChildren),
    ...list(frame.children),
    ...list(frame.groups).flatMap((group) => list(group.children))
  ]);
}
function roleOf(asset = {}) {
  if (asset.kind === 'background-image') return 'background-image';
  if (asset.kind === 'logo-icon') return 'logo';
  if (['svg-icon', 'icon-image', 'vector-image'].includes(asset.kind)) return 'icon';
  if (asset.kind === 'component-slice') return 'component-slice';
  return 'image';
}
export function buildAssetReliabilityReport(payload) {
  const assets = list(payload?.cloneModel?.assets);
  const renderLayers = allRenderLayers(payload?.figmaRenderPlan || {});
  const assetIds = new Set(assets.map((asset) => asset.id).filter(Boolean));
  const imageLayers = renderLayers.filter((layer) => layer.kind === 'image');
  const missingLayers = imageLayers.filter((layer) => layer.assetId && !assetIds.has(layer.assetId));
  const unresolvedLayers = imageLayers.filter((layer) => layer.assetId && layer.hasAsset === false);
  const placeholderLayers = renderLayers.filter((layer) => layer.role === 'image-placeholder-surface' || list(layer.warnings).includes('downgraded-missing-image-to-placeholder'));
  const unusedAssets = assets.filter((asset) => !renderLayers.some((layer) => layer.assetId === asset.id));
  return {
    version: 'asset-reliability-report-v1',
    status: missingLayers.length || unresolvedLayers.length ? 'fail' : placeholderLayers.length ? 'review' : 'pass',
    summary: {
      assets: assets.length,
      imageAssets: count(assets, (asset) => roleOf(asset) === 'image'),
      backgroundAssets: count(assets, (asset) => roleOf(asset) === 'background-image'),
      logoAssets: count(assets, (asset) => roleOf(asset) === 'logo'),
      iconAssets: count(assets, (asset) => roleOf(asset) === 'icon'),
      componentSliceAssets: count(assets, (asset) => roleOf(asset) === 'component-slice'),
      imageLayers: imageLayers.length,
      missingImageLayers: missingLayers.length,
      unresolvedImageLayers: unresolvedLayers.length,
      placeholderLayers: placeholderLayers.length,
      unusedAssets: unusedAssets.length
    },
    missing: missingLayers.slice(0, 20).map((layer) => ({ id: layer.id, name: layer.name, assetId: layer.assetId, role: layer.role })),
    placeholders: placeholderLayers.slice(0, 20).map((layer) => ({ id: layer.id, name: layer.name, role: layer.role })),
    unusedAssets: unusedAssets.slice(0, 20).map((asset) => ({ id: asset.id, kind: asset.kind, name: asset.name }))
  };
}
