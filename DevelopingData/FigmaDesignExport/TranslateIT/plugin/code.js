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
function uniq(list, limit) { var seen = {}; var out = []; for (var i = 0; i < list.length; i += 1) { var v = clean(list[i]); var k = v.toLowerCase(); if (!v || seen[k]) continue; seen[k] = true; out.push(v); if (limit && out.length >= limit) break; } return out; }
function post(text) { figma.ui.postMessage({ type: 'status', text: text }); }

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
}

function findAsset(assets, assetId) { for (var i = 0; i < assets.length; i += 1) if (assets[i].id === assetId) return assets[i]; return null; }
function elementsBySection(model, sectionId) { return arr(model.elements).filter(function(item) { return item.sectionId === sectionId; }); }
function elementsByRole(elements, roles) { return elements.filter(function(item) { for (var i = 0; i < roles.length; i += 1) if (item.role === roles[i]) return true; return false; }); }
function firstText(elements, roles) { var hits = elementsByRole(elements, roles); hits.sort(function(a, b) { return (b.style && b.style.fontSize || 0) - (a.style && a.style.fontSize || 0) || clean(b.text).length - clean(a.text).length; }); return hits.length ? clean(hits[0].text) : ''; }
function textValues(elements, roles, limit) { var values = []; var hits = elementsByRole(elements, roles); hits.sort(function(a, b) { return (a.rect && a.rect.y || 0) - (b.rect && b.rect.y || 0) || (a.rect && a.rect.x || 0) - (b.rect && b.rect.x || 0); }); for (var i = 0; i < hits.length; i += 1) values.push(clean(hits[i].text)); return uniq(values, limit || 12); }
function imageElements(elements) { return elements.filter(function(item) { return item.type === 'image'; }); }
function buttonText(elements) { var buttons = elementsByRole(elements, ['button']); if (buttons.length) return clean(buttons[0].text); return ''; }
function sectionByRole(model, role) { var sections = arr(model.sections); for (var i = 0; i < sections.length; i += 1) if (sections[i].role === role) return sections[i]; return null; }
function sectionsNot(model, excluded) { var sections = arr(model.sections); return sections.filter(function(s) { for (var i = 0; i < excluded.length; i += 1) if (s.role === excluded[i]) return false; return true; }); }

function renderNav(parent, links, x, y, maxWidth) {
  var cursor = x;
  for (var i = 0; i < links.length; i += 1) {
    var w = Math.max(46, Math.min(92, links[i].length * 7 + 14));
    if (cursor + w > x + maxWidth) break;
    text(parent, 'Nav Item / ' + links[i], links[i], cursor, y, 11, '#111827', w, 500);
    cursor += w + 12;
  }
}

function renderButton(parent, label, x, y, w, fill, color) {
  var g = frame('Button / ' + label, w, 38, '');
  g.x = x; g.y = y; g.clipsContent = false;
  rect(g, 'Button Surface', 0, 0, w, 38, fill || '#F4C84A', 19, '');
  text(g, 'Button Label', label, 16, 11, 11, color || '#111827', w - 32, 700);
  parent.appendChild(g);
  return g;
}

function renderHeader(parent, model, y) {
  var sec = sectionByRole(model, 'header');
  var els = sec ? elementsBySection(model, sec.id) : [];
  var links = textValues(els, ['nav-item', 'link', 'label'], 7);
  var brand = firstText(els, ['title', 'label', 'nav-item']) || clean(model.page.title || 'Website').split('|')[0];
  var h = 88;
  var s = frame('Section / Header / Navigation', 1280, h, '#FFFFFF'); s.x = 0; s.y = y; s.clipsContent = true; parent.appendChild(s);
  rect(s, 'Header Background', 40, 18, 1200, 52, '#FFFFFF', 24, '#EEF2F7');
  rect(s, 'Brand Mark', 64, 31, 28, 28, '#F4C84A', 9, '');
  text(s, 'Brand / ' + brand, brand, 104, 36, 14, '#111827', 220, 700);
  renderNav(s, links, 560, 37, 480);
  if (links.length) renderButton(s, links[links.length - 1], 1080, 28, 130, '#FFFFFF', '#111827');
  return h;
}

