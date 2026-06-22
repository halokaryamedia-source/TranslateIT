import fs from 'node:fs/promises';
import path from 'node:path';
import { buildPayload } from './build-payload-core-v5.mjs';
import { buildResponsiveRenderPlan } from './build-responsive-render-plan.mjs';
import { buildStyleInventory } from './build-style-inventory.mjs';

async function main() {
  const targetUrl = process.argv[2] || process.env.TRANSLATEIT_TARGET_URL || 'https://www.mivubi.com/';
  const output = process.argv[3] || path.join(process.cwd(), 'reports', 'translateit-payload.json');
  const payload = await buildPayload(targetUrl);
  payload.responsiveRenderPlan = buildResponsiveRenderPlan(payload.figmaRenderPlan);
  payload.styleInventory = buildStyleInventory(payload);
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.responsiveRenderPlan = payload.responsiveRenderPlan.diagnostics;
  payload.diagnostics.styleInventory = payload.styleInventory.diagnostics;
  payload.diagnostics.nativeUsefulness = { ...(payload.diagnostics.nativeUsefulness || {}), responsiveVariants: payload.responsiveRenderPlan.diagnostics?.variants || 0, styleInventoryStatus: payload.styleInventory.status };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify({ status: 'written', targetUrl, output, renderPlanStatus: payload.figmaRenderPlan?.status, productionManifestStatus: payload.productionExportManifest?.status, productionRiskLevel: payload.productionExportManifest?.risk?.level || 'unknown', renderPlanSanitized: payload.figmaRenderPlan?.diagnostics?.sanitized === true, responsiveVariants: payload.responsiveRenderPlan?.diagnostics?.variants || 0, styleInventoryStatus: payload.styleInventory?.status || 'missing' }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exit(1); });
