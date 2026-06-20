figma.showUI(__html__, { width: 320, height: 230 });

const tokens = {
  colors: {
    canvas: '#030407', shell: '#07090D', surface1: '#0B0E14', surface2: '#11151C', surface3: '#171C25',
    border: '#242B36', borderStrong: '#3A4454', textPrimary: '#F5F7FA', textSecondary: '#C8CED8', textMuted: '#8D96A6', accent: '#D7DDE7', danger: '#FF4B55', dangerSurface: '#241014'
  },
  radius: { sm: 12, md: 16, lg: 20, xl: 24 },
  font: 'Inter'
};

const iconNames = ['plus','clock','file','folder','shield','chevron','settings','mic','mic-off','headphones-off','keyboard','translate','speaker','sliders','code','arrow-up','back','swap','check','monitor','pulse','expand'];
const componentNames = ['Brand/TranslateIT/Default','Button/Primary/Default','Button/Secondary/Default','Button/Ghost/Default','Button/Icon/Default','NavItem/Main/Active','NavItem/Main/Default','NavItem/Settings/Active','NavItem/Settings/Default','Select/Default','Card/Feature/Default','Card/AssistantNotice/Default','Composer/Default','StatusPill/Ready/Default','StatusPill/Recording/Active','RadioRow/Default','RadioRow/Active','Toggle/Active','Meter/MicLevel/Default','Progress/Diagnostic/Default'];
const pageNames = ['00 Cover / Export Notes','01 Foundations','02 Icon Registry','03 Components','04 Templates','05 Screens'];

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  const int = parseInt(value, 16);
  return { r: ((int >> 16) & 255) / 255, g: ((int >> 8) & 255) / 255, b: (int & 255) / 255 };
}

function solid(hex) { return [{ type: 'SOLID', color: hexToRgb(hex) }]; }

async function getPage(name) {
  let page = figma.root.children.find(p => p.name === name);
  if (!page) page = figma.createPage();
  page.name = name;
  return page;
}

async function loadFonts() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
}

function text(label, size = 18, color = tokens.colors.textPrimary, bold = false) {
  const node = figma.createText();
  node.characters = label;
  node.fontName = { family: 'Inter', style: bold ? 'Bold' : 'Regular' };
  node.fontSize = size;
  node.fills = solid(color);
  return node;
}

function frame(name, w, h, fill = tokens.colors.canvas) {
  const node = figma.createFrame();
  node.name = name;
  node.resize(w, h);
  node.fills = solid(fill);
  node.strokes = solid(tokens.colors.border);
  node.strokeWeight = 1;
  node.cornerRadius = 0;
  return node;
}

function card(name, w, h) {
  const node = frame(name, w, h, tokens.colors.surface2);
  node.cornerRadius = tokens.radius.lg;
  node.strokes = solid(tokens.colors.borderStrong);
  return node;
}

function layoutColumn(node, gap = 16, padding = 24) {
  node.layoutMode = 'VERTICAL';
  node.itemSpacing = gap;
  node.paddingTop = padding;
  node.paddingRight = padding;
  node.paddingBottom = padding;
  node.paddingLeft = padding;
}

function layoutRow(node, gap = 12, padding = 16) {
  node.layoutMode = 'HORIZONTAL';
  node.itemSpacing = gap;
  node.paddingTop = padding;
  node.paddingRight = padding;
  node.paddingBottom = padding;
  node.paddingLeft = padding;
  node.counterAxisAlignItems = 'CENTER';
}

function createColorCard(name, hex) {
  const node = card(`Color/${name}`, 180, 92);
  layoutColumn(node, 8, 12);
  const swatch = frame('swatch', 156, 38, hex);
  swatch.cornerRadius = 8;
  swatch.strokes = solid(tokens.colors.border);
  node.appendChild(swatch);
  node.appendChild(text(name, 11, tokens.colors.textPrimary, true));
  node.appendChild(text(hex, 10, tokens.colors.textMuted));
  return node;
}

function createIconComponent(name) {
  const comp = figma.createComponent();
  comp.name = `Icon/${name}`;
  comp.resize(48, 48);
  comp.fills = solid(tokens.colors.surface1);
  comp.strokes = solid(tokens.colors.border);
  comp.cornerRadius = 10;
  const label = text(name, 8, tokens.colors.textMuted);
  label.x = 6; label.y = 31;
  const mark = text('◇', 16, tokens.colors.textSecondary);
  mark.x = 16; mark.y = 9;
  comp.appendChild(mark);
  comp.appendChild(label);
  comp.setSharedPluginData('translateit', 'sourceIconId', name);
  return comp;
}

function createButton(name, variant) {
  const comp = figma.createComponent();
  comp.name = name;
  comp.resize(180, 44);
  comp.cornerRadius = 10;
  comp.fills = solid(variant === 'ghost' ? tokens.colors.canvas : tokens.colors.surface2);
  comp.strokes = solid(variant === 'primary' ? tokens.colors.borderStrong : tokens.colors.border);
  layoutRow(comp, 10, 14);
  comp.appendChild(text(name.split('/')[1], 12, tokens.colors.textPrimary, true));
  return comp;
}

function createGenericComponent(name) {
  const comp = figma.createComponent();
  comp.name = name;
  comp.resize(300, 72);
  comp.cornerRadius = 14;
  comp.fills = solid(tokens.colors.surface2);
  comp.strokes = solid(tokens.colors.borderStrong);
  layoutColumn(comp, 6, 14);
  comp.appendChild(text(name, 12, tokens.colors.textPrimary, true));
  comp.appendChild(text('Mapped to DesignPreview framework class', 10, tokens.colors.textMuted));
  comp.setSharedPluginData('translateit', 'componentName', name);
  return comp;
}

