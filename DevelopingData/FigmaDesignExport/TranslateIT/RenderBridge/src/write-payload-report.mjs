import fs from 'node:fs/promises';
import path from 'node:path';
import { buildPayload } from './build-payload.mjs';

async function main() {
  const targetUrl = process.argv[2] || process.env.TRANSLATEIT_TARGET_URL || 'https://www.mivubi.com/';
  const output = process.argv[3] || path.join(process.cwd(), 'reports', 'translateit-payload.json');
  const payload = await buildPayload(targetUrl);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify({ status: 'written', targetUrl, output, renderPlanStatus: payload.figmaRenderPlan?.status, productionManifestStatus: payload.productionExportManifest?.status, productionRiskLevel: payload.productionExportManifest?.risk?.level || 'unknown' }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exit(1); });
