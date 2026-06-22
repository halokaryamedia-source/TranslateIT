import fs from 'node:fs/promises';
import path from 'node:path';
import { buildFinalPayloadHealthReport } from './build-final-payload-health-report.mjs';
import { buildAssetReliabilityReport } from './build-asset-reliability-report.mjs';
import { buildFigmaImportSafetySummary } from './build-figma-import-safety-summary.mjs';

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}
async function main() {
  const payloadPath = process.argv[2] || path.join(process.cwd(), 'reports', 'translateit-payload.json');
  const healthPath = process.argv[3] || path.join(process.cwd(), 'reports', 'translateit-final-payload-health.json');
  const assetPath = process.argv[4] || path.join(process.cwd(), 'reports', 'translateit-asset-reliability.json');
  const importPath = process.argv[5] || path.join(process.cwd(), 'reports', 'translateit-figma-import-safety.json');
  const payload = JSON.parse(await fs.readFile(payloadPath, 'utf8'));
  const health = buildFinalPayloadHealthReport(payload);
  const assets = buildAssetReliabilityReport(payload);
  const figmaImport = buildFigmaImportSafetySummary(payload);
  await writeJson(healthPath, health);
  await writeJson(assetPath, assets);
  await writeJson(importPath, figmaImport);
  console.log(JSON.stringify({ status: 'written', healthStatus: health.status, healthNextAction: health.nextAction, assetStatus: assets.status, figmaImportStatus: figmaImport.status, healthPath, assetPath, importPath }, null, 2));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exit(1); });
