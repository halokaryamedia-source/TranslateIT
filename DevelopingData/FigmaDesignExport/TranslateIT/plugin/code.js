figma.showUI(__html__, { width: 380, height: 340 });

// TranslateIT Design Export
// Scope: design tooling only. Generated nodes are editable Figma objects, not runtime app code.
// Safety rule: never delete user/manual content. Refresh removes only nodes tagged by this plugin.

const NS = 'translateit.designExport';
const EXPORT_PREFIX = 'TranslateIT Export / ';
const EXPORT_VERSION = '2026-06-safe-v1';

const T = {
  colors: {
    canvas: '#030407', shell: '#07090D', surface1: '#0B0E14', surface2: '#11151C', surface3: '#171C25', surfaceMuted: '#0D1017',
    borderSoft: '#151A22', border: '#242B36', borderStrong: '#3A4454', borderBright: '#5A6474',
    text: '#F5F7FA', text2: '#C8CED8', muted: '#8D96A6', subtle: '#6D7787', accent: '#D7DDE7', danger: '#FF4B55', dangerSurface: '#241014'
  },
  radius: { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, pill: 999 },
  page: { w: 2560, h: 1440, sidebar: 480, settingsSidebar: 430, topbar: 96 }
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
  expand: '<path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4"/><path d="M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6"/>'
};

const iconOrder = Object.keys(ICONS);
const pageNames = ['00 Cover / Export Notes','01 Foundations','02 Icon Registry','03 Components','04 Templates','05 Screens'];
const fullPageName = name => `${EXPORT_PREFIX}${name}`;

function rgb(hex) { const v = parseInt(hex.slice(1), 16); return { r: ((v >> 16) & 255) / 255, g: ((v >> 8) & 255) / 255, b: (v & 255) / 255 }; }
function fill(hex) { return [{ type: 'SOLID', color: rgb(hex) }]; }
function stroke(hex) { return [{ type: 'SOLID', color: rgb(hex) }]; }
function nowStamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }

function tag(node, kind, source = '') {
  node.setSharedPluginData(NS, 'generated', 'true');
  node.setSharedPluginData(NS, 'version', EXPORT_VERSION);
  node.setSharedPluginData(NS, 'kind', kind);
  node.setSharedPluginData(NS, 'source', source);
  return node;
}
function isTagged(node) { return node.getSharedPluginData(NS, 'generated') === 'true'; }

async function loadFontsSafe() {
  const wanted = [{ family: 'Inter', style: 'Regular' }, { family: 'Inter', style: 'Bold' }, { family: 'Inter', style: 'Extra Bold' }];
  for (const font of wanted) {
    try { await figma.loadFontAsync(font); } catch (err) { await figma.loadFontAsync({ family: 'Inter', style: 'Regular' }); }
  }
}

async function exportPage(name) {
  const targetName = fullPageName(name);
  let p = figma.root.children.find(x => x.name === targetName);
  if (!p) p = figma.createPage();
  p.name = targetName;
  p.setSharedPluginData(NS, 'ownedPage', 'true');
  await figma.setCurrentPageAsync(p);
  return p;
}

function clearGenerated(page) {
  let removed = 0;
  [...page.children].forEach(node => {
    if (isTagged(node)) { node.remove(); removed++; }
  });
  return removed;
}

function reportGeneratedCounts() {
  return pageNames.map(name => {
    const p = figma.root.children.find(x => x.name === fullPageName(name));
    const count = p ? p.children.filter(isTagged).length : 0;
    return `${name}: ${count}`;
  }).join('\n');
}

