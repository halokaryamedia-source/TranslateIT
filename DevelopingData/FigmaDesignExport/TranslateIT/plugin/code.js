figma.showUI(__html__, { width: 520, height: 720 });

// TranslateIT Figma Design Export
// Modular architecture: paste HTML/CSS -> parse to IR -> build editable native Figma nodes.
// This is not a screenshot importer and not a full browser renderer.

const NS = 'translateit.designExport';
const PAGE_PREFIX = 'TranslateIT Import / ';
const VERSION = '2026-06-html-css-ir-v2';
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
function tag(node, kind, source = '') { node.setSharedPluginData(NS, 'generated', 'true'); node.setSharedPluginData(NS, 'version', VERSION); node.setSharedPluginData(NS, 'kind', kind); node.setSharedPluginData(NS, 'source', source); return node; }
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

function hexToRgb(hex) { const value = /^#[0-9A-Fa-f]{6}$/.test(hex || '') ? hex : '#000000'; const n = parseInt(value.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; }
function paint(hex) { return [{ type: 'SOLID', color: hexToRgb(hex) }]; }
function parsePx(value, fallback) { if (typeof value === 'number' && Number.isFinite(value)) return value; if (!value) return fallback; const m = String(value).match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : fallback; }
function cssColor(value, fallback = '#11151C') {
  if (!value) return fallback;
  const v = String(value).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  const rgba = v.match(/rgba?\(([^)]+)\)/);
  if (rgba) { const parts = rgba[1].split(',').map(x => Math.max(0, Math.min(255, parseFloat(x)))); if (parts.length >= 3) return `#${parts.slice(0,3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('')}`; }
  const named = { transparent: null, black: '#000000', white: '#FFFFFF', red: '#FF0000', blue: '#0000FF', green: '#008000' };
  return Object.prototype.hasOwnProperty.call(named, v.toLowerCase()) ? named[v.toLowerCase()] : fallback;
}

