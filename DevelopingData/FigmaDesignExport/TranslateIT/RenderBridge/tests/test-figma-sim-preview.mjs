import fs from 'node:fs';
import path from 'node:path';
import { renderFigmaSimPreview } from '../src/render-figma-sim-preview.mjs';

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
if (!payload || payload.ok !== true) throw new Error('Invalid render payload');
if (!payload.cloneModel) throw new Error('cloneModel missing');
if (payload.cloneModel.mode !== 'layout-preserving-editable-clone') throw new Error('Wrong cloneModel mode');

const result = await renderFigmaSimPreview(payload, reportDir);
const report = {
  gate: 'translateit-figma-simulation-preview',
  status: 'pass',
  targetUrl,
  htmlPath: result.htmlPath,
  pngPath: result.pngPath,
  visualBacking: payload.cloneModel.visualBacking || null,
  sections: payload.cloneModel.sections.length,
  layers: payload.cloneModel.layers.length,
  assets: payload.cloneModel.assets.length
};

const reportPath = path.join(reportDir, 'translateit-figma-sim-preview-latest.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ ...report, reportPath }, null, 2));
