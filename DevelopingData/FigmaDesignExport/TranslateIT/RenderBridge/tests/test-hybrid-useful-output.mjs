import fs from 'node:fs';
import path from 'node:path';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const reportDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });
async function readJson(res) { const text = await res.text(); let payload = {}; try { payload = text ? JSON.parse(text) : {}; } catch {} if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (payload.error || text)); return payload; }
const payload = await readJson(await fetch(bridge + '/render?url=' + encodeURIComponent(targetUrl)));
const model = payload.cloneModel || {};
const layers = model.layers || [];
const failures = [];
const warnings = [];
const visualBlocks = layers.filter((layer) => layer.role === 'component-slice');
const editableText = layers.filter((layer) => layer.type === 'text' && String(layer.text || '').trim().length > 0);
const editableMedia = layers.filter((layer) => layer.type === 'image' && layer.role !== 'component-slice');
if (payload.diagnostics?.nativeUsefulness?.mode !== 'hybrid-component-slices-plus-editable-text') failures.push('native usefulness mode is not hybrid component slices plus editable text');
if (visualBlocks.length < 2) warnings.push('less than 2 component visual blocks captured; output may be too text-only');
if (editableText.length < 8) failures.push('not enough editable text layers');
if (editableMedia.length < 1) warnings.push('no separate editable media image layer found');
if (model.visualBacking?.enabled === true) failures.push('main output still has visual backing enabled');
const report = { gate: 'translateit-hybrid-useful-output', status: failures.length ? 'fail' : 'pass', targetUrl, layers: layers.length, visualBlocks: visualBlocks.length, editableText: editableText.length, editableMedia: editableMedia.length, nativeUsefulness: payload.diagnostics?.nativeUsefulness || null, failures, warnings };
fs.writeFileSync(path.join(reportDir, 'translateit-hybrid-useful-output.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
