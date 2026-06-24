import fs from 'node:fs';
import path from 'node:path';
import { comparePngFiles } from '../src/visual-compare-engine.mjs';

const dir = path.join(process.cwd(), 'reports');
fs.mkdirSync(dir, { recursive: true });
const source = path.join(dir, 'source-reference.png');
const output = path.join(dir, 'generated-preview.png');
const diff = path.join(dir, 'visual-diff.png');

let report;
if (!fs.existsSync(source) || !fs.existsSync(output)) {
  report = {
    gate: 'translateit-visual-compare-readiness',
    status: 'not-ready',
    reason: 'source-reference.png and generated-preview.png are required before visual compare can pass',
    requiredFiles: ['reports/source-reference.png', 'reports/generated-preview.png']
  };
} else {
  const result = await comparePngFiles(source, output, diff);
  report = { gate: 'translateit-visual-compare-readiness', ...result };
}
fs.writeFileSync(path.join(dir, 'translateit-visual-compare-readiness.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'pass') process.exitCode = 2;
