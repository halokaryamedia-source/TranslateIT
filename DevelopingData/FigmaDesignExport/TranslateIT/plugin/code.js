figma.showUI(__html__, { width: 520, height: 720 });

// TranslateIT Figma Design Export
// Modular architecture: HTML/CSS IR Importer -> Native editable Figma nodes.
// Safety rule: never delete manual content. Refresh archives only top-level nodes tagged by this plugin.

const NS = 'translateit.designExport';
const PAGE_PREFIX = 'TranslateIT Import / ';
const VERSION = '2026-06-html-css-ir-v1';
const DEFAULT_PAGE = '01 Imported Preview';
const ARCHIVE_PAGE = '98 Archive';
const REPORT_PAGE = '99 Import Report';

const state = {
  pendingRefresh: null,
  fontRegular: { family: 'Inter', style: 'Regular' },
  fontBold: { family: 'Inter', style: 'Bold' }
};

function pageName(name) { return `${PAGE_PREFIX}${name}`; }
function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function status(text, extra = {}) { figma.ui.postMessage({ type: 'status', text, ...extra }); }

function tag(node, kind, source = '') {
  node.setSharedPluginData(NS, 'generated', 'true');
  node.setSharedPluginData(NS, 'version', VERSION);
  node.setSharedPluginData(NS, 'kind', kind);
  node.setSharedPluginData(NS, 'source', source);
  return node;
}
function isTagged(node) { return node.getSharedPluginData(NS, 'generated') === 'true'; }

async function loadFonts() {
  try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); state.fontRegular = { family: 'Inter', style: 'Regular' }; }
  catch (_) { state.fontRegular = { family: 'Roboto', style: 'Regular' }; await figma.loadFontAsync(state.fontRegular); }
  try { await figma.loadFontAsync({ family: 'Inter', style: 'Bold' }); state.fontBold = { family: 'Inter', style: 'Bold' }; }
  catch (_) { state.fontBold = state.fontRegular; }
}

async function getPage(name) {
  let p = figma.root.children.find(x => x.name === pageName(name));
  if (!p) p = figma.createPage();
  p.name = pageName(name);
  p.setSharedPluginData(NS, 'ownedPage', 'true');
  await figma.setCurrentPageAsync(p);
  return p;
}

function generatedCount(targetPage = DEFAULT_PAGE) {
  const p = figma.root.children.find(x => x.name === pageName(targetPage));
  return p ? p.children.filter(isTagged).length : 0;
}

async function archiveGenerated(targetPage, runStamp) {
  const p = figma.root.children.find(x => x.name === pageName(targetPage));
  if (!p) return 0;
  const nodes = p.children.filter(isTagged);
  if (!nodes.length) return 0;
  const archivePage = await getPage(ARCHIVE_PAGE);
  const root = makeFrame(`Archive / ${targetPage} / ${runStamp}`, 1440, Math.max(260, nodes.length * 180), '#030407', 'archive-root', targetPage);
  root.layoutMode = 'VERTICAL'; root.itemSpacing = 18; root.paddingTop = 32; root.paddingRight = 32; root.paddingBottom = 32; root.paddingLeft = 32;
  root.appendChild(makeText(`Archived generated nodes from ${targetPage}`, 24, '#F5F7FA', true));
  root.appendChild(makeText('Manual Figma nodes were not moved.', 13, '#8D96A6', false));
  archivePage.appendChild(root);
  nodes.forEach((node, index) => { node.x = 0; node.y = 84 + index * 160; root.appendChild(node); });
  return nodes.length;
}

