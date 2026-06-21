figma.showUI(__html__, { width: 580, height: 860 });

const PAGE_NAME = 'TranslateIT Import / Workspace';
const PUBLIC_VERSION = 'Version 0.1 - Alpha';
const INTERNAL_RENDERER = 'translateit-alpha-visual-matched-clone-renderer';

let lastRun = null;
let lastDiagnostics = null;
let lastImportMeta = null;
let regular = { family: 'Inter', style: 'Regular' };
let bold = { family: 'Inter', style: 'Bold' };

const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
const safe = (v) => clean(v || 'Layer').slice(0, 96) || 'Layer';
const arr = (v) => Array.isArray(v) ? v : [];
const cut = (v, n) => { const t = clean(v); return t.length > n ? t.slice(0, Math.max(0, n - 1)) + '…' : t; };
const key = (v) => clean(v).toLowerCase();
const num = (v, fallback) => { const m = String(v || '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : fallback; };

function rgb(hex) { const n = parseInt(/^#[\da-fA-F]{6}$/.test(hex || '') ? hex.slice(1) : '111827', 16); return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }; }
function paint(hex) { return [{ type: 'SOLID', color: rgb(hex || '#111827') }]; }
function decodeBase64(value) { const raw = atob(value); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i); return out; }
function send(text, extra) { const msg = { type: 'status', text }; Object.assign(msg, extra || {}); figma.ui.postMessage(msg); }
function textValue(layer) { return clean(layer && (layer.text || layer.name || '')); }
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
function unique(items, fn, limit) { const seen = {}; const out = []; arr(items).forEach((item) => { const k = fn(item); if (!k || seen[k] || (limit && out.length >= limit)) return; seen[k] = true; out.push(item); }); return out; }
function isAccent(hex) { const h = String(hex || '').toLowerCase(); return /^#[0-9a-f]{6}$/.test(h) && !['#ffffff', '#f8fafc', '#f7f8fb', '#000000', '#111827', '#0b1020'].includes(h); }
function defaultSpacing() { return [{ name: 'Space / XS', value: 4 }, { name: 'Space / SM', value: 8 }, { name: 'Space / MD', value: 16 }, { name: 'Space / LG', value: 24 }, { name: 'Space / XL', value: 40 }, { name: 'Section Gap', value: 72 }, { name: 'Card Padding', value: 24 }, { name: 'Grid Gap', value: 20 }]; }
function defaultRadius() { return [{ name: 'Radius / SM', value: 8 }, { name: 'Radius / MD', value: 16 }, { name: 'Radius / LG', value: 24 }, { name: 'Radius / XL', value: 32 }]; }
function collectColors(layers) { const out = []; arr(layers).forEach((layer) => { const s = layer.style || {}; [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor, s.borderLeftColor, s.borderRightColor].forEach((v) => { const c = cssColor(v, ''); if (c && out.indexOf(c) < 0) out.push(c); }); }); return out.slice(0, 20); }
function styleKey(layer) { const s = layer.style || {}; return [layer.role || layer.type, s.fontSize || '', s.fontWeight || '', s.color || ''].join('|'); }
function theme(plan) { const colors = arr(plan.tokens && plan.tokens.colors); const primary = colors.find(isAccent) || '#2563EB'; return { primary, dark: '#0B1020', text: '#111827', muted: '#64748B', bg: '#F7F8FB', surface: '#FFFFFF', soft: '#EEF2FF', border: '#E5E7EB', danger: '#DC2626' }; }

async function loadFonts() { try { await figma.loadFontAsync(regular); } catch (_) { regular = { family: 'Roboto', style: 'Regular' }; await figma.loadFontAsync(regular); } try { await figma.loadFontAsync(bold); } catch (_) { bold = regular; } }
async function workspacePage() { let page = null; for (let i = 0; i < figma.root.children.length; i += 1) if (figma.root.children[i].name === PAGE_NAME) page = figma.root.children[i]; if (!page) page = figma.createPage(); page.name = PAGE_NAME; await figma.setCurrentPageAsync(page); return page; }
function frame(name, w, h, fill) { const node = figma.createFrame(); node.name = safe(name); node.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h || 100))); node.fills = fill ? paint(fill) : []; node.strokes = []; node.clipsContent = false; return node; }
function autoFrame(name, w, fill, gap, padding) { const node = frame(name, w, 100, fill); node.layoutMode = 'VERTICAL'; node.primaryAxisSizingMode = 'AUTO'; node.counterAxisSizingMode = 'FIXED'; node.itemSpacing = gap == null ? 16 : gap; node.paddingTop = padding == null ? 24 : padding; node.paddingRight = padding == null ? 24 : padding; node.paddingBottom = padding == null ? 24 : padding; node.paddingLeft = padding == null ? 24 : padding; return node; }
function label(name, value, size, color, isBold, width) { const node = figma.createText(); node.name = safe(name); node.fontName = isBold ? bold : regular; node.characters = String(value || ' '); node.fontSize = size || 12; node.fills = paint(color || '#111827'); try { node.textAutoResize = 'HEIGHT'; node.resize(width || 720, Math.max(18, (size || 12) * 1.5)); } catch (_) {} return node; }
function rect(parent, name, x, y, w, h, fill, radius, stroke) { const node = figma.createRectangle(); node.name = safe(name); node.x = x || 0; node.y = y || 0; node.resize(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); node.cornerRadius = radius == null ? 0 : radius; node.fills = paint(fill || '#FFFFFF'); node.strokes = stroke ? paint(stroke) : []; node.strokeWeight = stroke ? 1 : 0; parent.appendChild(node); return node; }
function imageNode(parent, layer, x, y, w, h, radius) { const node = figma.createRectangle(); node.name = safe('Image / ' + clean(layer && layer.name || 'Media')); node.x = x || 0; node.y = y || 0; node.resize(Math.max(1, w), Math.max(1, h)); node.cornerRadius = radius == null ? 0 : radius; node.strokes = []; if (layer && layer.image && layer.image.base64) { const img = figma.createImage(decodeBase64(layer.image.base64)); node.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }]; } else node.fills = paint('#E5E7EB'); parent.appendChild(node); return node; }
function placeText(parent, name, value, x, y, size, color, isBold, width, height) { const node = label(name, value, size, color, isBold, width || 180); node.x = x || 0; node.y = y || 0; try { node.textAutoResize = 'HEIGHT'; node.resize(Math.max(1, width || 180), Math.max(18, height || (size || 12) * 1.4)); } catch (_) {} parent.appendChild(node); return node; }

