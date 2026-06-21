import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pluginRoot = path.resolve(root, '..', 'plugin');
const failures = [];
function read(file) { return fs.readFileSync(file, 'utf8'); }
function must(name, text, marker, message) { if (!text.includes(marker)) failures.push(message || `${name} missing ${marker}`); }
function mustNot(name, text, marker, message) { if (text.includes(marker)) failures.push(message || `${name} must not contain ${marker}`); }

const manifest = JSON.parse(read(path.join(pluginRoot, 'manifest.json')));
const pkg = JSON.parse(read(path.join(root, 'package.json')));
const activeRendererPath = path.join(pluginRoot, manifest.main || 'code.js');
const files = {
  server: read(path.join(root, 'server.mjs')),
  contract: read(path.join(root, 'src', 'shared-contract.mjs')),
  capture: read(path.join(root, 'src', 'capture-site.mjs')),
  visualModel: read(path.join(root, 'src', 'build-visual-model.mjs')),
  payloadBuilder: read(path.join(root, 'src', 'build-payload.mjs')),
  designBuilder: read(path.join(root, 'src', 'build-design-model.mjs')),
  lineReconstruction: read(path.join(root, 'src', 'reconstruct-text-lines.mjs')),
  heroGuard: read(path.join(root, 'src', 'guard-hero-occlusion.mjs')),
  cloneBuilder: read(path.join(root, 'src', 'build-clone-model.mjs')),
  health: read(path.join(root, 'src', 'health-status.mjs')),
  routes: read(path.join(root, 'src', 'route-handlers.mjs')),
  matcher: read(path.join(root, 'src', 'match-dom-visual.mjs')),
  preview: read(path.join(root, 'src', 'render-clone-preview.mjs')),
  figmaSim: read(path.join(root, 'src', 'render-figma-sim-preview.mjs')),
  comparison: read(path.join(root, 'src', 'compare-visual-screenshots.mjs')),
  runner: read(path.join(root, 'src', 'run-clone-audit.mjs')),
  audit: read(path.join(root, 'src', 'visual-audit.mjs')),
  regression: read(path.join(root, 'tests', 'test-regression-suite.mjs')),
  sample: read(path.join(root, 'tests', 'test-sample-sites.mjs')),
  figmaDryRun: read(path.join(root, 'tests', 'test-figma-renderer-dry-run.mjs')),
  figmaSimTest: read(path.join(root, 'tests', 'test-figma-sim-preview.mjs')),
  ui: read(path.join(pluginRoot, 'ui.html')),
  renderer: read(activeRendererPath)
};

if (manifest.main !== 'code-visual-backed.js') failures.push('manifest must use code-visual-backed.js');
if (manifest.ui !== 'ui.html') failures.push('manifest must use ui.html');
if (pkg.scripts?.start !== 'node server.mjs') failures.push('npm start must use server.mjs');
if (pkg.scripts?.['test:imports'] !== 'node ./tests/test-module-imports.mjs') failures.push('npm test:imports must run module import gate');
if (pkg.scripts?.['test:v2'] !== 'node ./tests/test-v2-markers.mjs') failures.push('npm test:v2 must run V2 marker gate');
if (pkg.scripts?.['test:figma-dry-run'] !== 'node ./tests/test-figma-renderer-dry-run.mjs') failures.push('npm test:figma-dry-run must run Figma renderer dry run');
if (pkg.scripts?.['test:figma-sim-preview'] !== 'node ./tests/test-figma-sim-preview.mjs') failures.push('npm test:figma-sim-preview must run Figma simulation preview');

must('server', files.server, 'healthStatus', 'server must use healthStatus');
must('server', files.server, 'handleRender', 'server must use handleRender');
must('server', files.server, 'handleAudit', 'server must use handleAudit');
mustNot('server', files.server, 'function buildCloneModel', 'server must not contain clone model builder');
mustNot('server', files.server, 'function buildPayload', 'server must not contain payload builder');

must('contract', files.contract, 'translateit-core', 'contract missing engine marker');
must('contract', files.contract, 'alpha-clean-1', 'contract missing build marker');
must('contract', files.contract, 'Version 0.1 - Alpha', 'contract missing public version marker');
must('contract', files.contract, 'visualModel missing', 'contract does not require visualModel');
must('contract', files.contract, 'cloneModel missing', 'contract does not require cloneModel');
must('contract', files.contract, 'screenshot-first-html-assisted-v2', 'contract does not require visual model v2');
must('contract', files.contract, 'layout-preserving-editable-clone', 'contract does not require clone mode');

