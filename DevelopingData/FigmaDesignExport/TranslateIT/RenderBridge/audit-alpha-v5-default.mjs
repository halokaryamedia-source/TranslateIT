import fs from 'node:fs';
import path from 'node:path';

const bridgeRoot = process.cwd();
const pluginRoot = path.resolve(bridgeRoot, '..', 'plugin');
const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'manifest.json'), 'utf8'));
const ui = fs.readFileSync(path.join(pluginRoot, 'ui.html'), 'utf8');
const renderer = fs.readFileSync(path.join(pluginRoot, 'code.v5.strict.js'), 'utf8');

const failures = [];
if (manifest.main !== 'code.v5.strict.js') failures.push('manifest main is not code.v5.strict.js');
if (!ui.includes('strict V5 source-inspired structured clone')) failures.push('ui does not mention strict V5 structured clone');
if (!ui.includes('diagnostics.v5Enhanced')) failures.push('ui does not require V5 enhanced payload');
if (!ui.includes('Wrong bridge payload')) failures.push('ui does not block older bridge payloads');
if (!renderer.includes('translateit-alpha-v5-strict-source-inspired-renderer')) failures.push('renderer id is not strict V5');
if (!renderer.includes('Source-Inspired Editable Clone')) failures.push('V5 main frame name is missing');
if (!renderer.includes('No raw layer dump')) failures.push('V5 raw layer dump rejection copy is missing');
if (!renderer.includes('Screenshot stays as reference only')) failures.push('V5 screenshot reference copy is missing');
if (!renderer.includes('diagnostics.v5Enhanced')) failures.push('strict V5 enhanced payload guard is missing');

const report = {
  publicVersion: 'Version 0.1 - Alpha',
  gate: 'alpha-v5-strict-default-wiring',
  status: failures.length ? 'fail' : 'pass',
  manifestMain: manifest.main,
  renderer: 'code.v5.strict.js',
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
