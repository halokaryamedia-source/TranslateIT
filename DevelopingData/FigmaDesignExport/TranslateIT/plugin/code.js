figma.showUI(__html__, { width: 580, height: 860 });

const NS = 'translateit.designExport';
const VERSION = 'inspector-dom-tree-v5';
const PAGE_NAME = 'TranslateIT Import / Workspace';
let lastRun = null;

function sendStatus(text, extra) {
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

function fontName(bold) {
  return bold ? { family: 'Inter', style: 'Bold' } : { family: 'Inter', style: 'Regular' };
}

function component(value) {
  return Math.round(Math.max(0, Math.min(1, value)) * 255).toString(16).padStart(2, '0');
}

function hexToRgb(hex) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(hex || '') ? hex.slice(1) : '000000';
  const value = parseInt(safe, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255
  };
}

function solid(hex) {
  if (!hex) return [];
  return [{ type: 'SOLID', color: hexToRgb(hex) }];
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
    const parts = rgba[1].split(',').map((item) => parseFloat(item));
    if (parts.length >= 3) {
      if (parts.length >= 4 && parts[3] === 0) return fallback || null;
      return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
    }
  }

  const named = { white: '#FFFFFF', black: '#000000' };
  return named[raw.toLowerCase()] || fallback || null;
}

