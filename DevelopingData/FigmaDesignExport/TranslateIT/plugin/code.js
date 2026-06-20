figma.showUI(__html__, { width: 580, height: 860 });

const NS = 'translateit.designExport';
const VERSION = 'source-bundle-compiler-v1';
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

function isTextual(role) {
  return ['heading', 'paragraph', 'text'].indexOf(role) >= 0;
}

function isAction(role) {
  return role === 'button' || role === 'link';
}

function createText(characters, size, color, bold, name) {
  const node = figma.createText();
  node.fontName = fontName(!!bold);
  node.characters = cleanText(characters) || ' ';
  node.fontSize = size;
  node.fills = solid(color || '#111827');
  node.name = safeName(name || ('text / ' + node.characters.slice(0, 48)));
  try { node.layoutSizingHorizontal = 'FILL'; } catch (_) {}
  return node;
}

function createFrame(name, layoutMode, fill) {
  const frame = figma.createFrame();
  frame.name = safeName(name);
  frame.layoutMode = layoutMode || 'VERTICAL';
  frame.itemSpacing = layoutMode === 'HORIZONTAL' ? 12 : 10;
  frame.paddingTop = 16;
  frame.paddingRight = 16;
  frame.paddingBottom = 16;
  frame.paddingLeft = 16;
  frame.counterAxisSizingMode = 'AUTO';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.fills = fill ? solid(fill) : [];
  frame.strokes = [];
  try { frame.layoutSizingHorizontal = 'FILL'; } catch (_) {}
  return frame;
}

function createImage(node) {
  const imageNode = figma.createRectangle();
  const attrs = node.attrs || {};
  imageNode.name = safeName('image / ' + (node.name || attrs.alt || 'Image'));
  imageNode.resize(360, 220);
  imageNode.cornerRadius = 12;

  if (node.image && node.image.base64) {
    const image = figma.createImage(bytesFromBase64(node.image.base64));
    imageNode.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  } else {
    imageNode.fills = solid('#E5E7EB');
  }

  return imageNode;
}

function createAction(node) {
  const attrs = node.attrs || {};
  const frame = createFrame((node.role || 'action') + ' / ' + (node.name || node.text || 'Action'), 'HORIZONTAL', '#FFFFFF');
  frame.cornerRadius = 999;
  frame.paddingTop = 10;
  frame.paddingRight = 14;
  frame.paddingBottom = 10;
  frame.paddingLeft = 14;
  frame.strokes = solid('#D1D5DB');
  frame.strokeWeight = 1;
  const label = createText(node.text || node.name || attrs.href || 'Link', 14, '#111827', false, 'label / ' + (node.text || node.name || 'Action'));
  frame.appendChild(label);
  return frame;
}

function frameRoleStyle(role) {
  if (role === 'root') return { name: '01 Website UI / Source HTML Structure', fill: '#FFFFFF', layout: 'VERTICAL', padding: 24, gap: 20 };
  if (role === 'header' || role === 'nav') return { fill: '#FFFFFF', layout: 'HORIZONTAL', padding: 14, gap: 16 };
  if (role === 'footer') return { fill: '#F4D35E', layout: 'HORIZONTAL', padding: 24, gap: 28 };
  if (role === 'section') return { fill: '#FFFFFF', layout: 'HORIZONTAL', padding: 24, gap: 24 };
  if (role === 'card') return { fill: '#FFFFFF', layout: 'VERTICAL', padding: 16, gap: 12 };
  if (role === 'list') return { fill: null, layout: 'VERTICAL', padding: 0, gap: 8 };
  if (role === 'list-item') return { fill: null, layout: 'HORIZONTAL', padding: 4, gap: 8 };
  return { fill: null, layout: 'VERTICAL', padding: 8, gap: 8 };
}

function applyFrameStyle(frame, style) {
  frame.layoutMode = style.layout || 'VERTICAL';
  frame.itemSpacing = style.gap || 8;
  frame.paddingTop = style.padding || 0;
  frame.paddingRight = style.padding || 0;
  frame.paddingBottom = style.padding || 0;
  frame.paddingLeft = style.padding || 0;
  frame.fills = style.fill ? solid(style.fill) : [];
  try { frame.layoutSizingHorizontal = 'FILL'; } catch (_) {}
}

function attachMeta(figmaNode, sourceNode) {
  figmaNode.setSharedPluginData(NS, 'version', VERSION);
  figmaNode.setSharedPluginData(NS, 'role', sourceNode.role || '');
  figmaNode.setSharedPluginData(NS, 'tag', sourceNode.tag || '');
  figmaNode.setSharedPluginData(NS, 'path', sourceNode.path || '');
  figmaNode.setSharedPluginData(NS, 'sourceName', sourceNode.name || '');
}

