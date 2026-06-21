import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const bridgeRoot = process.cwd();
const pluginRoot = path.resolve(bridgeRoot, '..', 'plugin');
const rendererPath = path.join(pluginRoot, 'code.v5.strict.js');
const uiPath = path.join(pluginRoot, 'ui.html');
const renderer = fs.readFileSync(rendererPath, 'utf8');
const ui = fs.readFileSync(uiPath, 'utf8');
const failures = [];

function checkSyntax(name, source) {
  try {
    new vm.Script(source, { filename: name });
  } catch (error) {
    failures.push(`${name} syntax error: ${error.message}`);
  }
}

checkSyntax('plugin/code.v5.strict.js', renderer);

const scripts = [...ui.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
if (!scripts.length) failures.push('ui.html script block missing');
scripts.forEach((script, index) => checkSyntax(`plugin/ui.html script ${index + 1}`, script));

const requiredRendererMarkers = [
  'strict-v5.1-single-engine',
  'strictV5Engine',
  'export-ui-package',
  'exportJson',
  'import-design-reconstruction',
  'figma.viewport.scrollAndZoomIntoView',
  '01 Source-Inspired Editable Clone / Main Output',
  '02 Screenshot Reference / Pure Source'
];
for (const marker of requiredRendererMarkers) {
  if (!renderer.includes(marker)) failures.push(`renderer missing marker: ${marker}`);
}

const requiredUiMarkers = [
  'EXPECTED_BUILD',
  'strict-v5.1-single-engine',
  'strictV5Engine',
  'export-ui-package',
  'Import Design Clone',
  'Wrong bridge payload'
];
for (const marker of requiredUiMarkers) {
  if (!ui.includes(marker)) failures.push(`ui missing marker: ${marker}`);
}

const report = {
  publicVersion: 'Version 0.1 - Alpha',
  gate: 'alpha-v5-plugin-syntax-readiness',
  status: failures.length ? 'fail' : 'pass',
  renderer: 'code.v5.strict.js',
  ui: 'ui.html',
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
