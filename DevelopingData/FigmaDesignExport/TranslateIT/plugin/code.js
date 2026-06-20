figma.showUI(__html__, { width: 580, height: 860 });

// TranslateIT Figma Design Export
// Website/file HTML -> editable Figma workspace -> UI Build Package JSON.
// This plugin intentionally approximates browser layout. Use RenderBridge for better website captures.

const NS = 'translateit.designExport';
const VERSION = '2026-06-render-bridge-import-v1';
const WORKSPACE_PAGE = 'TranslateIT Import / Workspace';

const state = {
  fontRegular: { family: 'Inter', style: 'Regular' },
  fontBold: { family: 'Inter', style: 'Bold' }
};

function status(text, extra) {
  const message = { type: 'status', text: text };
  extra = extra || {};
  Object.keys(extra).forEach(function (key) { message[key] = extra[key]; });
  figma.ui.postMessage(message);
}

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function tag(node, kind, source) {
  node.setSharedPluginData(NS, 'generated', 'true');
  node.setSharedPluginData(NS, 'version', VERSION);
  node.setSharedPluginData(NS, 'kind', kind || '');
  node.setSharedPluginData(NS, 'source', source || '');
  return node;
}

function isTagged(node) {
  return node.getSharedPluginData(NS, 'generated') === 'true';
}

function kindOf(node) {
  return node.getSharedPluginData(NS, 'kind');
}

function sourceOf(node) {
  return node.getSharedPluginData(NS, 'source');
}

function setData(node, key, value) {
  if (value !== undefined && value !== null && String(value) !== '') {
    node.setSharedPluginData(NS, key, String(value));
  }
}

function getData(node, key) {
  return node.getSharedPluginData(NS, key);
}

async function loadFonts() {
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    state.fontRegular = { family: 'Inter', style: 'Regular' };
  } catch (err) {
    state.fontRegular = { family: 'Roboto', style: 'Regular' };
    await figma.loadFontAsync(state.fontRegular);
  }

  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
    state.fontBold = { family: 'Inter', style: 'Bold' };
  } catch (err) {
    state.fontBold = state.fontRegular;
  }
}

async function workspacePage() {
  let page = null;
  for (let i = 0; i < figma.root.children.length; i += 1) {
    if (figma.root.children[i].name === WORKSPACE_PAGE) {
      page = figma.root.children[i];
      break;
    }
  }

  if (!page) page = figma.createPage();
  page.name = WORKSPACE_PAGE;
  page.setSharedPluginData(NS, 'ownedPage', 'true');
  await figma.setCurrentPageAsync(page);
  return page;
}

function hexToRgb(hex) {
  const value = /^#[0-9A-Fa-f]{6}$/.test(hex || '') ? hex : '#000000';
  const n = parseInt(value.slice(1), 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255
  };
}

function componentToHex(value) {
  return Math.round(Math.max(0, Math.min(1, value)) * 255).toString(16).padStart(2, '0');
}

function rgbToHex(c) {
  return '#' + componentToHex(c.r) + componentToHex(c.g) + componentToHex(c.b);
}

function paint(hex) {
  return [{ type: 'SOLID', color: hexToRgb(hex) }];
}

function parsePx(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'auto' || raw === 'none') return fallback;
  const match = raw.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cssColor(value, fallback) {
  if (fallback === undefined) fallback = '#11151C';
  if (!value) return fallback;

  const v = String(value).trim();
  if (!v || v === 'transparent' || v === 'rgba(0, 0, 0, 0)') return null;

  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v;
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];

  const hex = v.match(/#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/);
  if (hex) return cssColor(hex[0], fallback);

  const rgba = v.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const parts = rgba[1].split(',').map(function (x) { return parseFloat(x); });
    if (parts.length >= 3) {
      if (parts.length >= 4 && Number(parts[3]) === 0) return null;
      return '#' + parts.slice(0, 3).map(function (n) {
        return Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
      }).join('');
    }
  }

  const named = {
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

  const key = v.toLowerCase();
  return Object.prototype.hasOwnProperty.call(named, key) ? named[key] : fallback;
}

