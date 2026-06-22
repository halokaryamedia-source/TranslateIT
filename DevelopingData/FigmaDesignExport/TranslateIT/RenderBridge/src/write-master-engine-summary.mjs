import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || path.join(process.cwd(), 'reports');
fs.mkdirSync(dir, { recursive: true });

function read(name) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); } catch { return null; }
}
function codeMap() {
  const file = path.join(dir, 'self-audit-exit-codes.txt');
  const map = {};
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^=]+)=(\d+)$/);
      if (m) map[m[1]] = Number(m[2]);
    }
  } catch {}
  return map;
}

const codes = codeMap();
const maturity = read('translateit-figma-engine-maturity.json');
const support = read('translateit-figma-support-engines.json');
const pipeline = read('translateit-engine-pipeline-readiness.json');
const required = ['imports','framework-contract','blueprint-framework-output','figma-support-engines','figma-engine-maturity','engine-pipeline-readiness','engine-preview-page'];
const failed = required.filter((name) => codes[name] !== 0);
const ready = failed.length === 0 && maturity?.manualFigmaTestAllowed === true && pipeline?.figmaTestAllowed === true;
const summary = {
  version: 'master-engine-summary-v1',
  status: ready ? 'ready' : 'not-ready',
  manualFigmaTestAllowed: ready,
  failedSteps: failed,
  maturity: maturity?.status || 'missing',
  support: support?.status || 'missing',
  pipeline: pipeline?.status || 'missing',
  blockers: (maturity?.failures || []).map((x) => x.message || String(x)).concat(support?.failures || [])
};
fs.writeFileSync(path.join(dir, 'translateit-master-engine-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
if (!ready) process.exitCode = 2;