function renderHero(parent, model, y) {
  var hero = sectionByRole(model, 'hero');
  var els = hero ? elementsBySection(model, hero.id) : [];
  var all = arr(model.elements);
  var images = imageElements(els); if (!images.length) images = imageElements(all).slice(0, 2);
  var title = firstText(els, ['title', 'section-title', 'subheading']) || firstText(all, ['title', 'section-title']) || clean(model.page.title || 'Website');
  var body = firstText(els, ['body']) || firstText(all, ['body', 'label']);
  var cta = buttonText(els) || buttonText(all) || 'Learn More';
  var h = 560;
  var s = frame('Section / Hero / Primary', 1280, h, '#FFFFFF'); s.x = 0; s.y = y; s.clipsContent = true; parent.appendChild(s);
  rect(s, 'Hero Surface', 40, 24, 1200, 508, '#FFFDF4', 28, '#F3EAC2');
  text(s, 'Eyebrow / Website Import', 'Website Import', 88, 82, 12, '#B88700', 260, 700);
  text(s, 'Title / ' + title, title, 88, 116, 42, '#111827', 390, 800);
  if (body) text(s, 'Body / Hero Summary', body, 88, 276, 14, '#475467', 390, 400);
  renderButton(s, cta, 88, 388, 136, '#F4C84A', '#111827');
  for (var i = 0; i < Math.min(2, images.length); i += 1) {
    var el = images[i]; var asset = findAsset(arr(model.assets), el.assetId);
    if (i === 0) image(s, el.name || 'Hero Image', asset, 560, 76, 360, 400, 22);
    if (i === 1) image(s, el.name || 'Supporting Image', asset, 940, 118, 220, 318, 20);
  }
  return h;
}

function renderContent(parent, model, y) {
  var candidates = sectionsNot(model, ['header', 'hero', 'footer']);
  var all = arr(model.elements);
  var contentEls = [];
  for (var i = 0; i < candidates.length; i += 1) contentEls = contentEls.concat(elementsBySection(model, candidates[i].id));
  if (!contentEls.length) contentEls = all;
  var images = imageElements(contentEls); if (!images.length) images = imageElements(all);
  var titles = textValues(contentEls, ['section-title', 'subheading', 'title', 'label'], 6);
  var bodies = textValues(contentEls, ['body', 'label'], 6);
  var h = 520;
  var s = frame('Section / Content / Main', 1280, h, '#FFFFFF'); s.x = 0; s.y = y; s.clipsContent = true; parent.appendChild(s);
  text(s, 'Section Title / Editable Content System', titles[0] || 'Editable Content System', 64, 48, 22, '#111827', 520, 800);
  text(s, 'Section Body / Clean grouped cards', bodies[0] || 'Clean grouped cards generated from the website structure.', 64, 86, 13, '#667085', 520, 400);
  var cardY = 160;
  var cardW = 360;
  for (var c = 0; c < Math.max(2, Math.min(3, images.length || titles.length || 2)); c += 1) {
    var x = 64 + c * 392;
    rect(s, 'Card Surface / ' + (c + 1), x, cardY, cardW, 290, '#FFFFFF', 24, '#EAECF0');
    if (images[c]) image(s, images[c].name || 'Card Image', findAsset(arr(model.assets), images[c].assetId), x + 18, cardY + 18, cardW - 36, 168, 18);
    else rect(s, 'Card Placeholder Image', x + 18, cardY + 18, cardW - 36, 168, '#F2F4F7', 18, '');
    text(s, 'Card Title / ' + (c + 1), titles[c + 1] || titles[c] || ('Content Card ' + (c + 1)), x + 22, cardY + 206, 15, '#111827', cardW - 44, 700);
    text(s, 'Card Body / ' + (c + 1), bodies[c + 1] || bodies[c] || 'Editable grouped content from the source website.', x + 22, cardY + 234, 11, '#667085', cardW - 44, 400);
  }
  return h;
}

function renderFooter(parent, model, y) {
  var sec = sectionByRole(model, 'footer');
  var els = sec ? elementsBySection(model, sec.id) : [];
  var footerTexts = textValues(els, ['footer-text', 'body', 'label'], 6);
  var links = textValues(els, ['footer-link', 'link', 'label'], 12);
  var brand = footerTexts[0] || clean(model.page.title || 'Website');
  var h = 260;
  var s = frame('Section / Footer', 1280, h, '#087A4B'); s.x = 0; s.y = y; s.clipsContent = true; parent.appendChild(s);
  rect(s, 'Footer Brand Mark', 64, 48, 36, 36, '#F4C84A', 10, '');
  text(s, 'Footer Brand / ' + brand.slice(0, 32), brand, 116, 50, 20, '#FFFFFF', 320, 800);
  if (footerTexts[1]) text(s, 'Footer Body', footerTexts[1], 116, 90, 12, '#DFF4EA', 360, 400);
  var columns = ['Recent Works', 'Program', 'Contact'];
  for (var c = 0; c < 3; c += 1) {
    var x = 560 + c * 190;
    text(s, 'Footer Column / ' + columns[c], columns[c], x, 52, 13, '#FFFFFF', 150, 800);
    for (var j = 0; j < 4; j += 1) {
      var label = links[c * 4 + j] || footerTexts[c + j + 2] || '';
      if (label) text(s, 'Footer Link / ' + label, label, x, 84 + j * 24, 11, '#EAFBF3', 158, 400);
    }
  }
  return h;
}

