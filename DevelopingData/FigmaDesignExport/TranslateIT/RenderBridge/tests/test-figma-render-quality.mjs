import fs from 'node:fs';
import path from 'node:path';
import { scoreFigmaRenderQuality } from '../src/figma-render-quality-score.mjs';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const reportDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });
async function readJson(res) { const text = await res.text(); let payload = {}; try { payload = text ? JSON.parse(text) : {}; } catch {} if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (payload.error || text)); return payload; }
const payload = await readJson(await fetch(bridge + '/render?url=' + encodeURIComponent(targetUrl)));
const report = { gate: 'translateit-figma-render-quality', targetUrl, ...scoreFigmaRenderQuality(payload) };
fs.writeFileSync(path.join(reportDir, 'translateit-figma-render-quality.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!report.passesThreshold) process.exitCode = 2;
