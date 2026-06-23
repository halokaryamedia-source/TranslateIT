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

function must(name, text, marker) {
  if (!String(text || '').includes(marker)) failures.push(`${name} missing marker: ${marker}`);
}

function mustNot(name, text, marker) {
  if (String(text || '').includes(marker)) failures.push(`${name} must not reference stale marker: ${marker}`);
}

const manifest = readJson(path.join(pluginRoot, 'manifest.json'));
const pkg = readJson(path.join(root, 'package.json'));

const activeRendererPath = path.join(pluginRoot, manifest.main || '');
const activeUiPath = path.join(pluginRoot, manifest.ui || '');

const files = {
  server: read(path.join(root, 'server.mjs')),
  routes: read(path.join(root, 'src', 'route-handlers.mjs')),
  contract: read(path.join(root, 'src', 'shared-contract.mjs')),
  health: read(path.join(root, 'src', 'health-status.mjs')),
  capture: read(path.join(root, 'src', 'capture-site.mjs')),
  payloadEntry: read(path.join(root, 'src', 'build-payload.mjs')),
  finalPayload: read(path.join(root, 'src', 'build-final-payload.mjs')),
  desktopQualityPass: read(path.join(root, 'src', 'apply-desktop-quality-pass.mjs')),
  figmaRenderPlan: read(path.join(root, 'src', 'build-figma-render-plan.mjs')),
  renderer: read(activeRendererPath),
  ui: read(activeUiPath)
};

if (manifest.main !== 'code-framework-production.js') failures.push(`manifest.main must be code-framework-production.js, got ${manifest.main || 'missing'}`);
if (manifest.ui !== 'ui-framework.html') failures.push(`manifest.ui must be ui-framework.html, got ${manifest.ui || 'missing'}`);
if (manifest.editorType && !manifest.editorType.includes('figma')) failures.push('manifest.editorType must include figma');

if (pkg.scripts?.start !== 'node server.mjs') failures.push('npm start must use server.mjs');
if (!pkg.scripts?.['test:active-flow']) failures.push('package.json missing test:active-flow script');
if (!pkg.scripts?.['test:workspace-clean']) failures.push('package.json missing test:workspace-clean script');
if (!pkg.scripts?.['test:desktop-quality']) failures.push('package.json missing test:desktop-quality script');
if (pkg.scripts?.['test:v2']) failures.push('package.json must not keep test:v2 as an active script');

for (const marker of ['TranslateIT Clean RenderBridge running', '/health', '/render', '/audit']) must('server', files.server, marker);
for (const marker of ['handleRender', 'handleAudit', 'buildFinalPayload', 'checkExternalVisualEngine']) must('routes', files.routes, marker);
for (const marker of ['translateit-core', 'alpha-clean-1', 'Version 0.1 - Alpha', 'cloneModel', 'figmaRenderPlan']) must('contract', files.contract + files.finalPayload, marker);
for (const marker of ['activeRenderer: \'plugin/code-framework-production.js\'', 'userFacingInput: \'url-link\'', 'contract: \'cloneModel\'', 'external-visual-engine-required']) must('health', files.health, marker);
for (const marker of ['chromium', 'stabilizePage', 'document.fonts', 'getComputedStyle', 'getBoundingClientRect', 'page.screenshot']) must('capture', files.capture, marker);
for (const marker of ['build-payload-core-v5.mjs']) must('payloadEntry', files.payloadEntry, marker);
for (const marker of ['buildBasePayload', 'applyLayerNamePass', 'finalizePluginRenderPlan', 'applyImageFitPlan', 'applyDesktopQualityPass', 'payload.figmaRenderPlan']) must('finalPayload', files.finalPayload, marker);
for (const marker of ['desktopQualityPass', 'duplicate-layer', 'tiny-noise', 'off-frame']) must('desktopQualityPass', files.desktopQualityPass, marker);
for (const marker of ['buildFigmaRenderPlan', 'frames', 'groups', 'textLayers', 'imageLayers', 'componentButtons']) must('figmaRenderPlan', files.figmaRenderPlan, marker);
for (const marker of ['figma.showUI', 'import-design-model', 'figmaRenderPlan', 'createText', 'createRectangle', 'createImage', 'Import complete']) must('renderer', files.renderer, marker);
for (const marker of ['Import Website to Figma', 'http://127.0.0.1:8844', '/health', '/render?url=', 'import-design-model', 'Payload JSON files are internal reports only']) must('ui', files.ui, marker);

mustNot('active renderer', files.renderer, 'Visual-Backed Editable Clone');
mustNot('active ui', files.ui, '<textarea');
mustNot('active ui', files.ui, 'manualJsonPayload');
mustNot('active ui', files.ui, 'load-payload-json');

if (manifest.name && !/TranslateIT|DesignIT/i.test(manifest.name)) warnings.push(`manifest name does not mention TranslateIT or DesignIT: ${manifest.name}`);
if (manifest.id && !/translateit|designit/i.test(manifest.id)) warnings.push(`manifest id does not mention TranslateIT or DesignIT: ${manifest.id}`);
if (String(files.ui || '').includes('No manual payload JSON import is needed')) warnings.push('UI explicitly explains that manual payload JSON import is not part of the active flow.');

const report = {
  gate: 'designit-active-contract',
  status: failures.length ? 'fail' : 'pass',
  productName: 'DesignIT',
  manifest: {
    name: manifest.name || null,
    id: manifest.id || null,
    main: manifest.main || null,
    ui: manifest.ui || null
  },
  activeFlow: {
    input: 'url-link',
    server: 'server.mjs',
    routes: ['/health', '/render', '/audit'],
    payloadContract: 'cloneModel + figmaRenderPlan + desktopQualityPass',
    renderer: manifest.main || null,
    ui: manifest.ui || null
  },
  warnings,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