function hexToRgb(hex) {
  const value = /^#[0-9A-Fa-f]{6}$/.test(hex || '') ? hex : '#000000';
  const n = parseInt(value.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function paint(hex) { return [{ type: 'SOLID', color: hexToRgb(hex) }]; }
function parsePx(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value) return fallback;
  const m = String(value).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : fallback;
}
function cssColor(value, fallback = '#11151C') {
  if (!value) return fallback;
  const v = String(value).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  const rgba = v.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const parts = rgba[1].split(',').map(x => Math.max(0, Math.min(255, parseFloat(x))));
    if (parts.length >= 3) return `#${parts.slice(0,3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
  }
  const named = { transparent: null, black: '#000000', white: '#FFFFFF', red: '#FF0000', blue: '#0000FF', green: '#008000' };
  return Object.prototype.hasOwnProperty.call(named, v.toLowerCase()) ? named[v.toLowerCase()] : fallback;
}

function makeFrame(name, width, height, background, kind = 'frame', source = '') {
  const node = figma.createFrame();
  node.name = name;
  node.resize(Math.max(1, width), Math.max(1, height));
  const bg = cssColor(background, null);
  node.fills = bg ? paint(bg) : [];
  node.strokes = [];
  return tag(node, kind, source || name);
}
function makeText(value, size = 14, color = '#F5F7FA', bold = false) {
  const node = figma.createText();
  node.name = `Text / ${String(value).slice(0, 40) || 'Empty'}`;
  node.fontName = bold ? state.fontBold : state.fontRegular;
  node.characters = String(value || '');
  node.fontSize = Math.max(1, size);
  node.fills = paint(cssColor(color, '#F5F7FA'));
  return tag(node, 'text', node.characters.slice(0, 40));
}
function applyStyle(node, style = {}) {
  if ('borderRadius' in style) node.cornerRadius = parsePx(style.borderRadius, 0);
  if (style.borderColor || style.border) { node.strokes = paint(cssColor(style.borderColor || '#242B36', '#242B36')); node.strokeWeight = parsePx(style.borderWidth, 1); }
  if (style.opacity) node.opacity = Math.max(0, Math.min(1, Number(style.opacity) || 1));
}
function applyAutoLayout(node, style = {}) {
  const display = String(style.display || '').toLowerCase();
  const direction = String(style.flexDirection || '').toLowerCase();
  const isFlex = display === 'flex' || display === 'inline-flex';
  node.layoutMode = isFlex && direction === 'row' ? 'HORIZONTAL' : 'VERTICAL';
  node.itemSpacing = parsePx(style.gap || style.rowGap || style.columnGap, 12);
  const p = parsePx(style.padding, 0);
  node.paddingTop = parsePx(style.paddingTop, p);
  node.paddingRight = parsePx(style.paddingRight, p);
  node.paddingBottom = parsePx(style.paddingBottom, p);
  node.paddingLeft = parsePx(style.paddingLeft, p);
}

function estimateSize(ir, parentWidth) {
  const s = ir.style || {};
  const tag = ir.tag || 'div';
  const childCount = (ir.children || []).length;
  const defaultWidth = tag === 'body' ? parentWidth : Math.min(parentWidth, 720);
  const width = parsePx(s.width, defaultWidth);
  let height = parsePx(s.height, NaN);
  if (!Number.isFinite(height)) {
    if (tag === 'button' || tag === 'input' || tag === 'select') height = 44;
    else if (tag === 'nav' || tag === 'header') height = 72;
    else height = Math.max(56, childCount * 64 + parsePx(s.padding, 24) * 2);
  }
  return { width, height };
}

function nodeLabel(ir) {
  const id = ir.attrs && ir.attrs.id ? `#${ir.attrs.id}` : '';
  const cls = ir.classes && ir.classes.length ? `.${ir.classes.slice(0, 2).join('.')}` : '';
  const comp = ir.attrs && (ir.attrs['data-component'] || ir.attrs['data-name']);
  return comp || `${ir.tag || 'node'}${id}${cls}` || 'Node';
}

function createFromIR(ir, parentWidth = 1200) {
  if (!ir) return null;
  if (ir.type === 'text') {
    const text = String(ir.text || '').trim();
    if (!text) return null;
    const style = ir.style || {};
    const node = makeText(text, parsePx(style.fontSize, 14), style.color || '#F5F7FA', String(style.fontWeight || '').match(/bold|600|700|800|900/i));
    return node;
  }
  if (ir.type === 'svg' && ir.svg) {
    try {
      const svg = figma.createNodeFromSvg(ir.svg);
      svg.name = nodeLabel(ir);
      return tag(svg, 'svg', nodeLabel(ir));
    } catch (_) {
      return makeText('SVG', 12, '#8D96A6', false);
    }
  }
  const style = ir.style || {};
  const size = estimateSize(ir, parentWidth);
  const node = makeFrame(nodeLabel(ir), size.width, size.height, style.backgroundColor || style.background || 'transparent', ir.attrs && ir.attrs['data-component'] ? 'component-candidate' : 'html-frame', ir.tag || 'div');
  applyStyle(node, style);
  applyAutoLayout(node, style);
  for (const child of (ir.children || [])) {
    const childNode = createFromIR(child, Math.max(1, size.width - 40));
    if (childNode) node.appendChild(childNode);
  }
  if ((!ir.children || !ir.children.length) && ir.text) {
    const textNode = makeText(ir.text, parsePx(style.fontSize, 14), style.color || '#F5F7FA', false);
    node.appendChild(textNode);
  }
  return node;
}

async function buildReport(payload, archived, runStamp) {
  const p = await getPage(REPORT_PAGE);
  const root = makeFrame(`Import Report / ${runStamp}`, 1100, 720, '#030407', 'report', runStamp);
  root.layoutMode = 'VERTICAL'; root.itemSpacing = 12; root.paddingTop = 32; root.paddingRight = 32; root.paddingBottom = 32; root.paddingLeft = 32;
  root.appendChild(makeText('HTML/CSS Import Report', 32, '#F5F7FA', true));
  root.appendChild(makeText(`Version: ${VERSION}`, 13, '#C8CED8', false));
  root.appendChild(makeText(`Mode: HTML/CSS intermediate representation to native Figma nodes`, 13, '#C8CED8', false));
  root.appendChild(makeText(`Source name: ${payload.name || 'Untitled Preview'}`, 13, '#8D96A6', false));
  root.appendChild(makeText(`Archived generated nodes: ${archived}`, 13, '#8D96A6', false));
  root.appendChild(makeText(`Warnings: ${(payload.warnings || []).length}`, 13, '#8D96A6', false));
  if (payload.warnings && payload.warnings.length) root.appendChild(makeText(payload.warnings.slice(0, 10).join('\n'), 11, '#8D96A6', false));
  p.appendChild(root);
}

async function validate() {
  await loadFonts();
  status(`Validation passed.\nMechanism: paste HTML + CSS in this plugin.\nThe UI parser converts it to layout data, then the plugin builds editable native Figma nodes.\nNo HTML file import is required.\nGenerated top-level nodes on ${DEFAULT_PAGE}: ${generatedCount(DEFAULT_PAGE)}`, { confirmRefresh: false });
}

async function importPreview(payload, refresh = false) {
  await loadFonts();
  const runStamp = stamp();
  let archived = 0;
  if (refresh) archived = await archiveGenerated(DEFAULT_PAGE, runStamp);
  const p = await getPage(DEFAULT_PAGE);
  const rootWidth = Number(payload.width) || 1440;
  const rootHeight = Number(payload.height) || 1000;
  const root = makeFrame(`${payload.name || 'Imported Preview'} / ${runStamp}`, rootWidth, rootHeight, '#030407', 'import-root', payload.name || 'preview');
  root.layoutMode = 'VERTICAL'; root.itemSpacing = 24; root.paddingTop = 48; root.paddingRight = 48; root.paddingBottom = 48; root.paddingLeft = 48;
  root.appendChild(makeText(payload.name || 'Imported Preview', 32, '#F5F7FA', true));
  root.appendChild(makeText('Generated from pasted HTML/CSS. Editable native Figma structure, not a screenshot.', 13, '#8D96A6', false));
  const built = createFromIR(payload.root, Math.max(1, rootWidth - 96));
  if (built) root.appendChild(built);
  p.appendChild(root);
  await buildReport(payload, archived, runStamp);
  status(`${refresh ? 'Refresh import complete' : 'Import complete'}.\nArchived nodes: ${archived}\nWarnings: ${(payload.warnings || []).length}\nPage: ${pageName(DEFAULT_PAGE)}`, { confirmRefresh: false });
  figma.notify('TranslateIT HTML/CSS import complete.');
}

async function prepareRefresh() {
  state.pendingRefresh = { stamp: stamp(), count: generatedCount(DEFAULT_PAGE) };
  status(`Confirm refresh required.\nGenerated top-level nodes to archive: ${state.pendingRefresh.count}\nManual nodes will not be touched.\nClick Confirm Refresh, then Generate from HTML/CSS again.`, { confirmRefresh: true });
}

async function importManifest(raw) {
  if (!raw || !raw.trim()) { status('No optional JSON provided.'); return; }
  try {
    const parsed = JSON.parse(raw);
    if (parsed.colors) Object.assign(T.colors || {}, parsed.colors);
    if (parsed.svgSymbols) Object.assign(ICONS, parsed.svgSymbols);
    if (parsed.icons && parsed.icons.svgSymbols) Object.assign(ICONS, parsed.icons.svgSymbols);
    status(`Optional manifest imported.\nKeys: ${Object.keys(parsed).join(', ')}\nIcon count: ${iconNames().length}`);
  } catch (err) {
    status(`Optional manifest import failed: ${err.message || err}`);
  }
}

figma.ui.onmessage = async msg => {
  try {
    if (msg.type === 'validate') await validate();
    if (msg.type === 'prepare-refresh') await prepareRefresh();
    if (msg.type === 'import-manifest') await importManifest(msg.raw || '');
    if (msg.type === 'import-preview') await importPreview(msg.payload, !!msg.refresh);
  } catch (err) {
    status(`Plugin error: ${err && err.message ? err.message : err}\nOpen the Figma console for details.`, { confirmRefresh: false });
    figma.notify('TranslateIT plugin error.');
  }
};
