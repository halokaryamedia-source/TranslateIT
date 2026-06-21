import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  sharedContract: fs.readFileSync(path.join(root, 'src', 'shared-contract.mjs'), 'utf8'),
  visualModel: fs.readFileSync(path.join(root, 'src', 'build-visual-model.mjs'), 'utf8'),
  health: fs.readFileSync(path.join(root, 'src', 'health-status.mjs'), 'utf8'),
  preview: fs.readFileSync(path.join(root, 'src', 'render-clone-preview.mjs'), 'utf8'),
  comparison: fs.readFileSync(path.join(root, 'src', 'compare-visual-screenshots.mjs'), 'utf8'),
  runner: fs.readFileSync(path.join(root, 'src', 'run-clone-audit.mjs'), 'utf8'),
  regression: fs.readFileSync(path.join(root, 'tests', 'test-regression-suite.mjs'), 'utf8')
};

const checks = [
  ['visualModel', "mode: 'screenshot-first-html-assisted-v2'", 'visual model must return v2 mode'],
  ['sharedContract', "visualModel?.mode !== 'screenshot-first-html-assisted-v2'", 'shared contract must require v2 mode'],
  ['health', "visualModel: 'screenshot-first-html-assisted-v2'", 'health must expose v2 visual model'],
  ['preview', 'textRenderScore', 'preview must expose text render score'],
  ['preview', 'imageFitScore', 'preview must expose image fit score'],
  ['preview', 'text-rendering:geometricPrecision', 'preview must use text rendering parity CSS'],
  ['comparison', 'visual-comparison-v2', 'comparison must expose v2 marker'],
  ['comparison', 'translateit-visual-diff-latest.png', 'comparison must write visual diff overlay'],
  ['comparison', 'topViewportSimilarityScore', 'comparison must include top viewport score'],
  ['comparison', 'worstBandScore', 'comparison must include worst band score'],
  ['runner', 'visualDiff', 'audit runner must expose visual diff paths'],
  ['regression', 'diffPngPath', 'regression must preserve per-site diff PNG'],
  ['regression', 'diffHtmlPath', 'regression must preserve per-site diff HTML']
];

const failures = [];
for (const [file, marker, message] of checks) {
  if (!files[file].includes(marker)) failures.push({ file, marker, message });
}

const report = {
  gate: 'translateit-v2-marker-consistency',
  status: failures.length ? 'fail' : 'pass',
  checks: checks.length,
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