function makeFrame(name, width, height, background, kind, source) {
  const node = figma.createFrame();
  node.name = String(name || 'Frame').slice(0, 96);
  node.resize(Math.max(1, width || 1), Math.max(1, height || 1));

  const color = cssColor(background, null);
  node.fills = color ? paint(color) : [];
  node.strokes = [];

  return tag(node, kind || 'frame', source || node.name);
}

function makeText(value, size, color, bold) {
  const textValue = String(value || '').trim();
  const node = figma.createText();
  node.name = 'Text / ' + (textValue.slice(0, 48) || 'Empty');
  node.fontName = bold ? state.fontBold : state.fontRegular;
  node.characters = textValue || ' ';
  node.fontSize = Math.max(1, size || 14);
  node.fills = paint(cssColor(color, '#F5F7FA') || '#F5F7FA');
  return tag(node, 'text', textValue.slice(0, 48));
}

function setCol(node, gap, pad) {
  node.layoutMode = 'VERTICAL';
  node.itemSpacing = gap || 0;
  node.paddingTop = pad || 0;
  node.paddingRight = pad || 0;
  node.paddingBottom = pad || 0;
  node.paddingLeft = pad || 0;
}

function setRow(node, gap, pad) {
  node.layoutMode = 'HORIZONTAL';
  node.itemSpacing = gap || 0;
  node.paddingTop = pad || 0;
  node.paddingRight = pad || 0;
  node.paddingBottom = pad || 0;
  node.paddingLeft = pad || 0;
  node.counterAxisAlignItems = 'CENTER';
}

function camel(prop) {
  const key = String(prop || '').trim();
  if (key.indexOf('--') === 0) return key;
  return key.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
}

function parseDecls(text) {
  const out = {};
  String(text || '').split(';').forEach(function (part) {
    const index = part.indexOf(':');
    if (index < 0) return;
    const key = camel(part.slice(0, index));
    const value = part.slice(index + 1).trim();
    if (key) out[key] = value;
  });
  return out;
}

function parseAttrs(raw) {
  const attrs = {};
  String(raw || '').replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g, function (_, key, value) {
    attrs[key] = String(value || '').replace(/^["']|["']$/g, '');
    return '';
  });
  return attrs;
}

function extractStyleBlocks(html) {
  const blocks = [];
  const body = String(html || '').replace(/<style\b[^>]*>([\s\S]*?)<\/style>/ig, function (_, css) {
    blocks.push(css || '');
    return '';
  });
  return { html: body, css: blocks.join('\n\n') };
}

function unique(items) {
  const seen = {};
  const out = [];
  (items || []).forEach(function (item) {
    const key = String(item || '');
    if (key && !seen[key]) {
      seen[key] = true;
      out.push(key);
    }
  });
  return out;
}

function parseCss(css) {
  const rules = [];
  const vars = {};
  const clean = String(css || '').replace(/\/\*[\s\S]*?\*\//g, '');

  clean.replace(/([^{}]+)\{([^{}]*)\}/g, function (_, selectorText, body) {
    const decl = parseDecls(body);
    selectorText.split(',').forEach(function (selector) {
      const s = selector.trim();
      if (!s) return;
      if (s === ':root') {
        Object.keys(decl).forEach(function (key) { vars[key] = decl[key]; });
      } else {
        rules.push({ selector: s, decl: decl });
      }
    });
    return '';
  });

  return { rules: rules, vars: vars };
}

function resolveVars(style, vars) {
  const out = Object.assign({}, style || {});
  Object.keys(out).forEach(function (key) {
    out[key] = String(out[key]).replace(/var\((--[^),]+)(?:,[^)]+)?\)/g, function (_, name) {
      return vars[String(name).trim()] || '';
    });
  });
  return out;
}

