figma.showUI(__html__, { width: 580, height: 860 });

const PAGE_NAME = 'TranslateIT Import / Workspace';
const VERSION = 'universal-page-adapter-v9';
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
    if (parts.length >= 3 && !(parts.length >= 4 && parts[3] === 0)) {
      return '#' + parts.slice(0, 3).map(function (n) { return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0'); }).join('');
    }
  }
  return fallback || null;
}
function decodeBase64(value) { const raw = atob(value); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i); return out; }
function key(value) { return clean(value).toLowerCase(); }
function unique(items, fn, limit) {
  const seen = {};
  const out = [];
  items.forEach(function (item) {
    const k = fn(item);
    if (!k || seen[k] || (limit && out.length >= limit)) return;
    seen[k] = true;
    out.push(item);
  });
  return out;
}
function styleKey(layer) {
  const s = layer.style || {};
  return [layer.role || layer.type, s.fontSize || '', s.fontWeight || '', s.color || '', s.backgroundColor || '', s.borderRadius || ''].join('|');
}
function collectColors(layers) {
  const out = [];
  (layers || []).forEach(function (layer) {
    const s = layer.style || {};
    [s.color, s.backgroundColor, s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor].forEach(function (value) {
      const hex = cssColor(value, null);
      if (hex && out.indexOf(hex) < 0) out.push(hex);
    });
  });
  return out.slice(0, 24);
}
function textContent(layer) { return clean(layer && (layer.text || layer.name || '')); }
function imageName(layer) { return clean(layer && (layer.name || layer.alt || 'Image')); }

async function workspacePage() {
  let page = null;
  for (let i = 0; i < figma.root.children.length; i += 1) if (figma.root.children[i].name === PAGE_NAME) page = figma.root.children[i];
  if (!page) page = figma.createPage();
  page.name = PAGE_NAME;
  await figma.setCurrentPageAsync(page);
  return page;
}

function makeFrame(name, w, h, fill) {
  const frame = figma.createFrame();
  frame.name = safe(name);
  frame.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  frame.layoutMode = 'NONE';
  frame.clipsContent = false;
  frame.fills = fill ? paint(fill) : [];
  frame.strokes = [];
  return frame;
}

function makeAutoFrame(name, w, fill, direction, gap, padding) {
  const frame = makeFrame(name, w, 100, fill);
  frame.layoutMode = direction || 'VERTICAL';
  frame.itemSpacing = gap == null ? 12 : gap;
  frame.paddingTop = padding == null ? 20 : padding;
  frame.paddingRight = padding == null ? 20 : padding;
  frame.paddingBottom = padding == null ? 20 : padding;
  frame.paddingLeft = padding == null ? 20 : padding;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'FIXED';
  return frame;
}

function makeComponent(name, w, h, fill) {
  const component = figma.createComponent();
  component.name = safe(name);
  component.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  component.layoutMode = 'NONE';
  component.clipsContent = true;
  component.fills = fill ? paint(fill) : [];
  component.strokes = [];
  return component;
}

function label(name, value, size, color, isBold) {
  const text = figma.createText();
  text.name = safe(name);
  text.fontName = font(!!isBold);
  text.characters = String(value || ' ');
  text.fontSize = size || 12;
  text.fills = paint(color || '#111827');
  try { text.textAutoResize = 'HEIGHT'; text.resize(720, Math.max(18, (size || 12) * 1.5)); } catch (_) {}
  return text;
}

function placeText(parent, name, value, x, y, size, color, isBold, maxWidth) {
  const text = label(name, value, size, color, isBold);
  text.x = x || 0;
  text.y = y || 0;
  try { text.resize(maxWidth || 160, Math.max(18, (size || 12) * 1.6)); } catch (_) {}
  parent.appendChild(text);
  return text;
}

function roundedRect(parent, name, x, y, w, h, fill, radius, stroke) {
  const rect = figma.createRectangle();
  rect.name = safe(name);
  rect.x = x || 0;
  rect.y = y || 0;
  rect.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  rect.cornerRadius = radius == null ? 12 : radius;
  rect.fills = paint(fill || '#FFFFFF');
  rect.strokes = stroke ? paint(stroke) : [];
  rect.strokeWeight = stroke ? 1 : 0;
  parent.appendChild(rect);
  return rect;
}

