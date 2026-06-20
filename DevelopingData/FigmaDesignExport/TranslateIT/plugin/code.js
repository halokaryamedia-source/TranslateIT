figma.showUI(__html__, { width: 580, height: 860 });

const NS = 'translateit.designExport';
const VERSION = 'layout-tree-compiler-v3';
const PAGE_NAME = 'TranslateIT Import / Workspace';
let lastRun = null;
let loadedRegularFont = { family: 'Inter', style: 'Regular' };
let loadedBoldFont = { family: 'Inter', style: 'Bold' };

function sendStatus(text, extra) {
  const message = { type: 'status', text: text };
  extra = extra || {};
  Object.keys(extra).forEach(function (key) { message[key] = extra[key]; });
  figma.ui.postMessage(message);
}

async function loadFonts() {
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    loadedRegularFont = { family: 'Inter', style: 'Regular' };
  } catch (_) {
    await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
    loadedRegularFont = { family: 'Roboto', style: 'Regular' };
  }

  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
    loadedBoldFont = { family: 'Inter', style: 'Bold' };
  } catch (_) {
    loadedBoldFont = loadedRegularFont;
  }
}

function fontName(bold) {
  return bold ? loadedBoldFont : loadedRegularFont;
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
    const parts = rgba[1].split(',').map(function (item) { return parseFloat(item); });
    if (parts.length >= 3) {
      if (parts.length >= 4 && parts[3] === 0) return fallback || null;
      return '#' + parts.slice(0, 3).map(function (n) { return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0'); }).join('');
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

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function bytesFromBase64(base64) {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function workspacePage() {
  let page = null;
  for (let i = 0; i < figma.root.children.length; i += 1) {
    if (figma.root.children[i].name === PAGE_NAME) {
      page = figma.root.children[i];
      break;
    }
  }
  if (!page) page = figma.createPage();
  page.name = PAGE_NAME;
  await figma.setCurrentPageAsync(page);
  return page;
}

function nodeSize(dataNode, scale) {
  return {
    w: Math.max(1, Math.round(((dataNode.rect && dataNode.rect.w) || 1) * scale)),
    h: Math.max(1, Math.round(((dataNode.rect && dataNode.rect.h) || 1) * scale))
  };
}

function relPos(dataNode, parentRect, scale) {
  parentRect = parentRect || { x: 0, y: 0 };
  const rect = dataNode.rect || { x: 0, y: 0 };
  return {
    x: Math.round(((rect.x || 0) - (parentRect.x || 0)) * scale),
    y: Math.round(((rect.y || 0) - (parentRect.y || 0)) * scale)
  };
}

function createTextNode(dataNode, scale) {
  const text = figma.createText();
  const style = dataNode.style || {};
  const weight = String(style.fontWeight || '');
  text.fontName = fontName(/bold|600|700|800|900/i.test(weight) || dataNode.role === 'heading');
  text.characters = cleanText(dataNode.text || dataNode.name || ' ');
  text.fontSize = Math.max(6, px(style.fontSize, dataNode.role === 'heading' ? 32 : 14) * scale);
  text.fills = solid(cssColor(style.color, '#111827'));
  text.name = safeName((dataNode.role || 'text') + ' / ' + text.characters.slice(0, 56));
  try { text.resize(Math.max(1, Math.round(((dataNode.rect && dataNode.rect.w) || 120) * scale)), text.height); } catch (_) {}
  return text;
}

function createImageNode(dataNode, scale) {
  const size = nodeSize(dataNode, scale);
  const rect = figma.createRectangle();
  rect.name = safeName('image / ' + (dataNode.name || dataNode.text || 'Image'));
  rect.resize(size.w, size.h);
  rect.cornerRadius = Math.max(0, px((dataNode.style || {}).borderRadius, 0) * scale);
  if (dataNode.image && dataNode.image.base64) {
    const image = figma.createImage(bytesFromBase64(dataNode.image.base64));
    rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  } else {
    rect.fills = solid('#E5E7EB');
  }
  return rect;
}

function createFrameNode(dataNode, scale) {
  const style = dataNode.style || {};
  const size = nodeSize(dataNode, scale);
  const frame = figma.createFrame();
  frame.name = safeName((dataNode.role || 'frame') + ' / ' + (dataNode.name || dataNode.tag || 'Layer'));
  frame.resize(size.w, size.h);
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

function attachMeta(figmaNode, dataNode) {
  figmaNode.setSharedPluginData(NS, 'version', VERSION);
  figmaNode.setSharedPluginData(NS, 'role', dataNode.role || '');
  figmaNode.setSharedPluginData(NS, 'tag', dataNode.tag || '');
  figmaNode.setSharedPluginData(NS, 'path', dataNode.path || '');
  figmaNode.setSharedPluginData(NS, 'sourceName', dataNode.name || '');
}

function isTextNode(dataNode) {
  return dataNode.type === 'text' || dataNode.tag === '#text' || dataNode.role === 'heading' || dataNode.role === 'paragraph' || dataNode.role === 'text';
}

function isImageNode(dataNode) {
  return dataNode.type === 'image' || dataNode.role === 'image';
}

function childRank(node) {
  if (isTextNode(node)) return 3;
  if (isImageNode(node)) return 1;
  if (node.role === 'button' || node.role === 'link') return 2;
  return 0;
}

function buildNode(dataNode, parentRect, scale, depth) {
  if (!dataNode || !dataNode.rect) return null;
  let figmaNode;
  if (isImageNode(dataNode)) figmaNode = createImageNode(dataNode, scale);
  else if (isTextNode(dataNode)) figmaNode = createTextNode(dataNode, scale);
  else figmaNode = createFrameNode(dataNode, scale);

  const pos = relPos(dataNode, parentRect, scale);
  figmaNode.x = pos.x;
  figmaNode.y = pos.y;
  attachMeta(figmaNode, dataNode);

  if ('children' in figmaNode && !isTextNode(dataNode) && !isImageNode(dataNode)) {
    const children = (dataNode.children || []).slice().sort(function (a, b) {
      return childRank(a) - childRank(b) || ((a.rect && a.rect.y) || 0) - ((b.rect && b.rect.y) || 0) || ((a.rect && a.rect.x) || 0) - ((b.rect && b.rect.x) || 0);
    });
    children.forEach(function (child) {
      const childLayer = buildNode(child, dataNode.rect, scale, depth + 1);
      if (childLayer) figmaNode.appendChild(childLayer);
    });
  }

  return figmaNode;
}

function countNodes(node) {
  if (!node) return 0;
  return 1 + (node.children || []).reduce(function (sum, child) { return sum + countNodes(child); }, 0);
}

async function importLayoutTree(payload) {
  await loadFonts();
  const page = await workspacePage();
  const tree = payload.tree;
  if (!tree || !tree.rect) throw new Error('Layout Tree Compiler returned no tree.');

  const viewport = payload.viewport || { width: 1440, height: 1600 };
  const scale = 1280 / Math.max(1, Number(viewport.width) || 1440);
  const canvasHeight = Math.max(500, Math.round(((tree.rect && tree.rect.h) || viewport.height || 1600) * scale));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const run = figma.createFrame();
  run.name = safeName((payload.title || 'Website Layout Import') + ' / ' + stamp);
  run.resize(1440, canvasHeight + 220);
  run.fills = solid('#030407');
  run.layoutMode = 'VERTICAL';
  run.itemSpacing = 24;
  run.paddingTop = 40;
  run.paddingRight = 40;
  run.paddingBottom = 40;
  run.paddingLeft = 40;
  run.primaryAxisSizingMode = 'AUTO';
  run.counterAxisSizingMode = 'FIXED';

  const title = createTextNode({ role: 'heading', text: payload.title || 'Website Layout Import', rect: { w: 800, h: 40 }, style: { fontSize: '30px', color: '#F7F9FD', fontWeight: '700' } }, 1);
  title.name = 'Import Title';
  run.appendChild(title);

  const info = payload.source || {};
  const note = createTextNode({ role: 'text', text: 'Layout Tree Compiler: rendered website DOM, computed CSS bounds, text nodes, and image assets. Nodes: ' + (info.nodeCount || countNodes(tree)), rect: { w: 1200, h: 24 }, style: { fontSize: '12px', color: '#8D96A6' } }, 1);
  note.name = 'Import Note';
  run.appendChild(note);

  const canvas = figma.createFrame();
  canvas.name = '01 Website UI / Layout Tree';
  canvas.resize(1280, canvasHeight);
  canvas.layoutMode = 'NONE';
  canvas.paddingTop = 0;
  canvas.paddingRight = 0;
  canvas.paddingBottom = 0;
  canvas.paddingLeft = 0;
  canvas.clipsContent = false;
  canvas.fills = solid('#FFFFFF');

  const body = buildNode(tree, { x: 0, y: 0 }, scale, 0);
  if (body) {
    body.x = 0;
    body.y = 0;
    canvas.appendChild(body);
  }

  run.appendChild(canvas);
  page.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([run]);
  lastRun = run;

  sendStatus('Import complete.\nOutput page: ' + PAGE_NAME + '\nTop-level run: ' + run.name + '\nMode: Layout Tree Compiler\nNodes generated: ' + (info.nodeCount || countNodes(tree)) + '\nNext step: review in Figma, then Export Data.');
}

function exportPackage() {
  if (!lastRun) {
    sendStatus('No import run found. Import Data first.');
    return;
  }
  const pkg = {
    schema: 'translateit.ui-build-package.layout-tree.v1',
    generatedAt: new Date().toISOString(),
    pluginVersion: VERSION,
    figmaRun: lastRun.name
  };
  sendStatus('Export complete.', { exportJson: JSON.stringify(pkg, null, 2) });
}

figma.ui.onmessage = async function (msg) {
  try {
    msg = msg || {};
    if (msg.type === 'import-layout-tree' || msg.type === 'import-source-bundle' || msg.type === 'import-inspector-tree') {
      await importLayoutTree(msg.payload || {});
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