function selectorMatches(selector, tag, attrs, classes) {
  if (!selector) return false;

  const s = String(selector).trim();
  if (!s) return false;
  if (s.indexOf(':') >= 0 || s.indexOf('>') >= 0 || s.indexOf('+') >= 0 || s.indexOf('~') >= 0 || s.indexOf('[') >= 0) return false;
  if (s.indexOf(' ') >= 0) return false;

  if (s[0] === '.') return classes.indexOf(s.slice(1)) >= 0;
  if (s[0] === '#') return attrs.id === s.slice(1);

  if (s.indexOf('.') >= 0) {
    const parts = s.split('.');
    return (!parts[0] || parts[0].toLowerCase() === tag) && classes.indexOf(parts[1]) >= 0;
  }

  return s.toLowerCase() === tag;
}

function styleFor(tag, attrs, classes, cssData) {
  const style = {};

  (cssData.rules || []).forEach(function (rule) {
    if (selectorMatches(rule.selector, tag, attrs, classes)) {
      Object.assign(style, rule.decl);
    }
  });

  Object.assign(style, parseDecls(attrs.style || ''));
  return resolveVars(style, cssData.vars || {});
}

function isVoidTag(tag) {
  return ['br', 'hr', 'img', 'input', 'meta', 'link', 'use'].indexOf(tag) >= 0;
}

function parseHtmlToIR(rawHtml) {
  const warnings = [];
  const styleExtract = extractStyleBlocks(rawHtml);
  const cssData = parseCss(styleExtract.css);

  let html = styleExtract.html
    .replace(/<!doctype[^>]*>/ig, '')
    .replace(/<script[\s\S]*?<\/script>/ig, function () {
      warnings.push('Script tag ignored. Render Bridge should provide the final DOM when JavaScript rendering is needed.');
      return '';
    })
    .replace(/<noscript[\s\S]*?<\/noscript>/ig, '')
    .replace(/<svg[\s\S]*?<\/svg>/ig, function () {
      warnings.push('SVG content approximated. Use icon placeholders after import if needed.');
      return '';
    });

  const root = {
    type: 'element',
    tag: 'body',
    attrs: {},
    classes: [],
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '24px',
      backgroundColor: '#030407',
      width: '1180px'
    },
    children: []
  };

  const stack = [root];
  const tokenRe = /<\/?[^>]+>|[^<]+/g;
  let token;

  while ((token = tokenRe.exec(html))) {
    const raw = token[0];
    if (!raw) continue;

    if (raw.indexOf('</') === 0) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    if (raw[0] === '<') {
      const open = raw.match(/^<\s*([a-zA-Z0-9-]+)/);
      if (!open) continue;

      const tag = open[1].toLowerCase();
      if (['html', 'head', 'title', 'style', 'script', 'meta', 'link'].indexOf(tag) >= 0) continue;

      const body = raw.replace(/^<\s*[a-zA-Z0-9-]+/, '').replace(/\/?>$/, '');
      const attrs = parseAttrs(body);
      const classes = String(attrs.class || '').split(/\s+/).filter(Boolean);
      const style = styleFor(tag, attrs, classes, cssData);

      const node = {
        type: 'element',
        tag: tag,
        attrs: attrs,
        classes: classes,
        style: style,
        children: []
      };

      if (tag === 'img') {
        node.attrs['data-placeholder'] = 'image';
      }

      stack[stack.length - 1].children.push(node);

      if (!isVoidTag(tag) && !/\/\s*>$/.test(raw)) {
        stack.push(node);
      }

      continue;
    }

    const text = raw.replace(/\s+/g, ' ').trim();
    if (text) {
      stack[stack.length - 1].children.push({
        type: 'text',
        text: text,
        style: {}
      });
    }
  }

  const analysis = analyzeIr(root);
  return {
    root: root,
    warnings: unique(warnings),
    cssLength: styleExtract.css.length,
    rawHtmlLength: String(rawHtml || '').length,
    analysis: analysis,
    readiness: readinessFrom(analysis, warnings, rawHtml)
  };
}

