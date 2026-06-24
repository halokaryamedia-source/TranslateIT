import fs from 'node:fs';
import path from 'node:path';

const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const reportDir = path.join(process.cwd(), 'reports');
fs.mkdirSync(reportDir, { recursive: true });
async function readJson(res) { const text = await res.text(); let payload = {}; try { payload = text ? JSON.parse(text) : {}; } catch {} if (!res.ok) throw new Error('HTTP ' + res.status + ': ' + (payload.error || text)); return payload; }
const health = await readJson(await fetch(bridge + '/health'));
const payload = await readJson(await fetch(bridge + '/render?url=' + encodeURIComponent(targetUrl)));
const bp = payload.designBlueprint || {};
const failures = [];
const warnings = [];
if (health.activeRenderer !== 'plugin/code-framework-editable.js') failures.push('active renderer is not framework editable');
if (health.rendererMode !== 'framework-editable-output') failures.push('renderer mode is not framework editable output');
if (bp.version !== 'design-blueprint-v1') failures.push('design blueprint missing or wrong version');
const types = new Set((bp.sections || []).map((section) => section.type));
for (const type of ['header', 'hero', 'content-grid', 'footer']) if (!types.has(type)) failures.push(`missing blueprint section: ${type}`);
if (!bp.tokens?.colors?.length) failures.push('missing color tokens');
if (!bp.tokens?.typography?.length) warnings.push('missing typography tokens');
const textLayers = (payload.cloneModel?.layers || []).filter((layer) => layer.type === 'text' && String(layer.text || '').trim()).length;
const imageLayers = (payload.cloneModel?.layers || []).filter((layer) => layer.type === 'image' && layer.role !== 'component-slice').length;
if (textLayers < 8) failures.push('not enough editable text layers');
if (imageLayers < 1) warnings.push('no editable image layer detected');
const report = { gate: 'translateit-blueprint-framework-output', status: failures.length ? 'fail' : 'pass', targetUrl, renderer: health.activeRenderer, rendererMode: health.rendererMode, blueprintVersion: bp.version || null, pageType: bp.pageType || null, sections: (bp.sections || []).map((section) => ({ id: section.id, type: section.type, layout: section.layout })), tokenSummary: { colors: bp.tokens?.colors?.length || 0, typography: bp.tokens?.typography?.length || 0, spacing: bp.tokens?.spacing?.length || 0 }, textLayers, imageLayers, failures, warnings };
fs.writeFileSync(path.join(reportDir, 'translateit-blueprint-framework-output.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