function addScreenshot(parent, payload, w, h, name) {
  if (!payload.screenshot || !payload.screenshot.base64) return null;
  const rect = figma.createRectangle();
  rect.name = safe(name || 'Pure Screenshot Reference');
  rect.resize(w, h);
  rect.x = 0;
  rect.y = 0;
  const image = figma.createImage(decodeBase64(payload.screenshot.base64));
  rect.fills = [{ type: 'IMAGE', imageHash: image.hash, scaleMode: 'FILL' }];
  rect.strokes = [];
  try { rect.locked = true; } catch (_) {}
  parent.appendChild(rect);
  return rect;
}

function createImagePreview(parent, layer, x, y, w, h, name) {
  const rect = figma.createRectangle();
  rect.name = safe(name || imageName(layer));
  rect.x = x || 0;
  rect.y = y || 0;
  rect.resize(w, h);
  rect.cornerRadius = 12;
  rect.strokes = [];
  if (layer && layer.image && layer.image.base64) {
    const img = figma.createImage(decodeBase64(layer.image.base64));
    rect.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
  } else {
    rect.fills = paint('#E5E7EB');
  }
  parent.appendChild(rect);
  return rect;
}

function createPaintStyles(title, colors) {
  const created = [];
  colors.forEach(function (hex, i) {
    try {
      const style = figma.createPaintStyle();
      style.name = 'TranslateIT/' + safe(title || 'Website') + '/Color ' + String(i + 1).padStart(2, '0') + ' ' + hex;
      style.paints = paint(hex);
      created.push(style.name);
    } catch (_) {}
  });
  return created;
}

function createTextStyles(title, styles) {
  const created = [];
  styles.forEach(function (layer, i) {
    try {
      const s = layer.style || {};
      const style = figma.createTextStyle();
      style.name = 'TranslateIT/' + safe(title || 'Website') + '/Text ' + String(i + 1).padStart(2, '0') + ' ' + (layer.role || 'text');
      style.fontName = /bold|600|700|800|900/i.test(String(s.fontWeight || '')) || layer.role === 'heading' ? bold : regular;
      style.fontSize = Math.max(8, px(s.fontSize, layer.role === 'heading' ? 32 : 14));
      style.fills = paint(cssColor(s.color, '#111827'));
      created.push(style.name);
    } catch (_) {}
  });
  return created;
}