function walkIr(ir, fn) {
  if (!ir) return;
  fn(ir);
  (ir.children || []).forEach(function (child) {
    walkIr(child, fn);
  });
}

function analyzeIr(root) {
  const result = {
    elements: 0,
    textNodes: 0,
    components: 0,
    actions: 0,
    binds: 0,
    slots: 0
  };

  walkIr(root, function (node) {
    if (node.type === 'text') {
      result.textNodes += 1;
      return;
    }

    result.elements += 1;
    const attrs = node.attrs || {};
    if (attrs['data-component']) result.components += 1;
    if (attrs['data-action']) result.actions += 1;
    if (attrs['data-bind']) result.binds += 1;
    if (attrs['data-slot']) result.slots += 1;
  });

  return result;
}

function readinessFrom(analysis, warnings, html) {
  let score = 100;
  const outWarnings = (warnings || []).slice();
  const blockers = [];

  if (!String(html || '').trim()) {
    score -= 70;
    blockers.push('HTML package is empty.');
  }

  if (!analysis.components) {
    score -= 10;
    outWarnings.push('No data-component attributes found. Component handoff will be weaker.');
  }

  if (!analysis.actions) {
    score -= 5;
    outWarnings.push('No data-action attributes found. Runtime action binding may need manual setup.');
  }

  score -= Math.min(25, outWarnings.length * 3);
  score = Math.max(0, Math.min(100, score));

  return {
    score: score,
    level: blockers.length ? 'BLOCKED' : score >= 85 ? 'READY' : score >= 70 ? 'USABLE_WITH_WARNINGS' : 'NEEDS_CLEANUP',
    blockers: blockers,
    warnings: unique(outWarnings).slice(0, 40)
  };
}

function shouldSkipIr(ir) {
  if (!ir || ir.type !== 'element') return false;

  const attrs = ir.attrs || {};
  const style = ir.style || {};
  const tag = ir.tag || '';

  if (String(style.display || '').toLowerCase() === 'none') return true;
  if (String(style.visibility || '').toLowerCase() === 'hidden') return true;
  if (tag === 'input' && String(attrs.type || '').toLowerCase() === 'file') return true;
  if (tag === 'input' && String(attrs.type || '').toLowerCase() === 'hidden') return true;
  if (['script', 'style', 'meta', 'link', 'defs', 'symbol'].indexOf(tag) >= 0) return true;

  return false;
}

function visibleTextFromChildren(ir) {
  let out = '';
  walkIr(ir, function (node) {
    if (node.type === 'text') out += (out ? ' ' : '') + String(node.text || '').trim();
  });
  return out.trim();
}

function nodeLabel(ir) {
  const attrs = ir.attrs || {};
  const classes = ir.classes || [];
  if (attrs['data-component']) return attrs['data-component'];
  if (attrs['data-name']) return attrs['data-name'];
  if (attrs.id) return (ir.tag || 'node') + '#' + attrs.id;
  if (classes.length) return (ir.tag || 'node') + '.' + classes.slice(0, 2).join('.');
  return ir.tag || 'node';
}

function estimateSize(ir, parentWidth) {
  const style = ir.style || {};
  const tag = ir.tag || 'div';
  const rawWidth = String(style.width || style.minWidth || '').trim();

  let width;
  if (rawWidth.indexOf('%') >= 0) {
    width = Math.max(1, parentWidth - 32);
  } else {
    width = parsePx(style.width, parsePx(style.minWidth, tag === 'body' || tag === 'main' ? parentWidth : Math.min(parentWidth, 720)));
  }

  width = clamp(width || parentWidth || 320, 1, 1600);

  let height = parsePx(style.height, parsePx(style.minHeight, NaN));
  const childCount = (ir.children || []).length;

  if (!Number.isFinite(height)) {
    if (['button', 'input', 'select', 'textarea'].indexOf(tag) >= 0) height = 48;
    else if (tag === 'img') height = 180;
    else height = Math.max(44, childCount * 52 + parsePx(style.padding, 18) * 2);
  }

  height = clamp(height || 48, 1, 2200);

  return {
    width: width,
    height: height
  };
}

