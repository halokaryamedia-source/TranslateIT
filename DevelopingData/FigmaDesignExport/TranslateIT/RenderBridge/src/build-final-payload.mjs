import { buildPayload as buildBasePayload } from './build-payload.mjs';
import { buildResponsiveRenderPlan } from './build-responsive-render-plan.mjs';
import { buildResponsiveLayoutIntent } from './build-responsive-layout-intent.mjs';
import { buildStyleInventory } from './build-style-inventory.mjs';
import { buildComponentSummary } from './build-component-summary.mjs';
import { buildComponentDetailSummary } from './build-component-detail-summary.mjs';
import { applyLayerNamePass } from './apply-layer-name-pass.mjs';
import { finalizePluginRenderPlan } from './finalize-plugin-render-plan.mjs';
import { applyImageFitPlan } from './apply-image-fit-plan.mjs';
import { applyDesktopQualityPass } from './apply-desktop-quality-pass.mjs';
import { applyVisualBackplatePass } from './apply-visual-backplate-pass.mjs';

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
    visualBackplateMode: 'screenshot-backed-editable-overlay',
    reason: 'DesignIT now prioritizes one visually faithful desktop frame with editable overlays before deeper layer reconstruction.'
  };
}

export async function buildFinalPayload(targetUrl) {
  const payload = await buildBasePayload(targetUrl);
  payload.figmaRenderPlan = applyDesktopQualityPass(applyImageFitPlan(finalizePluginRenderPlan(applyLayerNamePass(payload.figmaRenderPlan))));
  applyVisualBackplatePass(payload);
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
  payload.diagnostics.desktopQuality = payload.figmaRenderPlan.diagnostics?.desktopQuality || null;
  payload.diagnostics.visualBackplate = payload.figmaRenderPlan.diagnostics?.visualBackplate || null;
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
    imageFitPlan: payload.figmaRenderPlan.diagnostics?.imageFitPlan === true,
    desktopQualityPass: payload.figmaRenderPlan.diagnostics?.desktopQualityPass === true,
    desktopQualityScore: payload.figmaRenderPlan.diagnostics?.desktopQuality?.score || 0,
    desktopQualityGrade: payload.figmaRenderPlan.diagnostics?.desktopQuality?.grade || 'missing',
    visualBackplatePass: payload.figmaRenderPlan.diagnostics?.visualBackplatePass === true,
    visualBackplateMode: payload.figmaRenderPlan.diagnostics?.visualBackplate?.mode || 'missing'
  };
  return payload;
}
