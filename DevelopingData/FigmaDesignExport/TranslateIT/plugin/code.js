figma.showUI(__html__, { width: 420, height: 560 });

// TranslateIT Figma Design Export
// Stable architecture: Native Figma Builder, not HTML importer.
// Safety rule: never delete manual content. Refresh archives only top-level nodes tagged by this plugin.

const NS = 'translateit.designExport';
const EXPORT_PREFIX = 'TranslateIT Export / ';
const EXPORT_VERSION = '2026-06-native-builder-v3';
const CORE_PAGES = ['00 Cover / Export Notes', '01 Foundations', '02 Icon Registry', '03 Components', '04 Templates', '05 Screens'];
const ARCHIVE_PAGE = '98 Archive';
const REPORT_PAGE = '99 Export Report';

const state = {
  importedManifest: null,
  pendingRefresh: null,
  fontRegular: { family: 'Inter', style: 'Regular' },
  fontBold: { family: 'Inter', style: 'Bold' },
};

const T = {
  colors: {
    canvas: '#030407',
    shell: '#07090D',
    surface1: '#0B0E14',
    surface2: '#11151C',
    surface3: '#171C25',
    surfaceMuted: '#0D1017',
    borderSoft: '#151A22',
    border: '#242B36',
    borderStrong: '#3A4454',
    borderBright: '#5A6474',
    text: '#F5F7FA',
    text2: '#C8CED8',
    muted: '#8D96A6',
    subtle: '#6D7787',
    accent: '#D7DDE7',
    danger: '#FF4B55',
    dangerSurface: '#241014'
  },
  radius: { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, pill: 999 }
};

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  file: '<path d="M8 4h6l3 3v13H8V4Z"/><path d="M14 4v4h4"/>',
  folder: '<path d="M4 7h6l2 2h8v9H4V7Z"/>',
  shield: '<path d="M12 4 6 7v5c0 4 2.4 7 6 8 3.6-1 6-4 6-8V7l-6-3Z"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  settings: '<circle cx="12" cy="12" r="3.5"/><path d="M12 3v2M12 19v2M4.2 7.5l1.8 1M18 15.5l1.8 1M4.2 16.5l1.8-1M18 8.5l1.8-1M3 12h2M19 12h2"/>',
  mic: '<path d="M12 14a4 4 0 0 0 4-4V7a4 4 0 0 0-8 0v3a4 4 0 0 0 4 4Z"/><path d="M19 10a7 7 0 0 1-14 0M12 17v4M8 21h8"/>',
  'mic-off': '<path d="m4 4 16 16"/><path d="M9 9v1a3 3 0 0 0 4.8 2.4M15 9V7a3 3 0 0 0-5.2-2"/><path d="M19 10a7 7 0 0 1-2 5M5 10a7 7 0 0 0 10 6.3M12 17v4M8 21h8"/>',
  'headphones-off': '<path d="m4 4 16 16"/><path d="M4 14v-2a8 8 0 0 1 12.2-6.8"/><path d="M20 14v-2a8 8 0 0 0-.5-2.7"/><path d="M4 14h3v5H4v-5ZM17 14h3v5h-3v-5Z"/>',
  keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M19 10h.01M7 14h10"/>',
  translate: '<path d="M5 5h9M9 3v2M7 5c.8 3 2.5 5.2 5 6.5"/><path d="M13 5c-.6 2.6-2.3 5-5.2 7"/><path d="M14 20 18 11l4 9M15.5 17h5"/>',
  speaker: '<path d="M4 9h4l5-4v14l-5-4H4V9Z"/><path d="M17 9a4 4 0 0 1 0 6"/>',
  sliders: '<path d="M4 7h8M16 7h4M4 12h4M12 12h8M4 17h10M18 17h2"/><path d="M12 5v4M8 10v4M14 15v4"/>',
  code: '<path d="m8 9-4 3 4 3M16 9l4 3-4 3"/>',
  'arrow-up': '<path d="M12 19V5M5 12l7-7 7 7"/>',
  back: '<path d="M15 18 9 12l6-6"/>',
  swap: '<path d="M8 7h10l-3-3M16 17H6l3 3"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  monitor: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M9 21h6M12 16v5"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  expand: '<path d="M8 4H4v4M16 4h4M8 20H4v-4M16 20h4v-4"/><path d="M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6"/>'
};

