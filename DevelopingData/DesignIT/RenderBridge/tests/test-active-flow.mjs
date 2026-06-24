import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workspaceRoot = path.resolve(root, '..');
const pluginRoot = path.join(workspaceRoot, 'plugin');
const failures = [];
const warnings = [];

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    failures.push(`missing file: ${path.relative(workspaceRoot, file)} (${error.message})`);
    return '';
  }
}

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    failures.push(`invalid json: ${path.relative(workspaceRoot, file)} (${error.message})`);
    return {};
  }
}

function includes(name, text, marker) {
  if (!String(text || '').includes(marker)) failures.push(`${name} missing active-flow marker: ${marker}`);
}

function notIncludes(name, text, marker) {
  if (String(text || '').includes(marker)) failures.push(`${name} references stale active-flow marker: ${marker}`);
}

const manifest = readJson(path.join(pluginRoot, 'manifest.json'));
const pkg = readJson(path.join(root, 'package.json'));
const workflow = read(path.resolve(root, '../../../..', '.github', 'workflows', 'translateit-renderbridge-self-audit.yml'));
const health = read(path.join(root, 'src', 'health-status.mjs'));
const routes = read(path.join(root, 'src', 'route-handlers.mjs'));
const capture = read(path.join(root, 'src', 'capture-site.mjs'));
const payloadEntry = read(path.join(root, 'src', 'build-payload.mjs'));
const finalPayload = read(path.join(root, 'src', 'build-final-payload.mjs'));
const renderPlan = read(path.join(root, 'src', 'build-figma-render-plan.mjs'));
const renderer = read(path.join(pluginRoot, manifest.main || ''));
const ui = read(path.join(pluginRoot, manifest.ui || ''));

if (manifest.main !== 'code-framework-production.js') failures.push(`active renderer mismatch: ${manifest.main || 'missing'}`);
if (manifest.ui !== 'ui-framework.html') failures.push(`active UI mismatch: ${manifest.ui || 'missing'}`);

includes('ui', ui, 'Import Website to Figma');
includes('ui', ui, '/health');
includes('ui', ui, '/render?url=');
includes('ui', ui, 'import-design-model');
includes('renderer', renderer, 'figmaRenderPlan');
includes('renderer', renderer, 'function importPayload');
includes('renderer', renderer, 'createText');
includes('renderer', renderer, 'createRectangle');
includes('renderer', renderer, 'createImage');
includes('routes', routes, 'buildFinalPayload');
includes('routes', routes, 'checkExternalVisualEngine');
includes('routes', routes, 'handleRender');
includes('routes', routes, 'handleAudit');
includes('capture', capture, 'chromium');
includes('capture', capture, 'getComputedStyle');
includes('capture', capture, 'getBoundingClientRect');
includes('payloadEntry', payloadEntry, 'buildPayload');
includes('finalPayload', finalPayload, 'finalizePluginRenderPlan');
includes('renderPlan', renderPlan, 'buildFigmaRenderPlan');
includes('health', health, "activeRenderer: 'plugin/code-framework-production.js'");
includes('health', health, "userFacingInput: 'url-link'");
includes('health', health, "contract: 'cloneModel'");

notIncludes('package scripts', JSON.stringify(pkg.scripts || {}), 'test-v2-markers.mjs');
notIncludes('workflow', workflow, 'npm run test:v2');
notIncludes('workflow', workflow, 'run_step "v2"');

if (!pkg.scripts?.['test:contract']) failures.push('package script test:contract is missing');
if (!pkg.scripts?.['test:active-flow']) failures.push('package script test:active-flow is missing');
if (!pkg.scripts?.['test:workspace-clean']) failures.push('package script test:workspace-clean is missing');
if (!pkg.scripts?.['test:visual-engine']) warnings.push('package script test:visual-engine is recommended for external visual engine readiness');

const activeFlow = [
  'DesignIT URL input',
  'plugin/ui-framework.html',
  'RenderBridge /render',
  'capture-site.mjs',
  'external visual parser',
  'DOM/CSS extraction',
  'cloneModel',
  'figmaRenderPlan',
  'plugin/code-framework-production.js',
  'editable Figma layers'
];

const report = {
  gate: 'designit-active-flow',
  status: failures.length ? 'fail' : 'pass',
  activeFlow,
  sourceOfTruth: {
    manifest: 'plugin/manifest.json',
    ui: manifest.ui || null,
    renderer: manifest.main || null,
    bridge: 'RenderBridge/server.mjs',
    payloadEntry: 'RenderBridge/src/build-payload.mjs',
    renderPlan: 'RenderBridge/src/build-figma-render-plan.mjs'
  },
  warnings,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