function camel(prop) { return String(prop || '').trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }
function parseDecls(text) { const out = {}; String(text || '').split(';').forEach(part => { const i = part.indexOf(':'); if (i < 0) return; const key = camel(part.slice(0, i)); const value = part.slice(i + 1).trim(); if (key) out[key] = value; }); return out; }
function parseAttrs(raw) {
  const attrs = {};
  String(raw || '').replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g, (_, k, v) => { attrs[k] = String(v || '').replace(/^['"]|['"]$/g, ''); return ''; });
  return attrs;
}
function parseCss(css) {
  const clean = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = []; const vars = {};
  clean.replace(/([^{}]+)\{([^{}]*)\}/g, (_, selectorText, body) => { const decl = parseDecls(body); selectorText.split(',').map(s => s.trim()).filter(Boolean).forEach(selector => { if (selector === ':root') Object.assign(vars, decl); else rules.push({ selector, decl }); }); return ''; });
  return { rules, vars };
}
function resolveVars(style, vars) { const out = { ...style }; Object.keys(out).forEach(k => { out[k] = String(out[k]).replace(/var\((--[^),]+)(?:,[^)]+)?\)/g, (_, name) => vars[name.trim()] || ''); }); return out; }
function selectorMatches(selector, tag, attrs, classes) {
  if (!selector) return false;
  if (selector.includes(' ') || selector.includes('>') || selector.includes(':')) return false;
  if (selector[0] === '.') return classes.includes(selector.slice(1));
  if (selector[0] === '#') return attrs.id === selector.slice(1);
  if (selector.includes('.')) { const [t, c] = selector.split('.'); return (!t || t === tag) && classes.includes(c); }
  return selector.toLowerCase() === tag;
}
function styleFor(tag, attrs, classes, cssData) {
  let style = {};
  cssData.rules.forEach(rule => { if (selectorMatches(rule.selector, tag, attrs, classes)) style = { ...style, ...rule.decl }; });
  style = { ...style, ...parseDecls(attrs.style || '') };
  return resolveVars(style, cssData.vars);
}

function parseHtmlToIR(rawHtml, rawCss) {
  const warnings = [];
  const cssData = parseCss(rawCss);
  const html = String(rawHtml || '').replace(/<!doctype[^>]*>/ig, '').replace(/<script[\s\S]*?<\/script>/ig, '').replace(/<style[\s\S]*?<\/style>/ig, '');
  const root = { type: 'element', tag: 'body', attrs: {}, classes: [], style: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', backgroundColor: '#030407' }, children: [] };
  const stack = [root];
  const tokenRe = /<\/?[^>]+>|[^<]+/g;
  let token;
  while ((token = tokenRe.exec(html))) {
    const t = token[0];
    if (!t) continue;
    if (t.startsWith('</')) { if (stack.length > 1) stack.pop(); continue; }
    if (t.startsWith('<')) {
      const open = t.match(/^<\s*([a-zA-Z0-9-]+)/);
      if (!open) continue;
      const tag = open[1].toLowerCase();
      if (['html','head','meta','link','title'].includes(tag)) continue;
      const selfClosing = /\/\s*>$/.test(t) || ['br','hr','img','input'].includes(tag);
      const body = t.replace(/^<\s*[a-zA-Z0-9-]+/, '').replace(/\/?>$/, '');
      const attrs = parseAttrs(body);
      const classes = String(attrs.class || '').split(/\s+/).filter(Boolean);
      const node = { type: 'element', tag, attrs, classes, style: styleFor(tag, attrs, classes, cssData), children: [] };
      if (tag === 'img') { warnings.push(`img converted to placeholder: ${attrs.src || 'no src'}`); node.attrs['data-placeholder'] = 'image'; }
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) stack.push(node);
      continue;
    }
    const text = t.replace(/\s+/g, ' ').trim();
    if (text) stack[stack.length - 1].children.push({ type: 'text', text, style: {} });
  }
  return { root, warnings };
}

function makeFrame(name, width, height, background, kind = 'frame', source = '') { const node = figma.createFrame(); node.name = name; node.resize(Math.max(1, width), Math.max(1, height)); const bg = cssColor(background, null); node.fills = bg ? paint(bg) : []; node.strokes = []; return tag(node, kind, source || name); }
function makeText(value, size = 14, color = '#F5F7FA', bold = false) { const node = figma.createText(); node.name = `Text / ${String(value).slice(0, 40) || 'Empty'}`; node.fontName = bold ? state.fontBold : state.fontRegular; node.characters = String(value || ''); node.fontSize = Math.max(1, size); node.fills = paint(cssColor(color, '#F5F7FA')); return tag(node, 'text', node.characters.slice(0, 40)); }
function applyStyle(node, style = {}) { if ('borderRadius' in style) node.cornerRadius = parsePx(style.borderRadius, 0); if (style.borderColor || style.border) { node.strokes = paint(cssColor(style.borderColor || '#242B36', '#242B36')); node.strokeWeight = parsePx(style.borderWidth, 1); } if (style.opacity) node.opacity = Math.max(0, Math.min(1, Number(style.opacity) || 1)); }
function applyAutoLayout(node, style = {}) { const display = String(style.display || '').toLowerCase(); const direction = String(style.flexDirection || '').toLowerCase(); const isFlex = display === 'flex' || display === 'inline-flex'; node.layoutMode = isFlex && direction === 'row' ? 'HORIZONTAL' : 'VERTICAL'; node.itemSpacing = parsePx(style.gap || style.rowGap || style.columnGap, 12); const p = parsePx(style.padding, 0); node.paddingTop = parsePx(style.paddingTop, p); node.paddingRight = parsePx(style.paddingRight, p); node.paddingBottom = parsePx(style.paddingBottom, p); node.paddingLeft = parsePx(style.paddingLeft, p); }
function estimateSize(ir, parentWidth) { const s = ir.style || {}; const tag = ir.tag || 'div'; const childCount = (ir.children || []).length; const width = parsePx(s.width, tag === 'body' ? parentWidth : Math.min(parentWidth, 720)); let height = parsePx(s.height, NaN); if (!Number.isFinite(height)) height = ['button','input','select'].includes(tag) ? 44 : Math.max(56, childCount * 64 + parsePx(s.padding, 24) * 2); return { width, height }; }
function nodeLabel(ir) { const attrs = ir.attrs || {}; const classes = ir.classes || []; const id = attrs.id ? `#${attrs.id}` : ''; const cls = classes.length ? `.${classes.slice(0, 2).join('.')}` : ''; return attrs['data-component'] || attrs['data-name'] || `${ir.tag || 'node'}${id}${cls}` || 'Node'; }

function createFromIR(ir, parentWidth = 1200) {
  if (!ir) return null;
  if (ir.type === 'text') { const text = String(ir.text || '').trim(); if (!text) return null; return makeText(text, parsePx(ir.style && ir.style.fontSize, 14), ir.style && ir.style.color || '#F5F7FA', String(ir.style && ir.style.fontWeight || '').match(/bold|600|700|800|900/i)); }
  const style = ir.style || {}; const size = estimateSize(ir, parentWidth);
  const bg = ir.attrs && ir.attrs['data-placeholder'] === 'image' ? '#171C25' : (style.backgroundColor || style.background || 'transparent');
  const node = makeFrame(nodeLabel(ir), size.width, size.height, bg, ir.attrs && ir.attrs['data-component'] ? 'component-candidate' : 'html-frame', ir.tag || 'div');
  applyStyle(node, style); applyAutoLayout(node, style);
  if (ir.attrs && ir.attrs['data-placeholder'] === 'image') node.appendChild(makeText('Image placeholder', 12, '#8D96A6', false));
  for (const child of (ir.children || [])) { const childNode = createFromIR(child, Math.max(1, size.width - 40)); if (childNode) node.appendChild(childNode); }
  return node;
}

async function buildReport(payload, archived, runStamp) { const p = await getPage(REPORT_PAGE); const root = makeFrame(`Import Report / ${runStamp}`, 1100, 720, '#030407', 'report', runStamp); root.layoutMode = 'VERTICAL'; root.itemSpacing = 12; root.paddingTop = 32; root.paddingRight = 32; root.paddingBottom = 32; root.paddingLeft = 32; root.appendChild(makeText('HTML/CSS Import Report', 32, '#F5F7FA', true)); root.appendChild(makeText(`Version: ${VERSION}`, 13, '#C8CED8', false)); root.appendChild(makeText('Mode: pasted HTML/CSS to native editable Figma nodes', 13, '#C8CED8', false)); root.appendChild(makeText(`Source name: ${payload.name || 'Untitled Preview'}`, 13, '#8D96A6', false)); root.appendChild(makeText(`Archived generated nodes: ${archived}`, 13, '#8D96A6', false)); root.appendChild(makeText(`Warnings: ${(payload.warnings || []).length}`, 13, '#8D96A6', false)); if (payload.warnings && payload.warnings.length) root.appendChild(makeText(payload.warnings.slice(0, 10).join('\n'), 11, '#8D96A6', false)); p.appendChild(root); }
async function validate() { await loadFonts(); status(`Validation passed.\nMechanism: paste HTML + CSS.\nThe plugin parses structure and creates editable native Figma nodes.\nNo HTML file import is required.\nGenerated top-level nodes: ${generatedCount(DEFAULT_PAGE)}`, { confirmRefresh: false }); }
async function importPayload(payload, refresh = false) { await loadFonts(); const runStamp = stamp(); const parsed = parseHtmlToIR(payload.html, payload.css); payload.root = parsed.root; payload.warnings = [...(payload.warnings || []), ...parsed.warnings]; let archived = 0; if (refresh) archived = await archiveGenerated(DEFAULT_PAGE, runStamp); const p = await getPage(DEFAULT_PAGE); const rootWidth = Number(payload.width) || 1440; const rootHeight = Number(payload.height) || 1000; const root = makeFrame(`${payload.name || 'Imported Preview'} / ${runStamp}`, rootWidth, rootHeight, '#030407', 'import-root', payload.name || 'preview'); root.layoutMode = 'VERTICAL'; root.itemSpacing = 24; root.paddingTop = 48; root.paddingRight = 48; root.paddingBottom = 48; root.paddingLeft = 48; root.appendChild(makeText(payload.name || 'Imported Preview', 32, '#F5F7FA', true)); root.appendChild(makeText('Generated from pasted HTML/CSS. Editable native Figma structure, not a screenshot.', 13, '#8D96A6', false)); const built = createFromIR(payload.root, Math.max(1, rootWidth - 96)); if (built) root.appendChild(built); p.appendChild(root); await buildReport(payload, archived, runStamp); status(`${refresh ? 'Refresh import complete' : 'Import complete'}.\nArchived nodes: ${archived}\nWarnings: ${(payload.warnings || []).length}\nPage: ${pageName(DEFAULT_PAGE)}`, { confirmRefresh: false }); figma.notify('TranslateIT HTML/CSS import complete.'); }
async function prepareRefresh() { state.pendingRefresh = { stamp: stamp(), count: generatedCount(DEFAULT_PAGE) }; status(`Generated top-level nodes to archive: ${state.pendingRefresh.count}\nManual nodes will not be touched.\nUse Generate + Archive Previous to continue.`, { confirmRefresh: true }); }
async function importManifest(raw) { if (!raw || !raw.trim()) { status('No optional JSON provided.'); return; } try { const parsed = JSON.parse(raw); status(`Optional manifest accepted. Current generic importer mainly uses pasted HTML/CSS. Keys: ${Object.keys(parsed).join(', ')}`); } catch (err) { status(`Optional manifest import failed: ${err.message || err}`); } }

figma.ui.onmessage = async msg => {
  try {
    if (msg.type === 'validate') await validate();
    if (msg.type === 'prepare-refresh') await prepareRefresh();
    if (msg.type === 'import-manifest') await importManifest(msg.raw || '');
    if (msg.type === 'import-raw') await importPayload(msg.payload || {}, !!msg.refresh);
  } catch (err) {
    status(`Plugin error: ${err && err.message ? err.message : err}\nOpen the Figma console for details.`, { confirmRefresh: false });
    figma.notify('TranslateIT plugin error.');
  }
};
