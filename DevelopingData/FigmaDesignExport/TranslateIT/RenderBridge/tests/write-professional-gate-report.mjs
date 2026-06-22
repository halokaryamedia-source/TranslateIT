import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pluginRoot = path.resolve(root, '..', 'plugin');
const reports = path.join(root, 'reports');
const failures = [];
function read(file) { return fs.readFileSync(file, 'utf8'); }
function has(name, text, marker) { if (!text.includes(marker)) failures.push(`${name} missing ${marker}`); }
const pkg = JSON.parse(read(path.join(root, 'package.json')));
const manifest = JSON.parse(read(path.join(pluginRoot, 'manifest.json')));
const renderer = read(path.join(pluginRoot, manifest.main || 'code.js'));
const simTest = read(path.join(root, 'tests', 'test-figma-sim-preview.mjs'));
const simV2 = read(path.join(root, 'src', 'render-figma-sim-preview-v2.mjs'));
const packer = read(path.join(root, 'run-local-self-audit-pack.ps1'));
if (manifest.main !== 'code-visual-backed.js') failures.push('manifest main is not code-visual-backed.js');
if (pkg.scripts?.['test:source-size-parity'] !== 'node ./tests/test-source-size-frame-parity.mjs') failures.push('source-size parity script missing');
has('renderer', renderer, 'Visual Backing / Source Screenshot');
has('renderer', renderer, 'Editable Reconstruction / Low Opacity');
has('renderer', renderer, 'source screenshot dimensions');
has('simulation test', simTest, 'render-figma-sim-preview-v2.mjs');
has('simulation v2', simV2, 'source-size');
has('simulation v2', simV2, 'mainSize');
has('audit packer', packer, 'source-size-parity');
has('audit packer', packer, 'translateit-source-size-frame-parity.json');
const report = { gate: 'translateit-professional-gate-report', status: failures.length ? 'fail' : 'pass', generatedAt: new Date().toISOString(), manifestMain: manifest.main, sourceSizeParityScript: pkg.scripts?.['test:source-size-parity'] || null, failures };
fs.mkdirSync(reports, { recursive: true });
fs.writeFileSync(path.join(reports, 'translateit-professional-gate-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
