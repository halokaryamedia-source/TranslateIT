import { captureSite } from './capture-site.mjs';
import { extractLayoutDomFaithful } from './extract-layout-dom-faithful.mjs';
import { buildDesignModel } from './build-design-model.mjs';
import { buildVisualModel } from './build-visual-model.mjs';
import { reconstructTextLines } from './reconstruct-text-lines.mjs';
import { guardHeroOcclusion } from './guard-hero-occlusion.mjs';
import { matchDomToVisual } from './match-dom-visual.mjs';
import { buildCloneModel } from './build-clone-model.mjs';
import { addComponentSliceLayers } from './add-component-slice-layers.mjs';
import { professionalizeCloneModelV2 } from './professionalize-clone-model-v2.mjs';
import { buildDesignBlueprint } from './build-design-blueprint.mjs';
import { ok, assertCleanPayload } from './shared-contract.mjs';

export async function buildPayload(targetUrl) {
  const capture = await captureSite(targetUrl);
  const visualModel = buildVisualModel(capture);
  const layout = extractLayoutDomFaithful(capture);
  const designModel = buildDesignModel(layout);
  const lineModel = reconstructTextLines(designModel);
  const guardedModel = guardHeroOcclusion(lineModel);
  const matched = matchDomToVisual(guardedModel, visualModel);
  const baseCloneModel = buildCloneModel(matched.model, visualModel, matched.diagnostics);
  const hybridCloneModel = addComponentSliceLayers(baseCloneModel);
  const cloneModel = professionalizeCloneModelV2(hybridCloneModel);
  const designBlueprint = buildDesignBlueprint(cloneModel, capture.source);
  const payload = ok({
    source: Object.assign({}, capture.source, { screenshot: capture.source.screenshot }),
    visualModel,
    designModel: matched.model,
    cloneModel,
    designBlueprint,
    diagnostics: {
      capture: {
        rawElements: capture.rawElements.length,
        assets: capture.assets.length,
        componentSliceCount: capture.source.captureDiagnostics?.componentSliceCount || 0,
        stabilization: capture.source.captureDiagnostics || null,
        screenshot: {
          width: capture.source.screenshot?.width || 0,
          height: capture.source.screenshot?.height || 0,
          pageHeight: capture.source.pageHeight || 0,
          viewport: capture.source.viewport || null
        }
      },
      visualModel: visualModel.diagnostics,
      visualMatching: matched.diagnostics,
      layout: layout.stats,
      model: matched.model.diagnostics || guardedModel.diagnostics || lineModel.diagnostics || designModel.diagnostics,
      cloneModel: cloneModel.diagnostics,
      designBlueprint: designBlueprint.diagnostics,
      professionalLayerTree: cloneModel.professionalLayerTree || null,
      nativeUsefulness: {
        mode: 'blueprint-framework-editable-output',
        extractor: layout.stats.extractor,
        rawElements: layout.stats.rawElements,
        keptElements: layout.stats.keptElements,
        coverageRatio: layout.stats.coverageRatio,
        images: layout.stats.images,
        componentSlices: cloneModel.diagnostics?.componentSliceLayers || 0,
        visualBlocks: cloneModel.diagnostics?.visualBlockLayers || 0,
        surfaces: layout.stats.surfaces,
        text: layout.stats.text
      }
    }
  });
  const failures = assertCleanPayload(payload);
  if (failures.length) throw new Error('Clean contract failed: ' + failures.join(', '));
  return payload;
}
