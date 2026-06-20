figma.showUI(__html__, { width: 580, height: 860 });

const NS = 'translateit.designExport';
const PAGE_NAME = 'TranslateIT Import / Workspace';
const VERSION = 'inspector-dom-v4';
let lastRun = null;

function postStatus(text, extra) {
  const message = { type: 'status', text };
  extra = extra || {};
  Object.keys(extra).forEach((key) => { message[key] = extra[key]; });
  figma.ui.postMessage(message);
}

async function loadFonts() {
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  } catch (_) {
    await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
  }
}

function fontName(isBold) {
  return isBold ? { family: 'Inter', style: 'Bold' } : { family: 'Inter', style: 'Regular' };
}

function toComponent(value) {
  return Math.round(Math.max(0, Math.min(1, value)) * 255).toString(16).padStart(2, '0');
}

function rgbToHex(color) {
  return '#' + toComponent(color.r) + toComponent(color.g) + toComponent(color.b);
}

function hexToRgb(hex) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(hex || '') ? hex.slice(1) : '000000';
  const n = parseInt(safe, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255
  };
}

function paint(hex, opacity) {
  if (!hex) return [];
  const out = { type: 'SOLID', color: hexToRgb(hex) };
  if (opacity !== undefined) out.opacity = opacity;
  return [out];
}

function cssColor(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return fallback || null;

  const hex = raw.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/);
  if (hex) {
    const h = hex[0];
    return h.length === 4 ? '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3] : h;
  }

  const rgba = raw.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const parts = rgba[1].split(',').map((part) => parseFloat(part));
    if (parts.length >= 3) {
      if (parts.length >= 4 && Number(parts[3]) === 0) return fallback || null;
      return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
    }
  }

  const named = { white: '#FFFFFF', black: '#000000', transparent: null };
  return named[raw.toLowerCase()] || fallback || null;
}

