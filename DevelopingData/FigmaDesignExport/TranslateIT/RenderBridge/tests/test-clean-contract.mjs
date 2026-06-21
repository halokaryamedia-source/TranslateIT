import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pluginRoot = path.resolve(root, '..', 'plugin');
const failures = [];
const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const server = fs.readFileSync(path.join(root, 'server.mjs'), 'utf8');
const ui = fs.readFileSync(path.join(pluginRoot, 'ui.html'), 'utf8');
const renderer = fs.readFileSync(path.join(pluginRoot, 'code.js'), 'utf8');

if (manifest.main !== 'code.js') failures.push('manifest must use code.js');
if (manifest.ui !== 'ui.html') failures.push('manifest must use ui.html');
if (pkg.scripts?.start !== 'node server.mjs') failures.push('npm start must use server.mjs');

for (const [name, text] of [['server', server], ['ui', ui], ['renderer', renderer]]) {
  if (!text.includes('translateit-core')) failures.push(`${name} missing clean engine marker`);
  if (!text.includes('alpha-clean-1')) failures.push(`${name} missing clean build marker`);
  if (!text.includes('Version 0.1 - Alpha')) failures.push(`${name} missing public version marker`);
}

if (renderer.includes('?.')) failures.push('plugin/code.js uses optional chaining, which is not supported by this Figma runtime');
if (renderer.includes('??')) failures.push('plugin/code.js uses nullish coalescing, which is not supported by this Figma runtime');

const report = {
  gate: 'translateit-clean-contract',
  status: failures.length ? 'fail' : 'pass',
  manifestMain: manifest.main,
  npmStart: pkg.scripts?.start,
  engine: 'translateit-core',
  engineBuild: 'alpha-clean-1',
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
