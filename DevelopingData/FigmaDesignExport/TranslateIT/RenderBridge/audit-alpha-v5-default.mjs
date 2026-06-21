import fs from 'node:fs';
import path from 'node:path';

const bridgeRoot = process.cwd();
const pluginRoot = path.resolve(bridgeRoot, '..', 'plugin');
const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'manifest.json'), 'utf8'));
const ui = fs.readFileSync(path.join(pluginRoot, 'ui.html'), 'utf8');
const renderer = fs.readFileSync(path.join(pluginRoot, 'code.v5.js'), 'utf8');

const failures = [];
if (manifest.main !== 'code.v5.js') failures.push('manifest main is not code.v5.js');
if (!ui.includes('V5 source-inspired structured clone')) failures.push('ui does not mention V5 structured clone');
if (!ui.includes('Wrong bridge payload')) failures.push('ui does not block older bridge payloads');
if (!renderer.includes('translateit-alpha-v5-source-inspired-structured-renderer')) failures.push('renderer id is not V5');
if (!renderer.includes('Source-Inspired Editable Clone')) failures.push('V5 main frame name is missing');
if (!renderer.includes('No raw layer dump')) failures.push('V5 raw layer dump rejection copy is missing');
if (!renderer.includes('Screenshot stays as reference only')) failures.push('V5 screenshot reference copy is missing');

const report = {
  publicVersion: 'Version 0.1 - Alpha',
  gate: 'alpha-v5-default-wiring',
  status: failures.length ? 'fail' : 'pass',
  manifestMain: manifest.main,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
