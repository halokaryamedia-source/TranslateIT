import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function exists(value) { try { return !!value && fs.existsSync(value); } catch { return false; } }
function bool(value) { return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase()); }
function rootOf() { return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); }
function src(name) { return path.join(rootOf(), 'src', name); }
function pkgHas(name) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootOf(), 'package.json'), 'utf8'));
    return !!(pkg.dependencies && pkg.dependencies[name]);
  } catch {
    return false;
  }
}
function item(id, name, required, configured, reason, setup) { return { id, name, required, configured, status: configured ? 'ready' : required ? 'missing' : 'optional-missing', reason, setup }; }

export function evaluateExternalEngineReadiness(env = process.env) {
  const hasVisualParser = bool(env.TRANSLATEIT_VISUAL_ENGINE_READY) || !!env.OMNIPARSER_ENDPOINT || exists(env.UIED_CLI_PATH);
  const hasLayoutIntent = exists(src('build-layout-intent-model.mjs'));
  const hasAutoLayout = exists(src('figma-auto-layout-engine.mjs')) && exists(src('build-figma-render-plan.mjs')) && pkgHas('yoga-layout');
  const hasHtmlExport = exists(src('export-html-package.mjs'));
  const hasPreviewCompare = exists(src('visual-compare-engine.mjs')) && pkgHas('pixelmatch') && pkgHas('pngjs');
  const hasImageProcessing = exists(src('image-asset-processing-engine.mjs')) && pkgHas('sharp');
  const hasFontMetrics = exists(src('font-metric-engine.mjs')) && pkgHas('opentype.js');

  const engines = [
    item('visual-ui-parser', 'External Visual UI Parser', true, hasVisualParser, 'Needed to detect visual UI regions from screenshot, not only DOM.', 'Set OMNIPARSER_ENDPOINT or UIED_CLI_PATH.'),
    item('layout-intent-engine', 'Layout Intent Engine', true, hasLayoutIntent, 'Needed to classify header, hero, cards, footer, CTA, and media groups reliably.', 'Install src/build-layout-intent-model.mjs.'),
    item('figma-render-plan-engine', 'Figma Render Plan Engine', true, exists(src('build-figma-render-plan.mjs')), 'Needed to prepare source-geometry render frames before Figma plugin rendering.', 'Install src/build-figma-render-plan.mjs.'),
    item('auto-layout-renderer', 'Figma Auto Layout Renderer', true, hasAutoLayout, 'Needed so Figma output is not raw absolute-position layers forever.', 'Install yoga-layout and src/figma-auto-layout-engine.mjs.'),
    item('image-processing-engine', 'Image Asset Processing Engine', true, hasImageProcessing, 'Needed to normalize large or unsafe image assets before Figma import.', 'Install sharp and src/image-asset-processing-engine.mjs.'),
    item('preview-compare-engine', 'Preview Compare Engine', true, hasPreviewCompare, 'Needed to compare source reference and generated output before Figma test.', 'Install pixelmatch, pngjs, and src/visual-compare-engine.mjs.'),
    item('font-metric-engine', 'Font Metric Engine', false, hasFontMetrics, 'Useful for future text sizing improvements.', 'Install opentype.js and src/font-metric-engine.mjs.'),
    item('html-export-engine', 'Figma/Blueprint to HTML Export Engine', false, hasHtmlExport, 'Needed later for HTML/CSS/assets export.', 'Install src/export-html-package.mjs.')
  ];
  const missing = engines.filter((engine) => engine.required && !engine.configured);
  return {
    status: missing.length ? 'not-ready' : 'ready',
    figmaTestAllowed: missing.length === 0,
    generatedAt: new Date().toISOString(),
    honestStatus: missing.length ? 'External helper engines are not fully installed/configured. Do not test Figma yet.' : 'Required helper engines are installed/configured. Continue to maturity and preview verification before manual Figma test.',
    engines,
    blockers: missing.map((engine) => ({ code: engine.id, message: engine.reason, setup: engine.setup }))
  };
}
if (process.argv[1] && process.argv[1].endsWith('external-engine-readiness.mjs')) {
  const reportDir = process.argv[2] || path.join(process.cwd(), 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const report = evaluateExternalEngineReadiness();
  fs.writeFileSync(path.join(reportDir, 'translateit-external-engine-readiness.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report, null, 2));
  if (!report.figmaTestAllowed) process.exitCode = 2;
}