function normalizePlan(payload, layers, sections) {
  const bridgePlan = payload.rebuildPlan || {};
  const tokens = bridgePlan.tokens || {};
  const textLayers = layers.filter((l) => l.type === 'text');
  const planSections = arr(bridgePlan.sections).length ? arr(bridgePlan.sections) : sections.slice(0, 12).map((section, index) => ({ name: section.name || ('Section ' + (index + 1)), templateIntent: index === 0 ? 'header' : section.role === 'footer' ? 'footer' : 'content', priorityText: [] }));
  return { title: clean(payload.title || bridgePlan.title || 'Website Design Clone'), url: payload.url || bridgePlan.url || '', summary: bridgePlan.summary || 'Design clone generated as visual matched Figma structure.', publicVersion: payload.publicVersion || bridgePlan.publicVersion || PUBLIC_VERSION, tokens: { colors: arr(tokens.colors).length ? tokens.colors : collectColors(layers), textStyles: arr(tokens.typography).length ? tokens.typography : unique(textLayers, styleKey, 18), spacing: arr(tokens.spacing).length ? tokens.spacing : defaultSpacing(), radius: arr(tokens.radius).length ? tokens.radius : defaultRadius() }, componentBlueprints: arr(bridgePlan.componentBlueprints), responsive: bridgePlan.responsive || {}, counts: { sections: sections.length, text: textLayers.length, images: layers.filter((l) => l.type === 'image').length, buttons: layers.filter((l) => l.role === 'button-bg' || l.role === 'button-label').length }, sections: planSections, qualityHints: bridgePlan.qualityHints || {}, uncertainties: bridgePlan.uncertainties || [] };
}

