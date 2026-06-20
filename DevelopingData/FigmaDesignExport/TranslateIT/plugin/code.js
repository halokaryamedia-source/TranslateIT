figma.showUI(__html__, { width: 520, height: 650 });

// TranslateIT Figma Design Export
// Single self-contained HTML -> one Figma page -> modular editable sections.
// Icon symbols become Figma component masters; UI uses component instances.

const NS = 'translateit.designExport';
const VERSION = '2026-06-single-page-components-v1';
const WORKSPACE_PAGE = 'TranslateIT Import / Workspace';

const state = {
  fontRegular: { family: 'Inter', style: 'Regular' },
  fontBold: { family: 'Inter', style: 'Bold' }
};

const FALLBACK_ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  file: '<path d="M8 4h6l3 3v13H8V4Z"/><path d="M14 4v4h4"/>',
  folder: '<path d="M4 7h6l2 2h8v9H4V7Z"/>',
  shield: '<path d="M12 4 6 7v5c0 4 2.4 7 6 8 3.6-1 6-4 6-8V7l-6-3Z"/>',
  mic: '<path d="M12 14a4 4 0 0 0 4-4V7a4 4 0 0 0-8 0v3a4 4 0 0 0 4 4Z"/><path d="M19 10a7 7 0 0 1-14 0M12 17v4M8 21h8"/>',
  speaker: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  settings: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M4.2 7.5l1.8 1M18 15.5l1.8 1M4.2 16.5l1.8-1M18 8.5l1.8-1M3 12h2M19 12h2"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  code: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3"/>'
};

function status(text) { figma.ui.postMessage({ type: 'status', text }); }
function stamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function tag(node, kind, source = '') {
  node.setSharedPluginData(NS, 'generated', 'true');
  node.setSharedPluginData(NS, 'version', VERSION);
  node.setSharedPluginData(NS, 'kind', kind);
  node.setSharedPluginData(NS, 'source', source);
  return node;
}
function isTagged(node) { return node.getSharedPluginData(NS, 'generated') === 'true'; }
function kindOf(node) { return node.getSharedPluginData(NS, 'kind'); }

async function loadFonts() {
  try { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); state.fontRegular = { family: 'Inter', style: 'Regular' }; }
  catch (_) { state.fontRegular = { family: 'Roboto', style: 'Regular' }; await figma.loadFontAsync(state.fontRegular); }
  try { await figma.loadFontAsync({ family: 'Inter', style: 'Bold' }); state.fontBold = { family: 'Inter', style: 'Bold' }; }
  catch (_) { state.fontBold = state.fontRegular; }
}

async function workspacePage() {
  let p = figma.root.children.find(x => x.name === WORKSPACE_PAGE);
  if (!p) p = figma.createPage();
  p.name = WORKSPACE_PAGE;
  p.setSharedPluginData(NS, 'ownedPage', 'true');
  await figma.setCurrentPageAsync(p);
  return p;
}

