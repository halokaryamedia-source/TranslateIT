import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureSite } from './src/capture-site.mjs';
import { extractLayout } from './src/extract-layout.mjs';
import { buildDesignModel } from './src/build-design-model.mjs';
import { buildVisualModel } from './src/build-visual-model.mjs';
import { visualAudit } from './src/visual-audit.mjs';
import { PUBLIC_VERSION, ENGINE, ENGINE_BUILD, ok, error, assertCleanPayload, normalizeUrl } from './src/shared-contract.mjs';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const here = path.dirname(fileURLToPath(import.meta.url));
const reportDir = path.join(here, 'reports');

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function color(value, fallback = '') {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw;
  const m = raw.match(/rgba?\(([^)]+)\)/);
  if (!m) return fallback;
  const p = m[1].split(',').map((x) => Number.parseFloat(x));
  if (p.length < 3 || p[3] === 0) return fallback;
  return '#' + p.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
}
function area(rect) { return Math.max(0, rect?.w || 0) * Math.max(0, rect?.h || 0); }
function sectionName(section) {
  if (section.role === 'header') return 'Section / Header';
  if (section.role === 'hero') return 'Section / Hero';
  if (section.role === 'footer') return 'Section / Footer';
  if (section.role === 'content') return 'Section / Content';
  return section.name || `Section / ${section.role || 'Content'}`;
}
function layerType(element) {
  if (element.type === 'image') return 'image';
  if (element.type === 'button') return 'button';
  if (element.type === 'container') return 'shape';
  return 'text';
}
function layerName(element) {
  const role = clean(element.role || element.type || 'Layer');
  const txt = clean(element.text || element.alt || element.name || '');
  if (element.type === 'image') return `Image / ${clean(element.alt || element.name || role)}`;
  if (element.type === 'button') return `Button / ${txt.slice(0, 42)}`;
  if (element.type === 'container') return `Background / ${role}`;
  if (role === 'title') return 'Hero / Title';
  if (role === 'section-title') return 'Section / Title';
  if (role === 'nav-item') return `Navigation / ${txt.slice(0, 42)}`;
  if (role === 'footer-link') return `Footer Link / ${txt.slice(0, 42)}`;
  if (role === 'footer-text') return `Footer Text / ${txt.slice(0, 42)}`;
  return `${role} / ${txt.slice(0, 42)}`;
}
function styleOf(element) {
  const s = element.style || {};
  return { color: color(s.color, '#111827'), backgroundColor: color(s.backgroundColor, ''), fontSize: Number(s.fontSize || 14), fontWeight: Number(s.fontWeight || 400), fontFamily: s.fontFamily || 'Inter', lineHeight: Number(s.lineHeight || 0), borderRadius: Number(s.borderRadius || 0), textAlign: s.textAlign || 'left' };
}
function buildCloneModel(model, visualModel) {
  const sections = (model.sections || []).map((section) => ({ id: section.id, role: section.role, name: sectionName(section), rect: section.rect, layerIds: [] })).sort((a, b) => ((a.rect && a.rect.y) || 0) - ((b.rect && b.rect.y) || 0));
  const sectionMap = new Map(sections.map((section) => [section.id, section]));
  const layers = [];
  for (const element of (model.elements || [])) {
    if (!element.rect || area(element.rect) < 24) continue;
    const type = layerType(element);
    const layer = { id: `layer-${element.id}`, type, role: element.role || type, name: layerName(element), sectionId: element.sectionId || null, rect: element.rect, text: clean(element.text), assetId: element.assetId || null, alt: clean(element.alt), style: styleOf(element), zIndex: type === 'shape' ? 0 : type === 'image' ? 10 : type === 'text' ? 20 : 30, editable: true, sourceReason: 'dom-css-geometry' };
    layers.push(layer);
    const section = sectionMap.get(layer.sectionId);
    if (section) section.layerIds.push(layer.id);
  }
  const bgLayers = sections.map((section) => ({ id: `bg-${section.id}`, type: 'shape', role: 'section-background', name: `${section.name} / Background`, sectionId: section.id, rect: section.rect, text: '', assetId: null, alt: '', style: { color: '#111827', backgroundColor: section.role === 'footer' ? '#087A4B' : '#FFFFFF', fontSize: 0, fontWeight: 400, fontFamily: 'Inter', lineHeight: 0, borderRadius: 0, textAlign: 'left' }, zIndex: -10, editable: true, sourceReason: 'section-visual-background' }));
  const allLayers = bgLayers.concat(layers).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0) || ((a.rect && a.rect.y) || 0) - ((b.rect && b.rect.y) || 0));
  return { mode: 'layout-preserving-editable-clone', visualTruth: 'screenshot-first-html-assisted', page: { title: model.page?.title || 'Imported Website', url: model.page?.url || '', width: model.page?.width || 1440, height: model.page?.height || 1600, background: model.page?.background || '#FFFFFF' }, sections, layers: allLayers, assets: model.assets || [], visualModel: { mode: visualModel.mode, diagnostics: visualModel.diagnostics }, uiLibrary: { grouping: 'section-first-source-geometry', editableText: true, editableImages: true, screenshotReferenceOnly: true }, diagnostics: { sections: sections.length, layers: allLayers.length, textLayers: allLayers.filter((x) => x.type === 'text').length, imageLayers: allLayers.filter((x) => x.type === 'image').length, shapeLayers: allLayers.filter((x) => x.type === 'shape').length, buttonLayers: allLayers.filter((x) => x.type === 'button').length, visualBlocks: visualModel.diagnostics.blocks, visualConfidence: visualModel.diagnostics.averageConfidence } };
}
function sendJson(res, status, payload) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS' }); res.end(JSON.stringify(payload, null, 2)); }
function writeLatestReport(name, payload) { fs.mkdirSync(reportDir, { recursive: true }); const file = path.join(reportDir, name); fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8'); return file; }
async function buildPayload(targetUrl) {
  const capture = await captureSite(targetUrl);
  const visualModel = buildVisualModel(capture);
  const layout = extractLayout(capture);
  const designModel = buildDesignModel(layout);
  const cloneModel = buildCloneModel(designModel, visualModel);
  const payload = ok({ source: { ...capture.source, screenshot: capture.source.screenshot }, visualModel, designModel, cloneModel, diagnostics: { capture: { rawElements: capture.rawElements.length, assets: capture.assets.length }, visualModel: visualModel.diagnostics, layout: layout.stats, model: designModel.diagnostics, cloneModel: cloneModel.diagnostics } });
  const contractFailures = assertCleanPayload(payload);
  if (contractFailures.length) throw new Error(`Clean contract failed: ${contractFailures.join(', ')}`);
  return payload;
}
async function handleRender(req, res, url) { const target = normalizeUrl(url.searchParams.get('url')); if (!target) return sendJson(res, 400, error('Missing url parameter.')); try { return sendJson(res, 200, await buildPayload(target)); } catch (err) { return sendJson(res, 500, error(err?.message || err)); } }
async function handleAudit(req, res, url) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  try { const payload = await buildPayload(target); const audit = visualAudit(payload); const report = { publicVersion: PUBLIC_VERSION, engine: ENGINE, engineBuild: ENGINE_BUILD, targetUrl: target, generatedAt: new Date().toISOString(), readyForFigmaTest: audit.visualReadiness === 'pass', audit, diagnostics: payload.diagnostics }; report.reportPath = writeLatestReport('translateit-clean-latest.json', report); return sendJson(res, 200, report); } catch (err) { const report = { publicVersion: PUBLIC_VERSION, engine: ENGINE, engineBuild: ENGINE_BUILD, targetUrl: target, generatedAt: new Date().toISOString(), readyForFigmaTest: false, error: err?.message || String(err) }; report.reportPath = writeLatestReport('translateit-clean-latest.json', report); return sendJson(res, 500, report); }
}
const server = http.createServer(async (req, res) => { if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true }); const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`); if (url.pathname === '/health') return sendJson(res, 200, ok({ adapter: 'clean-render-bridge', activeServer: 'server.mjs', activeRenderer: 'plugin/code.js', contract: 'cloneModel', cloneMode: 'layout-preserving-editable-clone', visualModel: 'screenshot-first-html-assisted-visual-model', legacyActive: false })); if (url.pathname === '/render') return handleRender(req, res, url); if (url.pathname === '/audit') return handleAudit(req, res, url); return sendJson(res, 404, error('Route not found. Use /health, /render, or /audit.')); });
server.listen(PORT, '127.0.0.1', () => { console.log(`TranslateIT Clean RenderBridge running on http://127.0.0.1:${PORT}`); console.log(`Engine: ${ENGINE}`); console.log(`Engine Build: ${ENGINE_BUILD}`); console.log(`Public Version: ${PUBLIC_VERSION}`); });
