function list(value) { return Array.isArray(value) ? value : []; }
function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function allLayers(plan = {}) {
  return list(plan.frames).flatMap((frame) => [
    ...list(frame.directChildren),
    ...list(frame.children),
    ...list(frame.groups).flatMap((group) => list(group.children))
  ]);
}
function count(items, fn) { return list(items).filter(fn).length; }
function validHex(value) { return /^#[0-9a-fA-F]{6}$/.test(String(value || '')); }
function hasInvalidGradient(layer) {
  const gradient = layer.style?.backgroundGradient;
  if (!gradient) return false;
  if (gradient.type !== 'linear') return true;
  return list(gradient.colors).length < 2 || list(gradient.colors).some((color) => !validHex(color));
}
function hasRiskyShadow(layer) {
  const shadow = String(layer.style?.boxShadow || '').trim();
  if (!shadow || shadow === 'none') return false;
  return !/rgba?\(/i.test(shadow) || !/-?\d/.test(shadow);
}
export function buildPluginRenderContractReport(payload) {
  const plan = payload?.figmaRenderPlan || {};
  const layers = allLayers(plan);
  const supportedKinds = new Set(['text', 'image', 'button', 'shape']);
  const unsupportedKinds = layers.filter((layer) => !supportedKinds.has(String(layer.kind || '')));
  const imageWithoutAsset = layers.filter((layer) => layer.kind === 'image' && layer.assetId && layer.hasAsset === false);
  const invalidGradients = layers.filter(hasInvalidGradient);
  const riskyShadows = layers.filter(hasRiskyShadow);
  const extremeText = layers.filter((layer) => layer.kind === 'text' && (n(layer.style?.fontSize, 14) < 7 || n(layer.style?.fontSize, 14) > 140));
  const invalidRects = layers.filter((layer) => n(layer.rect?.w) <= 0 || n(layer.rect?.h) <= 0);
  const warnings = [
    unsupportedKinds.length ? `${unsupportedKinds.length} unsupported layer kind(s)` : '',
    imageWithoutAsset.length ? `${imageWithoutAsset.length} image layer(s) without available asset` : '',
    invalidGradients.length ? `${invalidGradients.length} invalid gradient layer(s)` : '',
    riskyShadows.length ? `${riskyShadows.length} risky shadow layer(s)` : '',
    extremeText.length ? `${extremeText.length} extreme text size layer(s)` : '',
    invalidRects.length ? `${invalidRects.length} invalid rect layer(s)` : ''
  ].filter(Boolean);
  return {
    version: 'plugin-render-contract-report-v1',
    status: unsupportedKinds.length || imageWithoutAsset.length || invalidRects.length ? 'fail' : warnings.length ? 'review' : 'pass',
    summary: {
      layers: layers.length,
      supportedKinds: layers.length - unsupportedKinds.length,
      unsupportedKinds: unsupportedKinds.length,
      imageWithoutAsset: imageWithoutAsset.length,
      invalidGradients: invalidGradients.length,
      riskyShadows: riskyShadows.length,
      extremeText: extremeText.length,
      invalidRects: invalidRects.length
    },
    warnings,
    samples: {
      unsupportedKinds: unsupportedKinds.slice(0, 12).map((layer) => ({ id: layer.id, name: layer.name, kind: layer.kind })),
      imageWithoutAsset: imageWithoutAsset.slice(0, 12).map((layer) => ({ id: layer.id, name: layer.name, assetId: layer.assetId })),
      invalidGradients: invalidGradients.slice(0, 12).map((layer) => ({ id: layer.id, name: layer.name, gradient: layer.style?.backgroundGradient })),
      riskyShadows: riskyShadows.slice(0, 12).map((layer) => ({ id: layer.id, name: layer.name, boxShadow: layer.style?.boxShadow }))
    }
  };
}
