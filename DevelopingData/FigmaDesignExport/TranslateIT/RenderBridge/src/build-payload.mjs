import { captureSite } from './capture-site.mjs';
import { extractLayout } from './extract-layout.mjs';
import { buildDesignModel } from './build-design-model.mjs';
import { buildVisualModel } from './build-visual-model.mjs';
import { reconstructTextLines } from './reconstruct-text-lines.mjs';
import { guardHeroOcclusion } from './guard-hero-occlusion.mjs';
import { matchDomToVisual } from './match-dom-visual.mjs';
import { buildCloneModel } from './build-clone-model.mjs';
import { ok, assertCleanPayload } from './shared-contract.mjs';

export async function buildPayload(targetUrl) {
  const capture = await captureSite(targetUrl);
  const visualModel = buildVisualModel(capture);
  const layout = extractLayout(capture);
  const designModel = buildDesignModel(layout);
  const lineModel = reconstructTextLines(designModel);
  const guardedModel = guardHeroOcclusion(lineModel);
  const matched = matchDomToVisual(guardedModel, visualModel);
  const cloneModel = buildCloneModel(matched.model, visualModel, matched.diagnostics);

  const payload = ok({
    source: Object.assign({}, capture.source, { screenshot: capture.source.screenshot }),
    visualModel,
    designModel: matched.model,
    cloneModel,
    diagnostics: {
      capture: { rawElements: capture.rawElements.length, assets: capture.assets.length },
      visualModel: visualModel.diagnostics,
      visualMatching: matched.diagnostics,
      layout: layout.stats,
      model: matched.model.diagnostics || guardedModel.diagnostics || lineModel.diagnostics || designModel.diagnostics,
      cloneModel: cloneModel.diagnostics
    }
  });

  const failures = assertCleanPayload(payload);
  if (failures.length) throw new Error('Clean contract failed: ' + failures.join(', '));
  return payload;
}
