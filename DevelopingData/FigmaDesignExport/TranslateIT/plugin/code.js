figma.showUI(__html__, { width: 580, height: 860 });

const PAGE_NAME = 'TranslateIT Import / Workspace';
const VERSION = 'universal-page-adapter-v11-design-clone';
let lastRun = null;
let lastDiagnostics = null;
let lastImportMeta = null;
let regular = { family: 'Inter', style: 'Regular' };
let bold = { family: 'Inter', style: 'Bold' };

function send(text, extra) {
  const msg = { type: 'status', text };
  extra = extra || {};
  Object.keys(extra).forEach((key) => { msg[key] = extra[key]; });
  figma.ui.postMessage(msg);
}

async function loadFonts() {
  try { await figma.loadFontAsync(regular); } catch (_) { regular = { family: 'Roboto', style: 'Regular' }; await figma.loadFontAsync(regular); }
  try { await figma.loadFontAsync(bold); } catch (_) { bold = regular; }
}

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function safe(value) { return clean(value || 'Layer').slice(0, 96) || 'Layer'; }
function key(value) { return clean(value).toLowerCase(); }
function px(value, fallback) { const m = String(value || '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : fallback; }
function rgb(hex) { const n = parseInt(/^#[\da-fA-F]{6}$/.test(hex || '') ? hex.slice(1) : '111827', 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; }
function paint(hex) { return [{ type: 'SOLID', color: rgb(hex || '#111827') }]; }
function cssColor(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return fallback || '';
  const hex = raw.match(/#[\da-fA-F]{6}|#[\da-fA-F]{3}/);
  if (hex) return hex[0].length === 4 ? '#' + hex[0][1] + hex[0][1] + hex[0][2] + hex[0][2] + hex[0][3] + hex[0][3] : hex[0];
  const rgba = raw.match(/rgba?\(([^)]+)\)/);
  if (!rgba) return fallback || '';
  const parts = rgba[1].split(',').map((x) => parseFloat(x));
  if (parts.length < 3 || (parts.length >= 4 && parts[3] === 0)) return fallback || '';
  return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
}
function decodeBase64(value) { const raw = atob(value); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i); return out; }
function unique(items, fn, limit) {
  const seen = {};
  const out = [];
  (items || []).forEach((item) => { const k = fn(item); if (!k || seen[k] || (limit && out.length >= limit)) return; seen[k] = true; out.push(item); });
  return out;
}
function textValue(layer) { return clean(layer && (layer.text || layer.name || '')); }
function styleKey(layer) { const s = layer.style || {}; return [layer.role || layer.type, s.fontSize || '', s.fontWeight || '', s.color || ''].join('|'); }
function collectColors(layers) {
  const colors = [];
  (layers || []).forEach((layer) => {
    const s = layer.style || {};
    [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor].forEach((value) => {
      const color = cssColor(value, '');
      if (color && colors.indexOf(color) < 0) colors.push(color);
    });
  });
  return colors.slice(0, 20);
}

async function workspacePage() {
  let page = null;
  for (let i = 0; i < figma.root.children.length; i += 1) if (figma.root.children[i].name === PAGE_NAME) page = figma.root.children[i];
  if (!page) page = figma.createPage();
  page.name = PAGE_NAME;
  await figma.setCurrentPageAsync(page);
  return page;
}

function frame(name, w, h, fill) {
  const node = figma.createFrame();
  node.name = safe(name);
  node.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h || 100)));
  node.fills = fill ? paint(fill) : [];
  node.strokes = [];
  node.clipsContent = false;
  return node;
}
function autoFrame(name, w, fill, gap, padding) {
  const node = frame(name, w, 100, fill);
  node.layoutMode = 'VERTICAL';
  node.primaryAxisSizingMode = 'AUTO';
  node.counterAxisSizingMode = 'FIXED';
  node.itemSpacing = gap == null ? 16 : gap;
  node.paddingTop = padding == null ? 24 : padding;
  node.paddingRight = padding == null ? 24 : padding;
  node.paddingBottom = padding == null ? 24 : padding;
  node.paddingLeft = padding == null ? 24 : padding;
  return node;
}
function component(name, w, h, fill) {
  const node = figma.createComponent();
  node.name = safe(name);
  node.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  node.fills = fill ? paint(fill) : [];
  node.strokes = [];
  node.clipsContent = true;
  return node;
}
function text(name, value, size, color, isBold, width) {
  const node = figma.createText();
  node.name = safe(name);
  node.fontName = isBold ? bold : regular;
  node.characters = String(value || ' ');
  node.fontSize = size || 12;
  node.fills = paint(color || '#111827');
  try { node.textAutoResize = 'HEIGHT'; node.resize(width || 720, Math.max(18, (size || 12) * 1.5)); } catch (_) {}
  return node;
}
function placeText(parent, name, value, x, y, size, color, isBold, width) {
  const node = text(name, value, size, color, isBold, width || 180);
  node.x = x || 0;
  node.y = y || 0;
  parent.appendChild(node);
  return node;
}
function rect(parent, name, x, y, w, h, fill, radius, stroke) {
  const node = figma.createRectangle();
  node.name = safe(name);
  node.x = x || 0;
  node.y = y || 0;
  node.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  node.cornerRadius = radius == null ? 12 : radius;
  node.fills = paint(fill || '#FFFFFF');
  node.strokes = stroke ? paint(stroke) : [];
  node.strokeWeight = stroke ? 1 : 0;
  parent.appendChild(node);
  return node;
}
function imagePreview(parent, layer, x, y, w, h) {
  const node = figma.createRectangle();
  node.name = safe('Image Preview / ' + clean(layer && layer.name || 'Media'));
  node.x = x || 0;
  node.y = y || 0;
  node.resize(w, h);
  node.cornerRadius = 14;
  node.strokes = [];
  if (layer && layer.image && layer.image.base64) {
    const img = figma.createImage(decodeBase64(layer.image.base64));
    node.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
  } else {
    node.fills = paint('#E5E7EB');
  }
  parent.appendChild(node);
  return node;
}

