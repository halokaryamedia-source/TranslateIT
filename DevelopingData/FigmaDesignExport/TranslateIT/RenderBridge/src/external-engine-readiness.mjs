import fs from 'node:fs';
import path from 'node:path';

function exists(value) { try { return !!value && fs.existsSync(value); } catch { return false; } }
function bool(value) { return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase()); }
function item(id, name, required, configured, reason, setup) { return { id, name, required, configured, status: configured ? 'ready' : required ? 'missing' : 'optional-missing', reason, setup }; }
export function evaluateExternalEngineReadiness(env = process.env) {
  const engines = [
    item('visual-ui-parser', 'External Visual UI Parser', true, bool(env.TRANSLATEIT_VISUAL_ENGINE_READY) || !!env.OMNIPARSER_ENDPOINT || exists(env.UIED_CLI_PATH), 'Needed to detect visual UI regions from screenshot, not only DOM.', 'Set OMNIPARSER_ENDPOINT or UIED_CLI_PATH, or set TRANSLATEIT_VISUAL_ENGINE_READY=1 only after real integration is installed.'),
    item('layout-intent-engine', 'Layout Intent Engine', true, bool(env.TRANSLATEIT_LAYOUT_INTENT_READY), 'Needed to classify header, hero, cards, footer, CTA, and media groups reliably.', 'Enable after TranslateIT layout intent engine has integration tests and real section classification.'),
    item('auto-layout-renderer', 'Figma Auto Layout Renderer', true, bool(env.TRANSLATEIT_AUTOLAYOUT_RENDERER_READY), 'Needed so Figma output is not raw absolute-position layers.', 'Enable after renderer creates framework-like sections/components and passes preview gate.'),
    item('html-export-engine', 'Figma/Blueprint to HTML Export Engine', true, bool(env.TRANSLATEIT_HTML_EXPORT_READY), 'Needed to export usable HTML/CSS/assets package.', 'Enable after exported package validates index.html, styles.css, assets, and manifest.'),
    item('preview-compare-engine', 'Preview Compare Engine', true, bool(env.TRANSLATEIT_PREVIEW_COMPARE_READY), 'Needed to compare framework output, source reference, and layer tree before Figma test.', 'Enable after preview report is generated and reviewed.')
  ];
  const missing = engines.filter((engine) => engine.required && !engine.configured);
  return {
    status: missing.length ? 'not-ready' : 'ready',
    figmaTestAllowed: missing.length === 0,
    generatedAt: new Date().toISOString(),
    honestStatus: missing.length ? 'External helper engines are not fully installed/configured. Do not test Figma yet.' : 'All required helper engine flags are configured. Continue to deep preview verification.',
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
