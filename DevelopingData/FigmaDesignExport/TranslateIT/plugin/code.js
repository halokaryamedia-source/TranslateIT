figma.showUI(__html__, { width: 580, height: 860 });

const PAGE_NAME = 'TranslateIT Import / Workspace';
const VERSION = 'universal-page-adapter-v11-3-design-clone';
let lastRun = null;
let lastDiagnostics = null;
let lastImportMeta = null;
let regular = { family: 'Inter', style: 'Regular' };
let bold = { family: 'Inter', style: 'Bold' };

function clean(v) { return String(v || '').replace(/\s+/g, ' ').trim(); }
function safe(v) { return clean(v || 'Layer').slice(0, 96) || 'Layer'; }
function key(v) { return clean(v).toLowerCase(); }
function cut(v, n) { const t = clean(v); return t.length > n ? t.slice(0, n - 1) + '…' : t; }
function px(v, fallback) { const m = String(v || '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : fallback; }
function rgb(hex) { const n = parseInt(/^#[\da-fA-F]{6}$/.test(hex || '') ? hex.slice(1) : '111827', 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; }
function paint(hex) { return [{ type: 'SOLID', color: rgb(hex || '#111827') }]; }
function cssColor(v, fallback) {
  const raw = String(v || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return fallback || '';
  const hex = raw.match(/#[\da-fA-F]{6}|#[\da-fA-F]{3}/);
  if (hex) return hex[0].length === 4 ? '#' + hex[0][1] + hex[0][1] + hex[0][2] + hex[0][2] + hex[0][3] + hex[0][3] : hex[0];
  const rgba = raw.match(/rgba?\(([^)]+)\)/);
  if (!rgba) return fallback || '';
  const parts = rgba[1].split(',').map((x) => parseFloat(x));
  if (parts.length < 3 || (parts.length >= 4 && parts[3] === 0)) return fallback || '';
  return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
}
function unique(items, fn, limit) {
  const seen = {};
  const out = [];
  (items || []).forEach((item) => { const k = fn(item); if (!k || seen[k] || (limit && out.length >= limit)) return; seen[k] = true; out.push(item); });
  return out;
}
function decodeBase64(value) { const raw = atob(value); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i); return out; }
function textValue(layer) { return clean(layer && (layer.text || layer.name || '')); }
function styleKey(layer) { const s = layer.style || {}; return [layer.role || layer.type, s.fontSize || '', s.fontWeight || '', s.color || ''].join('|'); }
function send(text, extra) { const msg = { type: 'status', text }; Object.assign(msg, extra || {}); figma.ui.postMessage(msg); }

function defaultSpacing() {
  return [
    { name: 'Space / XS', value: 4 }, { name: 'Space / SM', value: 8 }, { name: 'Space / MD', value: 16 }, { name: 'Space / LG', value: 24 },
    { name: 'Space / XL', value: 40 }, { name: 'Section Gap', value: 72 }, { name: 'Card Padding', value: 24 }, { name: 'Grid Gap', value: 20 }
  ];
}
function defaultRadius() {
  return [
    { name: 'Radius / SM', value: 8 }, { name: 'Radius / MD', value: 16 }, { name: 'Radius / LG', value: 24 }, { name: 'Radius / XL', value: 32 }
  ];
}
function defaultResponsive() {
  return {
    desktop: 'Use full-width sections, horizontal navigation, multi-column cards, and spacious section gaps.',
    tablet: 'Reduce grids to two columns, keep hierarchy clear, and preserve section rhythm.',
    mobile: 'Stack sections vertically, collapse navigation, use one-column cards, and increase tap spacing.'
  };
}
function collectColors(layers) {
  const out = [];
  (layers || []).forEach((layer) => {
    const s = layer.style || {};
    [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor].forEach((v) => {
      const c = cssColor(v, '');
      if (c && out.indexOf(c) < 0) out.push(c);
    });
  });
  return out.slice(0, 20);
}
function inferIntent(section, index) {
  if ((section.role || '') === 'header') return 'header';
  if ((section.role || '') === 'footer') return 'footer';
  const text = ((section.layers || []).filter((l) => l.type === 'text').map(textValue).join(' ') || '').toLowerCase();
  if (index === 1 || /hero|welcome|discover|unlock|introducing|creative/.test(text)) return 'hero';
  if (/project|portfolio|gallery|work|case/.test(text)) return 'gallery';
  return 'content';
}
function normalizeIntent(value, fallback) {
  const raw = key(value || fallback || '');
  if (raw.includes('navigation') || raw.includes('header')) return 'header';
  if (raw.includes('hero') || raw.includes('landing')) return 'hero';
  if (raw.includes('gallery') || raw.includes('grid') || raw.includes('portfolio') || raw.includes('card')) return 'gallery';
  if (raw.includes('footer')) return 'footer';
  return 'content';
}
function sectionTexts(section, limit) {
  return unique((section.layers || []).filter((l) => l.type === 'text'), (l) => key(textValue(l)), limit || 8).map(textValue).filter(Boolean);
}
function sectionImages(section, fallbackImages, index, limit) {
  const local = (section.layers || []).filter((l) => l.type === 'image');
  return (local.length ? local : (fallbackImages || []).slice(index, index + 1)).slice(0, limit || 2);
}
function normalizePlan(payload, layers, sections) {
  const bridgePlan = payload.rebuildPlan || {};
  const tokens = bridgePlan.tokens || {};
  const textLayers = layers.filter((l) => l.type === 'text');
  const planSections = Array.isArray(bridgePlan.sections) && bridgePlan.sections.length ? bridgePlan.sections : sections.slice(0, 12).map((section, index) => ({
    name: section.name || ('Section ' + (index + 1)),
    intent: inferIntent(section, index),
    templateIntent: inferIntent(section, index),
    textCount: (section.layers || []).filter((l) => l.type === 'text').length,
    imageCount: (section.layers || []).filter((l) => l.type === 'image').length,
    componentCount: (section.components || []).length,
    confidence: Math.min(0.95, 0.45 + Math.min((section.layers || []).length, 20) / 40)
  }));
  return {
    title: clean(payload.title || bridgePlan.title || 'Website Design Clone'),
    url: payload.url || bridgePlan.url || '',
    summary: bridgePlan.summary || 'Design clone generated as clean Figma structure. Raw browser-coordinate reconstruction is intentionally avoided.',
    tokens: {
      colors: Array.isArray(tokens.colors) && tokens.colors.length ? tokens.colors : collectColors(layers),
      textStyles: Array.isArray(tokens.typography) && tokens.typography.length ? tokens.typography : unique(textLayers, styleKey, 18),
      spacing: Array.isArray(tokens.spacing) && tokens.spacing.length ? tokens.spacing : defaultSpacing(),
      radius: Array.isArray(tokens.radius) && tokens.radius.length ? tokens.radius : defaultRadius()
    },
    responsive: bridgePlan.responsive || defaultResponsive(),
    counts: {
      sections: sections.length,
      text: textLayers.length,
      images: layers.filter((l) => l.type === 'image').length,
      buttons: layers.filter((l) => l.role === 'button-bg' || l.role === 'button-label').length
    },
    sections: planSections,
    uncertainties: bridgePlan.uncertainties || ['Post-import Figma visual validation is still required before claiming professional-ready quality.']
  };
}

async function loadFonts() {
  try { await figma.loadFontAsync(regular); } catch (_) { regular = { family: 'Roboto', style: 'Regular' }; await figma.loadFontAsync(regular); }
  try { await figma.loadFontAsync(bold); } catch (_) { bold = regular; }
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
function label(name, value, size, color, isBold, width) {
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
  const node = label(name, value, size, color, isBold, width || 180);
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
  node.cornerRadius = 16;
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
    shot.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
    shot.strokes = [];
    try { shot.locked = true; } catch (_) {}
    f.appendChild(shot);
  }
  return f;
}
function makePlanFrame(plan) {
  const f = autoFrame('02 Rebuild Plan / AI Interpretation', 1280, '#FFFFFF', 20, 32);
  f.cornerRadius = 24;
  f.strokes = paint('#E5E7EB');
  f.strokeWeight = 1;
  f.appendChild(label('Plan Title', 'Rebuild Plan / AI Interpretation', 30, '#111827', true, 1160));
  f.appendChild(label('Plan Summary', plan.summary, 13, '#64748B', false, 1160));
  f.appendChild(label('Plan Counts', 'Sections: ' + plan.counts.sections + '  •  Text: ' + plan.counts.text + '  •  Images: ' + plan.counts.images + '  •  Buttons: ' + plan.counts.buttons, 13, '#2563EB', true, 1160));
  f.appendChild(label('Responsive Intent', 'Desktop: ' + plan.responsive.desktop + '\nTablet: ' + plan.responsive.tablet + '\nMobile: ' + plan.responsive.mobile, 12, '#334155', false, 1160));
  const grid = frame('Section Plan Grid', 1180, Math.ceil(Math.max(1, plan.sections.length) / 3) * 132, null);
  grid.fills = [];
  plan.sections.forEach((section, index) => {
    const card = frame('Plan Card / ' + (section.name || index), 372, 116, '#F8FAFC');
    card.cornerRadius = 18;
    card.strokes = paint('#E5E7EB');
    card.strokeWeight = 1;
    card.x = (index % 3) * 394;
    card.y = Math.floor(index / 3) * 132;
    placeText(card, 'Section Name', section.name || ('Section ' + (index + 1)), 18, 16, 14, '#111827', true, 330);
    placeText(card, 'Template Intent', 'template: ' + (section.templateIntent || normalizeIntent(section.intent)), 18, 42, 11, '#2563EB', true, 330);
    placeText(card, 'Meta', 'text ' + (section.textCount || 0) + ' / image ' + (section.imageCount || 0) + ' / comp ' + (section.componentCount || 0), 18, 70, 10, '#64748B', false, 330);
    grid.appendChild(card);
  });
  f.appendChild(grid);
  return f;
}
function createPaintStyles(title, colors) {
  const created = [];
  colors.forEach((hex, index) => {
    try { const style = figma.createPaintStyle(); style.name = 'TranslateIT/' + safe(title) + '/Color ' + String(index + 1).padStart(2, '0') + ' ' + hex; style.paints = paint(hex); created.push(style.name); } catch (_) {}
  });
  return created;
}
function createTextStyles(title, items) {
  const created = [];
  items.forEach((item, index) => {
    try {
      const role = item.role || item.type || 'text';
      const fontSize = item.fontSize || (item.style && item.style.fontSize) || '14px';
      const fontWeight = item.fontWeight || (item.style && item.style.fontWeight) || '';
      const color = item.color || cssColor(item.style && item.style.color, '#111827') || '#111827';
      const style = figma.createTextStyle();
      style.name = 'TranslateIT/' + safe(title) + '/Text ' + String(index + 1).padStart(2, '0') + ' ' + role;
      style.fontName = /bold|600|700|800|900/i.test(String(fontWeight)) || role === 'heading' ? bold : regular;
      style.fontSize = Math.max(8, px(fontSize, role === 'heading' ? 30 : 14));
      style.fills = paint(color);
      created.push(style.name);
    } catch (_) {}
  });
  return created;
}

function tokenComponent(hex, index) {
  const c = component('Color Token / ' + String(index + 1).padStart(2, '0'), 156, 92, '#FFFFFF');
  c.cornerRadius = 16; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1;
  rect(c, 'Swatch', 16, 16, 124, 34, hex, 10);
  placeText(c, 'Hex', hex, 16, 58, 11, '#111827', true, 124);
  return c;
}
function typeComponent(item, index) {
  const role = item.role || item.type || 'text';
  const sample = item.sample || textValue(item) || 'Sample Text';
  const fontSize = item.fontSize || (item.style && item.style.fontSize) || '14px';
  const c = component('Typography Token / ' + String(index + 1).padStart(2, '0'), 224, 108, '#FFFFFF');
  c.cornerRadius = 16; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1;
  placeText(c, 'Type Meta', role + ' / ' + fontSize, 16, 14, 11, '#64748B', true, 190);
  placeText(c, 'Sample', cut(sample, 34), 16, 48, Math.min(18, Math.max(11, px(fontSize, 14) * 0.75)), '#111827', /heading|bold/i.test(role), 190);
  return c;
}
function spacingComponent(item, index) {
  const name = item.name || ('Space / ' + String(index + 1));
  const value = Number(item.value || item.px || 16);
  const c = component('Spacing Token / ' + name, 224, 96, '#FFFFFF');
  c.cornerRadius = 16; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1;
  placeText(c, 'Spacing Name', name, 16, 14, 12, '#111827', true, 190);
  placeText(c, 'Spacing Value', value + ' px', 16, 38, 10, '#64748B', false, 190);
  rect(c, 'Spacing Visual', 16, 64, Math.min(160, Math.max(8, value * 2)), 10, '#2563EB', 5);
  return c;
}
function radiusComponent(item, index) {
  const name = item.name || ('Radius / ' + String(index + 1));
  const value = Number(item.value || item.px || 16);
  const c = component('Radius Token / ' + name, 224, 104, '#FFFFFF');
  c.cornerRadius = 16; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1;
  placeText(c, 'Radius Name', name, 16, 14, 12, '#111827', true, 190);
  placeText(c, 'Radius Value', value + ' px', 16, 38, 10, '#64748B', false, 190);
  rect(c, 'Radius Visual', 16, 64, 56, 28, '#2563EB', Math.max(0, Math.min(28, value)));
  return c;
}
function buttonVariant(item) {
  const c = component('Button / ' + item.name, 200, 78, '#FFFFFF');
  c.cornerRadius = 16; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1;
  rect(c, 'Button Shape', 18, 22, 148, 34, item.fill, 17, item.fill === '#FFFFFF' ? '#CBD5E1' : null);
  placeText(c, 'Button Label', item.name, 34, 31, 12, item.color, true, 116);
  return c;
}
function navComponent(layer, index) {
  const c = component('Navigation / Default ' + String(index + 1).padStart(2, '0'), 192, 72, '#FFFFFF');
  c.cornerRadius = 16; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1;
  placeText(c, 'Nav Label', cut(textValue(layer) || 'Nav Item', 28), 18, 24, 13, '#111827', true, 154);
  return c;
}
function cardVariant(item) {
  const c = component('Card / ' + item.name, 240, item.media ? 188 : 132, '#FFFFFF');
  c.cornerRadius = 18; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1;
  if (item.media) rect(c, 'Card Media', 16, 16, 208, 78, '#E5E7EB', 14);
  placeText(c, 'Card Title', item.name, 16, item.media ? 110 : 24, 14, '#111827', true, 208);
  placeText(c, 'Card Body', 'Reusable editable card component.', 16, item.media ? 136 : 52, 10, '#64748B', false, 208);
  return c;
}
function mediaComponent(layer, index) {
  const c = component('Media Component / ' + String(index + 1).padStart(2, '0'), 224, 156, '#FFFFFF');
  c.cornerRadius = 16; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1;
  imagePreview(c, layer, 16, 16, 96, 72);
  placeText(c, 'Media Name', cut(layer.name || 'Image', 28), 16, 100, 12, '#111827', true, 190);
  const r = layer.rect || {};
  placeText(c, 'Media Size', Math.round(r.w || 0) + '×' + Math.round(r.h || 0), 16, 122, 10, '#64748B', false, 190);
  return c;
}
function sectionVariant(item) {
  const c = component('Section / ' + item.name, 260, 122, '#FFFFFF');
  c.cornerRadius = 18; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1;
  placeText(c, 'Section Name', item.name, 16, 16, 14, '#111827', true, 224);
  placeText(c, 'Section Intent', item.intent || 'Editable section block', 16, 42, 10, '#64748B', false, 224);
  rect(c, 'Section Preview Strip', 16, 76, 180, 18, '#EEF2FF', 9);
  return c;
}
function appendGrid(parent, title, desc, items, factory, cols, cardW, cardH) {
  const section = autoFrame(title, 1180, null, 10, 0);
  section.fills = [];
  section.appendChild(label('Library Group Title', title, 18, '#111827', true, 1160));
  section.appendChild(label('Library Group Description', desc, 11, '#64748B', false, 1160));
  const rows = Math.ceil(Math.max(1, items.length) / cols);
  const grid = frame(title + ' Grid', 1180, rows * (cardH + 16), null);
  grid.fills = [];
  items.forEach((item, index) => { const node = factory(item, index); node.x = (index % cols) * (cardW + 16); node.y = Math.floor(index / cols) * (cardH + 16); grid.appendChild(node); });
  section.appendChild(grid);
  parent.appendChild(section);
}
function makeLibraryFrame(plan, layers) {
  const textLayers = layers.filter((l) => l.type === 'text');
  const imageLayers = layers.filter((l) => l.type === 'image').slice(0, 20);
  const links = unique(textLayers.filter((l) => l.role === 'link'), (l) => key(textValue(l)), 24);
  const lib = autoFrame('03 UI Components / Structured Library', 1280, '#F7F8FB', 32, 32);
  lib.appendChild(label('Library Title', 'Structured UI Library', 30, '#111827', true, 1160));
  lib.appendChild(label('Library Note', 'Clean tokens, variants, and reusable components. No raw website-coordinate fragments.', 12, '#64748B', false, 1160));
  appendGrid(lib, 'Color Tokens', 'Detected color palette for quick design-system review.', plan.tokens.colors.length ? plan.tokens.colors : ['#111827', '#F8FAFC', '#2563EB'], tokenComponent, 7, 156, 92);
  appendGrid(lib, 'Typography Tokens', 'Detected type roles and font-size samples.', plan.tokens.textStyles.length ? plan.tokens.textStyles : textLayers.slice(0, 6), typeComponent, 5, 224, 108);
  appendGrid(lib, 'Spacing Tokens', 'Spacing rhythm for sections, cards, and grid gaps.', plan.tokens.spacing.length ? plan.tokens.spacing : defaultSpacing(), spacingComponent, 5, 224, 96);
  appendGrid(lib, 'Radius Tokens', 'Corner-radius tokens for cards, buttons, and media containers.', plan.tokens.radius.length ? plan.tokens.radius : defaultRadius(), radiusComponent, 5, 224, 104);
  appendGrid(lib, 'Button Variants', 'Reusable button variants for the editable draft.', [
    { name: 'Primary', fill: '#2563EB', color: '#FFFFFF' },
    { name: 'Secondary', fill: '#111827', color: '#FFFFFF' },
    { name: 'Ghost', fill: '#FFFFFF', color: '#111827' }
  ], buttonVariant, 5, 200, 78);
  appendGrid(lib, 'Navigation Components', 'Navigation item components from detected links or fallback labels.', links.length ? links : [{ text: 'Home' }, { text: 'About' }, { text: 'Projects' }, { text: 'Contact' }], navComponent, 6, 192, 72);
  appendGrid(lib, 'Card Components', 'Reusable card templates for content and gallery sections.', [{ name: 'Default', media: false }, { name: 'Media', media: true }, { name: 'Feature', media: true }], cardVariant, 4, 240, 188);
  appendGrid(lib, 'Media Components', 'Detected image/media assets or media fallback.', imageLayers.length ? imageLayers : [{ name: 'Media Placeholder' }], mediaComponent, 5, 224, 156);
  appendGrid(lib, 'Section Components', 'Section-level templates used by the editable result.', [
    { name: 'Header', intent: 'Navigation and brand area' },
    { name: 'Hero', intent: 'Main landing area' },
    { name: 'Content', intent: 'Text and supporting media' },
    { name: 'Gallery', intent: 'Card/grid style section' },
    { name: 'Footer', intent: 'Closing navigation area' }
  ], sectionVariant, 4, 260, 122);
  return lib;
}

function headerTemplate(section, texts) {
  const block = frame((section.name || 'Header') + ' / Header Template', 1180, 132, '#FFFFFF');
  block.cornerRadius = 26; block.strokes = paint('#E5E7EB'); block.strokeWeight = 1;
  placeText(block, 'Brand', cut(texts[0] || 'Brand', 28), 32, 42, 22, '#111827', true, 240);
  const nav = texts.slice(1, 6).length ? texts.slice(1, 6) : ['Home', 'About', 'Projects', 'Contact'];
  nav.forEach((item, i) => placeText(block, 'Nav Item', cut(item, 18), 380 + i * 118, 52, 12, '#475569', false, 100));
  rect(block, 'Header CTA', 1000, 38, 116, 38, '#111827', 19);
  placeText(block, 'CTA Label', 'Contact', 1034, 49, 11, '#FFFFFF', true, 70);
  return block;
}
function heroTemplate(section, texts, images) {
  const block = frame((section.name || 'Hero') + ' / Hero Template', 1180, 560, '#FFFFFF');
  block.cornerRadius = 28; block.strokes = paint('#E5E7EB'); block.strokeWeight = 1;
  placeText(block, 'Eyebrow', cut(section.name || 'Hero Section', 42), 40, 76, 12, '#2563EB', true, 520);
  placeText(block, 'Hero Heading', cut(texts[0] || 'Generated Hero Heading', 90), 40, 116, 54, '#111827', true, 560);
  placeText(block, 'Hero Body', cut(texts.slice(1, 4).join(' ') || 'Editable supporting copy generated from the source website structure.', 180), 44, 290, 17, '#64748B', false, 520);
  rect(block, 'Primary CTA', 44, 400, 148, 46, '#2563EB', 23);
  placeText(block, 'CTA Text', 'Explore', 92, 414, 12, '#FFFFFF', true, 84);
  if (images.length) imagePreview(block, images[0], 690, 70, 430, 420); else rect(block, 'Hero Media Placeholder', 690, 70, 430, 420, '#EEF2FF', 28, '#D9E2F2');
  return block;
}
function contentTemplate(section, texts, images) {
  const block = frame((section.name || 'Content') + ' / Content Template', 1180, 380, '#FFFFFF');
  block.cornerRadius = 28; block.strokes = paint('#E5E7EB'); block.strokeWeight = 1;
  placeText(block, 'Section Label', cut(section.name || 'Content Section', 42), 40, 44, 12, '#2563EB', true, 520);
  placeText(block, 'Content Heading', cut(texts[0] || 'Editable Content Section', 80), 40, 82, 34, '#111827', true, 600);
  placeText(block, 'Content Body', cut(texts.slice(1, 6).join(' ') || 'Editable body text generated from the page content. Use this as a clean starting point for manual design refinement.', 260), 42, 170, 15, '#64748B', false, 600);
  if (images.length) imagePreview(block, images[0], 760, 54, 330, 260); else rect(block, 'Content Media Placeholder', 760, 54, 330, 260, '#F1F5F9', 24, '#D9E2F2');
  return block;
}
function galleryTemplate(section, texts, images) {
  const block = frame((section.name || 'Gallery') + ' / Gallery Template', 1180, 480, '#FFFFFF');
  block.cornerRadius = 28; block.strokes = paint('#E5E7EB'); block.strokeWeight = 1;
  placeText(block, 'Gallery Heading', cut(texts[0] || 'Editable Gallery Section', 80), 40, 42, 34, '#111827', true, 720);
  const cardTexts = texts.slice(1, 7).length ? texts.slice(1, 7) : ['Card One', 'Card Two', 'Card Three'];
  for (let i = 0; i < 3; i += 1) {
    const x = 40 + i * 372;
    rect(block, 'Gallery Card BG', x, 130, 336, 284, '#F8FAFC', 24, '#E5E7EB');
    if (images[i]) imagePreview(block, images[i], x + 18, 148, 300, 128); else rect(block, 'Card Media Placeholder', x + 18, 148, 300, 128, '#E5E7EB', 18);
    placeText(block, 'Card Title', cut(cardTexts[i] || ('Card ' + (i + 1)), 36), x + 22, 300, 15, '#111827', true, 286);
    placeText(block, 'Card Body', 'Editable card description.', x + 22, 330, 11, '#64748B', false, 286);
  }
  return block;
}
function footerTemplate(section, texts) {
  const block = frame((section.name || 'Footer') + ' / Footer Template', 1180, 168, '#0B1020');
  block.cornerRadius = 28; block.strokes = paint('#1F2937'); block.strokeWeight = 1;
  placeText(block, 'Footer Brand', cut(texts[0] || 'Footer', 42), 40, 46, 22, '#F8FAFC', true, 420);
  placeText(block, 'Footer Note', cut(texts.slice(1, 5).join(' ') || 'Editable footer content and closing navigation.', 160), 40, 86, 12, '#CBD5E1', false, 560);
  (texts.slice(1, 5).length ? texts.slice(1, 5) : ['Home', 'About', 'Contact']).forEach((item, i) => placeText(block, 'Footer Link', cut(item, 18), 760 + i * 100, 72, 11, '#CBD5E1', false, 86));
  return block;
}
function makeEditableResultFrame(payload, plan, sections, layers) {
  const f = autoFrame('04 Editable Result / Clean Structured Draft', 1280, '#FFFFFF', 28, 40);
  f.appendChild(label('Editable Title', payload.title || 'Editable Design Draft', 30, '#111827', true, 1180));
  f.appendChild(label('Editable Note', 'Template-based editable draft using templateIntent from the rebuild plan. This avoids raw DOM block dumps.', 12, '#64748B', false, 1180));
  const globalImages = layers.filter((l) => l.type === 'image');
  sections.slice(0, 10).forEach((section, index) => {
    const planSection = plan.sections[index] || {};
    const intent = normalizeIntent(planSection.templateIntent || planSection.intent, inferIntent(section, index));
    const texts = sectionTexts(section, 10);
    const images = sectionImages(section, globalImages, index, 4);
    if (intent === 'header') f.appendChild(headerTemplate(section, texts));
    else if (intent === 'hero') f.appendChild(heroTemplate(section, texts, images));
    else if (intent === 'gallery') f.appendChild(galleryTemplate(section, texts, images));
    else if (intent === 'footer') f.appendChild(footerTemplate(section, texts));
    else f.appendChild(contentTemplate(section, texts, images));
  });
  return f;
}
function makeAuditFrame(diag) {
  const f = autoFrame('05 Audit / Design Clone Notes', 1280, '#0B1020', 14, 32);
  f.appendChild(label('Audit Title', 'Design Clone Audit / Honest Readiness', 28, '#F8FAFC', true, 1160));
  f.appendChild(label('Audit Note', 'This output is still a prototype until the imported Figma canvas is visually checked. Good data does not automatically mean good design output.', 13, '#CBD5E1', false, 1160));
  f.appendChild(label('Audit Diagnostics', 'sections: ' + diag.sectionCount + ' / layers: ' + diag.layerCount + ' / images: ' + diag.imageCount + ' / text: ' + diag.textCount + ' / colors: ' + diag.colorTokenCount + ' / type: ' + diag.textStyleCount + ' / spacing: ' + diag.spacingTokenCount + ' / radius: ' + diag.radiusTokenCount + ' / template intents: ' + diag.templateIntentCount, 14, '#93C5FD', true, 1160));
  f.appendChild(label('Audit Checklist', '✓ Pure screenshot reference\n✓ Rebuild plan generated\n✓ templateIntent used by editable draft\n✓ Structured library groups\n✓ Spacing tokens included\n✓ Radius tokens included\n✓ Component variants included\n⚠ Requires visual Figma validation before claiming professional-ready', 13, '#E5E7EB', false, 1160));
  return f;
}

async function importUniversal(payload) {
  await loadFonts();
  if (!payload || !/^universal-page-adapter-v[1-9]/.test(String(payload.mode || ''))) throw new Error('Expected Universal Page Adapter payload.');
  const page = await workspacePage();
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  if (!layers.length && !sections.length && !(payload.screenshot && payload.screenshot.base64)) throw new Error('No visible page data found.');
  const plan = normalizePlan(payload, layers, sections);
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
    spacingTokenCount: plan.tokens.spacing.length,
    radiusTokenCount: plan.tokens.radius.length,
    responsiveCount: Object.keys(plan.responsive || {}).length,
    templateIntentCount: plan.sections.filter((s) => !!s.templateIntent).length,
    paintStyleCount: paintStyles.length,
    figmaTextStyleCount: textStyles.length,
    outputMode: VERSION
  };
  lastImportMeta = { title: payload.title || '', url: payload.url || '', adapterMode: payload.mode || '', pluginOutputMode: VERSION };
  const run = autoFrame(safe((payload.title || 'Website Design Clone') + ' / ' + new Date().toISOString().replace(/[:.]/g, '-')), 1440, '#030407', 30, 40);
  run.appendChild(label('Run Title', payload.title || 'Website Design Clone', 30, '#F8FAFC', true, 1320));
  run.appendChild(label('Run Note', 'V11.3 Design Clone: radius tokens, templateIntent-driven editable draft, structured UI library, honest audit.', 12, '#8D96A6', false, 1320));
  run.appendChild(makeScreenshotFrame(payload, 1280));
  run.appendChild(makePlanFrame(plan));
  run.appendChild(makeLibraryFrame(plan, layers));
  run.appendChild(makeEditableResultFrame(payload, plan, sections, layers));
  run.appendChild(makeAuditFrame(lastDiagnostics));
  page.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([run]);
  lastRun = run;
  send('Import complete.\nMode: V11.3 Design Clone\nScreenshot preview: pure image only\nRebuild Plan: generated\nUI Library: structured grid + spacing tokens + radius tokens + variants\nEditable Result: templateIntent-driven templates, no raw dump\nSections: ' + lastDiagnostics.sectionCount + '\nColors: ' + lastDiagnostics.colorTokenCount + '\nText styles: ' + lastDiagnostics.textStyleCount + '\nSpacing tokens: ' + lastDiagnostics.spacingTokenCount + '\nRadius tokens: ' + lastDiagnostics.radiusTokenCount + '\nTemplate intents: ' + lastDiagnostics.templateIntentCount + '\nImportant: still needs visual Figma validation before professional-ready claim.');
}
function exportPackage() {
  if (!lastRun) return send('No import run found. Import Data first.');
  send('Export complete.', { exportJson: JSON.stringify({ schema: 'translateit.design-clone.v11.3', pluginVersion: VERSION, generatedAt: new Date().toISOString(), source: lastImportMeta || {}, diagnostics: lastDiagnostics || {} }, null, 2) });
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
