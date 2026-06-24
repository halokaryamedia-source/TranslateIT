import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}
const payloadPath = process.argv[2] || path.join(process.cwd(), 'reports', 'translateit-payload.json');
const reportDir = process.argv[3] || path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });

run(['./src/write-final-pretest-reports.mjs', payloadPath, path.join(reportDir, 'translateit-final-payload-health.json'), path.join(reportDir, 'translateit-asset-reliability.json'), path.join(reportDir, 'translateit-figma-import-safety.json'), path.join(reportDir, 'translateit-visual-fidelity-precheck.json')]);
run(['./src/write-render-contract-report.mjs', payloadPath, path.join(reportDir, 'translateit-plugin-render-contract.json')]);
run(['./src/evaluate-honest-production-readiness.mjs', payloadPath, path.join(reportDir, 'translateit-honest-production-readiness.json')]);
run(['./src/write-pretest-decision-report.mjs', path.join(reportDir, 'translateit-final-payload-health.json'), path.join(reportDir, 'translateit-asset-reliability.json'), path.join(reportDir, 'translateit-honest-production-readiness.json'), path.join(reportDir, 'translateit-plugin-render-contract.json'), path.join(reportDir, 'translateit-pretest-decision.json')]);
console.log(JSON.stringify({ status: 'pretest-quality-bundle-complete', reportDir }, null, 2));
