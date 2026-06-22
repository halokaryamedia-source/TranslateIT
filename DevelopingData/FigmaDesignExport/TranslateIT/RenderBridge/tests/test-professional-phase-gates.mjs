import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pluginRoot = path.resolve(root, '..', 'plugin');
const failures = [];
function read(file) { return fs.readFileSync(file, 'utf8'); }
function must(name, text, marker) { if (!text.includes(marker)) failures.push(`${name} missing ${marker}`); }

const pkg = JSON.parse(read(path.join(root, 'package.json')));
const manifest = JSON.parse(read(path.join(pluginRoot, 'manifest.json')));
const packer = read(path.join(root, 'run-local-self-audit-pack.ps1'));
const simTest = read(path.join(root, 'tests', 'test-figma-sim-preview.mjs'));
const parityTest = read(path.join(root, 'tests', 'test-source-size-frame-parity.mjs'));
const simV2 = read(path.join(root, 'src', 'render-figma-sim-preview-v2.mjs'));
const renderer = read(path.join(pluginRoot, manifest.main || 'code.js'));

if (manifest.main !== 'code-visual-backed.js') failures.push('manifest must point to code-visual-backed.js');
if (pkg.scripts?.['test:source-size-parity'] !== 'node ./tests/test-source-size-frame-parity.mjs') failures.push('missing test:source-size-parity script');
for (const marker of ['test:figma-dry-run', 'test:figma-sim-preview', 'test:source-size-parity']) must('package test script', pkg.scripts?.test || '', marker);
for (const marker of ['source-size-parity', 'test-source-size-frame-parity.mjs', 'translateit-source-size-frame-parity.json']) must('self-audit packer', packer, marker);
for (const marker of ['render-figma-sim-preview-v2.mjs', 'sourceSize', 'mainSize', 'translateit-figma-sim-main-diff-latest.png']) must('figma simulation test', simTest, marker);
for (const marker of ['sourceSize', 'mainSize', 'expectedHeight', 'ratioDelta']) must('source-size parity test', parityTest, marker);
for (const marker of ['source-size', 'sourceSize', 'mainSize', 'translateit-figma-sim-main-latest.png']) must('figma simulation v2', simV2, marker);
for (const marker of ['sourceSize', 'shot(payload)', 'source screenshot dimensions', 'Visual Backing / Source Screenshot']) must('figma renderer', renderer, marker);

const report = {
  gate: 'translateit-professional-phase-gates',
  status: failures.length ? 'fail' : 'pass',
  manifestMain: manifest.main,
  testScript: pkg.scripts?.test || null,
  sourceSizeParityScript: pkg.scripts?.['test:source-size-parity'] || null,
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