function applyStyle(node, style) {
  style = style || {};

  const radius = style.borderRadius || style.radius;
  if (radius !== undefined) {
    node.cornerRadius = parsePx(radius, 0);
  }

  const backgroundColor = cssColor(style.backgroundColor || style.background, null);
  if (backgroundColor) {
    node.fills = paint(backgroundColor);
  }

  const borderColor = cssColor(style.borderColor || style.outlineColor || style.border, null);
  const borderWeight = parsePx(style.borderWidth || style.outlineWidth || style.border, 0);

  if (borderColor || borderWeight) {
    node.strokes = paint(borderColor || '#242B36');
    node.strokeWeight = borderWeight || 1;
  }

  if (style.opacity !== undefined) {
    node.opacity = clamp(Number(style.opacity) || 1, 0, 1);
  }
}

function applyLayout(node, style) {
  style = style || {};

  const display = String(style.display || '').toLowerCase();
  const direction = String(style.flexDirection || '').toLowerCase();
  const isRow = (display === 'flex' || display === 'inline-flex') && direction === 'row';

  if (isRow) {
    setRow(node, parsePx(style.gap || style.columnGap, 12), 0);
  } else {
    setCol(node, parsePx(style.gap || style.rowGap, 10), 0);
  }

  const padding = parsePx(style.padding, 0);
  node.paddingTop = parsePx(style.paddingTop, padding);
  node.paddingRight = parsePx(style.paddingRight, padding);
  node.paddingBottom = parsePx(style.paddingBottom, padding);
  node.paddingLeft = parsePx(style.paddingLeft, padding);

  const align = String(style.alignItems || '').toLowerCase();
  if (align === 'center') node.counterAxisAlignItems = 'CENTER';
  if (align === 'flex-end' || align === 'end') node.counterAxisAlignItems = 'MAX';
  if (align === 'flex-start' || align === 'start') node.counterAxisAlignItems = 'MIN';

  const justify = String(style.justifyContent || '').toLowerCase();
  if (justify === 'center') node.primaryAxisAlignItems = 'CENTER';
  if (justify === 'flex-end' || justify === 'end') node.primaryAxisAlignItems = 'MAX';
  if (justify === 'space-between') node.primaryAxisAlignItems = 'SPACE_BETWEEN';
}