function fullPageName(name) { return `${EXPORT_PREFIX}${name}`; }
function nowStamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function sendStatus(text, extra = {}) { figma.ui.postMessage({ type: 'status', text, ...extra }); }
function iconNames() { return Object.keys(ICONS); }

function rgb(hex) {
  const fallback = '#000000';
  const value = /^#[0-9a-fA-F]{6}$/.test(hex || '') ? hex : fallback;
  const n = parseInt(value.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}
function fill(hex) { return [{ type: 'SOLID', color: rgb(hex) }]; }
function stroke(hex) { return [{ type: 'SOLID', color: rgb(hex) }]; }

function tag(node, kind, source = '') {
  node.setSharedPluginData(NS, 'generated', 'true');
  node.setSharedPluginData(NS, 'version', EXPORT_VERSION);
  node.setSharedPluginData(NS, 'kind', kind);
  node.setSharedPluginData(NS, 'source', source);
  return node;
}
function isTagged(node) { return node.getSharedPluginData(NS, 'generated') === 'true'; }

async function loadFontsSafe() {
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    state.fontRegular = { family: 'Inter', style: 'Regular' };
  } catch (_) {
    state.fontRegular = { family: 'Roboto', style: 'Regular' };
    await figma.loadFontAsync(state.fontRegular);
  }
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
    state.fontBold = { family: 'Inter', style: 'Bold' };
  } catch (_) {
    state.fontBold = state.fontRegular;
  }
}

async function exportPage(name) {
  const target = fullPageName(name);
  let p = figma.root.children.find(page => page.name === target);
  if (!p) p = figma.createPage();
  p.name = target;
  p.setSharedPluginData(NS, 'ownedPage', 'true');
  await figma.setCurrentPageAsync(p);
  return p;
}

function generatedCounts() {
  return CORE_PAGES.map(name => {
    const p = figma.root.children.find(page => page.name === fullPageName(name));
    return { page: name, count: p ? p.children.filter(isTagged).length : 0 };
  });
}
function reportGeneratedCounts() { return generatedCounts().map(x => `${x.page}: ${x.count}`).join('\n'); }
function totalGenerated() { return generatedCounts().reduce((sum, x) => sum + x.count, 0); }

function frame(name, w, h, color = T.colors.canvas, kind = 'frame', source = name) {
  const n = figma.createFrame();
  n.name = name;
  n.resize(w, h);
  n.fills = fill(color);
  n.strokes = [];
  return tag(n, kind, source);
}
function rect(name, w, h, color = T.colors.surface2, radius = 0, border = null) {
  const n = figma.createRectangle();
  n.name = name;
  n.resize(w, h);
  n.fills = fill(color);
  n.cornerRadius = radius;
  if (border) { n.strokes = stroke(border); n.strokeWeight = 1; }
  return n;
}
function textNode(value, size = 14, color = T.colors.text, bold = false) {
  const n = figma.createText();
  n.characters = value;
  n.fontName = bold ? state.fontBold : state.fontRegular;
  n.fontSize = size;
  n.fills = fill(color);
  return n;
}
function col(n, gap = 16, pad = 24) {
  n.layoutMode = 'VERTICAL';
  n.itemSpacing = gap;
  n.paddingTop = pad; n.paddingRight = pad; n.paddingBottom = pad; n.paddingLeft = pad;
}
function row(n, gap = 12, pad = 12) {
  n.layoutMode = 'HORIZONTAL';
  n.itemSpacing = gap;
  n.paddingTop = pad; n.paddingRight = pad; n.paddingBottom = pad; n.paddingLeft = pad;
  n.counterAxisAlignItems = 'CENTER';
}
function panel(name, w, h, color = T.colors.surface2) {
  const n = frame(name, w, h, color, 'component-frame', name);
  n.cornerRadius = T.radius.lg;
  n.strokes = stroke(T.colors.borderStrong);
  n.strokeWeight = 1;
  return n;
}

