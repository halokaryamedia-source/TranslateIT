import fs from 'node:fs';
import path from 'node:path';

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

const payload = await readJson(await fetch(bridge + '/render?url=' + encodeURIComponent(targetUrl)));
const failures = [];
const support = {
  figmaRenderPlan: payload.figmaRenderPlan || null,
  figmaAutoLayoutPlan: payload.figmaAutoLayoutPlan || null,
  imageAssetProcessingPlan: payload.imageAssetProcessingPlan || null,
  visualComparePlan: payload.visualComparePlan || null,
  fontMetricPlan: payload.fontMetricPlan || null
};

if (support.figmaRenderPlan?.status !== 'pass') failures.push('figma render plan not ready');
if (support.figmaAutoLayoutPlan?.status !== 'pass') failures.push('auto layout plan not ready');
if (support.imageAssetProcessingPlan?.status !== 'pass') failures.push('image asset processing not ready');
if (support.visualComparePlan?.status !== 'ready') failures.push('visual compare not ready');
if (support.fontMetricPlan?.status !== 'ready') failures.push('font metric not ready');

const report = {
  gate: 'translateit-figma-support-engines',
  status: failures.length ? 'fail' : 'pass',
  support: {
    figmaRenderPlan: support.figmaRenderPlan?.diagnostics || null,
    figmaAutoLayoutPlan: support.figmaAutoLayoutPlan?.diagnostics || null,
    imageAssetProcessingPlan: support.imageAssetProcessingPlan?.diagnostics || null,
    visualComparePlan: support.visualComparePlan?.diagnostics || null,
    fontMetricPlan: support.fontMetricPlan?.diagnostics || null
  },
  failures
};

fs.writeFileSync(path.join(reportDir, 'translateit-figma-support-engines.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