function storeBindingData(node, attrs) {
  attrs = attrs || {};
  ['data-action', 'data-bind', 'data-slot', 'data-route', 'data-state', 'data-component', 'data-backend', 'role', 'aria-label'].forEach(function (key) {
    setData(node, key, attrs[key]);
  });
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

function createFromIR(ir, parentWidth, inherited) {
  inherited = inherited || {};
  if (!ir || shouldSkipIr(ir)) return null;

  if (ir.type === 'text') {
    const rawText = String(ir.text || '').trim();
    if (!rawText) return null;
    const style = Object.assign({}, inherited, ir.style || {});
    const weight = String(style.fontWeight || '');
    return makeText(rawText, parsePx(style.fontSize, 14), style.color || '#F5F7FA', /bold|600|700|800|900/i.test(weight));
  }

  const attrs = ir.attrs || {};
  const style = ir.style || {};
  const size = estimateSize(ir, parentWidth);
  const isComponent = !!attrs['data-component'];
  const bg = attrs['data-placeholder'] === 'image' ? '#171C25' : (style.backgroundColor || style.background || 'transparent');

  const node = makeFrame(nodeLabel(ir), size.width, size.height, bg, isComponent ? 'component-candidate' : 'html-frame', ir.tag || 'div');
  storeBindingData(node, attrs);
  applyStyle(node, style);
  applyLayout(node, style);

  if (attrs['data-placeholder'] === 'image') {
    const label = attrs.src ? 'Image placeholder / ' + attrs.src : 'Image placeholder';
    node.appendChild(makeText(label, 12, '#8D96A6', false));
  }

  const placeholder = controlPlaceholderText(ir);
  if (placeholder) {
    node.appendChild(makeText(placeholder, parsePx(style.fontSize, 13), style.color || '#8D96A6', false));
  }

  const nextInherited = Object.assign({}, inherited);
  ['color', 'fontSize', 'fontWeight'].forEach(function (key) {
    if (style[key]) nextInherited[key] = style[key];
  });

  (ir.children || []).forEach(function (child) {
    const childNode = createFromIR(child, Math.max(1, size.width - 40), nextInherited);
    if (childNode) node.appendChild(childNode);
  });

  if (!node.children.length) {
    const text = visibleTextFromChildren(ir);
    if (text) node.appendChild(makeText(text.slice(0, 240), parsePx(style.fontSize, 13), style.color || '#F5F7FA', false));
  }

  return node;
}

async function archiveOldRuns(page, runStamp) {
  const old = page.children.filter(function (node) {
    return isTagged(node) && kindOf(node) === 'import-run';
  });

  if (!old.length) return 0;

  const archive = makeFrame('98 Archive / ' + runStamp, 1440, Math.max(280, old.length * 220), '#030407', 'archive-root', runStamp);
  setCol(archive, 18, 32);
  archive.x = 0;
  archive.y = 1280;
  archive.appendChild(makeText('98 Archive', 28, '#F5F7FA', true));
  archive.appendChild(makeText('Previous generated import runs were moved here. Manual layers were not touched.', 13, '#8D96A6', false));
  page.appendChild(archive);

  old.forEach(function (node, index) {
    node.x = 0;
    node.y = 84 + index * 220;
    archive.appendChild(node);
  });

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
    'Readiness: ' + parsed.readiness.level + ' (' + parsed.readiness.score + '/100)',
    'Elements: ' + parsed.analysis.elements,
    'Components: ' + parsed.analysis.components,
    'Actions: ' + parsed.analysis.actions,
    'Binds: ' + parsed.analysis.binds,
    'Slots: ' + parsed.analysis.slots,
    'Warnings: ' + parsed.readiness.warnings.length
  ];

  if (parsed.readiness.blockers.length) {
    lines.push('Blockers: ' + parsed.readiness.blockers.join(' | '));
  }

  return lines.join(' / ');
}

