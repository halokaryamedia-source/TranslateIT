figma.showUI(__html__, { width: 580, height: 860 });

var PUBLIC_VERSION = 'Version 0.1 - Alpha';
var ENGINE = 'translateit-core';
var ENGINE_BUILD = 'alpha-clean-1';
var PAGE_NAME = 'TranslateIT Import / Clean Engine';
var regular = { family: 'Inter', style: 'Regular' };
var bold = { family: 'Inter', style: 'Bold' };
var lastFrame = null;

function arr(value) { return Array.isArray(value) ? value : []; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function layerName(value) { return (clean(value) || 'Layer').slice(0, 90); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function post(text) { figma.ui.postMessage({ type: 'status', text: text }); }
function cut(value, max) { var text = clean(value); return text.length > max ? text.slice(0, max - 1) + '…' : text; }

function hexToRgb(hex) { var raw = /^#[0-9a-fA-F]{6}$/.test(hex || '') ? hex.slice(1) : '111827'; var num = parseInt(raw, 16); return { r: ((num >> 16) & 255) / 255, g: ((num >> 8) & 255) / 255, b: (num & 255) / 255 }; }
function paint(hex) { return [{ type: 'SOLID', color: hexToRgb(hex || '#111827') }]; }
function base64ToBytes(value) { var binary = atob(value || ''); var bytes = new Uint8Array(binary.length); for (var i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i); return bytes; }

async function preparePage() {
  try { await figma.loadFontAsync(regular); } catch (_) { regular = { family: 'Roboto', style: 'Regular' }; await figma.loadFontAsync(regular); }
  try { await figma.loadFontAsync(bold); } catch (_) { bold = regular; }
  var page = null;
  for (var i = 0; i < figma.root.children.length; i += 1) if (figma.root.children[i].name === PAGE_NAME) page = figma.root.children[i];
  if (!page) page = figma.createPage();
  page.name = PAGE_NAME;
  if (figma.setCurrentPageAsync) await figma.setCurrentPageAsync(page);
  return page;
}

function frame(name, w, h, fill) { var node = figma.createFrame(); node.name = layerName(name); node.resize(Math.max(1, w), Math.max(1, h)); node.fills = fill ? paint(fill) : []; node.strokes = []; node.clipsContent = false; return node; }
function rect(parent, name, x, y, w, h, fill, radius, stroke) { var node = figma.createRectangle(); node.name = layerName(name); node.x = x; node.y = y; node.resize(Math.max(1, w), Math.max(1, h)); node.fills = paint(fill || '#FFFFFF'); node.cornerRadius = radius || 0; node.strokes = stroke ? paint(stroke) : []; node.strokeWeight = stroke ? 1 : 0; parent.appendChild(node); return node; }
function text(parent, name, value, x, y, fontSize, color, width, weight) { var node = figma.createText(); node.name = layerName(name); node.fontName = weight >= 600 ? bold : regular; node.characters = clean(value) || ' '; node.fontSize = clamp(fontSize, 7, 64); node.fills = paint(color || '#111827'); node.x = x; node.y = y; try { node.textAutoResize = 'HEIGHT'; node.resize(Math.max(20, width || 220), Math.max(12, node.fontSize * 1.45)); } catch (_) {} parent.appendChild(node); return node; }
function image(parent, name, asset, x, y, w, h, radius) { var node = figma.createRectangle(); node.name = layerName(name); node.x = x; node.y = y; node.resize(Math.max(1, w), Math.max(1, h)); node.cornerRadius = radius || 0; node.strokes = []; if (asset && asset.base64) { var img = figma.createImage(base64ToBytes(asset.base64)); node.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }]; } else { node.fills = paint('#E5E7EB'); } parent.appendChild(node); return node; }

function validatePayload(payload) {
  if (!payload || payload.ok !== true) throw new Error('Invalid payload.');
  if (payload.publicVersion !== PUBLIC_VERSION) throw new Error('Wrong public version.');
  if (payload.engine !== ENGINE) throw new Error('Wrong engine. Expected translateit-core.');
  if (payload.engineBuild !== ENGINE_BUILD) throw new Error('Wrong engine build. Expected alpha-clean-1.');
  if (!payload.designModel) throw new Error('designModel missing.');
  if (!Array.isArray(payload.designModel.sections)) throw new Error('designModel.sections missing.');
  if (!Array.isArray(payload.designModel.elements)) throw new Error('designModel.elements missing.');
  if (!Array.isArray(payload.designModel.assets)) throw new Error('designModel.assets missing.');
  if (!payload.designModel.renderPlan) throw new Error('designModel.renderPlan missing. Run the latest clean RenderBridge.');
}

function findAsset(assets, assetId) { for (var i = 0; i < assets.length; i += 1) if (assets[i].id === assetId) return assets[i]; return null; }
function safePlan(model) { return model.renderPlan || {}; }
function asset(model, id) { return findAsset(arr(model.assets), id); }
function nonEmpty(value, fallback) { return clean(value) || fallback; }

function renderButton(parent, label, x, y, w, fill, color) { var g = frame('Button / ' + label, w, 40, ''); g.x = x; g.y = y; rect(g, 'Button Surface', 0, 0, w, 40, fill || '#F4C84A', 20, ''); text(g, 'Button Label', label, 18, 12, 11, color || '#111827', w - 36, 700); parent.appendChild(g); return g; }
function renderLinks(parent, prefix, links, x, y, columnWidth, rowGap, color) { for (var i = 0; i < links.length; i += 1) text(parent, prefix + ' / ' + links[i], links[i], x, y + i * rowGap, 11, color || '#111827', columnWidth, 400); }

function renderHeader(parent, model, y) {
  var plan = safePlan(model).header || {};
  var brand = nonEmpty(plan.brand, clean(model.page.title || 'Website'));
  var links = arr(plan.navLinks).slice(0, 6);
  var h = 96;
  var s = frame('Section / Header / Navigation', 1280, h, '#FFFFFF'); s.x = 0; s.y = y; s.clipsContent = true; parent.appendChild(s);
  rect(s, 'Header Shell', 48, 22, 1184, 56, '#FFFFFF', 26, '#E9EEF5');
  rect(s, 'Brand Mark', 72, 36, 26, 26, '#F4C84A', 8, '');
  text(s, 'Brand / ' + brand, brand, 110, 40, 14, '#111827', 260, 800);
  var cursor = 600;
  for (var i = 0; i < links.length; i += 1) { var label = links[i]; var w = Math.max(54, Math.min(104, label.length * 7 + 18)); text(s, 'Nav Item / ' + label, label, cursor, 42, 11, '#111827', w, 500); cursor += w + 14; }
  if (plan.cta) renderButton(s, plan.cta, 1080, 30, 130, '#FFFFFF', '#111827');
  return h;
}

function renderHero(parent, model, y) {
  var plan = safePlan(model).hero || {};
  var h = 610;
  var title = nonEmpty(plan.title, clean(model.page.title || 'Website'));
  var body = nonEmpty(plan.body, 'Clean editable reconstruction generated from the website source.');
  var s = frame('Section / Hero / Primary', 1280, h, '#FFFFFF'); s.x = 0; s.y = y; s.clipsContent = true; parent.appendChild(s);
  rect(s, 'Hero Background', 48, 34, 1184, 540, '#FFFDF4', 30, '#F3EAC2');
  text(s, 'Eyebrow / ' + nonEmpty(plan.eyebrow, 'Website Import'), nonEmpty(plan.eyebrow, 'Website Import'), 92, 98, 12, '#B88700', 320, 800);
  text(s, 'Hero Title / ' + cut(title, 40), title, 92, 132, 44, '#111827', 410, 800);
  text(s, 'Hero Body / Source Summary', body, 92, 318, 14, '#475467', 410, 400);
  renderButton(s, nonEmpty(plan.cta, 'Learn More'), 92, 430, 142, '#F4C84A', '#111827');
  var a1 = asset(model, plan.primaryAssetId); var a2 = asset(model, plan.secondaryAssetId);
  image(s, 'Hero Media / Primary', a1, 570, 86, 374, 420, 26);
  image(s, 'Hero Media / Secondary', a2, 968, 130, 210, 330, 22);
  rect(s, 'Hero Accent / Yellow Block', 1010, 486, 150, 42, '#F4C84A', 14, '');
  return h;
}

function renderContent(parent, model, y) {
  var plan = safePlan(model).content || {};
  var cards = arr(plan.cards);
  var h = 600;
  var s = frame('Section / Content / Card System', 1280, h, '#FFFFFF'); s.x = 0; s.y = y; s.clipsContent = true; parent.appendChild(s);
  text(s, 'Section Title / ' + nonEmpty(plan.title, 'Editable Content System'), nonEmpty(plan.title, 'Editable Content System'), 72, 56, 24, '#111827', 560, 800);
  text(s, 'Section Body / Render Plan Summary', nonEmpty(plan.body, 'Clean grouped cards generated from the website structure.'), 72, 96, 13, '#667085', 560, 400);
  var count = Math.max(2, Math.min(3, cards.length || 2));
  for (var i = 0; i < count; i += 1) {
    var card = cards[i] || {};
    var x = 72 + i * 386;
    rect(s, 'Card Surface / ' + (i + 1), x, 172, 350, 330, '#FFFFFF', 26, '#EAECF0');
    image(s, 'Card Image / ' + (i + 1), asset(model, card.assetId), x + 18, 192, 314, 178, 18);
    text(s, 'Card Title / ' + (i + 1), nonEmpty(card.title, 'Content Card ' + (i + 1)), x + 22, 396, 16, '#111827', 306, 800);
    text(s, 'Card Body / ' + (i + 1), nonEmpty(card.body, 'Editable grouped content from the source website.'), x + 22, 428, 11, '#667085', 306, 400);
  }
  return h;
}

function renderFooter(parent, model, y) {
  var plan = safePlan(model).footer || {};
  var h = 300;
  var brand = nonEmpty(plan.brand, clean(model.page.title || 'Website'));
  var links = arr(plan.links).slice(0, 12);
  var columns = arr(plan.columns); if (!columns.length) columns = ['Recent Works', 'Program', 'Contact'];
  var s = frame('Section / Footer', 1280, h, '#087A4B'); s.x = 0; s.y = y; s.clipsContent = true; parent.appendChild(s);
  rect(s, 'Footer Brand Mark', 72, 58, 38, 38, '#F4C84A', 11, '');
  text(s, 'Footer Brand / ' + cut(brand, 32), brand, 126, 58, 22, '#FFFFFF', 330, 800);
  text(s, 'Footer Body', nonEmpty(plan.body, 'Editable footer reconstructed from the source website.'), 126, 104, 12, '#DFF4EA', 390, 400);
  for (var c = 0; c < 3; c += 1) { var x = 590 + c * 190; text(s, 'Footer Column / ' + columns[c], columns[c] || ('Column ' + (c + 1)), x, 62, 13, '#FFFFFF', 160, 800); renderLinks(s, 'Footer Link', links.slice(c * 4, c * 4 + 4), x, 96, 160, 24, '#EAFBF3'); }
  return h;
}

function renderDesignModel(payload) {
  var model = payload.designModel;
  var totalH = 96 + 610 + 600 + 300 + 68;
  var root = frame('01 UI Library / Editable Website Reconstruction', 1280, totalH, '#FFFFFF'); root.clipsContent = true;
  var y = 0; y += renderHeader(root, model, y); y += renderHero(root, model, y); y += renderContent(root, model, y); y += renderFooter(root, model, y);
  text(root, 'Renderer Note', 'Rendered from engine renderPlan. Professional section-based editable UI Library structure.', 48, totalH - 38, 10, '#98A2B3', 780, 400);
  return root;
}

function renderSourceReference(payload, width) { var source = payload.source || {}; var shot = source.screenshot; var ratio = shot && shot.width ? (shot.height || 1600) / shot.width : 1.4; var ref = frame('02 Screenshot Reference / Pure Source', width, Math.max(640, Math.round(width * ratio)), '#FFFFFF'); ref.clipsContent = true; if (shot && shot.base64) { var img = figma.createImage(base64ToBytes(shot.base64)); var node = figma.createRectangle(); node.name = 'Locked Screenshot'; node.resize(ref.width, ref.height); node.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }]; node.strokes = []; try { node.locked = true; } catch (_) {} ref.appendChild(node); } return ref; }

