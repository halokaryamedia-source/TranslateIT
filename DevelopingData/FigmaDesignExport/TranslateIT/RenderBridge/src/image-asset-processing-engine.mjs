function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function num(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function sizeOf(asset = {}) { return { width: num(asset.width || asset.naturalWidth, 0), height: num(asset.height || asset.naturalHeight, 0) }; }
function assetRole(asset = {}) { const kind = clean(asset.kind || 'image'); if (kind === 'background-image') return 'background-image'; if (kind === 'component-slice') return 'component-slice'; return 'image'; }
export async function buildImageAssetProcessingPlan(cloneModel) {
  let sharpAvailable = true;
  try { await import('sharp'); } catch { sharpAvailable = false; }
  const assets = cloneModel?.assets || [];
  const imageAssets = assets.filter((asset) => assetRole(asset) !== 'component-slice' && asset.base64);
  const processed = imageAssets.map((asset, index) => {
    const size = sizeOf(asset);
    const role = assetRole(asset);
    const tooLarge = size.width > 2400 || size.height > 2400 || String(asset.base64 || '').length > 4_000_000;
    const tooSmall = size.width > 0 && size.height > 0 && (size.width < 16 || size.height < 16);
    return {
      id: asset.id || `asset-${index}`,
      kind: asset.kind || 'image',
      role,
      width: size.width,
      height: size.height,
      objectFit: clean(asset.objectFit || (role === 'background-image' ? 'cover' : '')),
      objectPosition: clean(asset.objectPosition || '50% 50%'),
      base64BytesApprox: Math.round(String(asset.base64 || '').length * 0.75),
      action: tooLarge ? 'resize-before-figma' : tooSmall ? 'keep-but-warn-small' : 'keep-original',
      warnings: [!sharpAvailable ? 'sharp-not-installed-yet' : '', tooLarge ? 'large-image' : '', tooSmall ? 'small-image' : ''].filter(Boolean)
    };
  });
  const failures = [];
  if (!sharpAvailable) failures.push('sharp dependency is missing');
  return {
    version: 'image-asset-processing-plan-v2-background-aware',
    engine: 'sharp-adapter',
    status: failures.length ? 'fail' : 'pass',
    processed,
    diagnostics: {
      assets: assets.length,
      imageAssets: imageAssets.length,
      backgroundImageAssets: processed.filter((item) => item.role === 'background-image').length,
      resizeCandidates: processed.filter((item) => item.action === 'resize-before-figma').length,
      warnings: processed.reduce((sum, item) => sum + item.warnings.length, 0),
      failures
    }
  };
}
