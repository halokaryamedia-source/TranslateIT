import fs from 'node:fs';
import path from 'node:path';
import { renderClonePreview } from '../src/render-clone-preview.mjs';
import { comparePngFiles } from '../src/visual-compare-engine.mjs';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const dir = path.join(process.cwd(), 'reports');
fs.mkdirSync(dir, { recursive: true });

async function readJson(res) {
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch {}
  if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (data.error || text));
  return data;
}

const payload = await readJson(await fetch(bridge + '/render?url=' + encodeURIComponent(targetUrl)));
const shot = payload.source?.screenshot;
const failures = [];
if (!shot?.base64) failures.push('source screenshot missing');

let report;
if (failures.length) {
  report = { gate: 'translateit-visual-compare-generated', status: 'not-ready', targetUrl, failures };
} else {
  const sourcePath = path.join(dir, 'source-reference.png');
  const outputPath = path.join(dir, 'generated-preview.png');
  fs.writeFileSync(sourcePath, Buffer.from(shot.base64, 'base64'));
  const preview = await renderClonePreview(payload, dir);
  fs.copyFileSync(preview.pngPath, outputPath);
  const result = await comparePngFiles(sourcePath, outputPath, path.join(dir, 'visual-diff.png'));
  report = { gate: 'translateit-visual-compare-generated', targetUrl, previewMetrics: preview.metrics, ...result };
}
fs.writeFileSync(path.join(dir, 'translateit-visual-compare-readiness.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'pass') process.exitCode = 2;
