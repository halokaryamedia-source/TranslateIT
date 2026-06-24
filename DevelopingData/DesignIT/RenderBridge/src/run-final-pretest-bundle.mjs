import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}
const url = process.argv[2] || process.env.TRANSLATEIT_TARGET_URL || 'https://www.mivubi.com/';
const reportDir = process.argv[3] || path.join(process.cwd(), 'reports');
const payloadPath = path.join(reportDir, 'translateit-final-payload.json');
fs.mkdirSync(reportDir, { recursive: true });
run(['./src/write-final-payload-report.mjs', url, payloadPath]);
run(['./src/run-pretest-quality-bundle.mjs', payloadPath, reportDir]);
console.log(JSON.stringify({ status: 'final-pretest-bundle-complete', url, payloadPath, reportDir }, null, 2));