for (const marker of ['objectFit', 'objectPosition', 'naturalWidth', 'letterSpacing', 'textTransform', 'whiteSpace', 'overflowWrap', 'opacity']) must('capture', files.capture, marker, `capture missing ${marker} metadata`);
for (const marker of ['coverageRatio', 'confidenceReason', 'importantBlocks', 'screenshot-first-html-assisted-v2']) must('visualModel', files.visualModel, marker, `visual model missing ${marker}`);
for (const marker of ['cssStackingPreserved', 'imageFitPreserved', 'textRenderMetadataPreserved', 'coloredSurfacePreserved', 'removeOffCanvasTextFragments', 'textStyleOf']) must('designBuilder', files.designBuilder, marker, `design builder missing ${marker}`);
for (const marker of ['reconstructTextLines', 'line-aware-headline-reconstruction']) must('lineReconstruction', files.lineReconstruction, marker, `line reconstruction missing ${marker}`);
for (const marker of ['removedHeroOccludedText', 'removedHeadlineCollisionText']) must('heroGuard', files.heroGuard, marker, `hero guard missing ${marker}`);
for (const marker of ['buildVisualModel', 'reconstructTextLines', 'guardHeroOcclusion', 'matchDomToVisual', 'buildCloneModel']) must('payloadBuilder', files.payloadBuilder, marker, `payload builder missing ${marker}`);
for (const marker of ['layout-preserving-editable-clone', 'screenshot-first-html-assisted', 'paintOrderOf', 'dom-paint-order-preserved', 'sectionSurfaceColor', 'source-derived', 'source-object-fit-preserved', 'imageFitLayerCount', 'source-text-rendering-preserved', 'textRenderLayerCount', 'visualBacking']) must('cloneBuilder', files.cloneBuilder, marker, `clone builder missing ${marker}`);
for (const marker of ['screenshot-first-html-assisted-v2', 'dom-paint-order-preserved', 'source-derived', 'source-object-fit-preserved', 'source-text-rendering-preserved', 'visual-comparison-v2', 'visualDiffOverlay']) must('health', files.health, marker, `health status missing ${marker}`);
for (const marker of ['visual-rect-dom-content-style', 'dom-rect-visual-verified']) must('matcher', files.matcher, marker, `matcher missing ${marker}`);
for (const marker of ['translateit-clone-preview-latest.png', 'imageFitCss', 'textRenderScore', 'text-rendering:geometricPrecision', 'letter-spacing', 'text-transform', 'overflow-wrap', 'sortLayers']) must('preview', files.preview, marker, `preview renderer missing ${marker}`);
for (const marker of ['renderFigmaSimPreview', 'source-screenshot-underlay', 'Editable Reconstruction', 'translateit-figma-sim-preview-latest.png']) must('figmaSim', files.figmaSim, marker, `Figma simulation missing ${marker}`);
for (const marker of ['visual-comparison-v2', 'topViewportSimilarityScore', 'sectionBandSimilarityScore', 'worstBandScore', 'layoutShiftRiskScore', 'translateit-visual-diff-latest.png']) must('comparison', files.comparison, marker, `comparison module missing ${marker}`);
for (const marker of ['visualDiff', 'compareSourceAndClonePreview']) must('runner', files.runner, marker, `audit runner missing ${marker}`);
for (const marker of ['top viewport similarity too low', 'worst visual band too low', 'layout shift risk too high', 'source clone visual comparison']) must('audit', files.audit, marker, `visual audit missing ${marker}`);
for (const marker of ['diffPngPath', 'diffHtmlPath']) must('regression', files.regression, marker, `regression report missing ${marker}`);
for (const marker of ['screenshot-first-html-assisted-v2', 'visual-comparison-v2', 'visualDiffOverlay']) must('sample', files.sample, marker, `sample test missing ${marker}`);
for (const marker of ['manifest.main', 'Import complete', 'VisualBacking: source screenshot underlay', 'EditableOverlay: low opacity grouped']) must('figmaDryRun', files.figmaDryRun, marker, `Figma dry run missing ${marker}`);
for (const marker of ['renderFigmaSimPreview', 'translateit-figma-sim-preview-latest.png']) must('figmaSimTest', files.figmaSimTest, marker, `Figma sim test missing ${marker}`);

must('renderer', files.renderer, 'cloneModel missing', 'plugin does not reject missing cloneModel');
must('renderer', files.renderer, 'Visual Backing / Source Screenshot', 'renderer missing locked visual backing layer');
must('renderer', files.renderer, 'Editable Reconstruction / Low Opacity', 'renderer missing editable overlay group');
must('renderer', files.renderer, 'VisualBacking: ', 'renderer does not report visual backing');
must('renderer', files.renderer, 'EditableOverlay: ', 'renderer does not report editable overlay');
must('renderer', files.renderer, 'fitMode', 'plugin renderer missing image fit mode');
for (const marker of ['renderHeader', 'renderHero', 'renderContent', 'renderFooter']) mustNot('renderer', files.renderer, marker, `active renderer contains forbidden marker ${marker}`);

const report = { gate: 'translateit-clean-contract', status: failures.length ? 'fail' : 'pass', manifestMain: manifest.main, npmStart: pkg.scripts ? pkg.scripts.start : null, engine: 'translateit-core', engineBuild: 'alpha-clean-1', renderer: 'visual-backed-editable-clone', modularPipeline: true, visualModel: 'screenshot-first-html-assisted-v2', textLineReconstruction: true, heroOcclusionGuard: true, sectionSurface: 'source-derived', imageFit: 'source-object-fit-preserved', textRender: 'source-text-rendering-preserved', visualComparison: 'visual-comparison-v2', visualDiffOverlay: true, visualMatching: 'dom-to-visual-foundation', paintOrder: 'dom-paint-order-preserved', clonePreview: 'html-png-preview-foundation', figmaSimulationPreview: true, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
