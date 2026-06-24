import fs from 'node:fs/promises';
import path from 'node:path';

async function readJson(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}
function scoreOf(readiness, key) { return Number(readiness?.scores?.[key]?.score || 0); }
function decide({ health, assets, readiness, renderContract }) {
  const blockers = [];
  const warnings = [];
  if (!health) blockers.push('final payload health report missing');
  if (!assets) blockers.push('asset reliability report missing');
  if (!renderContract) warnings.push('render contract report missing');
  if (!readiness) warnings.push('honest readiness report missing');
  if (health?.status === 'fail') blockers.push('final payload health status is fail');
  if (assets?.status === 'fail') blockers.push('asset reliability status is fail');
  if (renderContract?.status === 'fail') blockers.push('render contract status is fail');
  if (health?.summary?.manifestRisk === 'high') blockers.push('manifest risk is high');
  if (health?.summary?.missingAssets > 0) blockers.push(`${health.summary.missingAssets} missing image asset(s)`);
  if (health?.status === 'review') warnings.push('payload health requires review');
  if (assets?.status === 'review') warnings.push('asset reliability requires review');
  if (renderContract?.status === 'review') warnings.push('render contract requires review');
  if (health?.summary?.placeholders > 0) warnings.push(`${health.summary.placeholders} placeholder layer(s)`);
  if (readiness && scoreOf(readiness, 'productionPublicReadiness') < 25) warnings.push('production readiness score is still very low');
  const decision = blockers.length ? 'do-not-import-figma-yet' : warnings.length ? 'controlled-import-with-review' : 'ready-for-controlled-figma-import';
  return { version: 'pretest-decision-report-v2-render-contract-aware', decision, blockers, warnings, readinessScores: readiness?.scores || null, healthSummary: health?.summary || null, assetSummary: assets?.summary || null, renderContractSummary: renderContract?.summary || null };
}
async function main() {
  const healthPath = process.argv[2] || path.join(process.cwd(), 'reports', 'translateit-final-payload-health.json');
  const assetPath = process.argv[3] || path.join(process.cwd(), 'reports', 'translateit-asset-reliability.json');
  const readinessPath = process.argv[4] || path.join(process.cwd(), 'reports', 'translateit-honest-production-readiness.json');
  const renderContractPath = process.argv[5] || path.join(process.cwd(), 'reports', 'translateit-plugin-render-contract.json');
  const outPath = process.argv[6] || path.join(process.cwd(), 'reports', 'translateit-pretest-decision.json');
  const report = decide({ health: await readJson(healthPath), assets: await readJson(assetPath), readiness: await readJson(readinessPath), renderContract: await readJson(renderContractPath) });
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exit(1); });
