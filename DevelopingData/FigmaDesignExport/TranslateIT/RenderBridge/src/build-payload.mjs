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
import { addCardComponentGroups } from './add-card-component-groups.mjs';
import { professionalizeCloneModelV2 } from './professionalize-clone-model-v2.mjs';
import { buildDesignBlueprint } from './build-design-blueprint.mjs';
import { buildFigmaRenderPlan } from './build-figma-render-plan.mjs';
import { buildFigmaAutoLayoutPlan } from './figma-auto-layout-engine.mjs';
import { buildImageAssetProcessingPlan } from './image-asset-processing-engine.mjs';
import { buildVisualComparePlan } from './visual-compare-engine.mjs';
import { buildFontMetricPlan } from './font-metric-engine.mjs';
import { runExternalVisualParser } from './visual-parser-adapter.mjs';
import { buildVisualIntentModel, buildMissingVisualIntentModel } from './build-visual-intent-model.mjs';
import { buildLayoutIntentModel } from './build-layout-intent-model.mjs';
import { ok, assertCleanPayload } from './shared-contract.mjs';

export async function buildPayload(targetUrl) {
  const capture = await captureSite(targetUrl);
  const externalVisualParser = await runExternalVisualParser(capture.source);
  const visualIntentModel = externalVisualParser.result ? buildVisualIntentModel(externalVisualParser.result, capture.source) : buildMissingVisualIntentModel(capture.source, externalVisualParser.reason || 'external visual parser missing');
  const visualModel = buildVisualModel(capture);
  const layout = extractLayoutDomFaithful(capture);
  const rawDesignModel = buildDesignModel(layout);
  const effectDesignModel = promoteSurfaceEffects(rawDesignModel, layout);
  const gradientDesignModel = promoteGradientSurfaces(effectDesignModel);
  const designModel = promoteBackgroundImageLayers(gradientDesignModel);
  const lineModel = reconstructTextLines(designModel);
  const guardedModel = guardHeroOcclusion(lineModel);
  const matched = matchDomToVisual(guardedModel, visualModel);
  const baseCloneModel = buildCloneModel(matched.model, visualModel, matched.diagnostics);
  const hybridCloneModel = addComponentSliceLayers(baseCloneModel);
  const cardCloneModel = addCardComponentGroups(hybridCloneModel);
  const cloneModel = professionalizeCloneModelV2(cardCloneModel);
  const designBlueprint = buildDesignBlueprint(cloneModel, capture.source);
  const layoutIntentModel = buildLayoutIntentModel({ designBlueprint, visualIntentModel, cloneModel });
  const figmaRenderPlan = buildFigmaRenderPlan(cloneModel);
  const figmaAutoLayoutPlan = buildFigmaAutoLayoutPlan(figmaRenderPlan);
  const imageAssetProcessingPlan = await buildImageAssetProcessingPlan(cloneModel);
  const visualComparePlan = await buildVisualComparePlan({ source: capture.source });
  const fontMetricPlan = await buildFontMetricPlan(cloneModel);
  const payload = ok({
    source: Object.assign({}, capture.source, { screenshot: capture.source.screenshot }),
    visualModel,
    visualIntentModel,
    layoutIntentModel,
    figmaRenderPlan,
    figmaAutoLayoutPlan,
    imageAssetProcessingPlan,
    visualComparePlan,
    fontMetricPlan,
    designModel: matched.model,
    cloneModel,
    designBlueprint,
    diagnostics: {
      capture: {
        rawElements: capture.rawElements.length,
        assets: capture.assets.length,
        backgroundAssets: capture.assets.filter((asset) => asset.kind === 'background-image').length,
        componentSliceCount: capture.source.captureDiagnostics?.componentSliceCount || 0,
        stabilization: capture.source.captureDiagnostics || null,
        screenshot: { width: capture.source.screenshot?.width || 0, height: capture.source.screenshot?.height || 0, pageHeight: capture.source.pageHeight || 0, viewport: capture.source.viewport || null }
      },
      externalVisualParser: { status: externalVisualParser.status, parser: externalVisualParser.parser, attempts: externalVisualParser.attempts || [], reason: externalVisualParser.reason || null },
      visualIntentModel: visualIntentModel.diagnostics,
      layoutIntentModel: layoutIntentModel.diagnostics,
      figmaRenderPlan: figmaRenderPlan.diagnostics,
      figmaAutoLayoutPlan: figmaAutoLayoutPlan.diagnostics,
      imageAssetProcessingPlan: imageAssetProcessingPlan.diagnostics,
      visualComparePlan: visualComparePlan.diagnostics,
      fontMetricPlan: fontMetricPlan.diagnostics,
      visualModel: visualModel.diagnostics,
      visualMatching: matched.diagnostics,
      layout: layout.stats,
      model: matched.model.diagnostics || guardedModel.diagnostics || lineModel.diagnostics || designModel.diagnostics,
      cloneModel: cloneModel.diagnostics,
      designBlueprint: designBlueprint.diagnostics,
      professionalLayerTree: cloneModel.professionalLayerTree || null,
      nativeUsefulness: {
        mode: 'figma-render-plan-editable-output',
        figmaTestAllowed: layoutIntentModel.figmaTestAllowed && figmaRenderPlan.figmaTestAllowed && imageAssetProcessingPlan.status === 'pass' && visualComparePlan.status === 'ready',
        layoutIntentStatus: layoutIntentModel.status,
        figmaRenderPlanStatus: figmaRenderPlan.status,
        figmaAutoLayoutPlanStatus: figmaAutoLayoutPlan.status,
        imageAssetProcessingPlanStatus: imageAssetProcessingPlan.status,
        visualComparePlanStatus: visualComparePlan.status,
        fontMetricPlanStatus: fontMetricPlan.status,
        extractor: layout.stats.extractor,
        rawElements: layout.stats.rawElements,
        keptElements: layout.stats.keptElements,
        coverageRatio: layout.stats.coverageRatio,
        images: layout.stats.images,
        backgroundImages: designModel.diagnostics?.backgroundImageLayers || 0,
        gradientLayers: designModel.diagnostics?.gradientLayers || 0,
        surfaceStrokeLayers: designModel.diagnostics?.strokeLayers || 0,
        surfaceShadowLayers: designModel.diagnostics?.shadowLayers || 0,
        surfaceFilterLayers: designModel.diagnostics?.filterLayers || 0,
        componentSlices: cloneModel.diagnostics?.componentSliceLayers || 0,
        visualBlocks: cloneModel.diagnostics?.visualBlockLayers || 0,
        cardComponentGroups: cloneModel.diagnostics?.cardComponentGroups || 0,
        surfaces: layout.stats.surfaces,
        text: layout.stats.text
      }
    }
  });
  const failures = assertCleanPayload(payload);
  if (failures.length) throw new Error('Clean contract failed: ' + failures.join(', '));
  return payload;
}