async function importPayload(payload) {
  validatePayload(payload); await preparePage();
  var pageTitle = clean(payload.designModel.page.title || (payload.source && payload.source.title) || 'Website');
  var root = frame(pageTitle + ' / ' + new Date().toISOString().replace(/[:.]/g, '-'), 1440, 2400, '#FFFFFF');
  text(root, 'Run Title', pageTitle, 80, 30, 28, '#111827', 1200, 700);
  text(root, 'Run Note', PUBLIC_VERSION + ' / ' + ENGINE + ' / ' + ENGINE_BUILD + ' — rendered from engine renderPlan.', 80, 68, 12, '#667085', 1200, 400);
  var main = renderDesignModel(payload); main.x = 80; main.y = 112; root.appendChild(main);
  var ref = renderSourceReference(payload, 1280); ref.x = 80; ref.y = main.y + main.height + 80; root.resize(1440, ref.y + ref.height + 80); root.appendChild(ref);
  figma.currentPage.appendChild(root); figma.viewport.scrollAndZoomIntoView([main]); lastFrame = root;
  var plan = payload.designModel.renderPlan || {};
  post('Import complete.\nEngine: ' + ENGINE + '\nEngine Build: ' + ENGINE_BUILD + '\nRenderer: engine renderPlan UI Library\nRenderPlan: ' + (plan.mode || 'missing') + '\nSections: ' + payload.designModel.sections.length + '\nElements: ' + payload.designModel.elements.length + '\nAssets: ' + payload.designModel.assets.length);
}

function exportPackage() { figma.ui.postMessage({ exportJson: JSON.stringify({ publicVersion: PUBLIC_VERSION, engine: ENGINE, engineBuild: ENGINE_BUILD, workspace: PAGE_NAME, lastFrame: lastFrame ? lastFrame.name : null, exportedAt: new Date().toISOString(), rules: ['Render from designModel.renderPlan.', 'Screenshot source is reference only.', 'Output must stay editable and UI Library structured.'] }, null, 2) }); post('Export package ready.\nEngine: ' + ENGINE + '\nLast Frame: ' + (lastFrame ? lastFrame.name : 'none')); }

figma.ui.onmessage = async function(message) { try { if (message && message.type === 'import-design-model') return await importPayload(message.payload || {}); if (message && message.type === 'export-ui-package') return exportPackage(); post('Unsupported command: ' + (message && message.type)); } catch (err) { var msg = err && err.message ? err.message : String(err); console.error(err); post('Plugin error: ' + msg); } };
post('Clean renderer loaded.\nEngine: ' + ENGINE + '\nEngine Build: ' + ENGINE_BUILD + '\nRenderer: engine renderPlan UI Library');