function makeScreenshotFrame(payload, width) {
  const ratio = payload.screenshot && payload.screenshot.width ? (payload.screenshot.height || 1600) / payload.screenshot.width : 1.4;
  const h = Math.max(640, Math.min(9000, Math.round(width * ratio)));
  const f = frame('01 Screenshot Preview / Pure Reference', width, h, '#FFFFFF');
  f.clipsContent = true;
  if (payload.screenshot && payload.screenshot.base64) {
    const img = figma.createImage(decodeBase64(payload.screenshot.base64));
    const shot = figma.createRectangle();
    shot.name = 'Pure Screenshot Reference / no overlay';
    shot.resize(width, h);
    shot.x = 0;
    shot.y = 0;
    shot.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
    shot.strokes = [];
    try { shot.locked = true; } catch (_) {}
    f.appendChild(shot);
  }
  return f;
}

function inferIntent(section, index) {
  if ((section.role || '') === 'header') return 'Navigation / Header';
  if ((section.role || '') === 'footer') return 'Footer';
  const content = ((section.layers || []).filter((l) => l.type === 'text').map(textValue).join(' ') || '').toLowerCase();
  if (index === 1 || /hero|welcome|discover|unlock|introducing|creative/.test(content)) return 'Hero / Landing Intro';
  if (/project|portfolio|gallery|work|case/.test(content)) return 'Gallery / Card Grid';
  if (/about|team|culture|mission|story/.test(content)) return 'Content / About';
  return 'Content Section';
}
function buildPlan(payload, layers, sections) {
  const textLayers = layers.filter((l) => l.type === 'text');
  const imageLayers = layers.filter((l) => l.type === 'image');
  const buttonLayers = layers.filter((l) => l.role === 'button-bg' || l.role === 'button-label');
  const colors = collectColors(layers);
  const textStyles = unique(textLayers, styleKey, 18);
  return {
    title: clean(payload.title || 'Website Design Clone'),
    url: payload.url || '',
    summary: 'Design clone generated as clean Figma structure. Raw browser-coordinate reconstruction is intentionally avoided.',
    tokens: { colors, textStyles },
    counts: { sections: sections.length, text: textLayers.length, images: imageLayers.length, buttons: buttonLayers.length },
    sections: (sections || []).slice(0, 12).map((section, index) => ({
      name: section.name || ('Section ' + (index + 1)),
      intent: inferIntent(section, index),
      textCount: (section.layers || []).filter((l) => l.type === 'text').length,
      imageCount: (section.layers || []).filter((l) => l.type === 'image').length,
      componentCount: (section.components || []).length,
      confidence: Math.min(0.95, 0.45 + Math.min((section.layers || []).length, 20) / 40 + Math.min((section.components || []).length, 6) / 18)
    }))
  };
}