function px(value, fallback) {
  const match = String(value || '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function safeName(value) {
  return String(value || 'Layer').replace(/\s+/g, ' ').trim().slice(0, 96) || 'Layer';
}

function bytesFromBase64(base64) {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function workspacePage() {
  let page = figma.root.children.find((item) => item.name === PAGE_NAME);
  if (!page) page = figma.createPage();
  page.name = PAGE_NAME;
  await figma.setCurrentPageAsync(page);
  return page;
}

function hasVisibleFill(style) {
  const color = cssColor(style && style.backgroundColor, null);
  return !!color;
}

function hasVisibleStroke(style) {
  if (!style) return false;
  const width = Math.max(px(style.borderTopWidth, 0), px(style.borderRightWidth, 0), px(style.borderBottomWidth, 0), px(style.borderLeftWidth, 0));
  return width > 0 && !!cssColor(style.borderTopColor || style.borderRightColor || style.borderBottomColor || style.borderLeftColor, null);
}

function nodeSize(node, scale) {
  return {
    width: Math.max(1, Math.round((node.rect && node.rect.w ? node.rect.w : 1) * scale)),
    height: Math.max(1, Math.round((node.rect && node.rect.h ? node.rect.h : 1) * scale))
  };
}

function positionRelative(node, parentRect, scale) {
  return {
    x: Math.round(((node.rect && node.rect.x ? node.rect.x : 0) - (parentRect && parentRect.x ? parentRect.x : 0)) * scale),
    y: Math.round(((node.rect && node.rect.y ? node.rect.y : 0) - (parentRect && parentRect.y ? parentRect.y : 0)) * scale)
  };
}

function makeFrameNode(node, scale) {
  const style = node.style || {};
  const size = nodeSize(node, scale);
  const frame = figma.createFrame();
  frame.name = safeName((node.role || node.type || 'frame') + ' / ' + (node.name || node.tag || 'Layer'));
  frame.resize(size.width, size.height);
  frame.layoutMode = 'NONE';
  frame.paddingTop = 0;
  frame.paddingRight = 0;
  frame.paddingBottom = 0;
  frame.paddingLeft = 0;
  frame.clipsContent = false;

  const fill = cssColor(style.backgroundColor, null);
  frame.fills = fill ? solid(fill) : [];

  const strokeColor = cssColor(style.borderTopColor || style.borderRightColor || style.borderBottomColor || style.borderLeftColor, null);
  const strokeWidth = Math.max(px(style.borderTopWidth, 0), px(style.borderRightWidth, 0), px(style.borderBottomWidth, 0), px(style.borderLeftWidth, 0));
  frame.strokes = strokeColor && strokeWidth > 0 ? solid(strokeColor) : [];
  frame.strokeWeight = strokeColor && strokeWidth > 0 ? Math.max(1, strokeWidth * scale) : 0;
  frame.cornerRadius = Math.max(0, px(style.borderRadius, 0) * scale);
  return frame;
}

function makeTextNode(node, scale) {
  const style = node.style || {};
  const text = figma.createText();
  const weight = String(style.fontWeight || '');
  text.fontName = fontName(/bold|600|700|800|900/i.test(weight));
  text.characters = String(node.text || node.name || ' ');
  text.fontSize = Math.max(6, px(style.fontSize, 14) * scale);
  text.fills = solid(cssColor(style.color, '#111827'));
  text.name = safeName('text / ' + (node.text || node.name));
  try {
    text.resize(Math.max(1, Math.round((node.rect.w || 1) * scale)), text.height);
  } catch (_) {}
  return text;
}

function makeImageNode(node, scale) {
  const size = nodeSize(node, scale);
  const rect = figma.createRectangle();
  rect.name = safeName('image / ' + (node.name || 'Image'));
  rect.resize(size.width, size.height);
  if (node.imageBase64) {
    const image = figma.createImage(bytesFromBase64(node.imageBase64));
    rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  } else {
    rect.fills = solid('#E5E7EB');
  }
  return rect;
}

function attachMeta(figmaNode, dataNode) {
  figmaNode.setSharedPluginData(NS, 'version', VERSION);
  figmaNode.setSharedPluginData(NS, 'role', dataNode.role || '');
  figmaNode.setSharedPluginData(NS, 'type', dataNode.type || '');
  figmaNode.setSharedPluginData(NS, 'tag', dataNode.tag || '');
  figmaNode.setSharedPluginData(NS, 'path', dataNode.path || '');
}

function shouldRenderAsText(node) {
  return node.type === 'text' || node.tag === '#text';
}

function shouldRenderAsImage(node) {
  return node.type === 'image' || node.role === 'image';
}

function shouldCreateFrame(node) {
  if (node.role === 'root') return true;
  if (node.role === 'button' || node.role === 'link') return true;
  if (node.type === 'frame') return true;
  if ((node.children || []).length > 0) return true;
  return hasVisibleFill(node.style || {}) || hasVisibleStroke(node.style || {});
}

function createFigmaNode(dataNode, parentRect, scale, depth) {
  if (!dataNode || !dataNode.rect) return null;

  let figmaNode;
  if (shouldRenderAsText(dataNode)) {
    figmaNode = makeTextNode(dataNode, scale);
  } else if (shouldRenderAsImage(dataNode)) {
    figmaNode = makeImageNode(dataNode, scale);
  } else if (shouldCreateFrame(dataNode)) {
    figmaNode = makeFrameNode(dataNode, scale);
  } else {
    return null;
  }

  const position = positionRelative(dataNode, parentRect || { x: 0, y: 0 }, scale);
  figmaNode.x = position.x;
  figmaNode.y = position.y;
  attachMeta(figmaNode, dataNode);

  if ('children' in figmaNode && !shouldRenderAsText(dataNode) && !shouldRenderAsImage(dataNode)) {
    const children = (dataNode.children || []).slice().sort((a, b) => {
      const rank = { frame: 0, image: 1, control: 2, 'text-container': 2, text: 3 };
      const ar = rank[a.type] === undefined ? 1 : rank[a.type];
      const br = rank[b.type] === undefined ? 1 : rank[b.type];
      return ar - br || (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x);
    });

    children.forEach((child) => {
      const childNode = createFigmaNode(child, dataNode.rect, scale, depth + 1);
      if (childNode) figmaNode.appendChild(childNode);
    });
  }

  return figmaNode;
}

function countTree(node) {
  if (!node) return 0;
  return 1 + (node.children || []).reduce((sum, child) => sum + countTree(child), 0);
}

async function importInspectorTree(payload) {
  await loadFonts();
  const page = await workspacePage();
  const tree = payload.tree;
  if (!tree || !tree.rect) throw new Error('Render Bridge returned no inspector DOM tree.');

  const viewport = payload.viewport || { width: 1440, height: 1600 };
  const scale = 1280 / Math.max(1, Number(viewport.width) || 1440);
  const canvasHeight = Math.max(500, Math.round((Number(viewport.height) || 1600) * scale));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const run = figma.createFrame();
  run.name = safeName((payload.title || 'Website Import') + ' / ' + stamp);
  run.resize(1440, canvasHeight + 220);
  run.fills = solid('#030407');
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
  title.fills = solid('#F7F9FD');
  title.name = 'Import Title';
  run.appendChild(title);

  const note = figma.createText();
  note.fontName = fontName(false);
  note.characters = 'Inspector Tree Mode: generated from DOM hierarchy, computed CSS, text ranges, layout bounds, and image assets. Screenshot is not used as the main output.';
  note.fontSize = 12;
  note.fills = solid('#8D96A6');
  note.name = 'Import Note';
  run.appendChild(note);

  const canvas = figma.createFrame();
  canvas.name = '01 Website UI / Inspector Tree Layers';
  canvas.resize(1280, canvasHeight);
  canvas.fills = solid('#FFFFFF');
  canvas.layoutMode = 'NONE';
  canvas.paddingTop = 0;
  canvas.paddingRight = 0;
  canvas.paddingBottom = 0;
  canvas.paddingLeft = 0;
  canvas.clipsContent = false;

  const body = createFigmaNode(tree, { x: 0, y: 0 }, scale, 0);
  if (body) {
    body.x = 0;
    body.y = 0;
    canvas.appendChild(body);
  }

  run.appendChild(canvas);
  page.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([run]);
  lastRun = run;

  sendStatus('Import complete.\nOutput page: ' + PAGE_NAME + '\nTop-level run: ' + run.name + '\nMode: Inspector DOM Tree Layers\nNodes generated: ' + countTree(tree) + '\nNext step: review in Figma, then Export Data.');
}

function exportPackage() {
  if (!lastRun) {
    sendStatus('No import run found. Import Data first.');
    return;
  }

  const pkg = {
    schema: 'translateit.ui-build-package.inspector-tree.v1',
    generatedAt: new Date().toISOString(),
    pluginVersion: VERSION,
    figmaRun: lastRun.name
  };

  sendStatus('Export complete.', { exportJson: JSON.stringify(pkg, null, 2) });
}

figma.ui.onmessage = async function (msg) {
  try {
    msg = msg || {};
    if (msg.type === 'import-inspector-tree' || msg.type === 'import-inspector-layers' || msg.type === 'import-rendered-tree') {
      await importInspectorTree(msg.payload || {});
      return;
    }
    if (msg.type === 'export-ui-package') {
      exportPackage();
      return;
    }
    sendStatus('Unsupported command: ' + msg.type);
  } catch (error) {
    sendStatus('Plugin error: ' + (error && error.message ? error.message : error));
  }
};
