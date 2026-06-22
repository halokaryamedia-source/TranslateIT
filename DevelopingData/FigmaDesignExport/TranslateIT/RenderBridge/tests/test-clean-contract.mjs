import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pluginRoot = path.resolve(root, '..', 'plugin');
const failures = [];
function read(file) { return fs.readFileSync(file, 'utf8'); }
function must(name, text, marker) { if (!text.includes(marker)) failures.push(`${name} missing ${marker}`); }
function mustNot(name, text, marker) { if (text.includes(marker)) failures.push(`${name} must not contain ${marker}`); }

const manifest = JSON.parse(read(path.join(pluginRoot, 'manifest.json')));
const pkg = JSON.parse(read(path.join(root, 'package.json')));
const files = {
  server: read(path.join(root, 'server.mjs')),
  contract: read(path.join(root, 'src', 'shared-contract.mjs')),
  capture: read(path.join(root, 'src', 'capture-site.mjs')),
  payload: read(path.join(root, 'src', 'build-payload.mjs')),
  cloneBuilder: read(path.join(root, 'src', 'build-clone-model.mjs')),
  preview: read(path.join(root, 'src', 'render-clone-preview.mjs')),
  figmaSim: read(path.join(root, 'src', 'render-figma-sim-preview.mjs')),
  readiness: read(path.join(root, 'src', 'evaluate-self-audit-readiness-v2.mjs')),
  reviewPage: read(path.join(root, 'src', 'write-self-audit-review-page.mjs')),
  comparison: read(path.join(root, 'src', 'compare-visual-screenshots.mjs')),
  figmaDryRun: read(path.join(root, 'tests', 'test-figma-renderer-dry-run.mjs')),
  figmaSimTest: read(path.join(root, 'tests', 'test-figma-sim-preview.mjs')),
  packer: read(path.join(root, 'run-local-self-audit-pack.ps1')),
  renderer: read(path.join(pluginRoot, manifest.main || 'code.js')),
  ui: read(path.join(pluginRoot, 'ui.html'))
};

if (manifest.main !== 'code-visual-backed.js') failures.push('manifest must use code-visual-backed.js');
if (manifest.ui !== 'ui.html') failures.push('manifest must use ui.html');
if (pkg.scripts?.start !== 'node server.mjs') failures.push('npm start must use server.mjs');
if (pkg.scripts?.['test:figma-dry-run'] !== 'node ./tests/test-figma-renderer-dry-run.mjs') failures.push('npm test:figma-dry-run mismatch');
if (pkg.scripts?.['test:figma-sim-preview'] !== 'node ./tests/test-figma-sim-preview.mjs') failures.push('npm test:figma-sim-preview mismatch');
if (pkg.scripts?.['test:self-audit-readiness'] !== 'node ./src/evaluate-self-audit-readiness-v2.mjs ./reports') failures.push('npm test:self-audit-readiness mismatch');

for (const marker of ['translateit-core', 'alpha-clean-1', 'Version 0.1 - Alpha', 'screenshot-first-html-assisted-v2', 'layout-preserving-editable-clone']) must('contract', files.contract, marker);
for (const marker of ['handleRender', 'handleAudit', 'healthStatus']) must('server', files.server, marker);
for (const marker of ['stabilizePage', 'animationsFrozen', 'lazyScrollPasses', 'imageLoadedCount', 'imageBrokenCount', 'document.fonts', 'animations: \'disabled\'']) must('capture', files.capture, marker);
for (const marker of ['stabilization', 'capture.source.captureDiagnostics', 'screenshot']) must('payload', files.payload, marker);
for (const marker of ['visualBacking', 'source-screenshot-underlay', 'source-object-fit-preserved', 'source-text-rendering-preserved']) must('cloneBuilder', files.cloneBuilder, marker);
for (const marker of ['translateit-clone-preview-latest.png', 'imageFitCss', 'text-rendering:geometricPrecision']) must('preview', files.preview, marker);
for (const marker of ['renderFigmaSimPreview', 'translateit-figma-sim-preview-latest.png', 'translateit-figma-sim-main-latest.png', 'Editable Reconstruction / Low Opacity']) must('figmaSim', files.figmaSim, marker);
for (const marker of ['evaluateSelfAuditReadiness', 'Manual Figma Allowed', 'Reviewable', 'Not Ready', 'captureQuality', 'figma-sim-main-latest.png']) must('readiness', files.readiness, marker);
for (const marker of ['evaluateSelfAuditReadiness', 'translateit-self-audit-readiness.json', 'Figma Simulation Main Preview', 'Image Load']) must('reviewPage', files.reviewPage, marker);
for (const marker of ['visual-comparison-v2', 'topViewportSimilarityScore', 'worstBandScore', 'layoutShiftRiskScore']) must('comparison', files.comparison, marker);
for (const marker of ['manifest.main', 'VisualBacking: source screenshot underlay', 'EditableOverlay: low opacity grouped']) must('figmaDryRun', files.figmaDryRun, marker);
for (const marker of ['mainPngPath', 'compareSourceAndClonePreview', 'translateit-figma-sim-main-diff-latest.png']) must('figmaSimTest', files.figmaSimTest, marker);
for (const marker of ['translateit-self-audit-review.html', 'translateit-self-audit-readiness.json', 'translateit-figma-sim-main-latest.png']) must('packer', files.packer, marker);
for (const marker of ['Visual Backing / Source Screenshot', 'Editable Reconstruction / Low Opacity', 'VisualBacking: ', 'EditableOverlay: ', 'fitMode']) must('renderer', files.renderer, marker);
for (const marker of ['Visual-Backed Editable Clone', 'Import Visual-Backed Clone', 'visualBacking missing']) must('ui', files.ui, marker);
for (const marker of ['renderHeader', 'renderHero', 'renderContent', 'renderFooter']) mustNot('renderer', files.renderer, marker);

const report = { gate: 'translateit-clean-contract', status: failures.length ? 'fail' : 'pass', manifestMain: manifest.main, engine: 'translateit-core', engineBuild: 'alpha-clean-1', renderer: 'visual-backed-editable-clone', phase1ReadinessGate: true, phase2CaptureStabilization: true, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