function bounds(layers, viewport, pageHeight) {
  const valid = arr(layers).filter((l) => l.rect && l.rect.w > 1 && l.rect.h > 1);
  const maxY = Math.max(pageHeight || 0, ...valid.map((l) => l.rect.y + l.rect.h), viewport && viewport.height || 1200);
  return { width: viewport && viewport.width ? viewport.width : 1440, height: Math.min(Math.max(900, maxY), 12000) };
}
function visualLayerAllowed(layer, viewportWidth, pageHeight) {
  if (!layer || !layer.rect) return false;
  if (layer.rect.w < 2 || layer.rect.h < 2) return false;
  if (layer.rect.x > viewportWidth + 80 || layer.rect.x + layer.rect.w < -80) return false;
  if (layer.rect.y > pageHeight + 120 || layer.rect.y + layer.rect.h < -20) return false;
  const area = layer.rect.w * layer.rect.h;
  const pageArea = viewportWidth * Math.max(900, Math.min(pageHeight, 4000));
  if (layer.type === 'box' && area > pageArea * 0.72 && !['navigation', 'footer', 'section'].includes(layer.role)) return false;
  if (layer.type === 'text' && !textValue(layer)) return false;
  return true;
}
function makeVisualMatchedCloneFrame(payload, plan, layers) {
  const source = bounds(layers, payload.viewport || {}, payload.pageHeight || 0);
  const scale = 1280 / source.width;
  const h = Math.round(source.height * scale);
  const f = frame('01 Visual Matched Clone / Main Output', 1280, h, '#FFFFFF');
  f.clipsContent = true;
  const allowed = arr(layers).filter((l) => visualLayerAllowed(l, source.width, source.height)).sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 650);
  allowed.filter((l) => l.type === 'box').forEach((layer) => {
    const s = layer.style || {};
    const fill = cssColor(s.backgroundColor, '');
    const stroke = cssColor(s.borderTopColor || s.borderBottomColor || s.borderLeftColor || s.borderRightColor, '');
    if (!fill && !stroke) return;
    const r = layer.rect;
    const node = rect(f, (layer.role || 'Box') + ' / ' + (layer.name || layer.tag || ''), Math.round(r.x * scale), Math.round(r.y * scale), Math.round(r.w * scale), Math.round(r.h * scale), fill || '#FFFFFF', Math.round(num(s.borderRadius, 0) * scale), stroke || null);
    const opacity = Number(s.opacity || 1);
    if (Number.isFinite(opacity) && opacity < 1) node.opacity = Math.max(0.05, Math.min(1, opacity));
  });
  allowed.filter((l) => l.type === 'image').forEach((layer) => {
    const r = layer.rect;
    imageNode(f, layer, Math.round(r.x * scale), Math.round(r.y * scale), Math.round(r.w * scale), Math.round(r.h * scale), Math.round(num(layer.style && layer.style.borderRadius, 0) * scale));
  });
  allowed.filter((l) => l.type === 'text').forEach((layer) => {
    const r = layer.rect;
    const s = layer.style || {};
    const fontSize = Math.max(6, Math.min(96, num(s.fontSize, 14) * scale));
    const color = cssColor(s.color, '#111827') || '#111827';
    const isBold = /bold|600|700|800|900/i.test(String(s.fontWeight || '')) || layer.role === 'heading' || layer.role === 'button-label';
    placeText(f, (layer.role || 'Text') + ' / ' + cut(textValue(layer), 28), textValue(layer), Math.round(r.x * scale), Math.round(r.y * scale), fontSize, color, isBold, Math.max(20, Math.round(r.w * scale)), Math.max(12, Math.round(r.h * scale)));
  });
  return f;
}
function makeScreenshotFrame(payload, width) { const ratio = payload.screenshot && payload.screenshot.width ? (payload.screenshot.height || 1600) / payload.screenshot.width : 1.4; const h = Math.max(640, Math.min(9000, Math.round(width * ratio))); const f = frame('02 Screenshot Reference / Pure Source', width, h, '#FFFFFF'); f.clipsContent = true; if (payload.screenshot && payload.screenshot.base64) { const img = figma.createImage(decodeBase64(payload.screenshot.base64)); const shot = figma.createRectangle(); shot.name = 'Pure Screenshot Reference / locked'; shot.resize(width, h); shot.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }]; shot.strokes = []; try { shot.locked = true; } catch (_) {} f.appendChild(shot); } return f; }
function tokenComponent(hex, i) { const c = frame('Color Token / ' + String(i + 1).padStart(2, '0'), 156, 100, '#FFFFFF'); c.cornerRadius = 18; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1; rect(c, 'Swatch', 16, 16, 124, 38, hex, 12); placeText(c, 'Hex', hex, 16, 66, 11, '#111827', true, 124); return c; }
function appendMiniGrid(parent, title, items, factory, cols, cardW, cardH) { const section = autoFrame(title, 1180, '#FFFFFF', 12, 20); section.cornerRadius = 24; section.strokes = paint('#E5E7EB'); section.strokeWeight = 1; section.appendChild(label('Group Title', title, 18, '#111827', true, 1120)); const rows = Math.ceil(Math.max(1, arr(items).length) / cols); const grid = frame(title + ' Grid', 1120, rows * (cardH + 16), null); grid.fills = []; arr(items).forEach((item, i) => { const node = factory(item, i); node.x = (i % cols) * (cardW + 16); node.y = Math.floor(i / cols) * (cardH + 16); grid.appendChild(node); }); section.appendChild(grid); parent.appendChild(section); }
function makeLibraryFrame(plan) { const t = theme(plan); const lib = autoFrame('03 UI Library / Supporting Design System', 1280, t.bg, 28, 32); lib.appendChild(label('Library Title', 'UI Library / Supporting Design System', 32, t.text, true, 1160)); lib.appendChild(label('Library Note', 'Supporting tokens/components. Main clone output is the visual matched frame above.', 12, t.muted, false, 1160)); appendMiniGrid(lib, 'Color Tokens', plan.tokens.colors.length ? plan.tokens.colors : ['#111827', '#F8FAFC', t.primary], tokenComponent, 7, 156, 100); appendMiniGrid(lib, 'Component Blueprints', plan.componentBlueprints.length ? plan.componentBlueprints : [{ name: 'Card / Default' }], (item, i) => { const c = frame('Blueprint / ' + (item.name || i), 260, 112, '#FFFFFF'); c.cornerRadius = 20; c.strokes = paint('#D9DEE8'); c.strokeWeight = 1; placeText(c, 'Blueprint Name', item.name || 'Component', 16, 18, 13, '#111827', true, 220); placeText(c, 'Blueprint Purpose', cut(item.purpose || 'Reusable component.', 80), 16, 46, 10, '#64748B', false, 220); return c; }, 4, 260, 112); return lib; }
function makePlanFrame(plan) { const t = theme(plan); const f = autoFrame('04 Rebuild Plan / AI Interpretation', 1280, '#FFFFFF', 20, 32); f.cornerRadius = 28; f.strokes = paint(t.border); f.strokeWeight = 1; f.appendChild(label('Plan Title', 'Rebuild Plan / AI Interpretation', 30, t.text, true, 1160)); f.appendChild(label('Plan Summary', plan.summary, 13, t.muted, false, 1160)); f.appendChild(label('Plan Counts', 'Sections: ' + plan.counts.sections + ' | Text: ' + plan.counts.text + ' | Images: ' + plan.counts.images + ' | Buttons: ' + plan.counts.buttons, 13, t.primary, true, 1160)); return f; }
function makeAuditFrame(diag) { const f = autoFrame('05 Audit / Design Clone Notes', 1280, '#0B1020', 14, 32); f.appendChild(label('Audit Title', 'Design Clone Audit / Honest Readiness', 28, '#F8FAFC', true, 1160)); f.appendChild(label('Audit Note', 'Main output is now visual matched from captured layers. Inspect against screenshot reference below.', 13, '#CBD5E1', false, 1160)); f.appendChild(label('Audit Diagnostics', 'sections: ' + diag.sectionCount + ' / layers: ' + diag.layerCount + ' / images: ' + diag.imageCount + ' / text: ' + diag.textCount + ' / colors: ' + diag.colorTokenCount + ' / renderer: ' + INTERNAL_RENDERER, 14, '#93C5FD', true, 1160)); return f; }
function createPaintStyles(title, colors) { const created = []; arr(colors).forEach((hex, i) => { try { const s = figma.createPaintStyle(); s.name = 'TranslateIT/' + safe(title) + '/Color ' + String(i + 1).padStart(2, '0') + ' ' + hex; s.paints = paint(hex); created.push(s.name); } catch (_) {} }); return created; }
function createTextStyles(title, items) { const created = []; arr(items).forEach((item, i) => { try { const role = item.role || 'text'; const size = item.fontSize || (item.style && item.style.fontSize) || '14px'; const weight = item.fontWeight || (item.style && item.style.fontWeight) || ''; const color = item.color || cssColor(item.style && item.style.color, '#111827') || '#111827'; const s = figma.createTextStyle(); s.name = 'TranslateIT/' + safe(title) + '/Text ' + String(i + 1).padStart(2, '0') + ' ' + role; s.fontName = /bold|600|700|800|900/i.test(String(weight)) || role === 'heading' ? bold : regular; s.fontSize = Math.max(8, num(size, role === 'heading' ? 30 : 14)); s.fills = paint(color); created.push(s.name); } catch (_) {} }); return created; }

