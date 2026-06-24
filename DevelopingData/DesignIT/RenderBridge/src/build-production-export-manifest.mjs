function count(list, fn) { return (list || []).filter(fn).length; }
function pct(a, b) { return b ? Number(((a / b) * 100).toFixed(1)) : 0; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function riskLevel(score) { if (score >= 70) return 'high'; if (score >= 35) return 'medium'; return 'low'; }
function allRenderLayers(figmaRenderPlan) {
  const frames = figmaRenderPlan?.frames || [];
  return frames.flatMap((frame) => [
    ...(frame.directChildren || []),
    ...(frame.children || []),
    ...(frame.groups || []).flatMap((group) => group.children || [])
  ]);
}
function allGroups(figmaRenderPlan) { return (figmaRenderPlan?.frames || []).flatMap((frame) => frame.groups || []); }
export function buildProductionExportManifest({ cloneModel, figmaRenderPlan, figmaAutoLayoutPlan, imageAssetProcessingPlan }) {
  const layers = cloneModel?.layers || [];
  const renderLayers = allRenderLayers(figmaRenderPlan);
  const groups = allGroups(figmaRenderPlan);
  const text = count(layers, (layer) => layer.type === 'text');
  const images = count(layers, (layer) => layer.type === 'image');
  const buttons = count(layers, (layer) => layer.type === 'button');
  const shapes = count(layers, (layer) => layer.type === 'shape');
  const missingAssets = count(renderLayers, (layer) => (layer.warnings || []).includes('missing-image-asset'));
  const downgradedMissingImages = count(renderLayers, (layer) => (layer.warnings || []).includes('downgraded-missing-image-to-placeholder'));
  const visualBlocks = count(layers, (layer) => layer.role === 'component-slice');
  const editable = text + images + buttons + shapes;
  const editableRatio = pct(editable - visualBlocks, Math.max(1, editable));
  const emptyGroups = count(groups, (group) => !group.children?.length);
  const riskScore = missingAssets * 20 + downgradedMissingImages * 6 + visualBlocks * 3 + emptyGroups * 10 + (figmaAutoLayoutPlan?.diagnostics?.absoluteFrames || 0) * 4;
  return {
    version: 'production-export-manifest-v2-group-aware',
    status: missingAssets ? 'needs-review' : 'ready-for-controlled-test',
    summary: { layers: layers.length, renderLayers: renderLayers.length, groups: groups.length, text, images, buttons, shapes, visualBlocks, editableRatio },
    figma: { frames: figmaRenderPlan?.diagnostics?.frames || 0, cardGroups: figmaRenderPlan?.diagnostics?.normalizedCardGroups || figmaRenderPlan?.diagnostics?.cardGroups || 0, duplicateTextRemoved: figmaRenderPlan?.diagnostics?.duplicateTextRemoved || 0, missingAssets, downgradedMissingImages, emptyGroups },
    assets: { total: imageAssetProcessingPlan?.diagnostics?.assets || 0, images: imageAssetProcessingPlan?.diagnostics?.imageAssets || 0, backgroundImages: imageAssetProcessingPlan?.diagnostics?.backgroundImageAssets || 0, icons: imageAssetProcessingPlan?.diagnostics?.iconAssets || 0, logos: imageAssetProcessingPlan?.diagnostics?.logoAssets || 0, resizeCandidates: imageAssetProcessingPlan?.diagnostics?.resizeCandidates || 0 },
    autoLayout: { frames: figmaAutoLayoutPlan?.diagnostics?.frames || 0, autoLayoutFrames: figmaAutoLayoutPlan?.diagnostics?.autoLayoutFrames || 0, autoLayoutGroups: figmaAutoLayoutPlan?.diagnostics?.autoLayoutGroups || 0, cardGroups: figmaAutoLayoutPlan?.diagnostics?.cardGroups || 0, responsiveHints: figmaAutoLayoutPlan?.diagnostics?.responsiveHints || 0 },
    risk: { score: riskScore, level: riskLevel(riskScore), notes: [missingAssets ? `${missingAssets} missing image assets remain` : '', downgradedMissingImages ? `${downgradedMissingImages} image placeholders created` : '', visualBlocks ? `${visualBlocks} visual fallback blocks remain` : '', emptyGroups ? `${emptyGroups} empty group(s)` : '', clean(figmaRenderPlan?.status) !== 'pass' ? 'render plan is not pass' : ''].filter(Boolean) }
  };
}
