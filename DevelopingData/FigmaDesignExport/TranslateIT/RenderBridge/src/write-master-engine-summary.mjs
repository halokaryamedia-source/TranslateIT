import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || path.join(process.cwd(), 'reports');
fs.mkdirSync(dir, { recursive: true });

function read(name) { try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')); } catch { return null; } }
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
const quality = read('translateit-figma-render-quality.json');
const sectionLayer = read('translateit-section-layer-quality.json');
const layoutStrategy = read('translateit-layout-strategy-score.json');
const visualCompare = read('translateit-visual-compare-readiness.json');
const required = ['imports','framework-contract','blueprint-framework-output','figma-support-engines','figma-engine-maturity','engine-pipeline-readiness','engine-preview-page'];
const failed = required.filter((name) => codes[name] !== 0);
const qualityReady = !quality || quality.passesThreshold === true;
const sectionReady = !sectionLayer || sectionLayer.status === 'ready';
const layoutReady = !layoutStrategy || layoutStrategy.status === 'ready';
const visualReady = !visualCompare || visualCompare.status === 'pass';
const ready = failed.length === 0 && qualityReady && sectionReady && layoutReady && visualReady && maturity?.manualFigmaTestAllowed === true && pipeline?.figmaTestAllowed === true;
const summary = {
  version: 'master-engine-summary-v1',
  status: ready ? 'ready' : 'not-ready',
  manualFigmaTestAllowed: ready,
  failedSteps: failed,
  maturity: maturity?.status || 'missing',
  support: support?.status || 'missing',
  pipeline: pipeline?.status || 'missing',
  renderQuality: quality ? { status: quality.status, score: quality.score, threshold: quality.threshold } : null,
  sectionLayerQuality: sectionLayer ? { status: sectionLayer.status, score: sectionLayer.score } : null,
  layoutStrategy: layoutStrategy ? { status: layoutStrategy.status, score: layoutStrategy.score, total: layoutStrategy.total, flexible: layoutStrategy.flexible } : null,
  visualCompare: visualCompare ? { status: visualCompare.status, similarity: visualCompare.similarity || null, reason: visualCompare.reason || null } : null,
  blockers: (maturity?.failures || []).map((x) => x.message || String(x)).concat(support?.failures || []).concat(quality?.failures || []).concat(sectionLayer?.failures || []).concat(layoutStrategy?.issues || []).concat(visualCompare?.status && visualCompare.status !== 'pass' ? [visualCompare.reason || 'visual compare not passing'] : [])
};
fs.writeFileSync(path.join(dir, 'translateit-master-engine-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
if (!ready) process.exitCode = 2;
