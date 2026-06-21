figma.showUI(__html__, { width: 580, height: 860 });

var PUBLIC_VERSION = 'Version 0.1 - Alpha';
var ENGINE = 'translateit-core';
var ENGINE_BUILD = 'alpha-clean-1';
var PAGE_NAME = 'TranslateIT Import / Clean Engine';

var regular = { family: 'Inter', style: 'Regular' };
var bold = { family: 'Inter', style: 'Bold' };
var lastFrame = null;

function arr(value) { return Array.isArray(value) ? value : []; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function layerName(value) { return (clean(value) || 'Layer').slice(0, 90); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function get(obj, key, fallback) { return obj && obj[key] != null ? obj[key] : fallback; }

function post(text) {
  figma.ui.postMessage({ type: 'status', text: text });
}

function hexToRgb(hex) {
  var raw = /^#[0-9a-fA-F]{6}$/.test(hex || '') ? hex.slice(1) : '111827';
  var num = parseInt(raw, 16);
  return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 };
}

function paint(hex) {
  return [{ type: 'SOLID', color: hexToRgb(hex || '#111827') }];
}

function base64ToBytes(value) {
  var binary = atob(value || '');
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function preparePage() {
  try {
    await figma.loadFontAsync(regular);
  } catch (_) {
    regular = { family: 'Roboto', style: 'Regular' };
    await figma.loadFontAsync(regular);
  }
  try {
    await figma.loadFontAsync(bold);
  } catch (_) {
    bold = regular;
  }
  var page = null;
  for (var i = 0; i < figma.root.children.length; i += 1) {
    if (figma.root.children[i].name === PAGE_NAME) page = figma.root.children[i];
  }
  if (!page) page = figma.createPage();
  page.name = PAGE_NAME;
  if (figma.setCurrentPageAsync) await figma.setCurrentPageAsync(page);
  return page;
}

function frame(name, w, h, fill) {
  var node = figma.createFrame();
  node.name = layerName(name);
  node.resize(Math.max(1, w), Math.max(1, h));
  node.fills = fill ? paint(fill) : [];
  node.strokes = [];
  node.clipsContent = false;
  return node;
}

function rect(parent, name, x, y, w, h, fill, radius, stroke) {
  var node = figma.createRectangle();
  node.name = layerName(name);
  node.x = x;
  node.y = y;
  node.resize(Math.max(1, w), Math.max(1, h));
  node.fills = paint(fill || '#FFFFFF');
  node.cornerRadius = radius || 0;
  node.strokes = stroke ? paint(stroke) : [];
  node.strokeWeight = stroke ? 1 : 0;
  parent.appendChild(node);
  return node;
}

function text(parent, name, value, x, y, fontSize, color, width, weight) {
  var node = figma.createText();
  node.name = layerName(name);
  node.fontName = weight >= 600 ? bold : regular;
  node.characters = clean(value) || ' ';
  node.fontSize = clamp(fontSize, 7, 64);
  node.fills = paint(color || '#111827');
  node.x = x;
  node.y = y;
  try {
    node.textAutoResize = 'HEIGHT';
    node.resize(Math.max(20, width || 220), Math.max(12, node.fontSize * 1.45));
  } catch (_) {}
  parent.appendChild(node);
  return node;
}

function image(parent, name, asset, x, y, w, h, radius) {
  var node = figma.createRectangle();
  node.name = layerName(name);
  node.x = x;
  node.y = y;
  node.resize(Math.max(1, w), Math.max(1, h));
  node.cornerRadius = radius || 0;
  node.strokes = [];
  if (asset && asset.base64) {
    var img = figma.createImage(base64ToBytes(asset.base64));
    node.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
  } else {
    node.fills = paint('#E5E7EB');
  }
  parent.appendChild(node);
  return node;
}

function scaleRect(sourceRect, scale) {
  var r = sourceRect || {};
  return {
    x: Math.round((r.x || 0) * scale),
    y: Math.round((r.y || 0) * scale),
    w: Math.round((r.w || 120) * scale),
    h: Math.round((r.h || 40) * scale)
  };
}

function validatePayload(payload) {
  if (!payload || payload.ok !== true) throw new Error('Invalid payload.');
  if (payload.publicVersion !== PUBLIC_VERSION) throw new Error('Wrong public version.');
  if (payload.engine !== ENGINE) throw new Error('Wrong engine. Expected translateit-core.');
  if (payload.engineBuild !== ENGINE_BUILD) throw new Error('Wrong engine build. Expected alpha-clean-1.');
  if (!payload.designModel) throw new Error('designModel missing.');
  if (!Array.isArray(payload.designModel.sections)) throw new Error('designModel.sections missing.');
  if (!Array.isArray(payload.designModel.elements)) throw new Error('designModel.elements missing.');
  if (!Array.isArray(payload.designModel.assets)) throw new Error('designModel.assets missing.');
}

function renderSourceReference(payload, width) {
  var source = payload.source || {};
  var shot = source.screenshot;
  var ratio = shot && shot.width ? (shot.height || 1600) / shot.width : 1.4;
  var ref = frame('02 Screenshot Reference / Pure Source', width, Math.max(640, Math.round(width * ratio)), '#FFFFFF');
  ref.clipsContent = true;
  if (shot && shot.base64) {
    var img = figma.createImage(base64ToBytes(shot.base64));
    var node = figma.createRectangle();
    node.name = 'Locked Screenshot';
    node.resize(ref.width, ref.height);
    node.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
    node.strokes = [];
    try { node.locked = true; } catch (_) {}
    ref.appendChild(node);
  }
  return ref;
}

function findAsset(assets, assetId) {
  for (var i = 0; i < assets.length; i += 1) {
    if (assets[i].id === assetId) return assets[i];
  }
  return null;
}

function renderElement(sectionFrame, element, assets, sectionRect, scale) {
  var r = scaleRect(element.rect, scale);
  var x = r.x - sectionRect.x;
  var y = r.y - sectionRect.y;
  var style = element.style || {};
  var radius = clamp((style.borderRadius || 0) * scale, 0, 28);
  if (element.type === 'image') {
    var asset = findAsset(assets, element.assetId);
    return image(sectionFrame, element.name || 'Image', asset, x, y, r.w, r.h, radius);
  }
  if (element.type === 'button') {
    var group = frame(element.name || 'Button', r.w, Math.max(28, r.h), '');
    group.x = x;
    group.y = y;
    group.clipsContent = false;
    rect(group, 'Button Surface', 0, 0, r.w, Math.max(28, r.h), style.backgroundColor || '#111827', radius || 18, '');
    text(group, 'Button Label', element.text, 14, Math.max(7, r.h * 0.28), clamp((style.fontSize || 14) * scale, 8, 18), style.color || '#FFFFFF', Math.max(24, r.w - 28), style.fontWeight || 600);
    sectionFrame.appendChild(group);
    return group;
  }
  if (element.type === 'container') {
    return rect(sectionFrame, element.name || 'Container', x, y, r.w, r.h, style.backgroundColor || '#FFFFFF', radius, '#EEF0F3');
  }
  return text(sectionFrame, element.name || 'Text', element.text, x, y, clamp((style.fontSize || 14) * scale, 7, 42), style.color || '#111827', Math.max(30, r.w + 8), style.fontWeight || 400);
}

function renderDesignModel(payload) {
  var model = payload.designModel;
  var sourceWidth = model.page.width || 1440;
  var targetWidth = 1280;
  var scale = targetWidth / sourceWidth;
  var targetHeight = Math.max(900, Math.round((model.page.height || 1600) * scale));
  var root = frame('01 UI Library / Editable Website Reconstruction', targetWidth, targetHeight, model.page.background || '#FFFFFF');
  root.clipsContent = true;

  var assets = arr(model.assets);
  var elements = arr(model.elements);
  var sections = arr(model.sections).slice().sort(function(a, b) {
    return get(a.rect, 'y', 0) - get(b.rect, 'y', 0);
  });

  for (var i = 0; i < sections.length; i += 1) {
    var section = sections[i];
    var sr = scaleRect(section.rect, scale);
    var sf = frame('Section / ' + (section.name || section.role), targetWidth, Math.max(40, sr.h), '#FFFFFF');
    sf.x = 0;
    sf.y = sr.y;
    sf.clipsContent = true;
    try { sf.layoutMode = 'NONE'; } catch (_) {}
    if (section.role === 'footer') sf.fills = paint('#F7F8FA');
    if (section.role === 'header') sf.fills = paint('#FFFFFF');
    if (section.role === 'hero') sf.fills = paint('#FFFFFF');
    root.appendChild(sf);

    var childElements = elements.filter(function(item) { return item.sectionId === section.id; }).sort(function(a, b) {
      var order = { container: 0, image: 1, text: 2, button: 3 };
      return (order[a.type] || 4) - (order[b.type] || 4) || get(a.rect, 'y', 0) - get(b.rect, 'y', 0);
    });
    for (var j = 0; j < childElements.length; j += 1) renderElement(sf, childElements[j], assets, sr, scale);
  }

  return root;
}

async function importPayload(payload) {
  validatePayload(payload);
  await preparePage();
  var pageTitle = clean(payload.designModel.page.title || (payload.source && payload.source.title) || 'Website');
  var root = frame(pageTitle + ' / ' + new Date().toISOString().replace(/[:.]/g, '-'), 1440, 2400, '#FFFFFF');
  text(root, 'Run Title', pageTitle, 80, 30, 28, '#111827', 1200, 700);
  text(root, 'Run Note', PUBLIC_VERSION + ' / ' + ENGINE + ' / ' + ENGINE_BUILD + ' — clean editable UI Library reconstruction.', 80, 68, 12, '#667085', 1200, 400);

  var main = renderDesignModel(payload);
  main.x = 80;
  main.y = 112;
  root.appendChild(main);

  var ref = renderSourceReference(payload, 1280);
  ref.x = 80;
  ref.y = main.y + main.height + 80;
  root.resize(1440, ref.y + ref.height + 80);
  root.appendChild(ref);

  figma.currentPage.appendChild(root);
  figma.viewport.scrollAndZoomIntoView([main]);
  lastFrame = root;

  var audit = payload.audit ? ('\nVisual Readiness: ' + payload.audit.visualReadiness + '\nVisual Score: ' + payload.audit.score) : '';
  post('Import complete.\nEngine: ' + ENGINE + '\nEngine Build: ' + ENGINE_BUILD + '\nOutput: clean editable UI Library structure\nSections: ' + payload.designModel.sections.length + '\nElements: ' + payload.designModel.elements.length + '\nAssets: ' + payload.designModel.assets.length + audit);
}

function exportPackage() {
  figma.ui.postMessage({
    exportJson: JSON.stringify({
      publicVersion: PUBLIC_VERSION,
      engine: ENGINE,
      engineBuild: ENGINE_BUILD,
      workspace: PAGE_NAME,
      lastFrame: lastFrame ? lastFrame.name : null,
      exportedAt: new Date().toISOString(),
      rules: [
        'Render from designModel only.',
        'Screenshot source is reference only.',
        'Output must stay editable and UI Library structured.'
      ]
    }, null, 2)
  });
  post('Export package ready.\nEngine: ' + ENGINE + '\nLast Frame: ' + (lastFrame ? lastFrame.name : 'none'));
}

figma.ui.onmessage = async function(message) {
  try {
    if (message && message.type === 'import-design-model') return await importPayload(message.payload || {});
    if (message && message.type === 'export-ui-package') return exportPackage();
    post('Unsupported command: ' + (message && message.type));
  } catch (err) {
    var msg = err && err.message ? err.message : String(err);
    console.error(err);
    post('Plugin error: ' + msg);
  }
};

post('Clean renderer loaded.\nEngine: ' + ENGINE + '\nEngine Build: ' + ENGINE_BUILD);
