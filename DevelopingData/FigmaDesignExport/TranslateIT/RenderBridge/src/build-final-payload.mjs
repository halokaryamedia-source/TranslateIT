import { buildPayload as buildBasePayload } from './build-payload.mjs';
import { buildResponsiveRenderPlan } from './build-responsive-render-plan.mjs';
import { buildResponsiveLayoutIntent } from './build-responsive-layout-intent.mjs';
import { buildStyleInventory } from './build-style-inventory.mjs';
import { buildComponentSummary } from './build-component-summary.mjs';
import { buildComponentDetailSummary } from './build-component-detail-summary.mjs';
import { applyLayerNamePass } from './apply-layer-name-pass.mjs';
import { finalizePluginRenderPlan } from './finalize-plugin-render-plan.mjs';
import { applyImageFitPlan } from './apply-image-fit-plan.mjs';

function buildPluginRenderPolicy() {
  return {
    version: 'designit-plugin-render-policy-v1',
    defaultFrameMode: 'desktop-only',
    renderResponsiveVariants: false,
    renderDiagnosticSummary: false,
    skipNoisyIcons: true,
    skipMissingImageFallback: true,
    maxIconImageArea: 12000,
    minimumRenderableImageArea: 900,
    reason: 'DesignIT must first produce one clean editable desktop mockup before optional responsive variants are rendered.'
  };
}

export async function buildFinalPayload(targetUrl) {
  const payload = await buildBasePayload(targetUrl);
  payload.figmaRenderPlan = applyImageFitPlan(finalizePluginRenderPlan(applyLayerNamePass(payload.figmaRenderPlan)));
  payload.responsiveRenderPlan = buildResponsiveRenderPlan(payload.figmaRenderPlan);
  payload.responsiveLayoutIntent = buildResponsiveLayoutIntent(payload.figmaRenderPlan);
  payload.styleInventory = buildStyleInventory(payload);
  payload.componentSummary = buildComponentSummary(payload);
  payload.componentDetailSummary = buildComponentDetailSummary(payload);
  payload.pluginRenderPolicy = buildPluginRenderPolicy();
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.figmaRenderPlan = payload.figmaRenderPlan.diagnostics;
  payload.diagnostics.responsiveRenderPlan = payload.responsiveRenderPlan.diagnostics;
  payload.diagnostics.responsiveLayoutIntent = payload.responsiveLayoutIntent.diagnostics;
  payload.diagnostics.styleInventory = payload.styleInventory.diagnostics;
  payload.diagnostics.componentSummary = payload.componentSummary.summary;
  payload.diagnostics.componentDetailSummary = payload.componentDetailSummary.summary;
  payload.diagnostics.pluginRenderPolicy = payload.pluginRenderPolicy;
  payload.diagnostics.nativeUsefulness = {
    ...(payload.diagnostics.nativeUsefulness || {}),
    userFacingInput: 'url-link',
    internalPayloadMode: 'final-url-render-flow',
    pluginDefaultFrameMode: payload.pluginRenderPolicy.defaultFrameMode,
    responsiveVariants: payload.pluginRenderPolicy.renderResponsiveVariants ? payload.responsiveRenderPlan.diagnostics?.variants || 0 : 0,
    responsiveVariantsAvailable: payload.responsiveRenderPlan.diagnostics?.variants || 0,
    responsiveLayoutIntentStatus: payload.responsiveLayoutIntent.status,
    styleInventoryStatus: payload.styleInventory.status,
    componentSummaryStatus: payload.componentSummary.status,
    componentDetailSummaryStatus: payload.componentDetailSummary.status,
    layerNamePass: payload.figmaRenderPlan.diagnostics?.layerNamePass === true,
    pluginRenderFinalPass: payload.figmaRenderPlan.diagnostics?.pluginRenderFinalPass === true,
    imageFitPlan: payload.figmaRenderPlan.diagnostics?.imageFitPlan === true
  };
  return payload;
}
