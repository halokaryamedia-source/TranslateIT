import fs from 'node:fs/promises';
import path from 'node:path';
import { buildResponsiveRenderPlan } from './build-responsive-render-plan.mjs';

async function main() {
  const input = process.argv[2] || path.join(process.cwd(), 'reports', 'translateit-payload.json');
  const output = process.argv[3] || path.join(process.cwd(), 'reports', 'translateit-responsive-render-plan.json');
  const payload = JSON.parse(await fs.readFile(input, 'utf8'));
  const result = buildResponsiveRenderPlan(payload.figmaRenderPlan);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: 'written', output, variants: result.diagnostics?.variants || 0 }, null, 2));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exit(1); });