function hexToRgb(hex) {
  const value = /^#[0-9A-Fa-f]{6}$/.test(hex || '') ? hex : '#000000';
  const n = parseInt(value.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function paint(hex) { return [{ type: 'SOLID', color: hexToRgb(hex) }]; }
function parsePx(value, fallback) { const m = String(value || '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : fallback; }
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

function makeFrame(name, w, h, bg = 'transparent', kind = 'frame', source = '') {
  const n = figma.createFrame();
  n.name = name;
  n.resize(Math.max(1, w), Math.max(1, h));
  const color = cssColor(bg, null);
  n.fills = color ? paint(color) : [];
  n.strokes = [];
  return tag(n, kind, source || name);
}
function makeText(value, size = 14, color = '#F5F7FA', bold = false) {
  const n = figma.createText();
  n.name = `Text / ${String(value).slice(0, 44) || 'Empty'}`;
  n.fontName = bold ? state.fontBold : state.fontRegular;
  n.characters = String(value || '');
  n.fontSize = Math.max(1, size);
  n.fills = paint(cssColor(color, '#F5F7FA'));
  return tag(n, 'text', n.characters.slice(0, 44));
}
function setCol(node, gap = 16, pad = 24) {
  node.layoutMode = 'VERTICAL'; node.itemSpacing = gap;
  node.paddingTop = pad; node.paddingRight = pad; node.paddingBottom = pad; node.paddingLeft = pad;
}
function setRow(node, gap = 12, pad = 12) {
  node.layoutMode = 'HORIZONTAL'; node.itemSpacing = gap;
  node.paddingTop = pad; node.paddingRight = pad; node.paddingBottom = pad; node.paddingLeft = pad;
  node.counterAxisAlignItems = 'CENTER';
}

function camel(prop) { return String(prop || '').trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }
function parseDecls(text) {
  const out = {};
  String(text || '').split(';').forEach(part => {
    const i = part.indexOf(':');
    if (i < 0) return;
    const key = camel(part.slice(0, i));
    const value = part.slice(i + 1).trim();
    if (key) out[key] = value;
  });
  return out;
}
function parseAttrs(raw) {
  const attrs = {};
  String(raw || '').replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g, (_, k, v) => {
    attrs[k] = String(v || '').replace(/^['"]|['"]$/g, '');
    return '';
  });
  return attrs;
}
function extractStyleBlocks(html) {
  const blocks = [];
  const body = String(html || '').replace(/<style\b[^>]*>([\s\S]*?)<\/style>/ig, (_, css) => { blocks.push(css || ''); return ''; });
  return { html: body, css: blocks.join('\n\n') };
}
function extractSymbols(html) {
  const symbols = {};
  const body = String(html || '').replace(/<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/ig, (full, attrRaw, inner) => {
    const attrs = parseAttrs(attrRaw);
    if (attrs.id) symbols[attrs.id] = inner;
    return '';
  }).replace(/<defs\b[^>]*>[\s\S]*?<\/defs>/ig, '');
  return { html: body, symbols };
}
function parseCss(css) {
  const clean = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = []; const vars = {};
  clean.replace(/([^{}]+)\{([^{}]*)\}/g, (_, selectorText, body) => {
    const decl = parseDecls(body);
    selectorText.split(',').map(s => s.trim()).filter(Boolean).forEach(selector => {
      if (selector === ':root') Object.assign(vars, decl); else rules.push({ selector, decl });
    });
    return '';
  });
  return { rules, vars };
}
function resolveVars(style, vars) {
  const out = { ...style };
  Object.keys(out).forEach(k => { out[k] = String(out[k]).replace(/var\((--[^),]+)(?:,[^)]+)?\)/g, (_, name) => vars[name.trim()] || ''); });
  return out;
}
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

function parseHtmlToIR(rawHtml) {
  const warnings = [];
  const styleExtract = extractStyleBlocks(rawHtml);
  const symbolExtract = extractSymbols(styleExtract.html);
  const cssData = parseCss(styleExtract.css);
  let html = symbolExtract.html
    .replace(/<!doctype[^>]*>/ig, '')
    .replace(/<script[\s\S]*?<\/script>/ig, '')
    .replace(/<link[^>]*rel=["']?stylesheet["']?[^>]*>/ig, () => { warnings.push('External stylesheet link ignored. Embed CSS in <style>.'); return ''; });
  if (!styleExtract.css.trim()) warnings.push('No <style> CSS found. Generic layout will be used.');
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
      if (['html','head','meta','link','title','style'].includes(tag)) continue;
      const selfClosing = /\/\s*>$/.test(t) || ['br','hr','img','input','use'].includes(tag);
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
  return { root, symbols: { ...FALLBACK_ICONS, ...symbolExtract.symbols }, warnings, cssLength: styleExtract.css.length };
}

function applyStyle(node, style = {}) {
  if ('borderRadius' in style) node.cornerRadius = parsePx(style.borderRadius, 0);
  if (style.borderColor || style.border) { node.strokes = paint(cssColor(style.borderColor || '#242B36', '#242B36')); node.strokeWeight = parsePx(style.borderWidth, 1); }
  if (style.opacity) node.opacity = Math.max(0, Math.min(1, Number(style.opacity) || 1));
}
function applyLayout(node, style = {}) {
  const display = String(style.display || '').toLowerCase();
  const direction = String(style.flexDirection || '').toLowerCase();
  const isFlex = display === 'flex' || display === 'inline-flex';
  if (isFlex && direction === 'row') setRow(node, parsePx(style.gap || style.columnGap, 12), 0); else setCol(node, parsePx(style.gap || style.rowGap, 12), 0);
  const p = parsePx(style.padding, 0);
  node.paddingTop = parsePx(style.paddingTop, p); node.paddingRight = parsePx(style.paddingRight, p); node.paddingBottom = parsePx(style.paddingBottom, p); node.paddingLeft = parsePx(style.paddingLeft, p);
}
function estimateSize(ir, parentWidth) {
  const s = ir.style || {}; const tag = ir.tag || 'div'; const childCount = (ir.children || []).length;
  const width = parsePx(s.width, tag === 'body' ? parentWidth : Math.min(parentWidth, 720));
  let height = parsePx(s.height, NaN);
  if (!Number.isFinite(height)) height = ['button','input','select'].includes(tag) ? 44 : Math.max(48, childCount * 56 + parsePx(s.padding, 20) * 2);
  return { width, height };
}
function nodeLabel(ir) {
  const attrs = ir.attrs || {}; const classes = ir.classes || [];
  const id = attrs.id ? `#${attrs.id}` : '';
  const cls = classes.length ? `.${classes.slice(0, 2).join('.')}` : '';
  return attrs['data-component'] || attrs['data-name'] || `${ir.tag || 'node'}${id}${cls}` || 'Node';
}
function hrefIconName(href) { return String(href || '').split('#').pop().trim(); }
function findUseIcon(ir) {
  if (!ir || !ir.children) return '';
  for (const child of ir.children) {
    if (child.tag === 'use') return hrefIconName((child.attrs && (child.attrs.href || child.attrs['xlink:href'])) || '');
    const nested = findUseIcon(child);
    if (nested) return nested;
  }
  return '';
}

function createIconMaster(name, svgBody) {
  const comp = figma.createComponent();
  comp.name = `Icon/${name}`;
  comp.resize(24, 24);
  comp.fills = [];
  try {
    const svg = figma.createNodeFromSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C8CED8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgBody}</svg>`);
    svg.name = `Glyph/${name}`; svg.x = 0; svg.y = 0; comp.appendChild(svg);
  } catch (_) {
    const fallback = makeText('□', 18, '#C8CED8', false); fallback.x = 3; fallback.y = 1; comp.appendChild(fallback);
  }
  return tag(comp, 'icon-master', name);
}
function iconInstance(name, masters) {
  const master = masters[name] || masters.file || masters.plus;
  if (!master) return makeText('□', 16, '#8D96A6', false);
  const inst = master.createInstance();
  inst.name = `Icon Instance/${name}`;
  return tag(inst, 'icon-instance', name);
}

function createFromIR(ir, parentWidth, masters, inherited = {}) {
  if (!ir) return null;
  if (ir.type === 'text') {
    const text = String(ir.text || '').trim(); if (!text) return null;
    const style = { ...inherited, ...(ir.style || {}) };
    return makeText(text, parsePx(style.fontSize, 14), style.color || '#F5F7FA', String(style.fontWeight || '').match(/bold|600|700|800|900/i));
  }
  const attrs = ir.attrs || {};
  if (attrs['data-icon']) return iconInstance(attrs['data-icon'], masters);
  if (ir.tag === 'use') return iconInstance(hrefIconName(attrs.href || attrs['xlink:href']), masters);
  if (ir.tag === 'svg') {
    const icon = findUseIcon(ir);
    if (icon) return iconInstance(icon, masters);
  }
  if (['defs','symbol'].includes(ir.tag)) return null;
  const style = ir.style || {}; const size = estimateSize(ir, parentWidth);
  const bg = attrs['data-placeholder'] === 'image' ? '#171C25' : (style.backgroundColor || style.background || 'transparent');
  const node = makeFrame(nodeLabel(ir), size.width, size.height, bg, attrs['data-component'] ? 'component-candidate' : 'html-frame', ir.tag || 'div');
  applyStyle(node, style); applyLayout(node, style);
  if (attrs['data-placeholder'] === 'image') node.appendChild(makeText('Image placeholder', 12, '#8D96A6', false));
  const nextInherited = { ...inherited };
  ['color','fontSize','fontWeight'].forEach(k => { if (style[k]) nextInherited[k] = style[k]; });
  for (const child of (ir.children || [])) { const childNode = createFromIR(child, Math.max(1, size.width - 40), masters, nextInherited); if (childNode) node.appendChild(childNode); }
  return node;
}

function buildComponentPreview(symbols) {
  const section = makeFrame('00 Component Preview', 1440, 420, '#030407', 'section', 'component-preview');
  setCol(section, 18, 32);
  section.appendChild(makeText('00 Component Preview', 28, '#F5F7FA', true));
  section.appendChild(makeText('Reusable icon masters live here. UI below uses instances, so editing a master icon updates its instances.', 13, '#8D96A6', false));
  const grid = makeFrame('Icon Masters', 1280, 260, 'transparent', 'section-grid', 'icon-masters');
  grid.layoutMode = 'HORIZONTAL'; grid.layoutWrap = 'WRAP'; grid.itemSpacing = 14; grid.counterAxisSpacing = 14; grid.paddingTop = 0; grid.paddingRight = 0; grid.paddingBottom = 0; grid.paddingLeft = 0; grid.fills = [];
  const masters = {};
  Object.entries(symbols).forEach(([name, body]) => {
    const card = makeFrame(`Icon Card/${name}`, 90, 78, '#0B0E14', 'component-card', name);
    setCol(card, 6, 8); card.cornerRadius = 10; card.strokes = paint('#242B36'); card.strokeWeight = 1;
    const master = createIconMaster(name, body);
    masters[name] = master;
    card.appendChild(master);
    card.appendChild(makeText(name, 8, '#8D96A6', false));
    grid.appendChild(card);
  });
  section.appendChild(grid);
  return { section, masters };
}

async function archiveOldRuns(page, runStamp) {
  const old = page.children.filter(n => isTagged(n) && kindOf(n) === 'import-run');
  if (!old.length) return 0;
  const archive = makeFrame(`98 Archive / ${runStamp}`, 1440, Math.max(280, old.length * 220), '#030407', 'archive-root', runStamp);
  setCol(archive, 18, 32);
  archive.x = 0; archive.y = 1280;
  archive.appendChild(makeText('98 Archive', 28, '#F5F7FA', true));
  archive.appendChild(makeText('Previous generated import runs were moved here. Manual layers were not touched.', 13, '#8D96A6', false));
  page.appendChild(archive);
  old.forEach((node, index) => { node.x = 0; node.y = 84 + index * 220; archive.appendChild(node); });
  return old.length;
}

async function importSingleHtml(payload, refresh) {
  await loadFonts();
  const page = await workspacePage();
  const runStamp = stamp();
  const parsed = parseHtmlToIR(payload.html || '');
  let archived = 0;
  if (refresh) archived = await archiveOldRuns(page, runStamp);
  const width = Number(payload.width) || 1440;
  const height = Number(payload.height) || 1200;
  const run = makeFrame(`${payload.name || 'Single HTML Import'} / ${runStamp}`, width, height, '#030407', 'import-run', payload.name || 'single-html');
  run.x = 0; run.y = 0;
  setCol(run, 28, 48);
  run.appendChild(makeText(payload.name || 'Single HTML Import', 32, '#F5F7FA', true));
  run.appendChild(makeText('One-page output. Sections are modular frames. Icons are component masters plus instances.', 13, '#8D96A6', false));
  const { section, masters } = buildComponentPreview(parsed.symbols);
  run.appendChild(section);
  const uiSection = makeFrame('01 Imported UI', Math.max(320, width - 96), Math.max(240, height - 640), '#030407', 'section', 'imported-ui');
  setCol(uiSection, 18, 32);
  uiSection.appendChild(makeText('01 Imported UI', 28, '#F5F7FA', true));
  const built = createFromIR(parsed.root, Math.max(320, width - 160), masters);
  if (built) uiSection.appendChild(built);
  run.appendChild(uiSection);
  const report = makeFrame('99 Import Report', Math.max(320, width - 96), 180, '#0B0E14', 'section', 'report');
  report.cornerRadius = 16; report.strokes = paint('#242B36'); report.strokeWeight = 1; setCol(report, 8, 20);
  report.appendChild(makeText('99 Import Report', 20, '#F5F7FA', true));
  report.appendChild(makeText(`Version: ${VERSION}`, 12, '#C8CED8', false));
  report.appendChild(makeText(`Embedded CSS chars: ${parsed.cssLength} / Symbols: ${Object.keys(parsed.symbols).length} / Archived runs: ${archived}`, 12, '#8D96A6', false));
  if (parsed.warnings.length) report.appendChild(makeText(`Warnings: ${parsed.warnings.join(' | ')}`, 11, '#8D96A6', false));
  run.appendChild(report);
  page.appendChild(run);
  status(`Import complete.\nOutput page: ${WORKSPACE_PAGE}\nTop-level run: ${run.name}\nArchived previous runs: ${archived}\nIcons as reusable component masters: ${Object.keys(parsed.symbols).length}`);
  figma.notify('Single HTML import complete.');
}

async function validate() {
  await loadFonts();
  const page = figma.root.children.find(x => x.name === WORKSPACE_PAGE);
  const runs = page ? page.children.filter(n => isTagged(n) && kindOf(n) === 'import-run').length : 0;
  status(`Validation passed.\nCSS input is no longer required.\nUse one self-contained HTML with <style>.\nOutput is one Figma page: ${WORKSPACE_PAGE}\nExisting generated runs: ${runs}`);
}
async function prepareRefresh() {
  const page = figma.root.children.find(x => x.name === WORKSPACE_PAGE);
  const runs = page ? page.children.filter(n => isTagged(n) && kindOf(n) === 'import-run').length : 0;
  status(`Refresh ready.\nGenerated import runs to archive: ${runs}\nClick Generate + Archive Previous after pasting the new single HTML package.`);
}

figma.ui.onmessage = async msg => {
  try {
    if (msg.type === 'validate') await validate();
    if (msg.type === 'prepare-refresh') await prepareRefresh();
    if (msg.type === 'import-single-html') await importSingleHtml(msg.payload || {}, !!msg.refresh);
  } catch (err) {
    status(`Plugin error: ${err && err.message ? err.message : err}\nOpen Figma console for details.`);
    figma.notify('TranslateIT plugin error.');
  }
};
