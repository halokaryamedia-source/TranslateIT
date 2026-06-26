import { captureSite } from './capture-site.mjs';
import { extractLayoutDomFaithful } from './extract-layout-dom-faithful.mjs';
import { buildDesignModel } from './build-design-model.mjs';
import { promoteSurfaceEffects } from './promote-surface-effects.mjs';
import { promoteGradientSurfaces } from './promote-gradient-surfaces.mjs';
import { promoteBackgroundImageLayers } from './promote-background-image-layers.mjs';
import { buildVisualModel } from './build-visual-model.mjs';
import { reconstructTextLines } from './reconstruct-text-lines.mjs';
import { guardHeroOcclusion } from './guard-hero-occlusion.mjs';
import { matchDomToVisual } from './match-dom-visual.mjs';
import { buildCloneModel } from './build-clone-model.mjs';
import { addComponentSliceLayers } from './add-component-slice-layers.mjs';
import { addIconAssetLayers } from './add-icon-asset-layers.mjs';
import { resolveMissingImageAssets } from './resolve-missing-image-assets.mjs';
import { rebalanceVisualSliceOverlays } from './rebalance-visual-slice-overlays.mjs';
import { cleanProductionLayers } from './clean-production-layers.mjs';
import { addCardComponentGroups } from './add-card-component-groups.mjs';
import { professionalizeCloneModelV2 } from './professionalize-clone-model-v2.mjs';
import { buildDesignBlueprint } from './build-design-blueprint.mjs';
import { buildFigmaRenderPlan } from './build-figma-render-plan.mjs';
import { normalizeCardRenderGroups } from './normalize-card-render-groups.mjs';
import { normalizeRenderTextLayers } from './normalize-render-text-layers.mjs';
import { buildFigmaAutoLayoutPlan } from './figma-auto-layout-engine.mjs';
import { buildImageAssetProcessingPlan } from './image-asset-processing-engine.mjs';
import { buildVisualComparePlan } from './visual-compare-engine.mjs';
import { buildFontMetricPlan } from './font-metric-engine.mjs';
import { buildProductionExportManifest } from './build-production-export-manifest.mjs';
import { runExternalVisualParser } from './visual-parser-adapter.mjs';
import { buildVisualIntentModel, buildMissingVisualIntentModel } from './build-visual-intent-model.mjs';
import { buildLayoutIntentModel } from './build-layout-intent-model.mjs';
import { ok, assertCleanPayload } from './shared-contract.mjs';

function cap(capture) { return { rawElements: capture.rawElements.length, assets: capture.assets.length, backgroundAssets: capture.assets.filter((a) => a.kind === 'background-image').length, iconAssets: capture.assets.filter((a) => ['vector-image','svg-icon','logo-icon','icon-image'].includes(a.kind)).length, componentSliceCount: capture.source.captureDiagnostics?.componentSliceCount || 0, stabilization: capture.source.captureDiagnostics || null, screenshot: { width: capture.source.screenshot?.width || 0, height: capture.source.screenshot?.height || 0, pageHeight: capture.source.pageHeight || 0, viewport: capture.source.viewport || null } }; }
function nativeUsefulness(x) { return { mode: 'figma-render-plan-editable-output', figmaTestAllowed: x.layoutIntentModel.figmaTestAllowed && x.figmaRenderPlan.figmaTestAllowed && x.imageAssetProcessingPlan.status === 'pass' && x.visualComparePlan.status === 'ready', layoutIntentStatus: x.layoutIntentModel.status, figmaRenderPlanStatus: x.figmaRenderPlan.status, figmaAutoLayoutPlanStatus: x.figmaAutoLayoutPlan.status, imageAssetProcessingPlanStatus: x.imageAssetProcessingPlan.status, visualComparePlanStatus: x.visualComparePlan.status, fontMetricPlanStatus: x.fontMetricPlan.status, productionManifestStatus: x.productionExportManifest.status, productionRiskLevel: x.productionExportManifest.risk?.level || 'unknown', extractor: x.layout.stats.extractor, rawElements: x.layout.stats.rawElements, keptElements: x.layout.stats.keptElements, coverageRatio: x.layout.stats.coverageRatio, images: x.layout.stats.images, backgroundImages: x.designModel.diagnostics?.backgroundImageLayers || 0, iconAssetLayers: x.cloneModel.diagnostics?.iconAssetLayers || 0, missingImageAssetsResolved: x.cloneModel.diagnostics?.missingImageAssetsResolved || 0, missingImageLayersDropped: x.cloneModel.diagnostics?.missingImageLayersDropped || 0, missingImagePlaceholders: x.cloneModel.diagnostics?.missingImagePlaceholders || 0, visualSliceOverlaysDemoted: x.cloneModel.diagnostics?.visualSliceOverlaysDemoted || 0, visualSliceOverlaysRemoved: x.cloneModel.diagnostics?.visualSliceOverlaysRemoved || 0, productionDuplicateLayersRemoved: x.cloneModel.diagnostics?.productionDuplicateLayersRemoved || 0, productionSmallIconsRemoved: x.cloneModel.diagnostics?.productionSmallIconsRemoved || 0, productionOverflowLayersRemoved: x.cloneModel.diagnostics?.productionOverflowLayersRemoved || 0, normalizedCardGroups: x.figmaRenderPlan.diagnostics?.normalizedCardGroups || 0, normalizedCardSurfaces: x.figmaRenderPlan.diagnostics?.normalizedCardSurfaces || 0, duplicateTextRemoved: x.figmaRenderPlan.diagnostics?.duplicateTextRemoved || 0, gradientLayers: x.designModel.diagnostics?.gradientLayers || 0, componentSlices: x.cloneModel.diagnostics?.componentSliceLayers || 0, visualBlocks: x.cloneModel.diagnostics?.visualBlockLayers || 0, cardComponentGroups: x.cloneModel.diagnostics?.cardComponentGroups || 0, surfaces: x.layout.stats.surfaces, text: x.layout.stats.text }; }

