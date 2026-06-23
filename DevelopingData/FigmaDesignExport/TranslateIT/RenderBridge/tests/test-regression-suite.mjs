import fs from 'node:fs';
import path from 'node:path';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const root = process.cwd();
const workspaceRoot = path.resolve(root, '..');
const pluginRoot = path.join(workspaceRoot, 'plugin');

async function readJson(res) {
  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (payload.error || payload.message || text));
  return payload;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const failures = [];
const warnings = [];
const health = await readJson(await fetch(`${bridge}/health`));
const manifest = JSON.parse(read(path.join(pluginRoot, 'manifest.json')));
const pkg = JSON.parse(read(path.join(root, 'package.json')));
const renderer = read(path.join(pluginRoot, manifest.main || ''));
const ui = read(path.join(pluginRoot, manifest.ui || ''));

if (health.engine !== 'translateit-core') failures.push('Wrong engine: ' + (health.engine || 'missing'));
if (health.engineBuild !== 'alpha-clean-1') failures.push('Wrong engine build: ' + (health.engineBuild || 'missing'));
if (health.contract !== 'cloneModel') failures.push('Wrong contract: ' + (health.contract || 'missing'));
if (health.retiredWorkflowActive !== false) failures.push('retiredWorkflowActive must be false');
if (health.activeRenderer !== 'plugin/code-framework-production.js') failures.push('Wrong active renderer: ' + (health.activeRenderer || 'missing'));
if (health.userFacingInput !== 'url-link') failures.push('Wrong user-facing input: ' + (health.userFacingInput || 'missing'));
if (health.renderPolicy !== 'external-visual-engine-required') failures.push('External visual engine policy must remain explicit.');
if (manifest.main !== 'code-framework-production.js') failures.push('manifest main regression: expected code-framework-production.js');
if (manifest.ui !== 'ui-framework.html') failures.push('manifest UI regression: expected ui-framework.html');
if (!pkg.scripts?.['test:active-flow']) failures.push('missing test:active-flow script');
if (!pkg.scripts?.['test:workspace-clean']) failures.push('missing test:workspace-clean script');
if (pkg.scripts?.['test:v2']) failures.push('test:v2 must not return as an active regression script');
if (!renderer.includes('figmaRenderPlan')) failures.push('active renderer must consume figmaRenderPlan');
if (!renderer.includes('createText')) failures.push('active renderer must create editable text nodes');
if (!renderer.includes('createImage')) failures.push('active renderer must create Figma image fills');
if (!ui.includes('/render?url=')) failures.push('active UI must import through RenderBridge /render URL flow');
if (!ui.includes('import-design-model')) failures.push('active UI must send import-design-model to plugin code');

if (health.externalVisualEngine?.required !== true) warnings.push('externalVisualEngine.required is not true in health payload');

const report = {
  gate: 'designit-active-flow-regression',
  status: failures.length ? 'fail' : 'pass',
  bridge,
  activeFlow: {
    manifestMain: manifest.main,
    manifestUi: manifest.ui,
    activeRenderer: health.activeRenderer,
    input: health.userFacingInput,
    contract: health.contract,
    renderPolicy: health.renderPolicy
  },
  warnings,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