function px(value, fallback) {
  const match = String(value || '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function safeName(value) {
  return String(value || 'Layer').replace(/\s+/g, ' ').trim().slice(0, 96) || 'Layer';
}

function b64ToBytes(base64) {
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function workspacePage() {
  let page = figma.root.children.find((item) => item.name === PAGE_NAME);
  if (!page) page = figma.createPage();
  page.name = PAGE_NAME;
  await figma.setCurrentPageAsync(page);
  return page;
}

function makeText(layer, scale) {
  const style = layer.style || {};
  const node = figma.createText();
  const isBold = /bold|600|700|800|900/i.test(String(style.fontWeight || ''));
  node.fontName = fontName(isBold);
  node.characters = String(layer.text || layer.name || ' ');
  node.fontSize = Math.max(6, px(style.fontSize, 14) * scale);
  node.fills = paint(cssColor(style.color, '#111827'));
  node.name = safeName((layer.role || 'text') + ' / ' + (layer.text || layer.name));
  try {
    const width = Math.max(2, Math.round((layer.rect.w || 2) * scale));
    node.resize(width, node.height);
  } catch (_) {}
  return node;
}

function makeImage(layer, scale) {
  const node = figma.createRectangle();
  node.name = safeName('image / ' + (layer.name || 'Image'));
  node.resize(Math.max(2, Math.round((layer.rect.w || 2) * scale)), Math.max(2, Math.round((layer.rect.h || 2) * scale)));

  if (layer.imageBase64) {
    const image = figma.createImage(b64ToBytes(layer.imageBase64));
    node.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  } else {
    node.fills = paint('#E5E7EB');
  }

  return node;
}

function makeBox(layer, scale) {
  const style = layer.style || {};
  const node = figma.createFrame();
  node.name = safeName((layer.role || layer.kind || 'box') + ' / ' + (layer.name || layer.tag || 'Layer'));
  node.resize(Math.max(2, Math.round((layer.rect.w || 2) * scale)), Math.max(2, Math.round((layer.rect.h || 2) * scale)));
  node.layoutMode = 'NONE';
  node.paddingTop = 0;
  node.paddingRight = 0;
  node.paddingBottom = 0;
  node.paddingLeft = 0;
  node.clipsContent = false;

  const fill = cssColor(style.backgroundColor, null);
  node.fills = fill ? paint(fill) : [];

  const stroke = cssColor(style.borderColor, null);
  const weight = px(style.borderWidth, 0);
  node.strokes = stroke && weight > 0 ? paint(stroke) : [];
  node.strokeWeight = stroke && weight > 0 ? Math.max(1, weight * scale) : 0;
  node.cornerRadius = Math.max(0, px(style.borderRadius, 0) * scale);

  return node;
}

function makeControl(layer, scale) {
  const node = makeBox(layer, scale);
  if (!node.fills.length) node.fills = paint('#FFFFFF');
  return node;
}

function applyMetadata(node, layer) {
  node.setSharedPluginData(NS, 'version', VERSION);
  node.setSharedPluginData(NS, 'kind', layer.kind || 'layer');
  node.setSharedPluginData(NS, 'role', layer.role || '');
  node.setSharedPluginData(NS, 'tag', layer.tag || '');
  node.setSharedPluginData(NS, 'path', layer.path || '');
}

function createNode(layer, scale) {
  let node;
  if (layer.kind === 'text') node = makeText(layer, scale);
  else if (layer.kind === 'image') node = makeImage(layer, scale);
  else if (layer.kind === 'control') node = makeControl(layer, scale);
  else node = makeBox(layer, scale);

  node.x = Math.round((layer.rect.x || 0) * scale);
  node.y = Math.round((layer.rect.y || 0) * scale);
  applyMetadata(node, layer);
  return node;
}

function orderLayers(layers) {
  const rank = { box: 0, image: 1, control: 2, text: 3 };
  return layers.slice().sort((a, b) => {
    const ar = rank[a.kind] === undefined ? 1 : rank[a.kind];
    const br = rank[b.kind] === undefined ? 1 : rank[b.kind];
    return ar - br || (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x);
  });
}

async function importInspectorLayers(payload) {
  await loadFonts();
  const page = await workspacePage();
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const viewport = payload.viewport || { width: 1440, height: 1600 };
  const scale = 1280 / Math.max(1, Number(viewport.width) || 1440);
  const canvasHeight = Math.max(500, Math.round((Number(viewport.height) || 1600) * scale));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const run = figma.createFrame();
  run.name = safeName((payload.title || 'Website Import') + ' / ' + stamp);
  run.resize(1440, canvasHeight + 220);
  run.fills = paint('#030407');
  run.layoutMode = 'VERTICAL';
  run.itemSpacing = 24;
  run.paddingTop = 40;
  run.paddingRight = 40;
  run.paddingBottom = 40;
  run.paddingLeft = 40;

  const title = figma.createText();
  title.fontName = fontName(true);
  title.characters = payload.title || 'Website Import';
  title.fontSize = 30;
  title.fills = paint('#F7F9FD');
  title.name = 'Import Title';
  run.appendChild(title);

  const note = figma.createText();
  note.fontName = fontName(false);
  note.characters = 'Inspector Mode: generated from DOM elements, text ranges, computed CSS, layout bounds, and image assets. Screenshot is not used as the main output.';
  note.fontSize = 12;
  note.fills = paint('#8D96A6');
  note.name = 'Import Note';
  run.appendChild(note);

  const canvas = figma.createFrame();
  canvas.name = '01 Website UI / Inspector DOM Layers';
  canvas.resize(1280, canvasHeight);
  canvas.fills = paint('#FFFFFF');
  canvas.layoutMode = 'NONE';
  canvas.paddingTop = 0;
  canvas.paddingRight = 0;
  canvas.paddingBottom = 0;
  canvas.paddingLeft = 0;
  canvas.clipsContent = false;

  orderLayers(layers).forEach((layer) => {
    if (!layer || !layer.rect) return;
    const node = createNode(layer, scale);
    canvas.appendChild(node);
  });

  run.appendChild(canvas);
  page.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([run]);
  lastRun = run;

  postStatus('Import complete.\nOutput page: ' + PAGE_NAME + '\nTop-level run: ' + run.name + '\nMode: Inspector DOM Layers\nLayers generated: ' + layers.length + '\nNext step: review in Figma, then Export Data.');
}

function exportPackage() {
  if (!lastRun) {
    postStatus('No import run found. Import Data first.');
    return;
  }

  const pkg = {
    schema: 'translateit.ui-build-package.inspector.v1',
    generatedAt: new Date().toISOString(),
    pluginVersion: VERSION,
    figmaRun: lastRun.name
  };

  postStatus('Export complete.', { exportJson: JSON.stringify(pkg, null, 2) });
}

figma.ui.onmessage = async function (msg) {
  try {
    msg = msg || {};
    if (msg.type === 'import-inspector-layers' || msg.type === 'import-rendered-layers' || msg.type === 'import-rendered-tree') {
      await importInspectorLayers(msg.payload || {});
      return;
    }
    if (msg.type === 'export-ui-package') {
      exportPackage();
      return;
    }
    postStatus('Unsupported command: ' + msg.type);
  } catch (err) {
    postStatus('Plugin error: ' + (err && err.message ? err.message : err));
  }
};
