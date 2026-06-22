import fs from 'node:fs/promises';
import path from 'node:path';
import { buildPayload } from './build-payload-core-v5.mjs';
import { buildResponsiveRenderPlan } from './build-responsive-render-plan.mjs';
import { buildResponsiveLayoutIntent } from './build-responsive-layout-intent.mjs';
import { buildStyleInventory } from './build-style-inventory.mjs';
import { buildComponentSummary } from './build-component-summary.mjs';
import { applyLayerNamePass } from './apply-layer-name-pass.mjs';
import { finalizePluginRenderPlan } from './finalize-plugin-render-plan.mjs';
import { applyImageFitPlan } from './apply-image-fit-plan.mjs';

async function main() {
  const targetUrl = process.argv[2] || process.env.TRANSLATEIT_TARGET_URL || 'https://www.mivubi.com/';
  const output = process.argv[3] || path.join(process.cwd(), 'reports', 'translateit-final-payload-v2.json');
  const payload = await buildPayload(targetUrl);
  payload.figmaRenderPlan = applyImageFitPlan(finalizePluginRenderPlan(applyLayerNamePass(payload.figmaRenderPlan)));
  payload.responsiveRenderPlan = buildResponsiveRenderPlan(payload.figmaRenderPlan);
  payload.responsiveLayoutIntent = buildResponsiveLayoutIntent(payload.figmaRenderPlan);
  payload.styleInventory = buildStyleInventory(payload);
  payload.componentSummary = buildComponentSummary(payload);
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.figmaRenderPlan = payload.figmaRenderPlan.diagnostics;
  payload.diagnostics.responsiveRenderPlan = payload.responsiveRenderPlan.diagnostics;
  payload.diagnostics.responsiveLayoutIntent = payload.responsiveLayoutIntent.diagnostics;
  payload.diagnostics.styleInventory = payload.styleInventory.diagnostics;
  payload.diagnostics.componentSummary = payload.componentSummary.summary;
  payload.diagnostics.nativeUsefulness = { ...(payload.diagnostics.nativeUsefulness || {}), responsiveVariants: payload.responsiveRenderPlan.diagnostics?.variants || 0, responsiveLayoutIntentStatus: payload.responsiveLayoutIntent.status, styleInventoryStatus: payload.styleInventory.status, componentSummaryStatus: payload.componentSummary.status, layerNamePass: payload.figmaRenderPlan.diagnostics?.layerNamePass === true, pluginRenderFinalPass: payload.figmaRenderPlan.diagnostics?.pluginRenderFinalPass === true, imageFitPlan: payload.figmaRenderPlan.diagnostics?.imageFitPlan === true };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify({ status: 'written', output, imageFitPlan: payload.figmaRenderPlan?.diagnostics?.imageFitPlan === true }, null, 2));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exit(1); });