async function validateExport() {
  await loadFontsSafe();
  const problems = [];
  if (iconOrder.length < 20) problems.push('Icon registry looks incomplete.');
  if (!T.colors.canvas || !T.colors.surface2 || !T.colors.text) problems.push('Required color tokens missing.');
  if (!ICONS.chevron || !ICONS.swap || !ICONS.expand) problems.push('Required reference icons missing.');
  const result = problems.length ? `Validation failed:\n${problems.join('\n')}` : `Validation passed.\nNo user content will be deleted.\nRefresh only removes tagged generated nodes.\n\nCurrent generated nodes:\n${reportGeneratedCounts()}`;
  figma.ui.postMessage({ type: 'status', text: result });
  figma.notify(problems.length ? 'Validation failed. See plugin panel.' : 'Validation passed. Safe to export.');
}

function f(name, w, h, color = T.colors.canvas) {
  const n = figma.createFrame(); n.name = name; n.resize(w, h); n.fills = fill(color); n.strokes = []; return n;
}
function autoCol(n, gap = 16, pad = 24) { n.layoutMode = 'VERTICAL'; n.itemSpacing = gap; n.paddingTop = pad; n.paddingRight = pad; n.paddingBottom = pad; n.paddingLeft = pad; }
function autoRow(n, gap = 12, pad = 12) { n.layoutMode = 'HORIZONTAL'; n.itemSpacing = gap; n.paddingTop = pad; n.paddingRight = pad; n.paddingBottom = pad; n.paddingLeft = pad; n.counterAxisAlignItems = 'CENTER'; }
function txt(s, size = 14, color = T.colors.text, weight = 'Regular') { const n = figma.createText(); n.characters = s; n.fontName = { family: 'Inter', style: weight }; n.fontSize = size; n.fills = fill(color); return n; }
function rounded(n, radius = T.radius.md, border = T.colors.border) { n.cornerRadius = radius; n.strokes = stroke(border); n.strokeWeight = 1; return n; }
function makeIconNode(name, size = 20, color = T.colors.text2) { const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.file}</svg>`; const node = figma.createNodeFromSvg(svg); node.name = `IconGlyph/${name}`; node.resize(size, size); tag(node, 'icon-glyph', name); return node; }
function label(s) { return txt(`✥ ${s}`, 11, '#C79AFF', 'Bold'); }

function buttonComponent(name, variant = 'primary', textValue = 'Button') { const c = figma.createComponent(); c.name = name; c.resize(210, 48); autoRow(c, 12, 16); rounded(c, 10, variant === 'primary' ? T.colors.borderStrong : T.colors.border); c.fills = fill(variant === 'ghost' ? T.colors.canvas : T.colors.surface2); c.appendChild(txt(textValue, 13, T.colors.text, 'Bold')); tag(c, 'component', variant === 'primary' ? 'ti-c-button ti-c-button--primary' : `ti-c-button ti-c-button--${variant}`); return c; }
function iconButtonComponent(name, iconName = 'mic') { const c = figma.createComponent(); c.name = name; c.resize(56, 56); rounded(c, 999, T.colors.border); c.fills = fill(T.colors.surface1); const i = makeIconNode(iconName, 20); i.x = 18; i.y = 18; c.appendChild(i); tag(c, 'component', 'ti-c-icon-button'); return c; }
function navItemComponent(name, iconName, active = false, settings = false) { const c = figma.createComponent(); c.name = name; c.resize(settings ? 354 : 432, 56); autoRow(c, 20, 18); rounded(c, 14, active ? T.colors.borderStrong : T.colors.border); c.fills = fill(active ? T.colors.surface2 : T.colors.surface1); c.appendChild(makeIconNode(iconName, 18, active ? T.colors.text : T.colors.muted)); c.appendChild(txt(name.split('/').slice(-2, -1)[0] || 'Nav Item', 13, active ? T.colors.text : T.colors.muted, 'Bold')); if (!settings) c.appendChild(makeIconNode('chevron', 14, T.colors.muted)); tag(c, 'component', `ti-c-nav-item${settings ? ' ti-c-nav-item--settings' : ''}${active ? ' is-active' : ''}`); return c; }
function selectComponent(name, leadingIcon = 'mic', value = 'Default microphone') { const c = figma.createComponent(); c.name = name; c.resize(420, 62); autoRow(c, 16, 20); rounded(c, 14, T.colors.border); c.fills = fill(T.colors.surface1); if (leadingIcon) c.appendChild(makeIconNode(leadingIcon, 18, T.colors.text2)); c.appendChild(txt(value, 13, T.colors.text, 'Bold')); c.appendChild(makeIconNode('chevron', 14, T.colors.muted)); tag(c, 'component', 'ti-c-select'); return c; }
function featureCardComponent(name, iconName = 'keyboard') { const c = figma.createComponent(); c.name = name; c.resize(458, 250); autoCol(c, 24, 36); rounded(c, 20, T.colors.borderStrong); c.fills = fill(T.colors.surface2); const line = f('accent-line', 58, 2, T.colors.accent); line.cornerRadius = 999; c.appendChild(line); const head = f('title-row', 360, 28, T.colors.surface2); head.fills = []; autoRow(head, 14, 0); head.appendChild(makeIconNode(iconName, 20)); head.appendChild(txt(iconName === 'keyboard' ? 'Text input' : 'Voice input', 20, T.colors.text, 'Bold')); c.appendChild(head); c.appendChild(txt('Type or record and get a translated result in the conversation.', 14, T.colors.muted)); tag(c, 'component', 'ti-c-card ti-c-feature-card'); return c; }
function assistantNoticeComponent() { const c = figma.createComponent(); c.name = 'Card/AssistantNotice/Default'; c.resize(760, 76); autoRow(c, 14, 16); rounded(c, 16, T.colors.borderStrong); c.fills = fill(T.colors.surface2); const mark = f('T mark', 40, 40, T.colors.surface3); rounded(mark, 999, T.colors.borderStrong); const t = txt('T', 14, T.colors.text, 'Extra Bold'); t.x = 15; t.y = 11; mark.appendChild(t); c.appendChild(mark); const copy = f('copy', 640, 44, T.colors.surface2); copy.fills = []; autoCol(copy, 4, 0); copy.appendChild(txt('TranslateIT', 13, T.colors.text, 'Bold')); copy.appendChild(txt('Local runtime warmup completed. You can start typing or record speech.', 11, T.colors.text2)); c.appendChild(copy); tag(c, 'component', 'ti-c-card ti-c-assistant-note'); return c; }
function composerComponent() { const c = figma.createComponent(); c.name = 'Composer/Default'; c.resize(1320, 82); autoRow(c, 22, 18); rounded(c, 42, T.colors.borderStrong); c.fills = fill(T.colors.surface2); c.appendChild(makeIconNode('plus', 18)); const divider = f('divider', 1, 42, T.colors.border); c.appendChild(divider); const input = txt('Ask anything...', 16, T.colors.muted); input.resize(900, 24); c.appendChild(input); c.appendChild(iconButtonComponent('Composer/MicButton/Instance', 'mic')); c.appendChild(iconButtonComponent('Composer/SendButton/Instance', 'arrow-up')); tag(c, 'component', 'ti-c-composer'); return c; }
function radioComponent(name, active = false) { const c = figma.createComponent(); c.name = name; c.resize(360, 58); autoRow(c, 14, 0); c.fills = []; const dot = f('radio', 22, 22, active ? T.colors.accent : T.colors.canvas); rounded(dot, 999, active ? T.colors.accent : T.colors.borderStrong); c.appendChild(dot); const copy = f('copy', 300, 54, T.colors.canvas); copy.fills = []; autoCol(copy, 5, 0); copy.appendChild(txt(active ? 'Fast' : 'Quality', 13, T.colors.text, 'Bold')); copy.appendChild(txt(active ? 'Prioritize low latency for live voice translation.' : 'Prefer better translation quality when response time is less critical.', 10, T.colors.muted)); c.appendChild(copy); tag(c, 'component', `ti-c-radio-row${active ? ' is-active' : ''}`); return c; }
function meterComponent() { const c = figma.createComponent(); c.name = 'Meter/MicLevel/Default'; c.resize(260, 58); autoRow(c, 6, 0); c.fills = []; for (let i = 0; i < 22; i++) { const h = 14 + ((i * 11) % 34); const bar = f(`bar-${i+1}`, 4, h, '#516078'); bar.cornerRadius = 999; c.appendChild(bar); } tag(c, 'component', 'ti-c-meter'); return c; }
function progressComponent() { const c = figma.createComponent(); c.name = 'Progress/Diagnostic/Default'; c.resize(360, 36); c.fills = []; const track = f('track', 360, 5, '#434B5A'); track.y = 18; track.cornerRadius = 999; c.appendChild(track); const progress = f('fill', 187, 5, T.colors.accent); progress.y = 18; progress.cornerRadius = 999; c.appendChild(progress); const badge = f('badge', 48, 26, T.colors.surface2); badge.x = 160; badge.y = -8; rounded(badge, 8, T.colors.borderStrong); const value = txt('52%', 10, T.colors.text, 'Bold'); value.x = 12; value.y = 7; badge.appendChild(value); c.appendChild(badge); tag(c, 'component', 'ti-c-progress'); return c; }

async function buildStyles() { const existing = Object.fromEntries(figma.getLocalPaintStyles().map(s => [s.name, s])); Object.entries(T.colors).forEach(([name, hex]) => { const styleName = `TranslateIT/Color/${name}`; const s = existing[styleName] || figma.createPaintStyle(); s.name = styleName; s.paints = fill(hex); }); }

async function buildCover(opts) { const p = await exportPage('00 Cover / Export Notes'); if (opts.refresh) clearGenerated(p); const root = tag(f(`Export Notes / ${opts.stamp}`, 1200, 720, T.colors.canvas), 'frame', 'cover'); autoCol(root, 20, 48); root.appendChild(txt('TranslateIT Figma Design Export', 40, T.colors.text, 'Extra Bold')); root.appendChild(txt('Safe mode: generated content is tagged. Refresh removes only tagged nodes and never deletes manual user content.', 16, T.colors.text2)); root.appendChild(txt('Workflow: edit visually in Figma, record approved changes back to repo manifests, render DesignPreview, then sync Tauri only after approval.', 14, T.colors.muted)); root.appendChild(txt(`Export version: ${EXPORT_VERSION} / stamp: ${opts.stamp}`, 14, T.colors.muted)); p.appendChild(root); }
async function buildFoundations(opts) { const p = await exportPage('01 Foundations'); if (opts.refresh) clearGenerated(p); const root = tag(f(`Foundations / Tokens / ${opts.stamp}`, 1440, 1050, T.colors.canvas), 'frame', 'foundations'); autoCol(root, 26, 48); root.appendChild(txt('Foundations / Tokens', 34, T.colors.text, 'Extra Bold')); const grid = f('Color Tokens', 1100, 520, T.colors.canvas); grid.fills = []; grid.layoutMode = 'HORIZONTAL'; grid.layoutWrap = 'WRAP'; grid.itemSpacing = 18; grid.counterAxisSpacing = 18; Object.entries(T.colors).forEach(([name, hex]) => { const card = tag(f(`Token/${name}`, 190, 100, T.colors.canvas), 'token-card', name); autoCol(card, 8, 0); const sw = f('swatch', 190, 48, hex); rounded(sw, 8, T.colors.border); card.appendChild(sw); card.appendChild(txt(name, 11, T.colors.text, 'Bold')); card.appendChild(txt(hex, 10, T.colors.subtle)); grid.appendChild(card); }); root.appendChild(grid); p.appendChild(root); }
async function buildIcons(opts) { const p = await exportPage('02 Icon Registry'); if (opts.refresh) clearGenerated(p); const root = tag(f(`Icon Registry / Source Accurate / ${opts.stamp}`, 1440, 1050, T.colors.canvas), 'frame', 'icons'); autoCol(root, 26, 48); root.appendChild(txt('Icon Registry / Source Accurate', 34, T.colors.text, 'Extra Bold')); const grid = f('Icon Components', 1050, 560, T.colors.canvas); grid.fills = []; grid.layoutMode = 'HORIZONTAL'; grid.layoutWrap = 'WRAP'; grid.itemSpacing = 14; grid.counterAxisSpacing = 14; iconOrder.forEach(name => { const c = figma.createComponent(); c.name = `Icon/${name}`; c.resize(64, 64); autoCol(c, 4, 8); rounded(c, 10, T.colors.border); c.fills = fill(T.colors.surface1); c.appendChild(makeIconNode(name, 22)); c.appendChild(txt(name, 7, T.colors.muted)); tag(c, 'icon-component', name); grid.appendChild(c); }); root.appendChild(grid); p.appendChild(root); }
async function buildComponents(opts) { const p = await exportPage('03 Components'); if (opts.refresh) clearGenerated(p); const root = tag(f(`Component Library / ${opts.stamp}`, 1440, 2200, T.colors.canvas), 'frame', 'components'); autoCol(root, 30, 48); root.appendChild(txt('Component Library', 34, T.colors.text, 'Extra Bold')); const rows = [['Navigation + Shell', [navItemComponent('NavItem/Main/Active','clock',true,false), navItemComponent('NavItem/Main/Default','folder',false,false), navItemComponent('NavItem/Settings/Active','speaker',true,true), navItemComponent('NavItem/Settings/Default','translate',false,true)]], ['Controls', [buttonComponent('Button/Primary/Default','primary','Run Checking'), buttonComponent('Button/Secondary/Default','secondary','Save Default'), buttonComponent('Button/Ghost/Default','ghost','Cancel'), iconButtonComponent('Button/Icon/Mic','mic'), selectComponent('Select/Default','mic','Default microphone')]], ['Cards + Rows', [featureCardComponent('Card/Feature/TextInput','keyboard'), featureCardComponent('Card/Feature/VoiceInput','mic'), assistantNoticeComponent(), radioComponent('RadioRow/Active',true), radioComponent('RadioRow/Default',false)]], ['Runtime', [composerComponent(), meterComponent(), progressComponent()]]]; rows.forEach(([title, nodes]) => { root.appendChild(label(title)); const row = tag(f(`${title} Row`, 1250, 280, T.colors.canvas), 'component-row', title); row.fills = []; row.layoutMode = 'HORIZONTAL'; row.itemSpacing = 22; row.layoutWrap = 'WRAP'; nodes.forEach(n => row.appendChild(n)); root.appendChild(row); }); p.appendChild(root); }

function miniMainScreen(name) { const screen = tag(f(name, 1280, 720, T.colors.canvas), 'screen', name); autoRow(screen, 0, 0); const side = f('Main Sidebar', 240, 720, T.colors.shell); side.strokes = stroke(T.colors.borderSoft); autoCol(side, 18, 20); side.appendChild(txt('TRANSLATEIT', 14, T.colors.text, 'Extra Bold')); side.appendChild(buttonComponent('Screen/New Chat','secondary','New Chat')); side.appendChild(navItemComponent('Screen/Recent Chat','clock',true,false)); side.appendChild(navItemComponent('Screen/Saved Chat','folder',false,false)); screen.appendChild(side); const work = f('Workspace', 1040, 720, T.colors.canvas); autoCol(work, 24, 36); work.appendChild(txt('Voice translation', 28, T.colors.text, 'Bold')); work.appendChild(txt('How can I help translate today?', 42, T.colors.text, 'Extra Bold')); const grid = f('Feature Grid', 950, 260, T.colors.canvas); grid.fills = []; autoRow(grid, 32, 0); grid.appendChild(featureCardComponent('Screen/Text input','keyboard')); grid.appendChild(featureCardComponent('Screen/Voice input','mic')); work.appendChild(grid); work.appendChild(assistantNoticeComponent()); work.appendChild(composerComponent()); screen.appendChild(work); return screen; }
function miniSettingsScreen(name, active) { const screen = tag(f(name, 1280, 720, T.colors.canvas), 'screen', name); autoRow(screen, 0, 0); const side = f('Settings Sidebar', 215, 720, T.colors.shell); autoCol(side, 16, 28); side.appendChild(txt('Settings', 26, T.colors.text, 'Bold')); [['sliders','General','general'],['speaker','Audio','audio'],['translate','Translate','translate'],['code','Developer','developer']].forEach(x => side.appendChild(navItemComponent(`Screen/${x[1]}`,x[0],active===x[2],true))); screen.appendChild(side); const work = f('Settings Content', 1065, 720, T.colors.canvas); autoCol(work, 24, 44); work.appendChild(txt(active[0].toUpperCase()+active.slice(1), 34, T.colors.text, 'Bold')); work.appendChild(txt('Editable reference-locked layout placeholder generated from plugin components.', 14, T.colors.muted)); const card1 = f('Settings Card', 860, 190, T.colors.surface2); rounded(card1, 20, T.colors.borderStrong); autoRow(card1, 28, 32); card1.appendChild(selectComponent('Screen/Select A', active==='audio'?'mic':null, active==='translate'?'Indonesian':'Default microphone')); card1.appendChild(selectComponent('Screen/Select B', active==='audio'?'speaker':null, active==='translate'?'English':'System Output')); work.appendChild(card1); work.appendChild(progressComponent()); screen.appendChild(work); return screen; }
async function buildTemplatesAndScreens(opts) { const pt = await exportPage('04 Templates'); if (opts.refresh) clearGenerated(pt); const tr = tag(f(`Templates / Shells / ${opts.stamp}`, 1440, 1800, T.colors.canvas), 'frame', 'templates'); autoCol(tr, 26, 48); tr.appendChild(txt('Templates / Shells', 34, T.colors.text, 'Extra Bold')); tr.appendChild(miniMainScreen('Template/Main Shell')); tr.appendChild(miniSettingsScreen('Template/Settings Shell','audio')); pt.appendChild(tr); const ps = await exportPage('05 Screens'); if (opts.refresh) clearGenerated(ps); const screens = [miniMainScreen('Main Page / v28'), miniSettingsScreen('Audio Settings / v22','audio'), miniSettingsScreen('Translate Settings / v14','translate'), miniSettingsScreen('Developer Settings / v37','developer')]; screens.forEach((s,i)=>{ s.x=(i%2)*1360; s.y=Math.floor(i/2)*800; ps.appendChild(s); }); }

async function createLibrary(refresh = false) { await validateExport(); const opts = { refresh, stamp: nowStamp() }; await buildStyles(); for (const name of pageNames) await exportPage(name); await buildCover(opts); await buildFoundations(opts); await buildIcons(opts); await buildComponents(opts); await buildTemplatesAndScreens(opts); figma.ui.postMessage({ type: 'status', text: `${refresh ? 'Refresh complete' : 'New safe export complete'}.\n${reportGeneratedCounts()}` }); figma.notify(refresh ? 'TranslateIT export refreshed safely.' : 'TranslateIT safe export created.'); }
async function createNotes() { await loadFontsSafe(); const opts = { refresh: false, stamp: nowStamp() }; await buildCover(opts); figma.notify('TranslateIT export notes generated safely.'); }

figma.ui.onmessage = async msg => { try { if (msg.type === 'validate') await validateExport(); if (msg.type === 'create-safe') await createLibrary(false); if (msg.type === 'refresh-generated') await createLibrary(true); if (msg.type === 'create-notes') await createNotes(); } catch (err) { const message = `Export failed: ${err && err.message ? err.message : err}`; figma.ui.postMessage({ type: 'status', text: message }); figma.notify(message); } };
