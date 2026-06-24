import fs from 'node:fs/promises';
import path from 'node:path';
import { buildPluginRenderContractReport } from './build-plugin-render-contract-report.mjs';

async function main() {
  const payloadPath = process.argv[2] || path.join(process.cwd(), 'reports', 'translateit-payload.json');
  const outputPath = process.argv[3] || path.join(process.cwd(), 'reports', 'translateit-plugin-render-contract.json');
  const payload = JSON.parse(await fs.readFile(payloadPath, 'utf8'));
  const report = buildPluginRenderContractReport(payload);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: 'written', reportStatus: report.status, outputPath }, null, 2));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exit(1); });
