import fs from 'node:fs';
import path from 'node:path';
import { evaluateSectionLayerQuality } from '../src/section-layer-quality.mjs';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const reportDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });
async function readJson(res) { const text = await res.text(); let data = {}; try { data = text ? JSON.parse(text) : {}; } catch {} if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (data.error || text)); return data; }
const payload = await readJson(await fetch(bridge + '/render?url=' + encodeURIComponent(targetUrl)));
const report = { gate: 'translateit-section-layer-quality', targetUrl, ...evaluateSectionLayerQuality(payload) };
fs.writeFileSync(path.join(reportDir, 'translateit-section-layer-quality.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (report.status !== 'ready') process.exitCode = 2;
