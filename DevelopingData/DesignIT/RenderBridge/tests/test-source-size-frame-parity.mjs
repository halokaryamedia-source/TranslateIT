import fs from 'node:fs';
import path from 'node:path';
import { renderFigmaSimPreview } from '../src/render-figma-sim-preview-v2.mjs';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const reportDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });
async function readJson(res) { const text = await res.text(); let payload = {}; try { payload = text ? JSON.parse(text) : {}; } catch {} if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (payload.error || text)); return payload; }
const payload = await readJson(await fetch(bridge + '/render?url=' + encodeURIComponent(targetUrl)));
const shot = payload.source?.screenshot || {};
if (!shot.width || !shot.height) throw new Error('source screenshot size missing');
const sim = await renderFigmaSimPreview(payload, reportDir);
if (!sim.mainSize?.width || !sim.mainSize?.height) throw new Error('simulation main size missing');
const sourceRatio = shot.width / shot.height;
const mainRatio = sim.mainSize.width / sim.mainSize.height;
const expectedHeight = Math.round(sim.mainSize.width * shot.height / shot.width);
const heightDelta = Math.abs(sim.mainSize.height - expectedHeight);
const ratioDelta = Math.abs(sourceRatio - mainRatio);
const failures = [];
if (heightDelta > 2) failures.push(`main height ${sim.mainSize.height} does not match expected ${expectedHeight}`);
if (ratioDelta > 0.003) failures.push(`ratio delta too high: ${ratioDelta}`);
const report = { gate: 'translateit-source-size-frame-parity', status: failures.length ? 'fail' : 'pass', targetUrl, sourceSize: { width: shot.width, height: shot.height }, mainSize: sim.mainSize, expectedHeight, heightDelta, sourceRatio: Number(sourceRatio.toFixed(6)), mainRatio: Number(mainRatio.toFixed(6)), ratioDelta: Number(ratioDelta.toFixed(6)), simulator: 'source-size-fitted-v2', failures };
const reportPath = path.join(reportDir, 'translateit-source-size-frame-parity.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify({ ...report, reportPath }, null, 2));
if (failures.length) process.exitCode = 2;