function makePlanFrame(plan) {
  const f = autoFrame('02 Rebuild Plan / AI Interpretation', 1280, '#FFFFFF', 20, 32);
  f.cornerRadius = 24;
  f.strokes = paint('#E5E7EB');
  f.strokeWeight = 1;
  f.appendChild(text('Plan Title', 'Rebuild Plan / AI Interpretation', 30, '#111827', true, 1160));
  f.appendChild(text('Plan Summary', plan.summary, 13, '#64748B', false, 1160));
  f.appendChild(text('Plan Counts', 'Sections: ' + plan.counts.sections + '  •  Text: ' + plan.counts.text + '  •  Images: ' + plan.counts.images + '  •  Buttons: ' + plan.counts.buttons, 13, '#2563EB', true, 1160));

  const grid = frame('Section Plan Grid', 1180, Math.ceil(Math.max(1, plan.sections.length) / 3) * 132, null);
  grid.fills = [];
  plan.sections.forEach((section, index) => {
    const card = frame('Plan Card / ' + section.name, 372, 116, '#F8FAFC');
    card.cornerRadius = 18;
    card.strokes = paint('#E5E7EB');
    card.strokeWeight = 1;
    card.x = (index % 3) * 394;
    card.y = Math.floor(index / 3) * 132;
    placeText(card, 'Section Name', section.name, 18, 16, 14, '#111827', true, 330);
    placeText(card, 'Intent', section.intent, 18, 42, 11, '#64748B', false, 330);
    placeText(card, 'Meta', 'text ' + section.textCount + ' / image ' + section.imageCount + ' / comp ' + section.componentCount + ' / confidence ' + Math.round(section.confidence * 100) + '%', 18, 70, 10, '#2563EB', true, 330);
    grid.appendChild(card);
  });
  f.appendChild(grid);
  return f;
}

function createPaintStyles(title, colors) {
  const created = [];
  colors.forEach((hex, index) => {
    try {
      const style = figma.createPaintStyle();
      style.name = 'TranslateIT/' + safe(title) + '/Color ' + String(index + 1).padStart(2, '0') + ' ' + hex;
      style.paints = paint(hex);
      created.push(style.name);
    } catch (_) {}
  });
  return created;
}
function createTextStyles(title, textStyles) {
  const created = [];
  textStyles.forEach((layer, index) => {
    try {
      const s = layer.style || {};
      const style = figma.createTextStyle();
      style.name = 'TranslateIT/' + safe(title) + '/Text ' + String(index + 1).padStart(2, '0') + ' ' + (layer.role || 'text');
      style.fontName = /bold|600|700|800|900/i.test(String(s.fontWeight || '')) || layer.role === 'heading' ? bold : regular;
      style.fontSize = Math.max(8, px(s.fontSize, layer.role === 'heading' ? 30 : 14));
      style.fills = paint(cssColor(s.color, '#111827'));
      created.push(style.name);
    } catch (_) {}
  });
  return created;
}

