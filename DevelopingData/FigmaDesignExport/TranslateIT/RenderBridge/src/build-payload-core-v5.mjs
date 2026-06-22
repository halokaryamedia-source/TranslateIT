import { buildPayload as buildBasePayload } from './build-payload-core-v4.mjs';
import { sanitizeFigmaRenderPlan } from './sanitize-figma-render-plan.mjs';
import { buildFigmaAutoLayoutPlan } from './figma-auto-layout-engine.mjs';
import { buildProductionExportManifest } from './build-production-export-manifest.mjs';

function mergeNativeUsefulness(payload, manifest) {
  const native = payload.diagnostics?.nativeUsefulness || {};
  return { ...native, productionManifestStatus: manifest.status, productionRiskLevel: manifest.risk?.level || native.productionRiskLevel || 'unknown', missingImagesDowngraded: payload.figmaRenderPlan?.diagnostics?.missingImagesDowngraded || 0, emptyRenderGroupsDropped: payload.figmaRenderPlan?.diagnostics?.emptyGroupsDropped || 0, renderPlanSanitized: true };
}
export async function buildPayload(targetUrl) {
  const payload = await buildBasePayload(targetUrl);
  const figmaRenderPlan = sanitizeFigmaRenderPlan(payload.figmaRenderPlan);
  const figmaAutoLayoutPlan = buildFigmaAutoLayoutPlan(figmaRenderPlan);
  const productionExportManifest = buildProductionExportManifest({ cloneModel: payload.cloneModel, figmaRenderPlan, figmaAutoLayoutPlan, imageAssetProcessingPlan: payload.imageAssetProcessingPlan });
  payload.figmaRenderPlan = figmaRenderPlan;
  payload.figmaAutoLayoutPlan = figmaAutoLayoutPlan;
  payload.productionExportManifest = productionExportManifest;
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.figmaRenderPlan = figmaRenderPlan.diagnostics;
  payload.diagnostics.figmaAutoLayoutPlan = figmaAutoLayoutPlan.diagnostics;
  payload.diagnostics.productionExportManifest = productionExportManifest.summary;
  payload.diagnostics.nativeUsefulness = mergeNativeUsefulness(payload, productionExportManifest);
  return payload;
}