async function importSingleHtml(payload, refresh) {
  await loadFonts();

  payload = payload || {};
  const page = await workspacePage();
  const runStamp = stamp();
  const parsed = parseHtmlToIR(payload.html || '');

  if (parsed.readiness.level === 'BLOCKED') {
    status('Import blocked.\n' + readinessText(parsed) + '\nFix blockers before generating.', { readiness: parsed.readiness });
    figma.notify('Import blocked. HTML package is not ready.');
    return;
  }

  let archived = 0;
  if (refresh) archived = await archiveOldRuns(page, runStamp);

  const width = Number(payload.width) || 1440;
  const height = Number(payload.height) || 1600;
  const run = makeFrame((payload.name || 'TranslateIT Import') + ' / ' + runStamp, width, height, '#030407', 'import-run', payload.name || 'html-import');

  setRunMetadata(run, parsed);
  run.x = 0;
  run.y = 0;
  setCol(run, 28, 48);

  run.appendChild(makeText(payload.name || 'TranslateIT Import', 32, '#F5F7FA', true));
  run.appendChild(makeText('Generated from website/file HTML. Review layers, refine manually if needed, then export UI Build Package JSON.', 13, '#8D96A6', false));

  const uiSection = makeFrame('01 Imported UI', Math.max(320, width - 96), Math.max(240, height - 360), '#030407', 'section', 'imported-ui');
  setCol(uiSection, 18, 32);
  uiSection.appendChild(makeText('01 Imported UI', 28, '#F5F7FA', true));

  const built = createFromIR(parsed.root, Math.max(320, width - 160), {});
  if (built) uiSection.appendChild(built);
  run.appendChild(uiSection);

  const reportHeight = Math.max(220, 170 + parsed.readiness.warnings.slice(0, 6).length * 22);
  const report = makeFrame('99 Import Report', Math.max(320, width - 96), reportHeight, '#0B0E14', 'section', 'report');
  report.cornerRadius = 16;
  report.strokes = paint('#242B36');
  report.strokeWeight = 1;
  setCol(report, 8, 20);

  report.appendChild(makeText('99 Import Report', 20, '#F5F7FA', true));
  report.appendChild(makeText('Version: ' + VERSION, 12, '#C8CED8', false));
  report.appendChild(makeText('Embedded CSS chars: ' + parsed.cssLength + ' / Archived runs: ' + archived, 12, '#8D96A6', false));
  report.appendChild(makeText(readinessText(parsed), 11, parsed.readiness.level === 'READY' ? '#A8FFBE' : '#FFD28A', false));

  parsed.readiness.warnings.slice(0, 6).forEach(function (warning) {
    report.appendChild(makeText('Warning: ' + warning, 10, '#8D96A6', false));
  });

  report.appendChild(makeText('Use Export Data after reviewing the generated Figma structure.', 11, '#8D96A6', false));
  run.appendChild(report);
  page.appendChild(run);

  status('Import complete.\nOutput page: ' + WORKSPACE_PAGE + '\nTop-level run: ' + run.name + '\nArchived previous runs: ' + archived + '\n' + readinessText(parsed) + '\nNext step: review in Figma, then Export Data.', { readiness: parsed.readiness });
  figma.notify(parsed.readiness.level === 'READY' ? 'Import complete.' : 'Import complete with warnings.');
}

function firstPaintHex(node) {
  if (!('fills' in node) || !Array.isArray(node.fills) || !node.fills.length) return null;
  const p = node.fills[0];
  return p && p.type === 'SOLID' ? rgbToHex(p.color) : null;
}

function strokesHex(node) {
  if (!('strokes' in node) || !Array.isArray(node.strokes) || !node.strokes.length) return null;
  const p = node.strokes[0];
  return p && p.type === 'SOLID' ? rgbToHex(p.color) : null;
}

function nodeLayout(node) {
  return {
    x: Math.round(node.x || 0),
    y: Math.round(node.y || 0),
    width: Math.round(node.width || 0),
    height: Math.round(node.height || 0),
    layoutMode: node.layoutMode || 'NONE',
    itemSpacing: node.itemSpacing || 0,
    padding: {
      top: node.paddingTop || 0,
      right: node.paddingRight || 0,
      bottom: node.paddingBottom || 0,
      left: node.paddingLeft || 0
    }
  };
}

function nodeStyle(node) {
  return {
    fill: firstPaintHex(node),
    stroke: strokesHex(node),
    strokeWeight: node.strokeWeight || 0,
    radius: node.cornerRadius || 0,
    opacity: node.opacity === undefined ? 1 : node.opacity
  };
}

function bindingOf(node) {
  const b = {};
  ['data-action', 'data-bind', 'data-slot', 'data-route', 'data-state', 'data-component', 'data-backend', 'role', 'aria-label'].forEach(function (key) {
    const value = getData(node, key);
    if (value) b[key.replace('data-', '')] = value;
  });
  return b;
}

function exportTree(node) {
  const item = {
    name: node.name,
    figmaType: node.type,
    kind: kindOf(node) || '',
    source: sourceOf(node) || '',
    layout: nodeLayout(node),
    style: nodeStyle(node),
    binding: bindingOf(node),
    children: []
  };

  if (node.type === 'TEXT') item.text = node.characters;

  if ('children' in node) {
    item.children = node.children.map(function (child) {
      return exportTree(child);
    });
  }

  return item;
}

function walk(node, fn) {
  fn(node);
  if ('children' in node) {
    node.children.forEach(function (child) {
      walk(child, fn);
    });
  }
}