function componentColor(hex, index) {
  const c = makeComponent('Color Token / ' + String(index + 1).padStart(2, '0') + ' / ' + hex, 150, 92, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  roundedRect(c, 'Swatch', 16, 16, 118, 34, hex, 10, null);
  placeText(c, 'Token Label', hex, 16, 58, 11, '#111827', true, 118);
  return c;
}

function componentTextStyle(layer, index) {
  const s = layer.style || {};
  const fs = Math.min(18, Math.max(11, px(s.fontSize, layer.role === 'heading' ? 24 : 14) * 0.75));
  const c = makeComponent('Text Style / ' + String(index + 1).padStart(2, '0') + ' / ' + (layer.role || 'text'), 210, 104, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  placeText(c, 'Style Name', (layer.role || 'text') + ' / ' + (s.fontSize || 'size'), 16, 14, 11, '#64748B', true, 174);
  placeText(c, 'Style Sample', textContent(layer).slice(0, 34) || 'Sample Text', 16, 44, fs, '#111827', /bold|600|700|800|900/i.test(String(s.fontWeight || '')), 174);
  return c;
}

function componentNav(layer, index) {
  const c = makeComponent('Navigation Item / ' + String(index + 1).padStart(2, '0'), 190, 72, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  placeText(c, 'Nav Label', textContent(layer).slice(0, 28) || 'Navigation Item', 18, 24, 13, '#111827', true, 154);
  return c;
}

function componentButton(layer, index) {
  const c = makeComponent('Button / CTA ' + String(index + 1).padStart(2, '0'), 190, 78, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  roundedRect(c, 'Button Shape', 18, 22, 136, 34, '#2563EB', 17, null);
  placeText(c, 'Button Label', textContent(layer).slice(0, 18) || 'Button', 32, 31, 12, '#FFFFFF', true, 110);
  return c;
}

function componentMedia(layer, index) {
  const c = makeComponent('Media Asset / ' + String(index + 1).padStart(2, '0'), 210, 150, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  createImagePreview(c, layer, 16, 16, 90, 68, 'Media Preview');
  placeText(c, 'Media Title', imageName(layer).slice(0, 26) || 'Image', 16, 96, 12, '#111827', true, 174);
  const r = layer.rect || {};
  placeText(c, 'Media Meta', Math.round(r.w || 0) + '×' + Math.round(r.h || 0), 16, 118, 10, '#64748B', false, 174);
  return c;
}

function componentSection(section, index) {
  const c = makeComponent('Section Component / ' + String(index + 1).padStart(2, '0'), 230, 108, '#FFFFFF');
  c.cornerRadius = 16;
  c.strokes = paint('#D9DEE8');
  c.strokeWeight = 1;
  placeText(c, 'Section Title', section.name || 'Section', 16, 16, 13, '#111827', true, 194);
  placeText(c, 'Section Meta', 'layers: ' + ((section.layers || []).length) + ' / comps: ' + ((section.components || []).length), 16, 42, 10, '#64748B', false, 194);
  roundedRect(c, 'Section Preview Shape', 16, 68, 154, 18, '#EEF2FF', 9, null);
  return c;
}

function inferGroups(sections) {
  const groups = [];
  (sections || []).forEach(function (section, sIndex) {
    (section.components || []).forEach(function (component) {
      groups.push({ name: component.name || 'Component', section: section.name, role: 'bridge-component', layers: component.layers || [] });
    });
    const loose = (section.looseLayers || section.layers || []).filter(function (layer) { return layer.type === 'text' || layer.type === 'image' || layer.role === 'button-label' || layer.role === 'button-bg' || layer.role === 'link'; }).sort(function (a, b) { return (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x); });
    const rowBuckets = [];
    loose.forEach(function (layer) {
      let row = null;
      for (let i = 0; i < rowBuckets.length; i += 1) if (Math.abs(rowBuckets[i].y - layer.rect.y) < 48) row = rowBuckets[i];
      if (!row) { row = { y: layer.rect.y, layers: [] }; rowBuckets.push(row); }
      row.layers.push(layer);
    });
    rowBuckets.forEach(function (row, rIndex) {
      if (row.layers.length >= 2) groups.push({ name: 'Clean Row Group ' + String(sIndex + 1).padStart(2, '0') + '-' + String(rIndex + 1).padStart(2, '0'), section: section.name, role: 'row-group', layers: row.layers });
    });
  });
  return unique(groups, function (group) { return group.name + '|' + group.section + '|' + group.role; }, 60);
}

function appendGrid(parent, title, items, factory, cols, cardW, cardH) {
  const section = makeAutoFrame(title, 1180, '#F7F8FB', 'VERTICAL', 14, 0);
  section.fills = [];
  section.appendChild(label('Group Title', title, 18, '#111827', true));
  const grid = makeFrame(title + ' Grid', 1180, Math.ceil(Math.max(1, items.length) / cols) * (cardH + 16), null);
  grid.fills = [];
  items.forEach(function (item, index) {
    const node = factory(item, index);
    node.x = (index % cols) * (cardW + 16);
    node.y = Math.floor(index / cols) * (cardH + 16);
    grid.appendChild(node);
  });
  section.appendChild(grid);
  parent.appendChild(section);
}

function buildPureScreenshot(payload, w, h) {
  const f = makeFrame('01 Screenshot Preview / Pure Reference', w, h, '#FFFFFF');
  f.clipsContent = true;
  addScreenshot(f, payload, w, h, 'Pure Screenshot Reference / No Editable Layers');
  return f;
}

function buildLibrary(payload, layers, sections, groups, styleInfo) {
  const colors = styleInfo.colors;
  const textStyles = styleInfo.textStyles;
  const textLayers = layers.filter(function (l) { return l.type === 'text'; });
  const links = unique(textLayers.filter(function (l) { return l.role === 'link'; }), function (l) { return key(textContent(l)); }, 24);
  const buttons = unique(layers.filter(function (l) { return l.role === 'button-label' || l.role === 'button-bg'; }), function (l) { return key(textContent(l) || l.name || l.path); }, 18);
  const images = layers.filter(function (l) { return l.type === 'image'; }).slice(0, 20);

  const lib = makeAutoFrame('02 UI Components / Clean Editable Library', 1280, '#F7F8FB', 'VERTICAL', 28, 32);
  lib.appendChild(label('Library Title', 'Clean Editable UI Library', 30, '#111827', true));
  lib.appendChild(label('Library Note', 'This frame is intentionally clean. It uses generated Figma components and tokens instead of dumping browser coordinates.', 12, '#64748B', false));
  appendGrid(lib, 'Color Tokens', colors.length ? colors : ['#111827', '#F7F8FB', '#2563EB'], componentColor, 7, 150, 92);
  appendGrid(lib, 'Typography Tokens', textStyles.length ? textStyles : textLayers.slice(0, 6), componentTextStyle, 5, 210, 104);
  appendGrid(lib, 'Navigation Components', links.length ? links : textLayers.slice(0, 6), componentNav, 6, 190, 72);
  appendGrid(lib, 'Button Components', buttons, componentButton, 6, 190, 78);
  appendGrid(lib, 'Media Components', images, componentMedia, 5, 210, 150);
  appendGrid(lib, 'Section Components', sections.slice(0, 12), componentSection, 5, 230, 108);
  return lib;
}

function compactImage(layer, x, y, w, h) {
  const holder = makeFrame('Image Placeholder / Editable', w, h, '#E5E7EB');
  holder.x = x;
  holder.y = y;
  holder.cornerRadius = 16;
  holder.clipsContent = true;
  if (layer) createImagePreview(holder, layer, 0, 0, w, h, 'Editable Image');
  return holder;
}

function buildEditableResult(payload, layers, sections, groups) {
  const result = makeAutoFrame('03 Editable Result / Clean Structured Draft', 1280, '#FFFFFF', 'VERTICAL', 28, 40);
  result.appendChild(label('Result Title', payload.title || 'Editable Website Draft', 28, '#111827', true));
  result.appendChild(label('Result Note', 'A clean editable draft generated from extracted content. It avoids raw coordinate dumping so the output stays useful.', 12, '#64748B', false));

  const images = layers.filter(function (l) { return l.type === 'image'; });
  (sections || []).slice(0, 10).forEach(function (section, index) {
    const card = makeAutoFrame((section.name || 'Section') + ' / Editable Block', 1180, '#FFFFFF', 'VERTICAL', 14, 24);
    card.cornerRadius = 24;
    card.strokes = paint('#E5E7EB');
    card.strokeWeight = 1;
    card.appendChild(label('Section Label', (section.name || 'Section ' + (index + 1)), 18, '#111827', true));

    const sectionTexts = unique((section.layers || []).filter(function (l) { return l.type === 'text'; }), function (l) { return key(textContent(l)); }, 8);
    const sectionImages = (section.layers || []).filter(function (l) { return l.type === 'image'; }).slice(0, 3);
    const row = makeFrame('Editable Content Row', 1132, Math.max(180, 54 + sectionTexts.length * 38), null);
    row.fills = [];
    const left = makeAutoFrame('Editable Text Column', 650, null, 'VERTICAL', 10, 0);
    left.x = 0;
    left.y = 0;
    left.fills = [];
    sectionTexts.forEach(function (layer, tIndex) {
      const s = layer.style || {};
      const fontSize = Math.min(28, Math.max(12, px(s.fontSize, layer.role === 'heading' ? 24 : 14)));
      left.appendChild(label((layer.role || 'text') + ' / ' + String(tIndex + 1).padStart(2, '0'), textContent(layer).slice(0, 120), fontSize, cssColor(s.color, '#111827'), layer.role === 'heading' || /bold|600|700|800|900/i.test(String(s.fontWeight || ''))));
    });
    if (!sectionTexts.length) left.appendChild(label('Empty Text', 'No readable text detected for this section.', 12, '#94A3B8', false));
    row.appendChild(left);
    const media = makeFrame('Editable Media Column', 420, 180, null);
    media.x = 700;
    media.y = 0;
    media.fills = [];
    (sectionImages.length ? sectionImages : images.slice(index, index + 1)).slice(0, 2).forEach(function (layer, imgIndex) {
      const img = compactImage(layer, imgIndex * 204, 0, 190, 140);
      media.appendChild(img);
    });
    row.appendChild(media);
    card.appendChild(row);
    result.appendChild(card);
  });

  return result;
}

function buildAudit(d) {
  const audit = makeAutoFrame('04 Audit / Score and Usefulness Notes', 1280, '#0B1020', 'VERTICAL', 14, 32);
  audit.appendChild(label('Audit Title', 'V9 Usefulness Gate', 28, '#F8FAFC', true));
  audit.appendChild(label('Audit Note', 'Changed from raw reconstruction to clean useful output. Screenshot preview is pure. Components are clean. Editable result is structured and readable.', 13, '#CBD5E1', false));
  audit.appendChild(label('Diagnostics', 'layers: ' + d.layerCount + ' / sections: ' + d.sectionCount + ' / bridge components: ' + d.componentCount + ' / semantic groups: ' + d.semanticGroupCount + ' / paint styles: ' + d.paintStyleCount + ' / text styles: ' + d.textStyleCount, 14, '#93C5FD', true));
  audit.appendChild(label('Frame Order', '01 Screenshot Preview / Pure Reference\n02 UI Components / Clean Editable Library\n03 Editable Result / Clean Structured Draft\n04 Audit / Score and Usefulness Notes', 13, '#E5E7EB', false));
  return audit;
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
  const screenshotHeight = Math.max(600, Math.round((payload.pageHeight || viewport.height || 1600) * scale));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const groups = inferGroups(sections);
  const colors = collectColors(layers);
  const textStyles = unique(layers.filter(function (l) { return l.type === 'text'; }), styleKey, 24);
  const paintStyleNames = createPaintStyles(payload.title, colors);
  const textStyleNames = createTextStyles(payload.title, textStyles);
  const d = payload.diagnostics || {};

  lastDiagnostics = {
    layerCount: d.layerCount || layers.length,
    sectionCount: d.sectionCount || sections.length,
    componentCount: d.componentCount || 0,
    semanticGroupCount: groups.length,
    imageCount: d.imageCount || layers.filter(function (l) { return l.type === 'image'; }).length,
    textCount: d.textCount || layers.filter(function (l) { return l.type === 'text'; }).length,
    paintStyleCount: paintStyleNames.length,
    textStyleCount: textStyleNames.length,
    outputMode: VERSION,
    outputPrinciple: 'pure screenshot preview + clean components + clean editable draft'
  };
  lastImportMeta = { title: payload.title || 'Website Import', url: payload.url || '', adapterMode: payload.mode || '', pluginOutputMode: VERSION, pageHeight: payload.pageHeight || 0, viewport: viewport };

  const run = makeAutoFrame(safe((payload.title || 'Website Import') + ' / ' + stamp), 1440, '#030407', 'VERTICAL', 28, 40);
  run.appendChild(label('Import Title', payload.title || 'Website Import', 30, '#F7F9FD', true));
  run.appendChild(label('Import Note', 'V9 Clean Useful Output: pure screenshot preview, clean component library, clean editable draft. No raw browser-coordinate dump.', 12, '#8D96A6', false));
  run.appendChild(buildPureScreenshot(payload, 1280, screenshotHeight));
  run.appendChild(buildLibrary(payload, layers, sections, groups, { colors: colors, textStyles: textStyles }));
  run.appendChild(buildEditableResult(payload, layers, sections, groups));
  run.appendChild(buildAudit(lastDiagnostics));

  page.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([run]);
  lastRun = run;
  send('Import complete.\nOutput page: ' + PAGE_NAME + '\nTop-level run: ' + run.name + '\nMode: V9 Clean Useful Output\nScreenshot preview: pure image only\nComponent library: clean generated components\nEditable result: structured draft, no raw dump\nSemantic groups: ' + groups.length + '\nPaint styles: ' + paintStyleNames.length + '\nText styles: ' + textStyleNames.length + '\nAdapter version: ' + VERSION + '\nReview: 01 screenshot, 02 components, 03 editable result, 04 audit.');
}

function exportPackage() {
  if (!lastRun) return send('No import run found. Import Data first.');
  const pkg = { schema: 'translateit.ui-build-package.universal-page.v9', generatedAt: new Date().toISOString(), pluginVersion: VERSION, figmaRun: lastRun.name, source: lastImportMeta || {}, diagnostics: lastDiagnostics || {} };
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