function renderDesignModel(payload) {
  var model = payload.designModel;
  var totalH = 88 + 560 + 520 + 260 + 64;
  var root = frame('01 UI Library / Editable Website Reconstruction', 1280, totalH, '#FFFFFF');
  root.clipsContent = true;
  var y = 0;
  y += renderHeader(root, model, y);
  y += renderHero(root, model, y);
  y += renderContent(root, model, y);
  y += renderFooter(root, model, y);
  text(root, 'Renderer Note', 'Professional section-based reconstruction. Editable UI Library structure generated from designModel.', 40, totalH - 34, 10, '#98A2B3', 760, 400);
  return root;
}

function renderSourceReference(payload, width) {
  var source = payload.source || {}; var shot = source.screenshot; var ratio = shot && shot.width ? (shot.height || 1600) / shot.width : 1.4;
  var ref = frame('02 Screenshot Reference / Pure Source', width, Math.max(640, Math.round(width * ratio)), '#FFFFFF'); ref.clipsContent = true;
  if (shot && shot.base64) { var img = figma.createImage(base64ToBytes(shot.base64)); var node = figma.createRectangle(); node.name = 'Locked Screenshot'; node.resize(ref.width, ref.height); node.fills = [{ type: 'IMAGE', imageHash: img.hash, scaleMode: 'FILL' }]; node.strokes = []; try { node.locked = true; } catch (_) {} ref.appendChild(node); }
  return ref;
}

async function importPayload(payload) {
  validatePayload(payload);
  await preparePage();
  var pageTitle = clean(payload.designModel.page.title || (payload.source && payload.source.title) || 'Website');
  var root = frame(pageTitle + ' / ' + new Date().toISOString().replace(/[:.]/g, '-'), 1440, 2400, '#FFFFFF');
  text(root, 'Run Title', pageTitle, 80, 30, 28, '#111827', 1200, 700);
  text(root, 'Run Note', PUBLIC_VERSION + ' / ' + ENGINE + ' / ' + ENGINE_BUILD + ' — professional section-based UI Library reconstruction.', 80, 68, 12, '#667085', 1200, 400);
  var main = renderDesignModel(payload); main.x = 80; main.y = 112; root.appendChild(main);
  var ref = renderSourceReference(payload, 1280); ref.x = 80; ref.y = main.y + main.height + 80; root.resize(1440, ref.y + ref.height + 80); root.appendChild(ref);
  figma.currentPage.appendChild(root); figma.viewport.scrollAndZoomIntoView([main]); lastFrame = root;
  post('Import complete.\nEngine: ' + ENGINE + '\nEngine Build: ' + ENGINE_BUILD + '\nOutput: professional section-based UI Library structure\nSections: ' + payload.designModel.sections.length + '\nElements: ' + payload.designModel.elements.length + '\nAssets: ' + payload.designModel.assets.length);
}

function exportPackage() {
  figma.ui.postMessage({ exportJson: JSON.stringify({ publicVersion: PUBLIC_VERSION, engine: ENGINE, engineBuild: ENGINE_BUILD, workspace: PAGE_NAME, lastFrame: lastFrame ? lastFrame.name : null, exportedAt: new Date().toISOString(), rules: ['Render from designModel only.', 'Screenshot source is reference only.', 'Output must stay editable and UI Library structured.'] }, null, 2) });
  post('Export package ready.\nEngine: ' + ENGINE + '\nLast Frame: ' + (lastFrame ? lastFrame.name : 'none'));
}

figma.ui.onmessage = async function(message) { try { if (message && message.type === 'import-design-model') return await importPayload(message.payload || {}); if (message && message.type === 'export-ui-package') return exportPackage(); post('Unsupported command: ' + (message && message.type)); } catch (err) { var msg = err && err.message ? err.message : String(err); console.error(err); post('Plugin error: ' + msg); } };
post('Clean renderer loaded.\nEngine: ' + ENGINE + '\nEngine Build: ' + ENGINE_BUILD + '\nRenderer: professional section-based UI Library layout');