function buildNode(node, depth) {
  if (!node) return null;
  const role = node.role || 'group';

  if (role === 'image') {
    const image = createImage(node);
    attachMeta(image, node);
    return image;
  }

  if (isAction(role)) {
    const action = createAction(node);
    attachMeta(action, node);
    return action;
  }

  if (isTextual(role) || node.tag === '#text') {
    const text = node.text || node.name || '';
    if (!cleanText(text)) return null;
    const size = role === 'heading' ? 34 : role === 'paragraph' ? 16 : 14;
    const color = role === 'heading' ? '#111827' : '#374151';
    const textNode = createText(text, size, color, role === 'heading', role + ' / ' + text.slice(0, 48));
    attachMeta(textNode, node);
    return textNode;
  }

  const roleStyle = frameRoleStyle(role);
  const frame = createFrame(roleStyle.name || (role + ' / ' + (node.name || node.tag || 'Group')), roleStyle.layout, roleStyle.fill);
  applyFrameStyle(frame, roleStyle);
  attachMeta(frame, node);

  const seenText = {};
  (node.children || []).forEach(function (child) {
    if (!child) return;
    const textKey = child.tag === '#text' ? cleanText(child.text).toLowerCase() : '';
    if (textKey && seenText[textKey]) return;
    if (textKey) seenText[textKey] = true;
    const childLayer = buildNode(child, depth + 1);
    if (childLayer) frame.appendChild(childLayer);
  });

  if (frame.children.length === 0 && cleanText(node.text)) {
    const fallback = createText(node.text, 14, '#374151', false, 'text / ' + node.text.slice(0, 48));
    frame.appendChild(fallback);
  }

  if (frame.children.length === 0 && role !== 'root') return null;
  return frame;
}

function countNodes(node) {
  if (!node) return 0;
  return 1 + (node.children || []).reduce(function (sum, child) { return sum + countNodes(child); }, 0);
}

async function importSourceBundle(payload) {
  await loadFonts();
  const page = await workspacePage();
  const tree = payload.tree;
  if (!tree || !Array.isArray(tree.children)) throw new Error('Source Bundle Compiler returned no source tree.');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const run = figma.createFrame();
  run.name = safeName((payload.title || 'Website Source Import') + ' / ' + stamp);
  run.resize(1440, 900);
  run.fills = solid('#030407');
  run.layoutMode = 'VERTICAL';
  run.itemSpacing = 24;
  run.paddingTop = 40;
  run.paddingRight = 40;
  run.paddingBottom = 40;
  run.paddingLeft = 40;
  run.primaryAxisSizingMode = 'AUTO';
  run.counterAxisSizingMode = 'FIXED';

  const title = createText(payload.title || 'Website Source Import', 30, '#F7F9FD', true, 'Import Title');
  run.appendChild(title);

  const info = payload.source || {};
  const cssFiles = info.cssFiles || [];
  const note = createText('Source Bundle Compiler: downloaded HTML + CSS, normalized assets, and rebuilt a semantic Figma structure. Nodes: ' + (info.nodeCount || countNodes(tree)) + ' / CSS files: ' + (cssFiles.length || 0) + ' / Images: ' + (info.imageCount || 0), 12, '#8D96A6', false, 'Import Note');
  run.appendChild(note);

  const output = buildNode(tree, 0);
  if (output) run.appendChild(output);

  page.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([run]);
  lastRun = run;

  sendStatus('Import complete.\nOutput page: ' + PAGE_NAME + '\nTop-level run: ' + run.name + '\nMode: Source Bundle Compiler\nNodes generated: ' + (info.nodeCount || countNodes(tree)) + '\nNext step: review in Figma, then Export Data.');
}

function exportPackage() {
  if (!lastRun) {
    sendStatus('No import run found. Import Data first.');
    return;
  }

  const pkg = {
    schema: 'translateit.ui-build-package.source-bundle.v1',
    generatedAt: new Date().toISOString(),
    pluginVersion: VERSION,
    figmaRun: lastRun.name
  };

  sendStatus('Export complete.', { exportJson: JSON.stringify(pkg, null, 2) });
}

figma.ui.onmessage = async function (msg) {
  try {
    msg = msg || {};
    if (msg.type === 'import-source-bundle' || msg.type === 'import-inspector-tree') {
      await importSourceBundle(msg.payload || {});
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
