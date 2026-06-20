figma.showUI(__html__, { width: 580, height: 820 });

// TranslateIT Figma Design Export
// One self-contained HTML -> one Figma workspace page -> modular editable sections -> UI Build Package JSON.
// This plugin is not a browser engine. It creates editable/buildable Figma structure and warns about unsupported UI features.

const NS = 'translateit.designExport';
const VERSION = '2026-06-ui-build-package-v3-ready-to-use';
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
  code: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3"/>',
  send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 4.4 2.7 18a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 4.4a2 2 0 0 0-3.4 0Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>'
};

const SUPPORTED_CSS_PROPERTIES = new Set([
  'display',
  'flexDirection',
  'gap',
  'rowGap',
  'columnGap',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'background',
  'backgroundColor',
  'color',
  'border',
  'borderColor',
  'borderWidth',
  'borderRadius',
  'opacity',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'alignItems',
  'justifyContent'
]);

const UNSUPPORTED_CSS_PATTERNS = [
  { label: 'CSS grid', pattern: /\bdisplay\s*:\s*(inline-)?grid\b/i },
  { label: 'absolute/fixed/sticky positioning', pattern: /\bposition\s*:\s*(absolute|fixed|sticky)\b/i },
  { label: 'media queries', pattern: /@media\b/i },
  { label: 'container queries', pattern: /@container\b/i },
  { label: 'pseudo-elements or pseudo-classes', pattern: /::?[a-z-]+/i },
  { label: 'CSS animation/keyframes', pattern: /@keyframes\b|\banimation\s*:/i },
  { label: 'CSS transform', pattern: /\btransform\s*:/i },
  { label: 'external url() assets', pattern: /url\(/i },
  { label: 'box-shadow', pattern: /\bbox-shadow\s*:/i },
  { label: 'filter/backdrop-filter', pattern: /\b(backdrop-filter|filter)\s*:/i }
];

function status(text, extra = {}) { figma.ui.postMessage({ type: 'status', text, ...extra }); }
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
function sourceOf(node) { return node.getSharedPluginData(NS, 'source'); }
function setData(node, key, value) { if (value !== undefined && value !== null && String(value) !== '') node.setSharedPluginData(NS, key, String(value)); }
function getData(node, key) { return node.getSharedPluginData(NS, key); }

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

function hexToRgb(hex) { const value = /^#[0-9A-Fa-f]{6}$/.test(hex || '') ? hex : '#000000'; const n = parseInt(value.slice(1), 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; }
function rgbToHex(c) { const h = n => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0'); return `#${h(c.r)}${h(c.g)}${h(c.b)}`; }
function paint(hex) { return [{ type: 'SOLID', color: hexToRgb(hex) }]; }
function parsePx(value, fallback) { const m = String(value || '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : fallback; }
function cssColor(value, fallback = '#11151C') {
  if (!value) return fallback;
  const v = String(value).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  const hex = v.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/);
  if (hex) return cssColor(hex[0], fallback);
  const rgba = v.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const parts = rgba[1].split(',').map(x => Math.max(0, Math.min(255, parseFloat(x))));
    if (parts.length >= 3) return `#${parts.slice(0, 3).map(n => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
  }
  const named = {
    transparent: null,
    black: '#000000',
    white: '#FFFFFF',
    red: '#FF0000',
    blue: '#0000FF',
    green: '#008000',
    gray: '#808080',
    grey: '#808080',
    yellow: '#FFFF00',
    orange: '#FFA500',
    purple: '#800080'
  };
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
function setCol(node, gap = 16, pad = 24) { node.layoutMode = 'VERTICAL'; node.itemSpacing = gap; node.paddingTop = pad; node.paddingRight = pad; node.paddingBottom = pad; node.paddingLeft = pad; }
function setRow(node, gap = 12, pad = 12) { node.layoutMode = 'HORIZONTAL'; node.itemSpacing = gap; node.paddingTop = pad; node.paddingRight = pad; node.paddingBottom = pad; node.paddingLeft = pad; node.counterAxisAlignItems = 'CENTER'; }

function camel(prop) {
  const key = String(prop || '').trim();
  if (key.startsWith('--')) return key;
  return key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
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
function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}
function scanUnsupportedCss(css) {
  const warnings = [];
  const unsupportedProperties = [];
  const text = String(css || '');
  for (const rule of UNSUPPORTED_CSS_PATTERNS) {
    if (rule.pattern.test(text)) warnings.push(`${rule.label} detected. It will be approximated or ignored.`);
  }
  text.replace(/([^{}]+)\{([^{}]*)\}/g, (_, selectorText, body) => {
    selectorText.split(',').map(s => s.trim()).filter(Boolean).forEach(selector => {
      if (selector.includes(' ') || selector.includes('>') || selector.includes('+') || selector.includes('~') || selector.includes('[') || selector.includes(':')) {
        warnings.push(`Complex selector ignored or partially matched: ${selector}`);
      }
    });
    Object.keys(parseDecls(body)).forEach(prop => {
      if (prop.startsWith('--')) return;
      if (!SUPPORTED_CSS_PROPERTIES.has(prop)) unsupportedProperties.push(prop);
    });
    return '';
  });
  if (unsupportedProperties.length) warnings.push(`Unsupported CSS properties ignored: ${unique(unsupportedProperties).slice(0, 18).join(', ')}`);
  return unique(warnings);
}
function parseCss(css) {
  const clean = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = []; const vars = {};
  const warnings = scanUnsupportedCss(clean);
  clean.replace(/([^{}]+)\{([^{}]*)\}/g, (_, selectorText, body) => {
    const decl = parseDecls(body);
    selectorText.split(',').map(s => s.trim()).filter(Boolean).forEach(selector => {
      if (selector === ':root') Object.assign(vars, decl); else rules.push({ selector, decl });
    });
    return '';
  });
  return { rules, vars, warnings };
}
function resolveVars(style, vars) {
  const out = { ...style };
  Object.keys(out).forEach(k => {
    out[k] = String(out[k]).replace(/var\((--[^),]+)(?:,[^)]+)?\)/g, (_, name) => vars[name.trim()] || '');
  });
  return out;
}
function selectorMatches(selector, tag, attrs, classes) {
  if (!selector) return false;
  if (selector.includes(' ') || selector.includes('>') || selector.includes('+') || selector.includes('~') || selector.includes('[') || selector.includes(':')) return false;
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
function walkIr(ir, fn) {
  if (!ir) return;
  fn(ir);
  for (const child of ir.children || []) walkIr(child, fn);
}
function analyzeIr(root, symbols) {
  const result = {
    elements: 0,
    textNodes: 0,
    components: 0,
    actions: 0,
    binds: 0,
    slots: 0,
    icons: 0,
    missingIconRefs: []
  };
  walkIr(root, node => {
    if (node.type === 'text') { result.textNodes += 1; return; }
    result.elements += 1;
    const attrs = node.attrs || {};
    if (attrs['data-component']) result.components += 1;
    if (attrs['data-action']) result.actions += 1;
    if (attrs['data-bind']) result.binds += 1;
    if (attrs['data-slot']) result.slots += 1;
    if (attrs['data-icon']) {
      result.icons += 1;
      if (!symbols[attrs['data-icon']] && !FALLBACK_ICONS[attrs['data-icon']]) result.missingIconRefs.push(attrs['data-icon']);
    }
  });
  result.missingIconRefs = unique(result.missingIconRefs);
  return result;
}
function readinessFrom(parsed) {
  let score = 100;
  const blockers = [];
  const warnings = [...parsed.warnings];

  if (!parsed.rawHtmlLength) { score -= 60; blockers.push('HTML package is empty.'); }
  if (!parsed.cssLength) { score -= 15; warnings.push('No embedded CSS found. Output will use generic layout.'); }
  if (!parsed.analysis.components) { score -= 10; warnings.push('No data-component attributes found. Component handoff will be weak.'); }
  if (!parsed.analysis.actions) { score -= 7; warnings.push('No data-action attributes found. UI may not trigger backend actions.'); }
  if (!parsed.analysis.binds && !parsed.analysis.slots) { score -= 7; warnings.push('No data-bind/data-slot attributes found. Runtime state/output handoff will be weak.'); }
  if (parsed.analysis.missingIconRefs.length) { score -= 10; warnings.push(`Missing icon symbol(s): ${parsed.analysis.missingIconRefs.slice(0, 10).join(', ')}`); }
  score -= Math.min(30, parsed.warnings.length * 3);
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    level: blockers.length ? 'BLOCKED' : score >= 85 ? 'READY' : score >= 70 ? 'USABLE_WITH_WARNINGS' : 'NEEDS_CLEANUP',
    blockers,
    warnings: unique(warnings).slice(0, 40)
  };
}

function parseHtmlToIR(rawHtml) {
  const warnings = [];
  const styleExtract = extractStyleBlocks(rawHtml);
  const symbolExtract = extractSymbols(styleExtract.html);
  const cssData = parseCss(styleExtract.css);
  warnings.push(...cssData.warnings);
  let html = symbolExtract.html
    .replace(/<!doctype[^>]*>/ig, '')
    .replace(/<script[\s\S]*?<\/script>/ig, () => { warnings.push('Script tag ignored. Runtime logic must be connected through data-action/data-backend.'); return ''; })
    .replace(/<link[^>]*rel=["']?stylesheet["']?[^>]*>/ig, () => { warnings.push('External stylesheet link ignored. Embed CSS in <style>.'); return ''; });
  if (!String(rawHtml || '').trim()) warnings.push('HTML package is empty.');
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
      if (['html', 'head', 'meta', 'link', 'title', 'style'].includes(tag)) continue;
      const selfClosing = /\/\s*>$/.test(t) || ['br', 'hr', 'img', 'input', 'use'].includes(tag);
      const body = t.replace(/^<\s*[a-zA-Z0-9-]+/, '').replace(/\/?>$/, '');
      const attrs = parseAttrs(body);
      const classes = String(attrs.class || '').split(/\s+/).filter(Boolean);
      const node = { type: 'element', tag, attrs, classes, style: styleFor(tag, attrs, classes, cssData), children: [] };
      if (tag === 'img') { warnings.push(`img converted to placeholder: ${attrs.src || 'no src'}`); node.attrs['data-placeholder'] = 'image'; }
      if (tag === 'input' && !attrs.placeholder && !attrs.value && !attrs['aria-label']) warnings.push('input has no placeholder/value/aria-label. Placeholder text will be generic.');
      stack[stack.length - 1].children.push(node);
      if (!selfClosing) stack.push(node);
      continue;
    }
    const text = t.replace(/\s+/g, ' ').trim();
    if (text) stack[stack.length - 1].children.push({ type: 'text', text, style: {} });
  }
  const symbols = { ...FALLBACK_ICONS, ...symbolExtract.symbols };
  const parsed = {
    root,
    symbols,
    warnings: unique(warnings),
    cssLength: styleExtract.css.length,
    rawHtmlLength: String(rawHtml || '').length,
    analysis: analyzeIr(root, symbols)
  };
  parsed.readiness = readinessFrom(parsed);
  return parsed;
}

function applyStyle(node, style = {}) {
  const radius = style.borderRadius || style.radius;
  if (radius !== undefined) node.cornerRadius = parsePx(radius, 0);
  const borderColor = style.borderColor || cssColor(style.border, null);
  if (borderColor || style.border) {
    node.strokes = paint(borderColor || '#242B36');
    node.strokeWeight = parsePx(style.borderWidth || style.border, 1);
  }
  if (style.opacity) node.opacity = Math.max(0, Math.min(1, Number(style.opacity) || 1));
}
function applyLayout(node, style = {}) {
  const display = String(style.display || '').toLowerCase();
  const direction = String(style.flexDirection || '').toLowerCase();
  const isFlex = display === 'flex' || display === 'inline-flex';
  if (isFlex && direction === 'row') setRow(node, parsePx(style.gap || style.columnGap, 12), 0); else setCol(node, parsePx(style.gap || style.rowGap, 12), 0);
  const p = parsePx(style.padding, 0);
  node.paddingTop = parsePx(style.paddingTop, p); node.paddingRight = parsePx(style.paddingRight, p); node.paddingBottom = parsePx(style.paddingBottom, p); node.paddingLeft = parsePx(style.paddingLeft, p);
  const align = String(style.alignItems || '').toLowerCase();
  if (align === 'center') node.counterAxisAlignItems = 'CENTER';
  if (align === 'flex-end' || align === 'end') node.counterAxisAlignItems = 'MAX';
  if (align === 'flex-start' || align === 'start') node.counterAxisAlignItems = 'MIN';
  const justify = String(style.justifyContent || '').toLowerCase();
  if (justify === 'center') node.primaryAxisAlignItems = 'CENTER';
  if (justify === 'flex-end' || justify === 'end') node.primaryAxisAlignItems = 'MAX';
  if (justify === 'space-between') node.primaryAxisAlignItems = 'SPACE_BETWEEN';
}
function estimateSize(ir, parentWidth) {
  const s = ir.style || {}; const tag = ir.tag || 'div'; const childCount = (ir.children || []).length;
  const width = parsePx(s.width, parsePx(s.minWidth, tag === 'body' ? parentWidth : Math.min(parentWidth, 720)));
  let height = parsePx(s.height, parsePx(s.minHeight, NaN));
  if (!Number.isFinite(height)) height = ['button', 'input', 'select', 'textarea'].includes(tag) ? 44 : Math.max(48, childCount * 56 + parsePx(s.padding, 20) * 2);
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
function storeBindingData(node, attrs = {}) { ['data-action', 'data-bind', 'data-slot', 'data-route', 'data-state', 'data-component', 'data-backend', 'role', 'aria-label'].forEach(key => setData(node, key, attrs[key])); }
function iconInstance(name, masters, attrs = {}) {
  const master = masters[name] || masters.file || masters.plus;
  if (!master) return makeText('□', 16, '#8D96A6', false);
  const inst = tag(master.createInstance(), 'icon-instance', name);
  inst.name = `Icon Instance/${name}`;
  storeBindingData(inst, attrs);
  return inst;
}

function controlPlaceholderText(ir) {
  const attrs = ir.attrs || {};
  if (attrs.placeholder) return attrs.placeholder;
  if (attrs.value) return attrs.value;
  if (attrs['aria-label']) return attrs['aria-label'];
  if (ir.tag === 'textarea') return 'Textarea placeholder';
  if (ir.tag === 'input') return 'Input field';
  return '';
}

function createFromIR(ir, parentWidth, masters, inherited = {}) {
  if (!ir) return null;
  if (ir.type === 'text') {
    const text = String(ir.text || '').trim(); if (!text) return null;
    const style = { ...inherited, ...(ir.style || {}) };
    return makeText(text, parsePx(style.fontSize, 14), style.color || '#F5F7FA', String(style.fontWeight || '').match(/bold|600|700|800|900/i));
  }
  const attrs = ir.attrs || {};
  if (attrs['data-icon']) return iconInstance(attrs['data-icon'], masters, attrs);
  if (ir.tag === 'use') return iconInstance(hrefIconName(attrs.href || attrs['xlink:href']), masters, attrs);
  if (ir.tag === 'svg') { const icon = findUseIcon(ir); if (icon) return iconInstance(icon, masters, attrs); }
  if (['defs', 'symbol'].includes(ir.tag)) return null;
  const style = ir.style || {}; const size = estimateSize(ir, parentWidth);
  const bg = attrs['data-placeholder'] === 'image' ? '#171C25' : (style.backgroundColor || style.background || 'transparent');
  const node = makeFrame(nodeLabel(ir), size.width, size.height, bg, attrs['data-component'] ? 'component-candidate' : 'html-frame', ir.tag || 'div');
  storeBindingData(node, attrs);
  applyStyle(node, style); applyLayout(node, style);
  if (attrs['data-placeholder'] === 'image') {
    node.appendChild(makeText(`Image placeholder${attrs.src ? ` / ${attrs.src}` : ''}`, 12, '#8D96A6', false));
  }
  const placeholderText = controlPlaceholderText(ir);
  if (placeholderText) node.appendChild(makeText(placeholderText, parsePx(style.fontSize, 13), style.color || '#8D96A6', false));
  const nextInherited = { ...inherited };
  ['color', 'fontSize', 'fontWeight'].forEach(k => { if (style[k]) nextInherited[k] = style[k]; });
  for (const child of (ir.children || [])) { const childNode = createFromIR(child, Math.max(1, size.width - 40), masters, nextInherited); if (childNode) node.appendChild(childNode); }
  return node;
}

function buildComponentPreview(symbols) {
  const section = makeFrame('00 Component Preview', 1440, 420, '#030407', 'section', 'component-preview');
  setCol(section, 18, 32);
  section.appendChild(makeText('00 Component Preview', 28, '#F5F7FA', true));
  section.appendChild(makeText('Reusable icon masters live here. UI below uses instances. Editing an icon master updates its repeated UI instances.', 13, '#8D96A6', false));
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
  setCol(archive, 18, 32); archive.x = 0; archive.y = 1280;
  archive.appendChild(makeText('98 Archive', 28, '#F5F7FA', true));
  archive.appendChild(makeText('Previous generated import runs were moved here. Manual layers were not touched.', 13, '#8D96A6', false));
  page.appendChild(archive);
  old.forEach((node, index) => { node.x = 0; node.y = 84 + index * 220; archive.appendChild(node); });
  return old.length;
}
function setRunMetadata(run, parsed) {
  setData(run, 'readiness-level', parsed.readiness.level);
  setData(run, 'readiness-score', parsed.readiness.score);
  setData(run, 'warnings', JSON.stringify(parsed.readiness.warnings.slice(0, 40)));
  setData(run, 'analysis', JSON.stringify(parsed.analysis));
}
function readinessText(parsed) {
  const lines = [
    `Readiness: ${parsed.readiness.level} (${parsed.readiness.score}/100)`,
    `Elements: ${parsed.analysis.elements}`,
    `Components: ${parsed.analysis.components}`,
    `Actions: ${parsed.analysis.actions}`,
    `Binds: ${parsed.analysis.binds}`,
    `Slots: ${parsed.analysis.slots}`,
    `Icons: ${parsed.analysis.icons}`,
    `Warnings: ${parsed.readiness.warnings.length}`
  ];
  if (parsed.readiness.blockers.length) lines.push(`Blockers: ${parsed.readiness.blockers.join(' | ')}`);
  return lines.join(' / ');
}

async function importSingleHtml(payload, refresh) {
  await loadFonts();
  const page = await workspacePage();
  const runStamp = stamp();
  const parsed = parseHtmlToIR(payload.html || '');
  if (parsed.readiness.level === 'BLOCKED') {
    status(`Import blocked.\n${readinessText(parsed)}\nFix blockers before generating.`, { readiness: parsed.readiness });
    figma.notify('Import blocked. HTML package is not ready.');
    return;
  }
  let archived = 0;
  if (refresh) archived = await archiveOldRuns(page, runStamp);
  const width = Number(payload.width) || 1440;
  const height = Number(payload.height) || 1200;
  const run = makeFrame(`${payload.name || 'Single HTML Import'} / ${runStamp}`, width, height, '#030407', 'import-run', payload.name || 'single-html');
  setRunMetadata(run, parsed);
  run.x = 0; run.y = 0; setCol(run, 28, 48);
  run.appendChild(makeText(payload.name || 'Single HTML Import', 32, '#F5F7FA', true));
  run.appendChild(makeText('One-page output. Sections are modular frames. Icons are component masters plus instances. Data attributes become backend binding metadata.', 13, '#8D96A6', false));
  const { section, masters } = buildComponentPreview(parsed.symbols);
  run.appendChild(section);
  const uiSection = makeFrame('01 Imported UI', Math.max(320, width - 96), Math.max(240, height - 680), '#030407', 'section', 'imported-ui');
  setCol(uiSection, 18, 32);
  uiSection.appendChild(makeText('01 Imported UI', 28, '#F5F7FA', true));
  const built = createFromIR(parsed.root, Math.max(320, width - 160), masters);
  if (built) uiSection.appendChild(built);
  run.appendChild(uiSection);
  const reportHeight = Math.max(220, 170 + parsed.readiness.warnings.slice(0, 6).length * 22);
  const report = makeFrame('99 Import Report', Math.max(320, width - 96), reportHeight, '#0B0E14', 'section', 'report');
  report.cornerRadius = 16; report.strokes = paint('#242B36'); report.strokeWeight = 1; setCol(report, 8, 20);
  report.appendChild(makeText('99 Import Report', 20, '#F5F7FA', true));
  report.appendChild(makeText(`Version: ${VERSION}`, 12, '#C8CED8', false));
  report.appendChild(makeText(`Embedded CSS chars: ${parsed.cssLength} / Symbols: ${Object.keys(parsed.symbols).length} / Archived runs: ${archived}`, 12, '#8D96A6', false));
  report.appendChild(makeText(readinessText(parsed), 11, parsed.readiness.level === 'READY' ? '#A8FFBE' : '#FFD28A', false));
  parsed.readiness.warnings.slice(0, 6).forEach(w => report.appendChild(makeText(`Warning: ${w}`, 10, '#8D96A6', false)));
  report.appendChild(makeText('Use Export UI Build Package JSON after reviewing the generated Figma structure.', 11, '#8D96A6', false));
  run.appendChild(report);
  page.appendChild(run);
  status(`Import complete.\nOutput page: ${WORKSPACE_PAGE}\nTop-level run: ${run.name}\nArchived previous runs: ${archived}\n${readinessText(parsed)}\nNext step: review 99 Import Report, then Export UI Build Package JSON.`, { readiness: parsed.readiness });
  figma.notify(parsed.readiness.level === 'READY' ? 'Single HTML import complete.' : 'Import complete with warnings.');
}

function firstPaintHex(node) { if (!('fills' in node) || !Array.isArray(node.fills) || !node.fills.length) return null; const p = node.fills[0]; return p && p.type === 'SOLID' ? rgbToHex(p.color) : null; }
function strokesHex(node) { if (!('strokes' in node) || !Array.isArray(node.strokes) || !node.strokes.length) return null; const p = node.strokes[0]; return p && p.type === 'SOLID' ? rgbToHex(p.color) : null; }
function nodeLayout(node) { return { x: Math.round(node.x || 0), y: Math.round(node.y || 0), width: Math.round(node.width || 0), height: Math.round(node.height || 0), layoutMode: node.layoutMode || 'NONE', itemSpacing: node.itemSpacing || 0, padding: { top: node.paddingTop || 0, right: node.paddingRight || 0, bottom: node.paddingBottom || 0, left: node.paddingLeft || 0 } }; }
function nodeStyle(node) { return { fill: firstPaintHex(node), stroke: strokesHex(node), strokeWeight: node.strokeWeight || 0, radius: node.cornerRadius || 0, opacity: node.opacity === undefined ? 1 : node.opacity }; }
function bindingOf(node) { const b = {}; ['data-action', 'data-bind', 'data-slot', 'data-route', 'data-state', 'data-component', 'data-backend', 'role', 'aria-label'].forEach(k => { const v = getData(node, k); if (v) b[k.replace('data-', '')] = v; }); return b; }
function exportTree(node) { const item = { name: node.name, figmaType: node.type, kind: kindOf(node) || '', source: sourceOf(node) || '', layout: nodeLayout(node), style: nodeStyle(node), binding: bindingOf(node), children: [] }; if (node.type === 'TEXT') item.text = node.characters; if (node.type === 'INSTANCE') item.componentRef = node.mainComponent ? node.mainComponent.name : ''; if ('children' in node) item.children = node.children.map(exportTree); return item; }
function walk(node, fn) { fn(node); if ('children' in node) node.children.forEach(child => walk(child, fn)); }
function latestRun() { const p = figma.root.children.find(x => x.name === WORKSPACE_PAGE); if (!p) return null; const runs = p.children.filter(n => isTagged(n) && kindOf(n) === 'import-run'); return runs.length ? runs[runs.length - 1] : null; }
function importedUiRoot(run) {
  if (!run || !('children' in run)) return run;
  const section = run.children.find(n => n.name === '01 Imported UI');
  if (!section || !('children' in section)) return run;
  return section.children.find(n => kindOf(n) === 'html-frame' || kindOf(n) === 'component-candidate') || section;
}
function uint8ToText(bytes) {
  try { return new TextDecoder('utf-8').decode(bytes); }
  catch (_) { return Array.from(bytes).map(b => String.fromCharCode(b)).join(''); }
}
async function exportIconAsset(node) {
  let svg = '';
  try { svg = uint8ToText(await node.exportAsync({ format: 'SVG' })); } catch (_) { svg = ''; }
  return { name: sourceOf(node), componentName: node.name, svg };
}
function parseJsonData(node, key, fallback) {
  try { return JSON.parse(getData(node, key) || ''); } catch (_) { return fallback; }
}

async function exportUiPackage() {
  const run = latestRun();
  if (!run) { status('No generated import run found. Generate from Single HTML first.'); return; }
  const screenRoot = importedUiRoot(run);
  const iconNodes = [];
  const components = [];
  const bindings = [];
  const colors = new Set();
  walk(run, node => { if (kindOf(node) === 'icon-master') iconNodes.push(node); });
  walk(screenRoot, node => {
    const fill = firstPaintHex(node); if (fill) colors.add(fill);
    if (kindOf(node) === 'component-candidate') components.push({ name: node.name, source: sourceOf(node), binding: bindingOf(node) });
    const b = bindingOf(node); if (Object.keys(b).length) bindings.push({ nodeName: node.name, kind: kindOf(node), binding: b });
  });
  const icons = [];
  for (const node of iconNodes) icons.push(await exportIconAsset(node));
  const quality = {
    readinessLevel: getData(run, 'readiness-level') || 'UNKNOWN',
    readinessScore: Number(getData(run, 'readiness-score') || 0),
    warnings: parseJsonData(run, 'warnings', []),
    analysis: parseJsonData(run, 'analysis', {})
  };
  const pkg = {
    schema: 'translateit.ui-build-package.v1',
    generatedAt: new Date().toISOString(),
    pluginVersion: VERSION,
    source: { figmaPage: WORKSPACE_PAGE, importRun: run.name, exportedRoot: screenRoot.name },
    target: { primary: 'tauri-vite-typescript', secondary: 'html-css-js' },
    quality,
    tokens: { colors: Array.from(colors).sort() },
    assets: { icons },
    components,
    backendBindings: bindings,
    screens: [{ name: screenRoot.name, tree: exportTree(screenRoot) }],
    integrationContract: { eventAttribute: 'data-action', stateAttribute: 'data-bind', slotAttribute: 'data-slot', backendAttribute: 'data-backend', note: 'Connect actions/states to Tauri invoke or local backend bridge in generated adapter.' }
  };
  status(`UI Build Package exported.\nExported root: ${screenRoot.name}\nIcons: ${icons.length}\nBindings: ${bindings.length}\nReadiness: ${quality.readinessLevel} (${quality.readinessScore}/100)\nCopy the JSON below and save it as ui-build-package.json.`, { exportJson: JSON.stringify(pkg, null, 2), readiness: quality });
  figma.notify('UI Build Package exported.');
}

async function validate(payload = {}) {
  await loadFonts();
  const page = figma.root.children.find(x => x.name === WORKSPACE_PAGE);
  const runs = page ? page.children.filter(n => isTagged(n) && kindOf(n) === 'import-run').length : 0;
  const html = payload.html || '';
  if (!String(html).trim()) {
    status(`Plugin loaded.\nOutput page: ${WORKSPACE_PAGE}\nGenerated runs: ${runs}\nPaste a single self-contained HTML package, then click Validate Plugin again.`);
    return;
  }
  const parsed = parseHtmlToIR(html);
  const warnText = parsed.readiness.warnings.length ? `\nWarnings:\n- ${parsed.readiness.warnings.slice(0, 10).join('\n- ')}` : '';
  status(`Input validation complete.\n${readinessText(parsed)}\nOutput page: ${WORKSPACE_PAGE}\nGenerated runs: ${runs}${warnText}\nNext: generate only when readiness is READY or USABLE_WITH_WARNINGS.`, { readiness: parsed.readiness });
}
async function prepareRefresh() {
  const page = figma.root.children.find(x => x.name === WORKSPACE_PAGE);
  const runs = page ? page.children.filter(n => isTagged(n) && kindOf(n) === 'import-run').length : 0;
  status(`Refresh ready.\nGenerated import runs to archive: ${runs}\nClick Generate + Archive Previous after pasting and validating the new single HTML package.`);
}

figma.ui.onmessage = async msg => {
  try {
    if (msg.type === 'validate') await validate(msg.payload || {});
    if (msg.type === 'prepare-refresh') await prepareRefresh();
    if (msg.type === 'import-single-html') await importSingleHtml(msg.payload || {}, !!msg.refresh);
    if (msg.type === 'export-ui-package') await exportUiPackage();
  } catch (err) {
    status(`Plugin error: ${err && err.message ? err.message : err}\nOpen Figma console for details.`);
    figma.notify('TranslateIT plugin error.');
  }
};
