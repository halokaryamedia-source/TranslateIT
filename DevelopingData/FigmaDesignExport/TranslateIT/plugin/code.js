figma.showUI(__html__, { width: 580, height: 860 });

const PAGE_NAME = 'TranslateIT Import / Workspace';
const VERSION = 'universal-page-adapter-v1.1';
let lastRun = null;
let regular = { family: 'Inter', style: 'Regular' };
let bold = { family: 'Inter', style: 'Bold' };

function send(text, extra) {
  const message = { type: 'status', text: text };
  extra = extra || {};
  Object.keys(extra).forEach((key) => { message[key] = extra[key]; });
  figma.ui.postMessage(message);
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
    const parts = rgba[1].split(',').map((x) => parseFloat(x));
    if (parts.length >= 3 && !(parts.length >= 4 && parts[3] === 0)) return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
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
  const text = figma.createText();
  const value = clean(layer.text || layer.name || '');
  const fontSize = Math.max(6, px(style.fontSize, layer.role === 'heading' ? 32 : 14) * scale);
  const isBold = /bold|600|700|800|900/i.test(String(style.fontWeight || '')) || layer.role === 'heading';
  const p = pos(layer.rect, parentRect, scale);
  text.name = safe((layer.role || 'text') + ' / ' + value.slice(0, 56));
  text.fontName = font(isBold);
  text.characters = value || ' ';
  text.fontSize = fontSize;
  text.fills = paint(cssColor(style.color, layer.role === 'heading' ? '#111827' : '#374151'));
  text.x = p.x;
  text.y = p.y;
  try {
    text.textAutoResize = 'HEIGHT';
    const browserWidth = Math.max(20, Math.round(((layer.rect && layer.rect.w) || 80) * scale));
    const contentWidth = Math.round(value.length * fontSize * 0.45);
    text.resize(Math.max(browserWidth, contentWidth, 20), Math.max(fontSize * 1.25, Math.round(((layer.rect && layer.rect.h) || fontSize) * scale)));
  } catch (_) {}
  return text;
}

function makeLayer(layer, parentRect, scale) {
  if (!layer || !layer.rect) return null;
  if (layer.type === 'image') return makeImage(layer, parentRect, scale);
  if (layer.type === 'text') return makeText(layer, parentRect, scale);
  if (layer.type === 'box') return makeBox(layer, parentRect, scale);
  return null;
}

function layerSort(a, b) {
  const rank = { box: 0, image: 1, text: 2 };
  return (rank[a.type] || 9) - (rank[b.type] || 9) || (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x);
}

function getSourceHeight(sections, payload, viewport) {
  let maxHeight = payload.pageHeight || viewport.height || 1600;
  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i] || {};
    const rect = section.rect || {};
    maxHeight = Math.max(maxHeight, (rect.y || 0) + (rect.h || 0));
  }
  return maxHeight;
}

async function importUniversal(payload) {
  await loadFonts();
  if (!payload || (payload.mode !== 'universal-page-adapter-v1' && payload.mode !== 'universal-page-adapter-v1.1')) throw new Error('Expected Universal Page Adapter payload.');
  const page = await workspacePage();
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  if (!sections.length && !layers.length) throw new Error('Universal Page Adapter returned no visible layers.');

  const viewport = payload.viewport || { width: 1440, height: 1600 };
  const scale = 1280 / Math.max(1, Number(viewport.width) || 1440);
  const sourceHeight = getSourceHeight(sections, payload, viewport);
  const canvasHeight = Math.max(600, Math.round(sourceHeight * scale));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const run = figma.createFrame();
  run.name = safe((payload.title || 'Website Import') + ' / ' + stamp);
  run.resize(1440, canvasHeight + 220);
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

  const diagnostics = payload.diagnostics || {};
  const note = figma.createText();
  note.name = 'Import Note';
  note.fontName = font(false);
  note.characters = 'Universal Page Adapter: browser-rendered editable layers. Layers: ' + (diagnostics.layerCount || layers.length) + ' / Sections: ' + (diagnostics.sectionCount || sections.length) + ' / Images: ' + (diagnostics.imageCount || 0) + ' / Text: ' + (diagnostics.textCount || 0);
  note.fontSize = 12;
  note.fills = paint('#8D96A6');
  try { note.textAutoResize = 'HEIGHT'; note.resize(1200, 24); } catch (_) {}
  run.appendChild(note);

  const canvas = figma.createFrame();
  canvas.name = '01 Website UI / Universal Page Import';
  canvas.resize(1280, canvasHeight);
  canvas.layoutMode = 'NONE';
  canvas.paddingTop = 0;
  canvas.paddingRight = 0;
  canvas.paddingBottom = 0;
  canvas.paddingLeft = 0;
  canvas.clipsContent = false;
  canvas.fills = paint('#FFFFFF');

  if (sections.length) {
    sections.forEach((section, index) => {
      const rect = section.rect || { x: 0, y: 0, w: viewport.width, h: 100 };
      const sectionFrame = makeFrame(section.name || ('Section ' + String(index + 1).padStart(2, '0')), rect, { x: 0, y: 0 }, scale, null);
      sectionFrame.name = safe(section.role === 'header' ? 'Header' : section.role === 'footer' ? 'Footer' : (section.name || 'Section ' + String(index + 1).padStart(2, '0')));
      (section.layers || []).slice().sort(layerSort).forEach((layer) => {
        const node = makeLayer(layer, rect, scale);
        if (node) sectionFrame.appendChild(node);
      });
      canvas.appendChild(sectionFrame);
    });
  } else {
    layers.slice().sort(layerSort).forEach((layer) => {
      const node = makeLayer(layer, { x: 0, y: 0 }, scale);
      if (node) canvas.appendChild(node);
    });
  }

  run.appendChild(canvas);
  page.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([run]);
  lastRun = run;

  send('Import complete.\nOutput page: ' + PAGE_NAME + '\nTop-level run: ' + run.name + '\nMode: Universal Page Adapter\nLayers generated: ' + (diagnostics.layerCount || layers.length) + '\nSections generated: ' + (diagnostics.sectionCount || sections.length) + '\nAdapter version: ' + VERSION + '\nNext step: review in Figma, then Export Data.');
}

function exportPackage() {
  if (!lastRun) return send('No import run found. Import Data first.');
  send('Export complete.', { exportJson: JSON.stringify({ schema: 'translateit.ui-build-package.universal-page.v1', generatedAt: new Date().toISOString(), pluginVersion: VERSION, figmaRun: lastRun.name }, null, 2) });
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
