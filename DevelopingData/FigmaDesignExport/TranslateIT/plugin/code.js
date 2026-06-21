figma.showUI(__html__, { width: 580, height: 860 });

const PUBLIC_VERSION = 'Version 0.1 - Alpha';
const ENGINE = 'translateit-core';
const ENGINE_BUILD = 'alpha-clean-1';
const PAGE_NAME = 'TranslateIT Import / Clean Engine';

let regular = { family: 'Inter', style: 'Regular' };
let bold = { family: 'Inter', style: 'Bold' };
let lastFrame = null;

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const layerName = (value) => (clean(value) || 'Layer').slice(0, 90);
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

function post(text) {
  figma.ui.postMessage({ type: 'status', text });
}

function hexToRgb(hex) {
  const raw = /^#[0-9a-fA-F]{6}$/.test(hex || '') ? hex.slice(1) : '111827';
  const num = parseInt(raw, 16);
  return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 };
}

function paint(hex) {
  return [{ type: 'SOLID', color: hexToRgb(hex || '#111827') }];
}

function base64ToBytes(value) {
  const binary = atob(value || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
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
  let page = figma.root.children.find((item) => item.name === PAGE_NAME);
  if (!page) page = figma.createPage();
  page.name = PAGE_NAME;
  await figma.setCurrentPageAsync(page);
  return page;
}

function frame(name, w, h, fill) {
  const node = figma.createFrame();
  node.name = layerName(name);
  node.resize(Math.max(1, w), Math.max(1, h));
  node.fills = fill ? paint(fill) : [];
  node.strokes = [];
  node.clipsContent = false;
  return node;
}

function rect(parent, name, x, y, w, h, fill, radius, stroke) {
  const node = figma.createRectangle();
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
  const node = figma.createText();
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
  const node = figma.createRectangle();
  node.name = layerName(name);
  node.x = x;
  node.y = y;
  node.resize(Math.max(1, w), Math.max(1, h));
  node.cornerRadius = radius || 0;
  node.strokes = [];
  if (asset && asset.base64) {
    const img = figma.createImage(base64ToBytes(asset.base64));
    node.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
  } else {
    node.fills = paint('#E5E7EB');
  }
  parent.appendChild(node);
  return node;
}

function scaleRect(sourceRect, scale) {
  const r = sourceRect || {};
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
  const shot = payload.source && payload.source.screenshot;
  const ratio = shot && shot.width ? (shot.height || 1600) / shot.width : 1.4;
  const ref = frame('02 Screenshot Reference / Pure Source', width, Math.max(640, Math.round(width * ratio)), '#FFFFFF');
  ref.clipsContent = true;
  if (shot && shot.base64) {
    const img = figma.createImage(base64ToBytes(shot.base64));
    const node = figma.createRectangle();
    node.name = 'Locked Screenshot';
    node.resize(ref.width, ref.height);
    node.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
    node.strokes = [];
    try { node.locked = true; } catch (_) {}
    ref.appendChild(node);
  }
  return ref;
}

function renderElement(sectionFrame, element, assets, sectionRect, scale) {
  const r = scaleRect(element.rect, scale);
  const x = r.x - sectionRect.x;
  const y = r.y - sectionRect.y;
  const style = element.style || {};
  const radius = clamp((style.borderRadius || 0) * scale, 0, 28);
  if (element.type === 'image') {
    const asset = assets.find((item) => item.id === element.assetId);
    return image(sectionFrame, element.name || 'Image', asset, x, y, r.w, r.h, radius);
  }
  if (element.type === 'button') {
    const group = frame(element.name || 'Button', r.w, Math.max(28, r.h), '');
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
  const model = payload.designModel;
  const sourceWidth = model.page.width || 1440;
  const targetWidth = 1280;
  const scale = targetWidth / sourceWidth;
  const targetHeight = Math.max(900, Math.round((model.page.height || 1600) * scale));
  const root = frame('01 UI Library / Editable Website Reconstruction', targetWidth, targetHeight, model.page.background || '#FFFFFF');
  root.clipsContent = true;

  const assets = arr(model.assets);
  const elements = arr(model.elements);
  const sections = arr(model.sections).sort((a, b) => (a.rect?.y || 0) - (b.rect?.y || 0));

  for (const section of sections) {
    const sr = scaleRect(section.rect, scale);
    const sf = frame(`Section / ${section.name || section.role}`, targetWidth, Math.max(40, sr.h), '#FFFFFF');
    sf.x = 0;
    sf.y = sr.y;
    sf.clipsContent = true;
    sf.layoutMode = 'NONE';
    if (section.role === 'footer') sf.fills = paint('#F7F8FA');
    if (section.role === 'header') sf.fills = paint('#FFFFFF');
    if (section.role === 'hero') sf.fills = paint('#FFFFFF');
    root.appendChild(sf);

    const childElements = elements.filter((item) => item.sectionId === section.id).sort((a, b) => {
      const order = { container: 0, image: 1, text: 2, button: 3 };
      return (order[a.type] || 4) - (order[b.type] || 4) || (a.rect?.y || 0) - (b.rect?.y || 0);
    });
    for (const element of childElements) renderElement(sf, element, assets, sr, scale);
  }

  return root;
}

async function importPayload(payload) {
  validatePayload(payload);
  await preparePage();
  const pageTitle = clean(payload.designModel.page.title || payload.source?.title || 'Website');
  const root = frame(`${pageTitle} / ${new Date().toISOString().replace(/[:.]/g, '-')}`, 1440, 2400, '#FFFFFF');
  text(root, 'Run Title', pageTitle, 80, 30, 28, '#111827', 1200, 700);
  text(root, 'Run Note', `${PUBLIC_VERSION} / ${ENGINE} / ${ENGINE_BUILD} — clean editable UI Library reconstruction.`, 80, 68, 12, '#667085', 1200, 400);

  const main = renderDesignModel(payload);
  main.x = 80;
  main.y = 112;
  root.appendChild(main);

  const ref = renderSourceReference(payload, 1280);
  ref.x = 80;
  ref.y = main.y + main.height + 80;
  root.resize(1440, ref.y + ref.height + 80);
  root.appendChild(ref);

  figma.currentPage.appendChild(root);
  figma.viewport.scrollAndZoomIntoView([main]);
  lastFrame = root;

  const audit = payload.audit ? `\nVisual Readiness: ${payload.audit.visualReadiness}\nVisual Score: ${payload.audit.score}` : '';
  post(`Import complete.\nEngine: ${ENGINE}\nEngine Build: ${ENGINE_BUILD}\nOutput: clean editable UI Library structure\nSections: ${payload.designModel.sections.length}\nElements: ${payload.designModel.elements.length}\nAssets: ${payload.designModel.assets.length}${audit}`);
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
  post(`Export package ready.\nEngine: ${ENGINE}\nLast Frame: ${lastFrame ? lastFrame.name : 'none'}`);
}

figma.ui.onmessage = async (message) => {
  try {
    if (message && message.type === 'import-design-model') return await importPayload(message.payload || {});
    if (message && message.type === 'export-ui-package') return exportPackage();
    post(`Unsupported command: ${message && message.type}`);
  } catch (err) {
    post(`Plugin error: ${err && err.message ? err.message : err}`);
  }
};
