import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pluginRoot = path.resolve(root, '..', 'plugin');
const failures = [];
const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const server = fs.readFileSync(path.join(root, 'server.mjs'), 'utf8');
const contract = fs.readFileSync(path.join(root, 'src', 'shared-contract.mjs'), 'utf8');
const matcher = fs.readFileSync(path.join(root, 'src', 'match-dom-visual.mjs'), 'utf8');
const preview = fs.readFileSync(path.join(root, 'src', 'render-clone-preview.mjs'), 'utf8');
const comparison = fs.readFileSync(path.join(root, 'src', 'compare-visual-screenshots.mjs'), 'utf8');
const runner = fs.readFileSync(path.join(root, 'src', 'run-clone-audit.mjs'), 'utf8');
const audit = fs.readFileSync(path.join(root, 'src', 'visual-audit.mjs'), 'utf8');
const ui = fs.readFileSync(path.join(pluginRoot, 'ui.html'), 'utf8');
const renderer = fs.readFileSync(path.join(pluginRoot, 'code.js'), 'utf8');

if (manifest.main !== 'code.js') failures.push('manifest must use code.js');
if (manifest.ui !== 'ui.html') failures.push('manifest must use ui.html');
if (pkg.scripts?.start !== 'node server.mjs') failures.push('npm start must use server.mjs');

for (const pair of [['server', server], ['contract', contract], ['matcher', matcher], ['preview', preview], ['comparison', comparison], ['runner', runner], ['ui', ui], ['renderer', renderer]]) {
  const name = pair[0];
  const text = pair[1];
  if (!text.includes('translateit-core') && !['matcher','preview','comparison','runner'].includes(name)) failures.push(`${name} missing clean engine marker`);
  if (!text.includes('alpha-clean-1') && !['matcher','preview','comparison','runner'].includes(name)) failures.push(`${name} missing clean build marker`);
  if (!text.includes('Version 0.1 - Alpha') && !['matcher','preview','comparison','runner'].includes(name)) failures.push(`${name} missing public version marker`);
}

if (!server.includes('buildVisualModel')) failures.push('server missing buildVisualModel');
if (!server.includes('matchDomToVisual')) failures.push('server missing matchDomToVisual');
if (!server.includes('runCloneAudit')) failures.push('server missing runCloneAudit');
if (!server.includes('visualComparison')) failures.push('server missing visualComparison health marker');
if (!server.includes('visualMatching')) failures.push('server does not attach visualMatching diagnostics');
if (!server.includes('screenshot-first-html-assisted')) failures.push('server missing screenshot-first visual truth marker');
if (!server.includes('buildCloneModel')) failures.push('server missing buildCloneModel');
if (!server.includes('cloneModel')) failures.push('server does not attach cloneModel');
if (!matcher.includes('visual-rect-dom-content-style')) failures.push('matcher missing visual rect + DOM content rule');
if (!matcher.includes('dom-rect-visual-verified')) failures.push('matcher missing DOM rect visual verification rule');
if (!preview.includes('translateit-clone-preview-latest.png')) failures.push('preview renderer does not write PNG preview');
if (!preview.includes('visualSimilarityScore')) failures.push('preview renderer missing visual similarity metric');
if (!comparison.includes('compareSourceAndClonePreview')) failures.push('comparison module missing compareSourceAndClonePreview');
if (!comparison.includes('averagePixelDifference')) failures.push('comparison module missing pixel difference metric');
if (!runner.includes('compareSourceAndClonePreview')) failures.push('audit runner does not call source/clone comparison');
if (!audit.includes('comparison.visualSimilarityScore')) failures.push('visual audit does not gate source/clone comparison score');
if (!audit.includes('source clone visual comparison')) failures.push('visual audit missing source clone comparison failure text');
if (!contract.includes('visualModel missing')) failures.push('contract does not require visualModel');
if (!contract.includes('cloneModel missing')) failures.push('contract does not require cloneModel');
if (!contract.includes('layout-preserving-editable-clone')) failures.push('contract does not require clone mode');
if (!renderer.includes('cloneModel missing')) failures.push('plugin does not reject missing cloneModel');
if (!renderer.includes('Renderer: layout-preserving editable clone')) failures.push('plugin does not report clone renderer');
if (renderer.includes('renderHeader')) failures.push('renderer still contains template header renderer');
if (renderer.includes('renderHero')) failures.push('renderer still contains template hero renderer');
if (renderer.includes('renderContent')) failures.push('renderer still contains template content renderer');
if (renderer.includes('renderFooter')) failures.push('renderer still contains template footer renderer');
if (renderer.includes('?.')) failures.push('plugin/code.js uses optional chaining');
if (renderer.includes('??')) failures.push('plugin/code.js uses nullish coalescing');

const report = { gate: 'translateit-clean-contract', status: failures.length ? 'fail' : 'pass', manifestMain: manifest.main, npmStart: pkg.scripts ? pkg.scripts.start : null, engine: 'translateit-core', engineBuild: 'alpha-clean-1', renderer: 'layout-preserving-editable-clone', visualModel: 'screenshot-first-html-assisted', visualMatching: 'dom-to-visual-foundation', clonePreview: 'html-png-preview-foundation', visualComparison: 'source-vs-clone-preview-sampling', failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
