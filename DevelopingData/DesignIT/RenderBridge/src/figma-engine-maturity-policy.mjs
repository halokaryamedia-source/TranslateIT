function pass(value) { return value === true || value === 'pass' || value === 'ready'; }
function fail(message, code) { return { code, message }; }

export function evaluateFigmaEngineMaturity(payload = {}) {
  const failures = [];
  const warnings = [];
  const external = payload.diagnostics?.externalVisualParser || {};
  const visualIntent = payload.visualIntentModel || {};
  const layoutIntent = payload.layoutIntentModel || {};
  const renderPlan = payload.figmaRenderPlan || {};
  const autoLayout = payload.figmaAutoLayoutPlan || {};
  const imageAssets = payload.imageAssetProcessingPlan || {};
  const visualCompare = payload.visualComparePlan || {};
  const fontMetric = payload.fontMetricPlan || {};

  if (!pass(external.status)) failures.push(fail('External visual parser is not ready.', 'external-parser'));
  if (!visualIntent.diagnostics?.hasUsefulVisualParse) failures.push(fail('Visual intent model has no useful parse.', 'visual-intent'));
  if (!pass(layoutIntent.status) || layoutIntent.figmaTestAllowed !== true) failures.push(fail('Layout intent is not ready for Figma.', 'layout-intent'));
  if (renderPlan.version !== 'figma-render-plan-v1' || !pass(renderPlan.status)) failures.push(fail('Figma render plan is not ready.', 'figma-render-plan'));
  if (autoLayout.version !== 'figma-auto-layout-plan-v1' || !pass(autoLayout.status)) failures.push(fail('Auto layout plan is not ready.', 'auto-layout-plan'));
  if (imageAssets.version !== 'image-asset-processing-plan-v1' || !pass(imageAssets.status)) failures.push(fail('Image asset processing is not ready.', 'image-assets'));
  if (visualCompare.version !== 'visual-compare-plan-v1' || !pass(visualCompare.status)) failures.push(fail('Visual compare engine is not ready.', 'visual-compare'));
  if (fontMetric.version !== 'font-metric-plan-v1' || !pass(fontMetric.status)) warnings.push(fail('Font metric engine is not fully active. This is non-blocking for early audit.', 'font-metric'));

  const stages = [
    { id: 'P0', name: 'Parser Ready', ready: pass(external.status) && !!visualIntent.diagnostics?.hasUsefulVisualParse },
    { id: 'P1', name: 'Layout Intent Ready', ready: pass(layoutIntent.status) && layoutIntent.figmaTestAllowed === true },
    { id: 'P2', name: 'Figma Render Plan Ready', ready: renderPlan.version === 'figma-render-plan-v1' && pass(renderPlan.status) },
    { id: 'P3', name: 'Support Engines Ready', ready: pass(autoLayout.status) && pass(imageAssets.status) && pass(visualCompare.status) },
    { id: 'P4', name: 'Renderer Contract Ready', ready: payload.publicVersion && payload.engine && payload.engineBuild },
    { id: 'P5', name: 'Manual Figma Test Allowed', ready: failures.length === 0 }
  ];

  return {
    version: 'figma-engine-maturity-policy-v1',
    status: failures.length ? 'not-ready' : 'ready',
    manualFigmaTestAllowed: failures.length === 0,
    stages,
    failures,
    warnings,
    summary: {
      readyStages: stages.filter((stage) => stage.ready).length,
      totalStages: stages.length,
      blockers: failures.length,
      warnings: warnings.length
    }
  };
}