function tokenComponent(hex, index) {
  const c = component('Color Token / ' + String(index + 1).padStart(2, '0'), 156, 92, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  rect(c, 'Swatch', 16, 16, 124, 34, hex, 10);
  placeText(c, 'Hex', hex, 16, 58, 11, '#111827', true, 124);
  return c;
}
function typeComponent(layer, index) {
  const s = layer.style || {};
  const fs = Math.min(18, Math.max(11, px(s.fontSize, 14) * 0.75));
  const c = component('Typography Token / ' + String(index + 1).padStart(2, '0'), 224, 108, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  placeText(c, 'Type Meta', (layer.role || 'text') + ' / ' + (s.fontSize || 'size'), 16, 14, 11, '#64748B', true, 190);
  placeText(c, 'Sample', textValue(layer).slice(0, 34) || 'Sample Text', 16, 48, fs, '#111827', /bold|600|700|800|900/i.test(String(s.fontWeight || '')), 190);
  return c;
}
function navComponent(layer, index) {
  const c = component('Navigation Item / ' + String(index + 1).padStart(2, '0'), 192, 72, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  placeText(c, 'Nav Label', textValue(layer).slice(0, 28) || 'Nav Item', 18, 24, 13, '#111827', true, 154);
  return c;
}
function buttonComponent(layer, index) {
  const c = component('Button / CTA ' + String(index + 1).padStart(2, '0'), 192, 78, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  rect(c, 'Button Shape', 18, 22, 140, 34, '#2563EB', 17);
  placeText(c, 'Button Label', textValue(layer).slice(0, 18) || 'Button', 32, 31, 12, '#FFFFFF', true, 112);
  return c;
}
function mediaComponent(layer, index) {
  const c = component('Media Component / ' + String(index + 1).padStart(2, '0'), 224, 156, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  imagePreview(c, layer, 16, 16, 96, 72);
  placeText(c, 'Media Name', clean(layer.name || 'Image').slice(0, 28), 16, 100, 12, '#111827', true, 190);
  const r = layer.rect || {};
  placeText(c, 'Media Size', Math.round(r.w || 0) + '×' + Math.round(r.h || 0), 16, 122, 10, '#64748B', false, 190);
  return c;
}
function sectionComponent(section, index) {
  const c = component('Section Component / ' + String(index + 1).padStart(2, '0'), 240, 112, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  placeText(c, 'Section Name', section.name || 'Section', 16, 16, 13, '#111827', true, 204);
  placeText(c, 'Intent', inferIntent(section, index), 16, 40, 10, '#64748B', false, 204);
  rect(c, 'Preview Strip', 16, 72, 160, 18, '#EEF2FF', 9);
  return c;
}
function appendGrid(parent, title, items, factory, cols, cardW, cardH) {
  const section = autoFrame(title, 1180, null, 12, 0);
  section.fills = [];
  section.appendChild(text('Library Group Title', title, 18, '#111827', true, 1160));
  const rows = Math.ceil(Math.max(1, items.length) / cols);
  const grid = frame(title + ' Grid', 1180, rows * (cardH + 16), null);
  grid.fills = [];
  items.forEach((item, index) => {
    const node = factory(item, index);
    node.x = (index % cols) * (cardW + 16);
    node.y = Math.floor(index / cols) * (cardH + 16);
    grid.appendChild(node);
  });
  section.appendChild(grid);
  parent.appendChild(section);
}
function makeLibraryFrame(plan, layers, sections) {
  const textLayers = layers.filter((l) => l.type === 'text');
  const imageLayers = layers.filter((l) => l.type === 'image').slice(0, 20);
  const links = unique(textLayers.filter((l) => l.role === 'link'), (l) => key(textValue(l)), 24);
  const buttons = unique(layers.filter((l) => l.role === 'button-label' || l.role === 'button-bg'), (l) => key(textValue(l) || l.name || l.path), 18);
  const lib = autoFrame('03 UI Components / Structured Library', 1280, '#F7F8FB', 28, 32);
  lib.appendChild(text('Library Title', 'Structured UI Library', 30, '#111827', true, 1160));
  lib.appendChild(text('Library Note', 'Clean component groups. No raw website-coordinate fragments. Every item is generated as a readable design component.', 12, '#64748B', false, 1160));
  appendGrid(lib, 'Color Tokens', plan.tokens.colors.length ? plan.tokens.colors : ['#111827', '#F8FAFC', '#2563EB'], tokenComponent, 7, 156, 92);
  appendGrid(lib, 'Typography Tokens', plan.tokens.textStyles.length ? plan.tokens.textStyles : textLayers.slice(0, 6), typeComponent, 5, 224, 108);
  appendGrid(lib, 'Navigation Components', links.length ? links : textLayers.slice(0, 6), navComponent, 6, 192, 72);
  appendGrid(lib, 'Button / CTA Components', buttons, buttonComponent, 6, 192, 78);
  appendGrid(lib, 'Media Components', imageLayers, mediaComponent, 5, 224, 156);
  appendGrid(lib, 'Section Components', sections.slice(0, 12), sectionComponent, 5, 240, 112);
  return lib;
}

function makeEditableResultFrame(payload, sections, layers) {
  const f = autoFrame('04 Editable Result / Clean Structured Draft', 1280, '#FFFFFF', 28, 40);
  f.appendChild(text('Editable Title', payload.title || 'Editable Design Draft', 30, '#111827', true, 1180));
  f.appendChild(text('Editable Note', 'Clean editable section draft generated from content and rebuild plan. This intentionally avoids chaotic raw coordinate reconstruction.', 12, '#64748B', false, 1180));
  const globalImages = layers.filter((l) => l.type === 'image');
  sections.slice(0, 10).forEach((section, index) => {
    const block = autoFrame((section.name || 'Section') + ' / Editable Block', 1180, '#FFFFFF', 16, 24);
    block.cornerRadius = 24;
    block.strokes = paint('#E5E7EB');
    block.strokeWeight = 1;
    block.appendChild(text('Block Title', section.name || 'Section', 19, '#111827', true, 1100));
    block.appendChild(text('Block Intent', inferIntent(section, index), 11, '#2563EB', true, 1100));
    const content = frame('Editable Content Layout', 1132, 230, null);
    content.fills = [];
    const textCol = autoFrame('Editable Text Column', 650, null, 10, 0);
    textCol.fills = [];
    textCol.x = 0;
    textCol.y = 0;
    const sectionTexts = unique((section.layers || []).filter((l) => l.type === 'text'), (l) => key(textValue(l)), 8);
    sectionTexts.forEach((layer) => {
      const s = layer.style || {};
      const fontSize = Math.min(28, Math.max(12, px(s.fontSize, layer.role === 'heading' ? 24 : 14)));
      textCol.appendChild(text((layer.role || 'Text') + ' Layer', textValue(layer).slice(0, 140), fontSize, cssColor(s.color, '#111827'), layer.role === 'heading' || /bold|600|700|800|900/i.test(String(s.fontWeight || '')), 620));
    });
    if (!sectionTexts.length) textCol.appendChild(text('Empty Text Note', 'No readable text detected for this section.', 12, '#94A3B8', false, 620));
    content.appendChild(textCol);
    const mediaCol = frame('Editable Media Column', 420, 190, null);
    mediaCol.fills = [];
    mediaCol.x = 700;
    mediaCol.y = 0;
    const sectionImages = (section.layers || []).filter((l) => l.type === 'image').slice(0, 2);
    (sectionImages.length ? sectionImages : globalImages.slice(index, index + 1)).slice(0, 2).forEach((img, imgIndex) => imagePreview(mediaCol, img, imgIndex * 210, 0, 196, 148));
    content.appendChild(mediaCol);
    block.appendChild(content);
    f.appendChild(block);
  });
  return f;
}

function makeAuditFrame(diag) {
  const f = autoFrame('05 Audit / Design Clone Notes', 1280, '#0B1020', 14, 32);
  f.appendChild(text('Audit Title', 'Design Clone Audit', 28, '#F8FAFC', true, 1160));
  f.appendChild(text('Audit Note', 'V11 focuses on clean design structure: pure reference, rebuild plan, structured library, editable draft, and audit. Raw coordinate dumps are not allowed.', 13, '#CBD5E1', false, 1160));
  f.appendChild(text('Audit Diagnostics', 'sections: ' + diag.sectionCount + ' / layers: ' + diag.layerCount + ' / images: ' + diag.imageCount + ' / text: ' + diag.textCount + ' / colors: ' + diag.colorTokenCount + ' / type styles: ' + diag.textStyleCount, 14, '#93C5FD', true, 1160));
  f.appendChild(text('Audit Frame Order', '01 Screenshot Preview / Pure Reference\n02 Rebuild Plan / AI Interpretation\n03 UI Components / Structured Library\n04 Editable Result / Clean Structured Draft\n05 Audit / Design Clone Notes', 13, '#E5E7EB', false, 1160));
  return f;
}

async function importUniversal(payload) {
  await loadFonts();
  if (!payload || !/^universal-page-adapter-v[1-9]/.test(String(payload.mode || ''))) throw new Error('Expected Universal Page Adapter payload.');
  const page = await workspacePage();
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  if (!layers.length && !sections.length && !(payload.screenshot && payload.screenshot.base64)) throw new Error('No visible page data found.');
  const plan = buildPlan(payload, layers, sections);
  const paintStyles = createPaintStyles(payload.title || 'Website', plan.tokens.colors);
  const textStyles = createTextStyles(payload.title || 'Website', plan.tokens.textStyles);
  const d = payload.diagnostics || {};
  lastDiagnostics = {
    layerCount: d.layerCount || layers.length,
    sectionCount: d.sectionCount || sections.length,
    componentCount: d.componentCount || 0,
    imageCount: d.imageCount || layers.filter((l) => l.type === 'image').length,
    textCount: d.textCount || layers.filter((l) => l.type === 'text').length,
    colorTokenCount: plan.tokens.colors.length,
    textStyleCount: plan.tokens.textStyles.length,
    paintStyleCount: paintStyles.length,
    figmaTextStyleCount: textStyles.length,
    outputMode: VERSION
  };
  lastImportMeta = { title: payload.title || '', url: payload.url || '', adapterMode: payload.mode || '', pluginOutputMode: VERSION };

  const run = autoFrame(safe((payload.title || 'Website Design Clone') + ' / ' + new Date().toISOString().replace(/[:.]/g, '-')), 1440, '#030407', 30, 40);
  run.appendChild(text('Run Title', payload.title || 'Website Design Clone', 30, '#F8FAFC', true, 1320));
  run.appendChild(text('Run Note', 'V11 Design Clone: pure screenshot, rebuild plan, structured UI library, clean editable draft, audit.', 12, '#8D96A6', false, 1320));
  run.appendChild(makeScreenshotFrame(payload, 1280));
  run.appendChild(makePlanFrame(plan));
  run.appendChild(makeLibraryFrame(plan, layers, sections));
  run.appendChild(makeEditableResultFrame(payload, sections, layers));
  run.appendChild(makeAuditFrame(lastDiagnostics));

  page.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([run]);
  lastRun = run;
  send('Import complete.\nMode: V11 Design Clone Structure\nOutput page: ' + PAGE_NAME + '\nScreenshot preview: pure image only\nRebuild Plan: generated\nUI Library: structured clean grid\nEditable Result: clean draft, no raw dump\nSections: ' + lastDiagnostics.sectionCount + '\nColors: ' + lastDiagnostics.colorTokenCount + '\nText styles: ' + lastDiagnostics.textStyleCount + '\nReview frames 01–05.');
}

function exportPackage() {
  if (!lastRun) return send('No import run found. Import Data first.');
  send('Export complete.', { exportJson: JSON.stringify({ schema: 'translateit.design-clone.v11', pluginVersion: VERSION, generatedAt: new Date().toISOString(), source: lastImportMeta || {}, diagnostics: lastDiagnostics || {} }, null, 2) });
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