async function buildCover() {
  const page = await getPage('00 Cover / Export Notes');
  await figma.setCurrentPageAsync(page);
  page.children.forEach(n => n.remove());
  const root = frame('TranslateIT Figma Export / Notes', 1200, 720, tokens.colors.canvas);
  layoutColumn(root, 18, 48);
  root.appendChild(text('TranslateIT Figma Design Export', 40, tokens.colors.textPrimary, true));
  root.appendChild(text('Generated from DevelopingData/FigmaDesignExport/TranslateIT. This file is design workflow only, not runtime app code.', 16, tokens.colors.textSecondary));
  root.appendChild(text('Rule: edit icons/components in Figma for review, then record approved changes back to repo manifests and DesignPreview.', 14, tokens.colors.textMuted));
  root.appendChild(text('Protected branch: V1. Working branch: V1-Pull.', 14, tokens.colors.textMuted));
  page.appendChild(root);
}

async function buildFoundations() {
  const page = await getPage('01 Foundations');
  await figma.setCurrentPageAsync(page);
  page.children.forEach(n => n.remove());
  const root = frame('Foundations / Tokens', 1440, 900, tokens.colors.canvas);
  layoutColumn(root, 24, 48);
  root.appendChild(text('Foundations / Tokens', 32, tokens.colors.textPrimary, true));
  const grid = figma.createFrame();
  grid.name = 'Color Tokens';
  grid.layoutMode = 'HORIZONTAL';
  grid.itemSpacing = 18;
  grid.layoutWrap = 'WRAP';
  grid.resize(1120, 360);
  grid.fills = [];
  Object.entries(tokens.colors).forEach(([name, hex]) => grid.appendChild(createColorCard(name, hex)));
  root.appendChild(grid);
  page.appendChild(root);
}

async function buildIcons() {
  const page = await getPage('02 Icon Registry');
  await figma.setCurrentPageAsync(page);
  page.children.forEach(n => n.remove());
  const root = frame('Icon Registry / Source Accurate', 1440, 920, tokens.colors.canvas);
  layoutColumn(root, 24, 48);
  root.appendChild(text('Icon Registry / Source Accurate', 32, tokens.colors.textPrimary, true));
  const grid = figma.createFrame();
  grid.name = 'Icon Components';
  grid.layoutMode = 'HORIZONTAL';
  grid.itemSpacing = 14;
  grid.layoutWrap = 'WRAP';
  grid.resize(980, 360);
  grid.fills = [];
  iconNames.forEach(name => grid.appendChild(createIconComponent(name)));
  root.appendChild(grid);
  page.appendChild(root);
}

async function buildComponents() {
  const page = await getPage('03 Components');
  await figma.setCurrentPageAsync(page);
  page.children.forEach(n => n.remove());
  const root = frame('Component Library', 1440, 1600, tokens.colors.canvas);
  layoutColumn(root, 28, 48);
  root.appendChild(text('Component Library', 32, tokens.colors.textPrimary, true));
  const grid = figma.createFrame();
  grid.name = 'Components';
  grid.layoutMode = 'HORIZONTAL';
  grid.itemSpacing = 20;
  grid.layoutWrap = 'WRAP';
  grid.resize(1180, 900);
  grid.fills = [];
  componentNames.forEach(name => {
    if (name.startsWith('Button/Primary')) grid.appendChild(createButton(name, 'primary'));
    else if (name.startsWith('Button/Ghost')) grid.appendChild(createButton(name, 'ghost'));
    else if (name.startsWith('Button/Secondary')) grid.appendChild(createButton(name, 'secondary'));
    else grid.appendChild(createGenericComponent(name));
  });
  root.appendChild(grid);
  page.appendChild(root);
}

async function buildTemplatesAndScreens() {
  const templates = await getPage('04 Templates');
  await figma.setCurrentPageAsync(templates);
  templates.children.forEach(n => n.remove());
  const tRoot = frame('Templates / Shells', 1440, 900, tokens.colors.canvas);
  layoutColumn(tRoot, 24, 48);
  tRoot.appendChild(text('Templates / Shells', 32, tokens.colors.textPrimary, true));
  tRoot.appendChild(createGenericComponent('Template/MainShell/v28'));
  tRoot.appendChild(createGenericComponent('Template/SettingsShell/SharedSidebar'));
  templates.appendChild(tRoot);

  const screens = await getPage('05 Screens');
  await figma.setCurrentPageAsync(screens);
  screens.children.forEach(n => n.remove());
  const names = ['Main Page / v28', 'Audio Settings / v22', 'Translate Settings / v14', 'Developer Settings / v37'];
  names.forEach((name, index) => {
    const node = frame(name, 1280, 720, tokens.colors.canvas);
    node.x = (index % 2) * 1360;
    node.y = Math.floor(index / 2) * 800;
    layoutColumn(node, 20, 40);
    node.appendChild(text(name, 34, tokens.colors.textPrimary, true));
    node.appendChild(text('Editable Figma placeholder. Use the reference render and DesignPreview template for exact layout sync.', 14, tokens.colors.textMuted));
    screens.appendChild(node);
  });
}

async function createLibrary() {
  await loadFonts();
  await buildCover();
  await buildFoundations();
  await buildIcons();
  await buildComponents();
  await buildTemplatesAndScreens();
  figma.notify('TranslateIT Figma library generated. Review pages 01-05.');
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create-library') await createLibrary();
  if (msg.type === 'create-notes') { await loadFonts(); await buildCover(); figma.notify('TranslateIT export notes generated.'); }
};