async function importUniversal(payload) {
  await loadFonts();
  if (!payload || !(payload.screenshot || arr(payload.layers).length || arr(payload.sections).length)) throw new Error('Expected TranslateIT design clone payload.');
  const page = await workspacePage();
  const layers = arr(payload.layers); const sections = arr(payload.sections);
  if (!layers.length && !sections.length && !(payload.screenshot && payload.screenshot.base64)) throw new Error('No visible page data found.');
  const plan = normalizePlan(payload, layers, sections);
  const paintStyles = createPaintStyles(payload.title || 'Website', plan.tokens.colors);
  const textStyles = createTextStyles(payload.title || 'Website', plan.tokens.textStyles);
  const d = payload.diagnostics || {};
  lastDiagnostics = { layerCount: d.layerCount || layers.length, sectionCount: d.sectionCount || sections.length, componentCount: d.componentCount || 0, imageCount: d.imageCount || layers.filter((l) => l.type === 'image').length, textCount: d.textCount || layers.filter((l) => l.type === 'text').length, colorTokenCount: plan.tokens.colors.length, textStyleCount: plan.tokens.textStyles.length, spacingTokenCount: plan.tokens.spacing.length, radiusTokenCount: plan.tokens.radius.length, componentBlueprintCount: plan.componentBlueprints.length, overflowRiskCount: (plan.qualityHints && plan.qualityHints.overflowRiskCount) || 0, denseSectionCount: (plan.qualityHints && plan.qualityHints.denseSectionCount) || 0, responsiveCount: Object.keys(plan.responsive || {}).length, templateIntentCount: plan.sections.filter((s) => !!s.templateIntent).length, paintStyleCount: paintStyles.length, figmaTextStyleCount: textStyles.length, visualPolishLevel: 'visual-matched', outputMode: INTERNAL_RENDERER };
  lastImportMeta = { title: payload.title || '', url: payload.url || '', adapterMode: payload.mode || '', publicVersion: plan.publicVersion, pluginOutputMode: INTERNAL_RENDERER };
  const run = autoFrame(safe((payload.title || 'Website Design Clone') + ' / ' + new Date().toISOString().replace(/[:.]/g, '-')), 1440, '#030407', 30, 40);
  run.appendChild(label('Run Title', payload.title || 'Website Design Clone', 30, '#F8FAFC', true, 1320));
  run.appendChild(label('Run Note', PUBLIC_VERSION + ': visual matched clone first. Compare 01 output against 02 screenshot reference.', 12, '#8D96A6', false, 1320));
  const visualClone = makeVisualMatchedCloneFrame(payload, plan, layers);
  run.appendChild(visualClone);
  run.appendChild(makeScreenshotFrame(payload, 1280));
  run.appendChild(makeLibraryFrame(plan));
  run.appendChild(makePlanFrame(plan));
  run.appendChild(makeAuditFrame(lastDiagnostics));
  page.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([visualClone]);
  lastRun = run;
  send('Import complete.\nPublic version: ' + PUBLIC_VERSION + '\nRenderer: visual matched clone\nMain Output: 01 Visual Matched Clone / Main Output\nCompare against: 02 Screenshot Reference / Pure Source\nSections: ' + lastDiagnostics.sectionCount + '\nLayers: ' + lastDiagnostics.layerCount + '\nImages: ' + lastDiagnostics.imageCount + '\nText: ' + lastDiagnostics.textCount + '\nImportant: inspect 01 vs 02 for visual match.');
}
function exportPackage() { if (!lastRun) return send('No import run found. Import Data first.'); send('Export complete.', { exportJson: JSON.stringify({ schema: 'translateit.design-clone.alpha', publicVersion: PUBLIC_VERSION, pluginRenderer: INTERNAL_RENDERER, generatedAt: new Date().toISOString(), source: lastImportMeta || {}, diagnostics: lastDiagnostics || {} }, null, 2) }); }
figma.ui.onmessage = async function (msg) { try { msg = msg || {}; if (msg.type === 'import-design-reconstruction' || msg.type === 'import-layout-tree' || msg.type === 'import-source-bundle' || msg.type === 'import-inspector-tree') return await importUniversal(msg.payload || {}); if (msg.type === 'export-ui-package') return exportPackage(); send('Unsupported command: ' + msg.type); } catch (error) { send('Plugin error: ' + (error && error.message ? error.message : error)); } };
