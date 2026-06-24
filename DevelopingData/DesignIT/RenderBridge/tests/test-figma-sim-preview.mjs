import fs from 'node:fs';
import path from 'node:path';
import { renderFigmaSimPreview } from '../src/render-figma-sim-preview-v2.mjs';
import { compareSourceAndClonePreview } from '../src/compare-visual-screenshots.mjs';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const reportDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });

async function readJson(res) {
  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (payload.error || text));
  return payload;
}
function copyIfExists(from, to) { try { if (from && fs.existsSync(from)) fs.copyFileSync(from, to); return fs.existsSync(to) ? to : null; } catch { return null; } }

const payload = await readJson(await fetch(bridge + '/render?url=' + encodeURIComponent(targetUrl)));
if (!payload || payload.ok !== true) throw new Error('Invalid render payload');
if (!payload.cloneModel) throw new Error('cloneModel missing');
if (payload.cloneModel.mode !== 'layout-preserving-editable-clone') throw new Error('Wrong cloneModel mode');
if (!payload.cloneModel.visualBacking || payload.cloneModel.visualBacking.enabled !== true) throw new Error('visualBacking must be enabled for alpha visual gate');

const result = await renderFigmaSimPreview(payload, reportDir);
const comparison = await compareSourceAndClonePreview(payload, { pngPath: result.mainPngPath });
const diffPngPath = copyIfExists(comparison.overlayPath, path.join(reportDir, 'translateit-figma-sim-main-diff-latest.png'));
const diffHtmlPath = copyIfExists(comparison.overlayHtmlPath, path.join(reportDir, 'translateit-figma-sim-main-diff-latest.html'));
const failures = [];
if (!result.visualBacking) failures.push('visual backing missing in Figma simulation');
if (!result.mainPngPath || !fs.existsSync(result.mainPngPath)) failures.push('main-only Figma simulation PNG missing');
if (!comparison.available) failures.push('main Figma simulation visual comparison unavailable');
if ((comparison.risk || 'unknown') === 'high') failures.push('main Figma simulation visual risk is high');
if (Number(comparison.topViewportSimilarityScore || 0) < 88) failures.push('top viewport similarity below professional alpha threshold');
if (Number(comparison.visualSimilarityScore || 0) < 82) failures.push('visual similarity below professional alpha threshold');

const report = {
  gate: 'translateit-figma-simulation-preview',
  status: failures.length ? 'fail' : 'pass',
  targetUrl,
  htmlPath: result.htmlPath,
  pngPath: result.pngPath,
  mainPngPath: result.mainPngPath,
  diffPngPath,
  diffHtmlPath,
  visualBacking: payload.cloneModel.visualBacking || null,
  overlayOpacity: result.overlayOpacity,
  sourceSize: result.sourceSize || null,
  mainSize: result.mainSize || null,
  comparison: {
    available: comparison.available,
    version: comparison.version,
    visualSimilarityScore: comparison.visualSimilarityScore,
    topViewportSimilarityScore: comparison.topViewportSimilarityScore,
    sectionBandSimilarityScore: comparison.sectionBandSimilarityScore,
    worstBandScore: comparison.worstBandScore,
    layoutShiftRiskScore: comparison.layoutShiftRiskScore,
    risk: comparison.risk,
    sourceSize: comparison.sourceSize,
    cloneSize: comparison.cloneSize
  },
  sections: payload.cloneModel.sections.length,
  layers: payload.cloneModel.layers.length,
  assets: payload.cloneModel.assets.length,
  failures
};
const reportPath = path.join(reportDir, 'translateit-figma-sim-preview-latest.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ ...report, reportPath }, null, 2));
if (failures.length) process.exitCode = 2;