export async function buildPayload(targetUrl) {
  const capture = await captureSite(targetUrl);
  const externalVisualParser = await runExternalVisualParser(capture.source);
  const visualIntentModel = externalVisualParser.result ? buildVisualIntentModel(externalVisualParser.result, capture.source) : buildMissingVisualIntentModel(capture.source, externalVisualParser.reason || 'external visual parser missing');
  const visualModel = buildVisualModel(capture);
  const layout = extractLayoutDomFaithful(capture);
  const rawDesignModel = buildDesignModel(layout);
  const designModel = promoteBackgroundImageLayers(promoteGradientSurfaces(promoteSurfaceEffects(rawDesignModel, layout)));
  const matched = matchDomToVisual(guardHeroOcclusion(reconstructTextLines(designModel)), visualModel);
  const baseCloneModel = buildCloneModel(matched.model, visualModel, matched.diagnostics);
  const cloneBeforeCards = cleanProductionLayers(rebalanceVisualSliceOverlays(resolveMissingImageAssets(addIconAssetLayers(addComponentSliceLayers(baseCloneModel)))));
  const cloneModel = professionalizeCloneModelV2(addCardComponentGroups(cloneBeforeCards));
  const designBlueprint = buildDesignBlueprint(cloneModel, capture.source);
  const layoutIntentModel = buildLayoutIntentModel({ designBlueprint, visualIntentModel, cloneModel });
  const rawFigmaRenderPlan = buildFigmaRenderPlan(cloneModel);
  const figmaRenderPlan = normalizeRenderTextLayers(normalizeCardRenderGroups(rawFigmaRenderPlan));
  const figmaAutoLayoutPlan = buildFigmaAutoLayoutPlan(figmaRenderPlan);
  const imageAssetProcessingPlan = await buildImageAssetProcessingPlan(cloneModel);
  const visualComparePlan = await buildVisualComparePlan({ source: capture.source });
  const fontMetricPlan = await buildFontMetricPlan(cloneModel);
  const productionExportManifest = buildProductionExportManifest({ cloneModel, figmaRenderPlan, figmaAutoLayoutPlan, imageAssetProcessingPlan });
  const payload = ok({ source: Object.assign({}, capture.source, {
      screenshot: capture.source.screenshot,
      rawElements: capture.rawElements,
      /* DESIGNIT_ACTIVE_CORE_V4_SOURCE_TRUTH_16D_F */
      sourceTruth: capture.sourceTruth || capture.source?.sourceTruth || null,
      rawMediaSourceTruth: capture.rawMediaSourceTruth || capture.source?.rawMediaSourceTruth || null,
      backgroundMediaSourceTruth: capture.backgroundMediaSourceTruth || capture.source?.backgroundMediaSourceTruth || null,
      textSourceTruth: capture.textSourceTruth || capture.source?.textSourceTruth || null,
      controlSourceTruth: capture.controlSourceTruth || capture.source?.controlSourceTruth || null
    }), visualModel, visualIntentModel, layoutIntentModel, figmaRenderPlan, figmaAutoLayoutPlan, imageAssetProcessingPlan, visualComparePlan, fontMetricPlan, productionExportManifest, designModel: matched.model, cloneModel, designBlueprint, diagnostics: { capture: cap(capture), externalVisualParser: { status: externalVisualParser.status, parser: externalVisualParser.parser, attempts: externalVisualParser.attempts || [], reason: externalVisualParser.reason || null }, visualIntentModel: visualIntentModel.diagnostics, layoutIntentModel: layoutIntentModel.diagnostics, figmaRenderPlan: figmaRenderPlan.diagnostics, figmaAutoLayoutPlan: figmaAutoLayoutPlan.diagnostics, imageAssetProcessingPlan: imageAssetProcessingPlan.diagnostics, visualComparePlan: visualComparePlan.diagnostics, fontMetricPlan: fontMetricPlan.diagnostics, productionExportManifest: productionExportManifest.summary, visualModel: visualModel.diagnostics, visualMatching: matched.diagnostics, layout: layout.stats, model: matched.model.diagnostics || designModel.diagnostics, cloneModel: cloneModel.diagnostics, designBlueprint: designBlueprint.diagnostics, professionalLayerTree: cloneModel.professionalLayerTree || null, nativeUsefulness: nativeUsefulness({ layout, layoutIntentModel, figmaRenderPlan, figmaAutoLayoutPlan, imageAssetProcessingPlan, visualComparePlan, fontMetricPlan, designModel, cloneModel, productionExportManifest }) } });
  const failures = assertCleanPayload(payload);
  if (failures.length) throw new Error('Clean contract failed: ' + failures.join(', '));
  return payload;
}

