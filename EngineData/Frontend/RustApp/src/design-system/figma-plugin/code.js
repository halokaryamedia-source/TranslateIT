figma.showUI(__html__, { width: 460, height: 520 });

const FONT = { family: "Inter", style: "Regular" };

function px(value, fallback = 0) {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rgb(hex) {
  const value = Number.parseInt(String(hex ?? "#000000").replace("#", ""), 16);
  return { r: ((value >> 16) & 255) / 255, g: ((value >> 8) & 255) / 255, b: (value & 255) / 255 };
}

function paint(hex) {
  return { type: "SOLID", color: rgb(hex) };
}

function tokenMap(payload) {
  return Object.fromEntries((payload.variables ?? []).map((variable) => [variable.name, variable.value]));
}

function token(tokens, name, fallback) {
  return tokens[name] ?? fallback;
}

async function text(parent, value, x, y, size, color, width = null) {
  const node = figma.createText();
  node.fontName = FONT;
  node.characters = value;
  node.x = x;
  node.y = y;
  node.fontSize = size;
  node.fills = [paint(color)];
  if (width) node.resize(width, node.height);
  parent.appendChild(node);
  return node;
}

function frame(parent, spec, tokens) {
  const node = figma.createFrame();
  node.name = spec.name;
  node.x = spec.x ?? 0;
  node.y = spec.y ?? 0;
  node.resize(spec.width ?? 100, spec.height ?? 100);
  node.cornerRadius = spec.radius ? px(token(tokens, spec.radius, spec.radius), 0) : 0;
  node.fills = spec.fill === "none" ? [] : [paint(token(tokens, spec.fill, spec.fill ?? "#11141a"))];
  node.strokes = spec.stroke === "none" ? [] : [paint(token(tokens, spec.stroke, spec.stroke ?? "#37404b"))];
  node.strokeWeight = spec.stroke === "none" ? 0 : 1;
  parent.appendChild(node);
  return node;
}

async function labelFrame(node, spec, colors) {
  await text(node, spec.name, 24, 22, 16, colors.text, Math.max(80, node.width - 48));
  await text(node, spec.id ?? "component", 24, 48, 10, colors.muted, Math.max(80, node.width - 48));
}

async function createPageFrame(key, spec, tokens, offsetY) {
  const colors = {
    bg: token(tokens, "color/bg", "#050609"),
    text: token(tokens, "color/text", "#f5f6f8"),
    muted: token(tokens, "color/muted", "#a5adba"),
  };

  const pageFrame = figma.createFrame();
  pageFrame.name = spec.name ?? key;
  pageFrame.x = 0;
  pageFrame.y = offsetY;
  pageFrame.resize(spec.width ?? 2560, spec.height ?? 1440);
  pageFrame.fills = [paint(colors.bg)];
  figma.currentPage.appendChild(pageFrame);

  await text(pageFrame, spec.name ?? key, 40, 34, 28, colors.text, 900);
  await text(pageFrame, "Approved editable frame generated from TranslateIT Design System export.", 40, 76, 13, colors.muted, 900);

  for (const child of spec.children ?? []) {
    const childFrame = frame(pageFrame, child, tokens);
    if (child.width >= 160 && child.height >= 70) await labelFrame(childFrame, child, colors);
  }

  return pageFrame;
}

async function createTokenSheet(payload, tokens, offsetY) {
  const colors = {
    bg: token(tokens, "color/bg", "#050609"),
    text: token(tokens, "color/text", "#f5f6f8"),
    muted: token(tokens, "color/muted", "#a5adba"),
    surface: token(tokens, "color/surface", "#11141a"),
    border: token(tokens, "color/borderStrong", "#37404b"),
  };

  const sheet = figma.createFrame();
  sheet.name = "TranslateIT / Design Tokens";
  sheet.x = 0;
  sheet.y = offsetY;
  sheet.resize(1180, 760);
  sheet.fills = [paint(colors.bg)];
  figma.currentPage.appendChild(sheet);

  await text(sheet, "Design Tokens", 40, 34, 28, colors.text, 900);
  await text(sheet, "Source of truth for future UI edits.", 40, 76, 13, colors.muted, 900);

  for (const [index, variable] of (payload.variables ?? []).entries()) {
    const row = figma.createFrame();
    row.name = variable.name;
    row.x = 40 + (index % 2) * 540;
    row.y = 126 + Math.floor(index / 2) * 38;
    row.resize(500, 28);
    row.cornerRadius = 8;
    row.fills = [paint(colors.surface)];
    row.strokes = [paint(colors.border)];
    row.strokeWeight = 1;
    sheet.appendChild(row);
    await text(row, variable.name, 12, 7, 10, colors.muted, 260);
    await text(row, String(variable.value), 300, 7, 10, colors.text, 160);
  }

  return sheet;
}

async function importDesignSystem(payload) {
  await figma.loadFontAsync(FONT);

  const page = figma.createPage();
  page.name = payload.meta?.name ?? "TranslateIT Approved UI";
  figma.currentPage = page;

  const tokens = tokenMap(payload);
  const frames = [];
  let y = 0;

  for (const [key, spec] of Object.entries(payload.figmaFrames ?? {})) {
    const node = await createPageFrame(key, spec, tokens, y);
    frames.push(node);
    y += node.height + 120;
  }

  frames.push(await createTokenSheet(payload, tokens, y));
  figma.viewport.scrollAndZoomIntoView(frames);
  figma.notify("TranslateIT approved UI imported.");
}

figma.ui.onmessage = async (message) => {
  if (message.type !== "import-design-system") return;
  try {
    await importDesignSystem(message.payload);
  } catch (error) {
    figma.notify(`Import failed: ${error.message}`);
  }
};
