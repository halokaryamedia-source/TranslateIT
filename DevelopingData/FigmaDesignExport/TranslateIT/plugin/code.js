figma.showUI(__html__, { width: 580, height: 860 });

const NS = 'translateit.designExport';
const VERSION = 'design-reconstruction-compiler-v1';
const PAGE_NAME = 'TranslateIT Import / Workspace';
let lastRun = null;
let regularFont = { family: 'Inter', style: 'Regular' };
let boldFont = { family: 'Inter', style: 'Bold' };

function status(text, extra) {
  const message = { type: 'status', text: text };
  extra = extra || {};
  Object.keys(extra).forEach(function (key) { message[key] = extra[key]; });
  figma.ui.postMessage(message);
}

async function loadFonts() {
  try { await figma.loadFontAsync(regularFont); } catch (_) { regularFont = { family: 'Roboto', style: 'Regular' }; await figma.loadFontAsync(regularFont); }
  try { await figma.loadFontAsync(boldFont); } catch (_) { boldFont = regularFont; }
}

function font(bold) { return bold ? boldFont : regularFont; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function safeName(value) { return clean(value || 'Layer').slice(0, 96) || 'Layer'; }
function px(value, fallback) { const m = String(value || '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : fallback; }
function rgb(hex) { const v = parseInt(/^#[\da-fA-F]{6}$/.test(hex || '') ? hex.slice(1) : '111827', 16); return { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 }; }
function paint(hex) { return hex ? [{ type: 'SOLID', color: rgb(hex) }] : []; }
function color(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return fallback || null;
  const hex = raw.match(/#[\da-fA-F]{6}|#[\da-fA-F]{3}/);
  if (hex) return hex[0].length === 4 ? '#' + hex[0][1] + hex[0][1] + hex[0][2] + hex[0][2] + hex[0][3] + hex[0][3] : hex[0];
  const rgba = raw.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const p = rgba[1].split(',').map(function (x) { return parseFloat(x); });
    if (p.length >= 3 && !(p.length >= 4 && p[3] === 0)) return '#' + p.slice(0, 3).map(function (n) { return Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0'); }).join('');
  }
  return fallback || null;
}
function bytes(base64) { const raw = atob(base64); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i); return out; }
function pos(rect, parent, scale) { rect = rect || {}; parent = parent || {}; return { x: Math.round(((rect.x || 0) - (parent.x || 0)) * scale), y: Math.round(((rect.y || 0) - (parent.y || 0)) * scale) }; }
function size(rect, scale) { rect = rect || {}; return { w: Math.max(1, Math.round((rect.w || 1) * scale)), h: Math.max(1, Math.round((rect.h || 1) * scale)) }; }

async function page() {
  let p = null;
  for (let i = 0; i < figma.root.children.length; i += 1) if (figma.root.children[i].name === PAGE_NAME) p = figma.root.children[i];
  if (!p) p = figma.createPage();
  p.name = PAGE_NAME;
  await figma.setCurrentPageAsync(p);
  return p;
}

function meta(node, source) {
  source = source || {};
  node.setSharedPluginData(NS, 'version', VERSION);
  node.setSharedPluginData(NS, 'role', source.role || '');
  node.setSharedPluginData(NS, 'tag', source.tag || '');
  node.setSharedPluginData(NS, 'path', source.path || '');
}

function makeFrame(name, rect, parent, scale, fill) {
  const f = figma.createFrame();
  const s = size(rect, scale);
  const p = pos(rect, parent, scale);
  f.name = safeName(name);
  f.resize(s.w, s.h);
  f.x = p.x; f.y = p.y;
  f.layoutMode = 'NONE';
  f.paddingTop = 0; f.paddingRight = 0; f.paddingBottom = 0; f.paddingLeft = 0;
  f.clipsContent = false;
  f.fills = fill ? paint(fill) : [];
  f.strokes = [];
  return f;
}

function makeText(item, parent, scale) {
  const style = item.style || {};
  const t = figma.createText();
  const value = clean(item.text || item.name || '');
  const bold = /bold|600|700|800|900/i.test(String(style.fontWeight || '')) || item.role === 'heading';
  t.fontName = font(bold);
  t.characters = value || ' ';
  t.fontSize = Math.max(6, px(style.fontSize, item.role === 'heading' ? 32 : 14) * scale);
  t.fills = paint(color(style.color, item.role === 'heading' ? '#111827' : '#374151'));
  t.name = safeName((item.role || 'text') + ' / ' + value.slice(0, 56));
  const p = pos(item.rect, parent, scale);
  t.x = p.x; t.y = p.y;
  try { t.resize(Math.max(1, Math.round(((item.rect && item.rect.w) || 120) * scale)), t.height); } catch (_) {}
  meta(t, item);
  return t;
}

function makeImage(item, parent, scale) {
  const r = figma.createRectangle();
  const s = size(item.rect, scale);
  const p = pos(item.rect, parent, scale);
  r.name = safeName('image / ' + (item.name || 'Image'));
  r.resize(s.w, s.h);
  r.x = p.x; r.y = p.y;
  r.cornerRadius = Math.max(0, px((item.style || {}).borderRadius, 0) * scale);
  if (item.image && item.image.base64) {
    const img = figma.createImage(bytes(item.image.base64));
    r.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }];
  } else r.fills = paint('#E5E7EB');
  meta(r, item);
  return r;
}

function makeButton(item, parent, scale) {
  const f = makeFrame((item.role || 'button') + ' / ' + (item.text || item.name || 'Action'), item.rect, parent, scale, color((item.style || {}).backgroundColor, '#FFFFFF'));
  f.cornerRadius = Math.max(8, Math.round(size(item.rect, scale).h / 2));
  f.strokes = paint('#D1D5DB');
  f.strokeWeight = 1;
  const labelRect = { x: (item.rect.x || 0) + 12, y: (item.rect.y || 0) + 6, w: Math.max(20, (item.rect.w || 80) - 24), h: Math.max(12, (item.rect.h || 32) - 12) };
  const label = makeText({ role: 'text', tag: 'label', name: item.name, text: item.text || item.name || 'Button', rect: labelRect, style: item.style || {}, path: item.path || '' }, item.rect, scale);
  label.x = Math.max(4, label.x); label.y = Math.max(2, label.y);
  f.appendChild(label);
  meta(f, item);
  return f;
}

function makeElement(item, parent, scale) {
  if (!item || !item.rect) return null;
  if (item.role === 'image') return makeImage(item, parent, scale);
  if (item.role === 'button' || item.role === 'link') return makeButton(item, parent, scale);
  if (clean(item.text || item.name)) return makeText(item, parent, scale);
  return null;
}

function canvasHeight(sections, viewport) {
  let h = viewport && viewport.height ? viewport.height : 1600;
  (sections || []).forEach(function (section) { const r = section.rect || {}; h = Math.max(h, (r.y || 0) + (r.h || 0)); });
  return h;
}

async function importDesign(payload) {
  await loadFonts();
  const p = await page();
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const elements = Array.isArray(payload.elements) ? payload.elements : [];
  if (!sections.length && !elements.length) throw new Error('Design Reconstruction Compiler returned no visible elements.');

  const viewport = payload.viewport || { width: 1440, height: 1600 };
  const scale = 1280 / Math.max(1, Number(viewport.width) || 1440);
  const sourceHeight = canvasHeight(sections, viewport);
  const canvasH = Math.max(600, Math.round(sourceHeight * scale));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const run = figma.createFrame();
  run.name = safeName((payload.title || 'Website Design Reconstruction') + ' / ' + stamp);
  run.resize(1440, canvasH + 220);
  run.fills = paint('#030407');
  run.layoutMode = 'VERTICAL';
  run.itemSpacing = 24;
  run.paddingTop = 40; run.paddingRight = 40; run.paddingBottom = 40; run.paddingLeft = 40;
  run.primaryAxisSizingMode = 'AUTO';
  run.counterAxisSizingMode = 'FIXED';

  const title = figma.createText();
  title.fontName = font(true);
  title.characters = payload.title || 'Website Design Reconstruction';
  title.fontSize = 30;
  title.fills = paint('#F7F9FD');
  title.name = 'Import Title';
  run.appendChild(title);

  const info = payload.source || {};
  const note = figma.createText();
  note.fontName = font(false);
  note.characters = 'Design Reconstruction Compiler: clean editable rebuild from visible website text, images, actions, and layout clusters. Elements: ' + (info.elementCount || elements.length) + ' / Sections: ' + (info.sectionCount || sections.length);
  note.fontSize = 12;
  note.fills = paint('#8D96A6');
  note.name = 'Import Note';
  run.appendChild(note);

  const canvas = figma.createFrame();
  canvas.name = '01 Website UI / Reconstructed Design';
  canvas.resize(1280, canvasH);
  canvas.layoutMode = 'NONE';
  canvas.paddingTop = 0; canvas.paddingRight = 0; canvas.paddingBottom = 0; canvas.paddingLeft = 0;
  canvas.clipsContent = false;
  canvas.fills = paint('#FFFFFF');

  if (sections.length) {
    sections.forEach(function (section, index) {
      const rect = section.rect || { x: 0, y: 0, w: viewport.width, h: 100 };
      const frame = makeFrame(section.role === 'header' ? 'Header' : 'Section ' + String(index + 1).padStart(2, '0'), rect, { x: 0, y: 0 }, scale, null);
      meta(frame, section);
      (section.rows || []).forEach(function (row) {
        (row.elements || []).forEach(function (item) {
          const layer = makeElement(item, rect, scale);
          if (layer) frame.appendChild(layer);
        });
      });
      canvas.appendChild(frame);
    });
  } else {
    elements.forEach(function (item) { const layer = makeElement(item, { x: 0, y: 0 }, scale); if (layer) canvas.appendChild(layer); });
  }

  run.appendChild(canvas);
  p.appendChild(run);
  figma.viewport.scrollAndZoomIntoView([run]);
  lastRun = run;

  status('Import complete.\nOutput page: ' + PAGE_NAME + '\nTop-level run: ' + run.name + '\nMode: Design Reconstruction Compiler\nElements generated: ' + (info.elementCount || elements.length) + '\nSections generated: ' + (info.sectionCount || sections.length) + '\nNext step: review in Figma, then Export Data.');
}

function exportPackage() {
  if (!lastRun) return status('No import run found. Import Data first.');
  status('Export complete.', { exportJson: JSON.stringify({ schema: 'translateit.ui-build-package.design-reconstruction.v1', generatedAt: new Date().toISOString(), pluginVersion: VERSION, figmaRun: lastRun.name }, null, 2) });
}

figma.ui.onmessage = async function (msg) {
  try {
    msg = msg || {};
    if (msg.type === 'import-design-reconstruction' || msg.type === 'import-layout-tree' || msg.type === 'import-source-bundle' || msg.type === 'import-inspector-tree') return await importDesign(msg.payload || {});
    if (msg.type === 'export-ui-package') return exportPackage();
    status('Unsupported command: ' + msg.type);
  } catch (error) {
    status('Plugin error: ' + (error && error.message ? error.message : error));
  }
};