function iconNode(name, size = 20, color = T.colors.text2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.file}</svg>`;
  try {
    const node = figma.createNodeFromSvg(svg);
    node.name = `IconGlyph/${name}`;
    node.resize(size, size);
    return tag(node, 'icon-glyph', name);
  } catch (err) {
    const fallback = textNode('□', size, color, false);
    fallback.name = `IconFallback/${name}`;
    return tag(fallback, 'icon-fallback', name);
  }
}

function buttonFrame(name, label, icon = null, active = false, width = 220) {
  const n = panel(name, width, 48, active ? T.colors.surface3 : T.colors.surface2);
  n.cornerRadius = 12;
  row(n, 10, 14);
  if (icon) n.appendChild(iconNode(icon, 18, active ? T.colors.text : T.colors.muted));
  n.appendChild(textNode(label, 13, active ? T.colors.text : T.colors.text2, true));
  return n;
}
function navFrame(label, icon, active = false, width = 420) {
  const n = panel(`Nav / ${label}`, width, 56, active ? T.colors.surface2 : T.colors.surface1);
  n.cornerRadius = 14;
  row(n, 14, 16);
  n.appendChild(iconNode(icon, 18, active ? T.colors.text : T.colors.muted));
  n.appendChild(textNode(label, 13, active ? T.colors.text : T.colors.muted, true));
  n.appendChild(iconNode('chevron', 14, T.colors.muted));
  return n;
}
function selectFrame(label, icon, width = 420) {
  const n = panel(`Select / ${label}`, width, 62, T.colors.surface1);
  n.cornerRadius = 14;
  row(n, 14, 18);
  if (icon) n.appendChild(iconNode(icon, 18));
  n.appendChild(textNode(label, 13, T.colors.text, true));
  n.appendChild(iconNode('chevron', 14, T.colors.muted));
  return n;
}
function featureCard(title, icon) {
  const n = panel(`Feature Card / ${title}`, 458, 250, T.colors.surface2);
  col(n, 22, 34);
  const line = rect('accent-line', 58, 2, T.colors.accent, 999);
  n.appendChild(line);
  const head = frame('title-row', 360, 28, T.colors.surface2, 'layout-row', title);
  head.fills = [];
  row(head, 12, 0);
  head.appendChild(iconNode(icon, 20));
  head.appendChild(textNode(title, 20, T.colors.text, true));
  n.appendChild(head);
  n.appendChild(textNode('Type or record and get a translated result in the conversation.', 14, T.colors.muted, false));
  return n;
}
function composerFrame() {
  const n = panel('Composer / Default', 960, 82, T.colors.surface2);
  n.cornerRadius = 42;
  row(n, 18, 18);
  n.appendChild(iconNode('plus', 18));
  n.appendChild(rect('divider', 1, 42, T.colors.border, 999));
  const input = textNode('Ask anything...', 16, T.colors.muted, false);
  input.resize(640, 24);
  n.appendChild(input);
  n.appendChild(buttonFrame('Mic Button', '', 'mic', false, 56));
  n.appendChild(buttonFrame('Send Button', '', 'arrow-up', true, 56));
  return n;
}
function meterFrame() {
  const n = frame('Meter / Mic Level', 260, 58, T.colors.canvas, 'component-frame', 'meter');
  n.fills = [];
  row(n, 6, 0);
  for (let i = 0; i < 22; i++) n.appendChild(rect(`bar-${i + 1}`, 4, 14 + ((i * 11) % 34), '#516078', 999));
  return n;
}
function progressFrame() {
  const n = frame('Progress / Diagnostic', 360, 36, T.colors.canvas, 'component-frame', 'progress');
  n.fills = [];
  const track = rect('track', 360, 5, '#434B5A', 999); track.y = 18; n.appendChild(track);
  const prog = rect('fill', 187, 5, T.colors.accent, 999); prog.y = 18; n.appendChild(prog);
  const badge = panel('badge', 48, 26, T.colors.surface2); badge.x = 160; badge.y = -8; badge.cornerRadius = 8;
  const value = textNode('52%', 10, T.colors.text, true); value.x = 12; value.y = 7; badge.appendChild(value);
  n.appendChild(badge);
  return n;
}

async function validateExport() {
  await loadFontsSafe();
  const problems = [];
  if (iconNames().length < 20) problems.push('Icon registry looks incomplete.');
  if (!T.colors.canvas || !T.colors.surface2 || !T.colors.text) problems.push('Required color tokens missing.');
  if (!ICONS.chevron || !ICONS.swap || !ICONS.expand) problems.push('Required reference icons missing.');
  if (figma.editorType !== 'figma') problems.push('This plugin is intended for Figma design files, not FigJam.');
  const result = problems.length
    ? `Validation failed:\n${problems.join('\n')}`
    : `Validation passed.\nMode: Native Figma Builder, not HTML importer.\nManual content is safe. Refresh archives generated nodes before replacing them.\n\nGenerated top-level nodes:\n${reportGeneratedCounts()}`;
  sendStatus(result, { confirmRefresh: false });
  figma.notify(problems.length ? 'Validation failed. See plugin panel.' : 'Validation passed. Safe to export.');
  return problems.length === 0;
}

async function archiveGeneratedNodes(stamp) {
  const archivePage = await exportPage(ARCHIVE_PAGE);
  const archiveRoot = frame(`Archive / ${stamp}`, 1440, 900, T.colors.canvas, 'archive-root', stamp);
  col(archiveRoot, 16, 32);
  archiveRoot.appendChild(textNode(`Archived generated export / ${stamp}`, 26, T.colors.text, true));
  archiveRoot.appendChild(textNode('Only plugin-generated top-level nodes were moved here. Manual content was not touched.', 13, T.colors.muted));
  archivePage.appendChild(archiveRoot);
  let moved = 0;
  for (const name of CORE_PAGES) {
    const p = figma.root.children.find(page => page.name === fullPageName(name));
    if (!p) continue;
    const nodes = p.children.filter(isTagged);
    if (!nodes.length) continue;
    const group = frame(`From ${name}`, 1320, Math.max(180, nodes.length * 160), T.colors.surface1, 'archive-page-group', name);
    col(group, 18, 20);
    group.appendChild(textNode(name, 18, T.colors.text, true));
    archiveRoot.appendChild(group);
    nodes.forEach((node, index) => { node.x = 0; node.y = 72 + index * 150; group.appendChild(node); moved++; });
  }
  return moved;
}

async function buildStyles() {
  const existing = Object.fromEntries(figma.getLocalPaintStyles().map(s => [s.name, s]));
  Object.entries(T.colors).forEach(([name, hex]) => {
    const styleName = `TranslateIT/Color/${name}`;
    const style = existing[styleName] || figma.createPaintStyle();
    style.name = styleName;
    style.paints = fill(hex);
  });
}
async function buildCover(opts) {
  const p = await exportPage('00 Cover / Export Notes');
  const root = frame(`Export Notes / ${opts.stamp}`, 1200, 760, T.colors.canvas, 'page-root', 'cover');
  col(root, 18, 48);
  root.appendChild(textNode('TranslateIT Figma Design Export', 40, T.colors.text, true));
  root.appendChild(textNode('Mechanism: Native Figma Builder. This plugin does not import HTML or render the browser preview.', 16, T.colors.text2));
  root.appendChild(textNode('Input sources: embedded default tokens/icons + optional pasted manifest JSON. Output: editable Figma frames and vector icon nodes.', 14, T.colors.muted));
  root.appendChild(textNode('Workflow: edit visually in Figma, record approved changes back to repo manifests and DesignPreview, then sync Tauri only after approval.', 14, T.colors.muted));
  root.appendChild(textNode(`Version: ${EXPORT_VERSION} / stamp: ${opts.stamp}`, 13, T.colors.subtle));
  p.appendChild(root);
}
async function buildFoundations(opts) {
  const p = await exportPage('01 Foundations');
  const root = frame(`Foundations / ${opts.stamp}`, 1440, 1050, T.colors.canvas, 'page-root', 'foundations');
  col(root, 24, 48);
  root.appendChild(textNode('Foundations / Tokens', 34, T.colors.text, true));
  const grid = frame('Color Tokens', 1100, 620, T.colors.canvas, 'token-grid', 'colors');
  grid.fills = [];
  grid.layoutMode = 'HORIZONTAL'; grid.layoutWrap = 'WRAP'; grid.itemSpacing = 18; grid.counterAxisSpacing = 18;
  Object.entries(T.colors).forEach(([name, hex]) => {
    const card = panel(`Token / ${name}`, 190, 100, T.colors.canvas);
    col(card, 8, 0);
    card.appendChild(rect('swatch', 190, 48, hex, 8, T.colors.border));
    card.appendChild(textNode(name, 11, T.colors.text, true));
    card.appendChild(textNode(hex, 10, T.colors.subtle, false));
    grid.appendChild(card);
  });
  root.appendChild(grid);
  p.appendChild(root);
}
async function buildIcons(opts) {
  const p = await exportPage('02 Icon Registry');
  const root = frame(`Icon Registry / ${opts.stamp}`, 1440, 1050, T.colors.canvas, 'page-root', 'icons');
  col(root, 24, 48);
  root.appendChild(textNode('Icon Registry', 34, T.colors.text, true));
  root.appendChild(textNode('Generated as editable SVG/vector nodes. If an SVG fails, plugin creates a fallback glyph instead of crashing.', 13, T.colors.muted));
  const grid = frame('Icon Grid', 1050, 560, T.colors.canvas, 'icon-grid', 'icons');
  grid.fills = [];
  grid.layoutMode = 'HORIZONTAL'; grid.layoutWrap = 'WRAP'; grid.itemSpacing = 14; grid.counterAxisSpacing = 14;
  iconNames().forEach(name => {
    const item = panel(`Icon / ${name}`, 72, 72, T.colors.surface1);
    col(item, 4, 8);
    item.appendChild(iconNode(name, 22));
    item.appendChild(textNode(name, 7, T.colors.muted, false));
    grid.appendChild(item);
  });
  root.appendChild(grid);
  p.appendChild(root);
}
async function buildComponents(opts) {
  const p = await exportPage('03 Components');
  const root = frame(`Component Frames / ${opts.stamp}`, 1440, 1900, T.colors.canvas, 'page-root', 'components');
  col(root, 28, 48);
  root.appendChild(textNode('Component Frames', 34, T.colors.text, true));
  root.appendChild(textNode('Stable mode uses editable frames first. True Figma master components will be added after this native builder is validated.', 13, T.colors.muted));
  const row1 = frame('Navigation Row', 1250, 150, T.colors.canvas, 'component-row', 'nav'); row1.fills = []; row(row1, 22, 0);
  row1.appendChild(navFrame('Recent Chat', 'clock', true)); row1.appendChild(navFrame('Saved Chat', 'folder', false));
  root.appendChild(row1);
  const row2 = frame('Controls Row', 1250, 160, T.colors.canvas, 'component-row', 'controls'); row2.fills = []; row(row2, 22, 0);
  row2.appendChild(buttonFrame('Button / Primary', 'Run Checking', 'check', true)); row2.appendChild(buttonFrame('Button / Secondary', 'Save Default', 'file')); row2.appendChild(selectFrame('Default microphone', 'mic'));
  root.appendChild(row2);
  const row3 = frame('Cards Row', 1250, 320, T.colors.canvas, 'component-row', 'cards'); row3.fills = []; row(row3, 24, 0);
  row3.appendChild(featureCard('Text input', 'keyboard')); row3.appendChild(featureCard('Voice input', 'mic'));
  root.appendChild(row3);
  root.appendChild(composerFrame());
  const row4 = frame('Runtime Row', 1250, 100, T.colors.canvas, 'component-row', 'runtime'); row4.fills = []; row(row4, 40, 0);
  row4.appendChild(meterFrame()); row4.appendChild(progressFrame());
  root.appendChild(row4);
  p.appendChild(root);
}
function mainScreenFrame(name) {
  const screen = frame(name, 1280, 720, T.colors.canvas, 'screen', name);
  row(screen, 0, 0);
  const side = frame('Sidebar', 240, 720, T.colors.shell, 'screen-part', `${name}/sidebar`);
  side.strokes = stroke(T.colors.borderSoft); side.strokeWeight = 1; col(side, 18, 20);
  side.appendChild(textNode('TRANSLATEIT', 14, T.colors.text, true));
  side.appendChild(buttonFrame('New Chat', 'New Chat', 'plus', false, 200));
  side.appendChild(navFrame('Recent Chat', 'clock', true, 200));
  side.appendChild(navFrame('Saved Chat', 'folder', false, 200));
  screen.appendChild(side);
  const work = frame('Workspace', 1040, 720, T.colors.canvas, 'screen-part', `${name}/workspace`);
  col(work, 22, 36);
  work.appendChild(textNode('Voice translation', 28, T.colors.text, true));
  work.appendChild(textNode('How can I help translate today?', 42, T.colors.text, true));
  const cards = frame('Feature Grid', 960, 260, T.colors.canvas, 'screen-part', `${name}/cards`); cards.fills = []; row(cards, 32, 0);
  cards.appendChild(featureCard('Text input', 'keyboard')); cards.appendChild(featureCard('Voice input', 'mic'));
  work.appendChild(cards);
  work.appendChild(composerFrame());
  screen.appendChild(work);
  return screen;
}
function settingsScreenFrame(name, active) {
  const screen = frame(name, 1280, 720, T.colors.canvas, 'screen', name);
  row(screen, 0, 0);
  const side = frame('Settings Sidebar', 240, 720, T.colors.shell, 'screen-part', `${name}/sidebar`);
  col(side, 16, 28);
  side.appendChild(textNode('Settings', 26, T.colors.text, true));
  [['General','sliders','general'],['Audio','speaker','audio'],['Translate','translate','translate'],['Developer','code','developer']].forEach(item => side.appendChild(navFrame(item[0], item[1], active === item[2], 200)));
  screen.appendChild(side);
  const work = frame('Settings Content', 1040, 720, T.colors.canvas, 'screen-part', `${name}/content`);
  col(work, 24, 44);
  work.appendChild(textNode(active[0].toUpperCase() + active.slice(1), 34, T.colors.text, true));
  work.appendChild(textNode('Editable generated screen draft. Use this as Figma review layer, not direct Tauri runtime output.', 14, T.colors.muted, false));
  const card = panel('Settings Card', 860, 190, T.colors.surface2); row(card, 28, 32);
  card.appendChild(selectFrame(active === 'audio' ? 'Default microphone' : active === 'translate' ? 'Indonesian' : 'Launcher status', active === 'audio' ? 'mic' : null, 360));
  card.appendChild(selectFrame(active === 'audio' ? 'System output' : active === 'translate' ? 'English' : 'Engine status', active === 'audio' ? 'speaker' : null, 360));
  work.appendChild(card);
  work.appendChild(progressFrame());
  screen.appendChild(work);
  return screen;
}
async function buildTemplatesAndScreens(opts) {
  const pt = await exportPage('04 Templates');
  const templateRoot = frame(`Templates / ${opts.stamp}`, 1440, 1750, T.colors.canvas, 'page-root', 'templates');
  col(templateRoot, 26, 48);
  templateRoot.appendChild(textNode('Templates / Shells', 34, T.colors.text, true));
  templateRoot.appendChild(mainScreenFrame('Template / Main Shell'));
  templateRoot.appendChild(settingsScreenFrame('Template / Settings Shell', 'audio'));
  pt.appendChild(templateRoot);
  const ps = await exportPage('05 Screens');
  const screens = [mainScreenFrame('Main Page / v28'), settingsScreenFrame('Audio Settings / v22', 'audio'), settingsScreenFrame('Translate Settings / v14', 'translate'), settingsScreenFrame('Developer Settings / v37', 'developer')];
  screens.forEach((screen, index) => { screen.x = (index % 2) * 1360; screen.y = Math.floor(index / 2) * 800; ps.appendChild(screen); });
}
async function buildReport(opts, report) {
  const p = await exportPage(REPORT_PAGE);
  const root = frame(`Export Report / ${opts.stamp}`, 1180, 760, T.colors.canvas, 'report', opts.stamp);
  col(root, 12, 36);
  root.appendChild(textNode('TranslateIT Export Report', 34, T.colors.text, true));
  root.appendChild(textNode(`Version: ${EXPORT_VERSION}`, 13, T.colors.text2));
  root.appendChild(textNode(`Mechanism: Native Figma Builder, no HTML import`, 13, T.colors.text2));
  root.appendChild(textNode(`Timestamp: ${opts.stamp}`, 13, T.colors.text2));
  root.appendChild(textNode(`Mode: ${report.mode}`, 13, T.colors.text2));
  root.appendChild(textNode(`Archived generated nodes: ${report.archived}`, 13, T.colors.muted));
  root.appendChild(textNode(`Color tokens: ${Object.keys(T.colors).length}`, 13, T.colors.muted));
  root.appendChild(textNode(`Icons: ${iconNames().length}`, 13, T.colors.muted));
  root.appendChild(textNode(`Manifest imported: ${state.importedManifest ? 'yes' : 'no'}`, 13, T.colors.muted));
  root.appendChild(textNode(`Generated top-level nodes:\n${reportGeneratedCounts()}`, 12, T.colors.muted));
  p.appendChild(root);
}
async function buildAll(opts, report) {
  await buildStyles();
  for (const name of CORE_PAGES) await exportPage(name);
  await buildCover(opts);
  await buildFoundations(opts);
  await buildIcons(opts);
  await buildComponents(opts);
  await buildTemplatesAndScreens(opts);
  await buildReport(opts, report);
}
async function createNewExport() {
  if (!(await validateExport())) return;
  const opts = { stamp: nowStamp() };
  const report = { mode: 'create-new-safe-export', archived: 0 };
  await buildAll(opts, report);
  sendStatus(`New safe export complete.\nMechanism: Native Figma Builder, no HTML import.\n\n${reportGeneratedCounts()}`, { confirmRefresh: false });
  figma.notify('TranslateIT safe export created.');
}
async function prepareRefresh() {
  state.pendingRefresh = { stamp: nowStamp(), total: totalGenerated() };
  sendStatus(`Confirm refresh required.\nGenerated top-level nodes that will be archived: ${state.pendingRefresh.total}\nManual nodes will not be touched.\nClick Confirm Refresh to continue.`, { confirmRefresh: true });
}
async function confirmRefresh() {
  if (!state.pendingRefresh) { await prepareRefresh(); return; }
  if (!(await validateExport())) return;
  const archived = await archiveGeneratedNodes(state.pendingRefresh.stamp);
  const opts = { stamp: state.pendingRefresh.stamp };
  const report = { mode: 'refresh-generated-with-archive', archived };
  await buildAll(opts, report);
  state.pendingRefresh = null;
  sendStatus(`Refresh complete.\nArchived nodes: ${archived}\n${reportGeneratedCounts()}`, { confirmRefresh: false });
  figma.notify('TranslateIT export refreshed safely.');
}
async function createNotes() {
  await loadFontsSafe();
  const opts = { stamp: nowStamp() };
  await buildCover(opts);
  sendStatus('Notes page generated.');
}
async function importManifest(raw) {
  if (!raw || !raw.trim()) { sendStatus('No manifest JSON provided.'); return; }
  try {
    const parsed = JSON.parse(raw);
    state.importedManifest = parsed;
    if (parsed.colors) Object.assign(T.colors, parsed.colors);
    if (parsed.tokens && parsed.tokens.colors) Object.assign(T.colors, parsed.tokens.colors);
    if (parsed.icons && parsed.icons.svgSymbols) Object.assign(ICONS, parsed.icons.svgSymbols);
    if (parsed.svgSymbols) Object.assign(ICONS, parsed.svgSymbols);
    await figma.clientStorage.setAsync('translateit:lastManifest', raw);
    sendStatus(`Manifest imported into current plugin session.\nKeys: ${Object.keys(parsed).join(', ')}\nColors: ${Object.keys(T.colors).length}\nIcons: ${iconNames().length}`);
    figma.notify('Manifest imported.');
  } catch (err) {
    sendStatus(`Manifest import failed: ${err && err.message ? err.message : err}`);
    figma.notify('Manifest import failed.');
  }
}

figma.ui.onmessage = async msg => {
  try {
    if (msg.type === 'validate') await validateExport();
    if (msg.type === 'import-manifest') await importManifest(msg.raw || '');
    if (msg.type === 'create-safe') await createNewExport();
    if (msg.type === 'prepare-refresh') await prepareRefresh();
    if (msg.type === 'confirm-refresh') await confirmRefresh();
    if (msg.type === 'create-notes') await createNotes();
  } catch (err) {
    const message = `Export failed: ${err && err.message ? err.message : err}`;
    sendStatus(`${message}\n\nOpen the Figma console for details. This version avoids nested components and HTML import.`, { confirmRefresh: false });
    figma.notify(message);
  }
};
