import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'reports');
const summaryPath = path.join(dir, 'translateit-master-engine-summary.json');
const summary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, 'utf8')) : null;
const failures = [];

if (!summary) failures.push('master summary missing');
if (summary && summary.manualFigmaTestAllowed !== true) failures.push('manual Figma test is not allowed');
if (summary && summary.status !== 'ready') failures.push('master summary is not ready');
if (summary && Array.isArray(summary.blockers) && summary.blockers.length) failures.push('master summary has blockers');

const report = {
  gate: 'translateit-controlled-readiness',
  status: failures.length ? 'not-ready' : 'ready',
  manualFigmaTestAllowed: failures.length === 0,
  failures
};

fs.writeFileSync(path.join(dir, 'translateit-controlled-readiness.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
