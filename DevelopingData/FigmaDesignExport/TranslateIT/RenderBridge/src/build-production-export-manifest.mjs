function count(list, fn) { return (list || []).filter(fn).length; }
function pct(a, b) { return b ? Number(((a / b) * 100).toFixed(1)) : 0; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function riskLevel(score) { if (score >= 70) return 'high'; if (score >= 35) return 'medium'; return 'low'; }
export function buildProductionExportManifest({ cloneModel, figmaRenderPlan, figmaAutoLayoutPlan, imageAssetProcessingPlan }) {
  const layers = cloneModel?.layers || [];
  const renderLayers = (figmaRenderPlan?.frames || []).flatMap((frame) => frame.children || []);
  const groups = (figmaRenderPlan?.frames || []).flatMap((frame) => frame.groups || []);
  const text = count(layers, (layer) => layer.type === 'text');
  const images = count(layers, (layer) => layer.type === 'image');
  const buttons = count(layers, (layer) => layer.type === 'button');
  const shapes = count(layers, (layer) => layer.type === 'shape');
  const missingAssets = count(renderLayers, (layer) => (layer.warnings || []).includes('missing-image-asset'));
  const visualBlocks = count(layers, (layer) => layer.role === 'component-slice');
  const editable = text + images + buttons + shapes;
  const editableRatio = pct(editable - visualBlocks, Math.max(1, editable));
  const riskScore = missingAssets * 20 + visualBlocks * 3 + count(groups, (group) => !group.children?.length) * 10 + (figmaAutoLayoutPlan?.diagnostics?.absoluteFrames || 0) * 4;
  return {
    version: 'production-export-manifest-v1',
    status: missingAssets ? 'needs-review' : 'ready-for-controlled-test',
    summary: { layers: layers.length, renderLayers: renderLayers.length, groups: groups.length, text, images, buttons, shapes, visualBlocks, editableRatio },
    figma: { frames: figmaRenderPlan?.diagnostics?.frames || 0, cardGroups: figmaRenderPlan?.diagnostics?.normalizedCardGroups || figmaRenderPlan?.diagnostics?.cardGroups || 0, duplicateTextRemoved: figmaRenderPlan?.diagnostics?.duplicateTextRemoved || 0, missingAssets },
    assets: { total: imageAssetProcessingPlan?.diagnostics?.assets || 0, images: imageAssetProcessingPlan?.diagnostics?.imageAssets || 0, backgroundImages: imageAssetProcessingPlan?.diagnostics?.backgroundImageAssets || 0, icons: imageAssetProcessingPlan?.diagnostics?.iconAssets || 0, logos: imageAssetProcessingPlan?.diagnostics?.logoAssets || 0, resizeCandidates: imageAssetProcessingPlan?.diagnostics?.resizeCandidates || 0 },
    autoLayout: { frames: figmaAutoLayoutPlan?.diagnostics?.frames || 0, autoLayoutFrames: figmaAutoLayoutPlan?.diagnostics?.autoLayoutFrames || 0, autoLayoutGroups: figmaAutoLayoutPlan?.diagnostics?.autoLayoutGroups || 0, cardGroups: figmaAutoLayoutPlan?.diagnostics?.cardGroups || 0, responsiveHints: figmaAutoLayoutPlan?.diagnostics?.responsiveHints || 0 },
    risk: { score: riskScore, level: riskLevel(riskScore), notes: [missingAssets ? `${missingAssets} missing image assets remain` : '', visualBlocks ? `${visualBlocks} visual fallback blocks remain` : '', clean(figmaRenderPlan?.status) !== 'pass' ? 'render plan is not pass' : ''].filter(Boolean) }
  };
}