function latestRun() {
  let page = null;
  for (let i = 0; i < figma.root.children.length; i += 1) {
    if (figma.root.children[i].name === WORKSPACE_PAGE) {
      page = figma.root.children[i];
      break;
    }
  }

  if (!page) return null;

  const runs = page.children.filter(function (node) {
    return isTagged(node) && kindOf(node) === 'import-run';
  });

  return runs.length ? runs[runs.length - 1] : null;
}

function importedUiRoot(run) {
  if (!run || !('children' in run)) return run;

  let section = null;
  for (let i = 0; i < run.children.length; i += 1) {
    if (run.children[i].name === '01 Imported UI') {
      section = run.children[i];
      break;
    }
  }

  if (!section || !('children' in section)) return run;

  for (let j = 0; j < section.children.length; j += 1) {
    const kind = kindOf(section.children[j]);
    if (kind === 'html-frame' || kind === 'component-candidate') return section.children[j];
  }

  return section;
}

function parseJsonData(node, key, fallback) {
  try {
    return JSON.parse(getData(node, key) || '');
  } catch (err) {
    return fallback;
  }
}

async function exportUiPackage() {
  const run = latestRun();

  if (!run) {
    status('No generated import run found. Import Data first.');
    return;
  }

  const screenRoot = importedUiRoot(run);
  const components = [];
  const bindings = [];
  const colors = {};

  walk(screenRoot, function (node) {
    const fill = firstPaintHex(node);
    if (fill) colors[fill] = true;

    if (kindOf(node) === 'component-candidate') {
      components.push({
        name: node.name,
        source: sourceOf(node),
        binding: bindingOf(node)
      });
    }

    const b = bindingOf(node);
    if (Object.keys(b).length) {
      bindings.push({
        nodeName: node.name,
        kind: kindOf(node),
        binding: b
      });
    }
  });

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
    source: {
      figmaPage: WORKSPACE_PAGE,
      importRun: run.name,
      exportedRoot: screenRoot.name
    },
    target: {
      primary: 'tauri-vite-typescript',
      secondary: 'html-css-js'
    },
    quality: quality,
    tokens: {
      colors: Object.keys(colors).sort()
    },
    assets: {
      icons: []
    },
    components: components,
    backendBindings: bindings,
    screens: [
      {
        name: screenRoot.name,
        tree: exportTree(screenRoot)
      }
    ],
    integrationContract: {
      eventAttribute: 'data-action',
      stateAttribute: 'data-bind',
      slotAttribute: 'data-slot',
      backendAttribute: 'data-backend',
      note: 'Connect actions/states to Tauri invoke or local backend bridge in generated adapter.'
    }
  };

  status('UI Build Package exported.\nExported root: ' + screenRoot.name + '\nBindings: ' + bindings.length + '\nReadiness: ' + quality.readinessLevel + ' (' + quality.readinessScore + '/100)\nThe JSON file will download from the plugin panel.', {
    exportJson: JSON.stringify(pkg, null, 2),
    readiness: quality
  });

  figma.notify('UI Build Package exported.');
}

async function validate(payload) {
  await loadFonts();
  payload = payload || {};

  const html = payload.html || '';
  if (!String(html).trim()) {
    status('Plugin loaded.\nPaste a website address or select an HTML file, then click Import Data.');
    return;
  }

  const parsed = parseHtmlToIR(html);
  status('Input validation complete.\n' + readinessText(parsed) + '\nNext: Import Data.', { readiness: parsed.readiness });
}

figma.ui.onmessage = async function (msg) {
  try {
    msg = msg || {};
    if (msg.type === 'validate') await validate(msg.payload || {});
    if (msg.type === 'import-single-html') await importSingleHtml(msg.payload || {}, !!msg.refresh);
    if (msg.type === 'export-ui-package') await exportUiPackage();
  } catch (err) {
    status('Plugin error: ' + (err && err.message ? err.message : err) + '\nOpen Figma console for details.');
    figma.notify('TranslateIT plugin error.');
  }
};
