figma.showUI(__html__, { width: 580, height: 860 });

const PAGE_NAME = 'TranslateIT Import / Workspace';
const VERSION = 'universal-page-adapter-v4';
let lastRun = null;
let lastDiagnostics = null;
let lastImportMeta = null;
let regular = { family: 'Inter', style: 'Regular' };
let bold = { family: 'Inter', style: 'Bold' };

function send(text, extra) {
  const msg = { type: 'status', text: text };
  extra = extra || {};
  Object.keys(extra).forEach(function (key) { msg[key] = extra[key]; });
  figma.ui.postMessage(msg);
}

async function loadFonts() {
  try { await figma.loadFontAsync(regular); } catch (_) { regular = { family: 'Roboto', style: 'Regular' }; await figma.loadFontAsync(regular); }
  try { await figma.loadFontAsync(bold); } catch (_) { bold = regular; }
}

function font(isBold) { return isBold ? bold : regular; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function safe(value) { return clean(value || 'Layer').slice(0, 96) || 'Layer'; }
function px(value, fallback) { const match = String(value || '').match(/-?\d+(\.\d+)?/); return match ? Number(match[0]) : fallback; }
function rgb(hex) { const value = parseInt(/^#[\da-fA-F]{6}$/.test(hex || '') ? hex.slice(1) : '111827', 16); return { r: ((value >> 16) & 255) / 255, g: ((value >> 8) & 255) / 255, b: (value & 255) / 255 }; }
function paint(hex) { return hex ? [{ type: 'SOLID', color: rgb(hex) }] : []; }
function cssColor(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return fallback || null;
  const hex = raw.match(/#[\da-fA-F]{6}|#[\da-fA-F]{3}/);
  if (hex) return hex[0].length === 4 ? '#' + hex[0][1] + hex[0][1] + hex[0][2] + hex[0][2] + hex[0][3] + hex[0][3] : hex[0];
  const rgba = raw.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const parts = rgba[1].split(',').map(function (x) { return parseFloat(x); });
    if (parts.length >= 3 && !(parts.length >= 4 && parts[3] === 0)) return '#' + parts.slice(0, 3).map(function (n) { return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0'); }).join('');
  }
  return fallback || null;
}
function decodeBase64(value) { const raw = atob(value); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i); return out; }
function size(rect, scale) { rect = rect || {}; return { w: Math.max(1, Math.round((rect.w || 1) * scale)), h: Math.max(1, Math.round((rect.h || 1) * scale)) }; }
function pos(rect, parentRect, scale) { rect = rect || {}; parentRect = parentRect || {}; return { x: Math.round(((rect.x || 0) - (parentRect.x || 0)) * scale), y: Math.round(((rect.y || 0) - (parentRect.y || 0)) * scale) }; }

async function workspacePage() {
  let page = null;
  for (let i = 0; i < figma.root.children.length; i += 1) if (figma.root.children[i].name === PAGE_NAME) page = figma.root.children[i];
  if (!page) page = figma.createPage();
  page.name = PAGE_NAME;
  await figma.setCurrentPageAsync(page);
  return page;
}

function makeFrame(name, rect, parentRect, scale, fill) {
  const frame = figma.createFrame();
  const s = size(rect, scale);
  const p = pos(rect, parentRect, scale);
  frame.name = safe(name);
  frame.resize(s.w, s.h);
  frame.x = p.x;
  frame.y = p.y;
  frame.layoutMode = 'NONE';
  frame.paddingTop = 0;
  frame.paddingRight = 0;
  frame.paddingBottom = 0;
  frame.paddingLeft = 0;
  frame.clipsContent = false;
  frame.fills = fill ? paint(fill) : [];
  frame.strokes = [];
  return frame;
}

function makeBox(layer, parentRect, scale) {
  const style = layer.style || {};
  const rect = figma.createRectangle();
  const s = size(layer.rect, scale);
  const p = pos(layer.rect, parentRect, scale);
  rect.name = safe((layer.role || 'box') + ' / ' + (layer.name || layer.tag || 'Box'));
  rect.resize(s.w, s.h);
  rect.x = p.x;
  rect.y = p.y;
  rect.cornerRadius = Math.max(0, px(style.borderRadius, 0) * scale);
  rect.fills = paint(cssColor(style.backgroundColor, layer.role === 'button-bg' ? '#FFFFFF' : null));
  const strokeColor = cssColor(style.borderTopColor || style.borderRightColor || style.borderBottomColor || style.borderLeftColor, null);
  const strokeWidth = Math.max(px(style.borderTopWidth, 0), px(style.borderRightWidth, 0), px(style.borderBottomWidth, 0), px(style.borderLeftWidth, 0));
  rect.strokes = strokeColor && strokeWidth > 0 ? paint(strokeColor) : [];
  rect.strokeWeight = strokeColor && strokeWidth > 0 ? Math.max(1, strokeWidth * scale) : 0;
  return rect;
}

function makeImage(layer, parentRect, scale) {
  const imageLayer = { type: layer.type, role: 'image', tag: layer.tag, name: layer.name, rect: layer.rect, style: { backgroundColor: '#E5E7EB', borderRadius: ((layer.style || {}).borderRadius || '0px') } };
  const rect = makeBox(imageLayer, parentRect, scale);
  rect.name = safe('image / ' + (layer.name || 'Image'));
  if (layer.image && layer.image.base64) {
    const image = figma.createImage(decodeBase64(layer.image.base64));
    rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  }
  return rect;
}

function makeText(layer, parentRect, scale) {
  const style = layer.style || {};
  const node = figma.createText();
  const value = clean(layer.text || layer.name || '');
  const fontSize = Math.max(6, px(style.fontSize, layer.role === 'heading' ? 32 : 14) * scale);
  const isBold = /bold|600|700|800|900/i.test(String(style.fontWeight || '')) || layer.role === 'heading';
  const p = pos(layer.rect, parentRect, scale);
  node.name = safe((layer.role || 'text') + ' / ' + value.slice(0, 56));
  node.fontName = font(isBold);
  node.characters = value || ' ';
  node.fontSize = fontSize;
  node.fills = paint(cssColor(style.color, layer.role === 'heading' ? '#111827' : '#374151'));
  node.x = p.x;
  node.y = p.y;
  try {
    node.textAutoResize = 'HEIGHT';
    const browserWidth = Math.max(20, Math.round(((layer.rect && layer.rect.w) || 80) * scale));
    const contentWidth = Math.round(value.length * fontSize * 0.45);
    node.resize(Math.max(browserWidth, contentWidth, 20), Math.max(fontSize * 1.25, Math.round(((layer.rect && layer.rect.h) || fontSize) * scale)));
  } catch (_) {}
  return node;
}

function makeLayer(layer, parentRect, scale) {
  if (!layer || !layer.rect) return null;
  if (layer.type === 'image') return makeImage(layer, parentRect, scale);
  if (layer.type === 'text') return makeText(layer, parentRect, scale);
  if (layer.type === 'box') return makeBox(layer, parentRect, scale);
  return null;
}
function layerSort(a, b) { const rank = { box: 0, image: 1, text: 2 }; return (rank[a.type] || 9) - (rank[b.type] || 9) || (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x); }
function modeOk(mode) { return mode === 'universal-page-adapter-v1' || mode === 'universal-page-adapter-v1.1' || mode === 'universal-page-adapter-v2' || mode === 'universal-page-adapter-v3' || mode === 'universal-page-adapter-v4'; }
function appendLayerList(parent, layers, parentRect, scale, filterFn) { (layers || []).slice().filter(function (layer) { return filterFn ? filterFn(layer) : true; }).sort(layerSort).forEach(function (layer) { const node = makeLayer(layer, parentRect, scale); if (node) parent.appendChild(node); }); }
function appendComponents(sectionFrame, section, sectionRect, scale) { const components = Array.isArray(section.components) ? section.components : []; if (!components.length) { appendLayerList(sectionFrame, section.layers || [], sectionRect, scale); return; } components.forEach(function (component, index) { const componentRect = component.rect || { x: sectionRect.x, y: sectionRect.y, w: 1, h: 1 }; const componentFrame = makeFrame(component.name || ('Component ' + String(index + 1).padStart(2, '0')), componentRect, sectionRect, scale, null); appendLayerList(componentFrame, component.layers || [], componentRect, scale); sectionFrame.appendChild(componentFrame); }); appendLayerList(sectionFrame, section.looseLayers || [], sectionRect, scale); }
function sourceHeight(sections, payload, viewport) { let h = payload.pageHeight || viewport.height || 1600; for (let i = 0; i < sections.length; i += 1) { const r = (sections[i] || {}).rect || {}; h = Math.max(h, (r.y || 0) + (r.h || 0)); } return h; }

function screenshotFrame(payload, name, width, height, opacity) {
  if (!payload.screenshot || !payload.screenshot.base64) return null;
  const frame = figma.createFrame();
  frame.name = name;
  frame.resize(width, height);
  frame.layoutMode = 'NONE';
  frame.paddingTop = 0;
  frame.paddingRight = 0;
  frame.paddingBottom = 0;
  frame.paddingLeft = 0;
  frame.clipsContent = true;
  frame.fills = paint('#FFFFFF');
  const rect = figma.createRectangle();
  rect.name = 'Website Screenshot Base';
  rect.resize(width, height);
  rect.x = 0;
  rect.y = 0;
  const image = figma.createImage(decodeBase64(payload.screenshot.base64));
  rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  rect.strokes = [];
  rect.opacity = typeof opacity === 'number' ? opacity : 1;
  try { rect.locked = true; } catch (_) {}
  frame.appendChild(rect);
  return frame;
}

function rawReconstructionFrame(name, sections, layers, viewport, scale, canvasHeight) {
  const canvas = figma.createFrame();
  canvas.name = name;
  canvas.resize(1280, canvasHeight);
  canvas.layoutMode = 'NONE';
  canvas.paddingTop = 0;
  canvas.paddingRight = 0;
  canvas.paddingBottom = 0;
  canvas.paddingLeft = 0;
  canvas.clipsContent = false;
  canvas.fills = paint('#FFFFFF');
  if (sections.length) {
    sections.forEach(function (section, index) {
      const rect = section.rect || { x: 0, y: 0, w: viewport.width, h: 100 };
      const sectionFrame = makeFrame(section.name || ('Section ' + String(index + 1).padStart(2, '0')), rect, { x: 0, y: 0 }, scale, null);
      sectionFrame.name = safe(section.role === 'header' ? 'Header' : section.role === 'footer' ? 'Footer' : (section.name || 'Section ' + String(index + 1).padStart(2, '0')));
      appendComponents(sectionFrame, section, rect, scale);
      canvas.appendChild(sectionFrame);
    });
  } else {
    appendLayerList(canvas, layers, { x: 0, y: 0 }, scale);
  }
  return canvas;
}

function hybridOverlayFrame(payload, sections, layers, viewport, scale, canvasHeight) {
  const frame = screenshotFrame(payload, '02 Hybrid Visual Match / Screenshot-backed Editable Overlay', 1280, canvasHeight, 1);
  if (!frame) return null;
  const overlay = figma.createFrame();
  overlay.name = 'Editable Overlay Layers / low opacity for visual match';
  overlay.resize(1280, canvasHeight);
  overlay.x = 0;
  overlay.y = 0;
  overlay.layoutMode = 'NONE';
  overlay.paddingTop = 0;
  overlay.paddingRight = 0;
  overlay.paddingBottom = 0;
  overlay.paddingLeft = 0;
  overlay.clipsContent = false;
  overlay.fills = [];
  overlay.opacity = 0.08;
  appendLayerList(overlay, layers, { x: 0, y: 0 }, scale, function (layer) { return layer.type === 'text' || layer.role === 'button-bg' || layer.role === 'button-label'; });
  frame.appendChild(overlay);
  return frame;
}

async function importUniversal(payload) {
  await loadFonts();
  if (!payload || !modeOk(payload.mode)) throw new Error('Expected Universal Page Adapter payload.');
  const page = await workspacePage();
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  if (!sections.length && !layers.length && !(payload.screenshot && payload.screenshot.base64)) throw new Error('Universal Page Adapter returned no visible layers.');
  const viewport = payload.viewport || { width: 1440, height: 1600 };
  const scale = 1280 / Math.max(1, Number(viewport.width) || 1440);
  const canvasHeight = Math.max(600, Math.round(sourceHeight(sections, payload, viewport) * scale));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const diagnostics = payload.diagnostics || {};
  lastDiagnostics = { layerCount: diagnostics.layerCount || layers.length, sectionCount: diagnostics.sectionCount || sections.length, componentCount: diagnostics.componentCount || 0, imageCount: diagnostics.imageCount || 0, textCount: diagnostics.textCount || 0, hasScreenshotReference: !!(payload.screenshot && payload.screenshot.base64), outputMode: VERSION };
  lastImportMeta = { title: payload.title || 'Website Import', url: payload.url || '', adapterMode: payload.mode || '', pluginOutputMode: VERSION, pageHeight: payload.pageHeight || 0, viewport: viewport };

  const run = figma.createFrame();
  run.name = safe((payload.title || 'Website Import') + ' / ' + stamp);
  run.resize(1440, payload.screenshot ? canvasHeight * 3 + 380 : canvasHeight + 220);
  run.fills = paint('#030407');
  run.layoutMode = 'VERTICAL';
  run.itemSpacing = 22;
  run.paddingTop = 40;
  run.paddingRight = 40;
  run.paddingBottom = 40;
  run.paddingLeft = 40;
  run.primaryAxisSizingMode = 'AUTO';
  run.counterAxisSizingMode = 'FIXED';

  const title = figma.createText();
  title.name = 'Import Title';
  title.fontName = font(true);
  title.characters = payload.title || 'Website Import';
  title.fontSize = 30;
  title.fills = paint('#F7F9FD');
  run.appendChild(title);
  const note = figma.createText();
  note.name = 'Import Note';
  note.fontName = font(false);
  note.characters = 'Universal Page Adapter V4: visual reference + screenshot-backed editable overlay + raw debug reconstruction. Layers: ' + lastDiagnostics.layerCount + ' / Sections: ' + lastDiagnostics.sectionCount + ' / Components: ' + lastDiagnostics.componentCount + ' / Images: ' + lastDiagnostics.imageCount + ' / Text: ' + lastDiagnostics.textCount;
  note.fontSize = 12;
  note.fills = paint('#8D96A6');
  try { note.textAutoResize = 'HEIGHT'; note.resize(1200, 24); } catch (_) {}
  run.appendChild(note);

  const visual = screenshotFrame(payload, '01 Visual Reference / Website Screenshot', 1280, canvasHeight, 1);
  if (visual) run.appendChild(visual);
  const hybrid = hybridOverlayFrame(payload, sections, layers, viewport, scale, canvasHeight);
  if (hybrid) run.appendChild(hybrid);
  const raw = rawReconstructionFrame(payload.screenshot ? '03 Raw Editable Reconstruction / Debug' : '01 Raw Editable Reconstruction / Debug', sections, layers, viewport, scale, canvasHeight);
  run.appendChild(raw);

  page.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([run]);
  lastRun = run;
  send('Import complete.\nOutput page: ' + PAGE_NAME + '\nTop-level run: ' + run.name + '\nMode: Universal Page Adapter V4 Hybrid\nVisual reference: ' + (lastDiagnostics.hasScreenshotReference ? 'yes' : 'no') + '\nLayers generated: ' + lastDiagnostics.layerCount + '\nSections generated: ' + lastDiagnostics.sectionCount + '\nComponents generated: ' + lastDiagnostics.componentCount + '\nAdapter version: ' + VERSION + '\nNext step: compare 01 Visual Reference, 02 Hybrid Visual Match, and 03 Raw Debug.');
}

function exportPackage() {
  if (!lastRun) return send('No import run found. Import Data first.');
  const pkg = { schema: 'translateit.ui-build-package.universal-page.v4', generatedAt: new Date().toISOString(), pluginVersion: VERSION, figmaRun: lastRun.name, source: lastImportMeta || {}, diagnostics: lastDiagnostics || {} };
  send('Export complete.', { exportJson: JSON.stringify(pkg, null, 2) });
}

figma.ui.onmessage = async function (msg) {
  try {
    msg = msg || {};
    if (msg.type === 'import-design-reconstruction' || msg.type === 'import-layout-tree' || msg.type === 'import-source-bundle' || msg.type === 'import-inspector-tree') return await importUniversal(msg.payload || {});
    if (msg.type === 'export-ui-package') return exportPackage();
    send('Unsupported command: ' + msg.type);
  } catch (error) {
    send('Plugin error: ' + (error && error.message ? error.message : error));
  }
};
