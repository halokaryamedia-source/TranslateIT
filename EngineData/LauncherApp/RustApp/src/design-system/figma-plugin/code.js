figma.showUI(__html__, { width: 460, height: 520 });

const FONT = { family: "Inter", style: "Regular" };

function px(value, fallback = 0) {
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hexToRgb(hex) {
  const clean = String(hex ?? "#000000").replace("#", "");
  const value = Number.parseInt(clean, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

function solidPaint(hex) {
  return { type: "SOLID", color: hexToRgb(hex) };
}

function tokenMap(payload) {
  return Object.fromEntries((payload.variables ?? []).map((variable) => [variable.name, variable.value]));
}

function tokenValue(tokens, name, fallback) {
  return tokens[name] ?? fallback;
}

function tokenColor(tokens, name, fallback) {
  return tokenValue(tokens, name, fallback);
}

function tokenRadius(tokens, name, fallback = 0) {
  return px(tokenValue(tokens, name, fallback), fallback);
}

async function createText(parent, text, x, y, size, colorHex, width = null) {
  const node = figma.createText();
  node.fontName = FONT;
  node.characters = text;
  node.x = x;
  node.y = y;
  node.fontSize = size;
  node.fills = [solidPaint(colorHex)];
  if (width) node.resize(width, node.height);
  parent.appendChild(node);
  return node;
}

function createFrame(parent, spec, tokens) {
  const frame = figma.createFrame();
  frame.name = spec.name;
  frame.x = spec.x ?? 0;
  frame.y = spec.y ?? 0;
  frame.resize(spec.width ?? 100, spec.height ?? 100);
  frame.cornerRadius = spec.radius ? tokenRadius(tokens, spec.radius, px(spec.radius)) : 0;
  frame.fills = spec.fill === "none" ? [] : [solidPaint(tokenColor(tokens, spec.fill, spec.fill ?? "#11141a"))];
  frame.strokes = spec.stroke === "none" ? [] : [solidPaint(tokenColor(tokens, spec.stroke, spec.stroke ?? "#37404b"))];
  frame.strokeWeight = spec.stroke === "none" ? 0 : 1;
  parent.appendChild(frame);
  return frame;
}

async function addMainPageContent(nodes, tokens) {
  const colors = {
    text: tokenColor(tokens, "color/text", "#f5f6f8"),
    muted: tokenColor(tokens, "color/muted", "#a5adba"),
    muted2: tokenColor(tokens, "color/muted2", "#858e9c"),
  };

  const sidebar = nodes.get("sidebar");
  if (sidebar) {
    await createText(sidebar, "TranslateIT", 72, 36, 18, colors.text);
    await createText(sidebar, "New Chat", 44, 118, 14, colors.text);
    await createText(sidebar, "Recent Chat", 44, 192, 12, colors.muted);
    await createText(sidebar, "Unsaved Chat", 44, 246, 12, colors.muted);
    await createText(sidebar, "Workspace", 44, 330, 11, colors.muted2);
    await createText(sidebar, "Saved Chat", 44, 384, 12, colors.muted);
  }

  const topbar = nodes.get("topbar");
  if (topbar) {
    await createText(topbar, "Voice translation", 40, 18, 15, colors.text);
    await createText(topbar, "Speak Indonesian. Get translated English voice output.", 40, 42, 11, colors.muted);
    await createText(topbar, "ID > EN", 1730, 22, 11, colors.text);
    await createText(topbar, "Recording", 1880, 22, 11, colors.text);
  }

  const hero = nodes.get("hero");
  if (hero) {
    await createText(hero, "REALTIME VOICE TRANSLATION", 210, 0, 10, colors.muted);
    await createText(hero, "How can I help translate today?", 80, 96, 32, colors.text, 560);
    await createText(hero, "Start speaking in Indonesian and TranslateIT will transcribe, translate, then speak English.", 96, 154, 11, colors.muted, 520);
  }

  const textCard = nodes.get("feature-card-text");
  if (textCard) {
    await createText(textCard, "Text input", 36, 116, 18, colors.text);
    await createText(textCard, "Type or paste Indonesian text to translate into English speech output.", 36, 164, 12, colors.muted, 250);
  }

  const voiceCard = nodes.get("feature-card-voice");
  if (voiceCard) {
    await createText(voiceCard, "Voice input", 36, 116, 18, colors.text);
    await createText(voiceCard, "Use live microphone capture for realtime translation workflow.", 36, 164, 12, colors.muted, 250);
  }

  const assistant = nodes.get("assistant-card");
  if (assistant) {
    await createText(assistant, "TranslateIT Assistant", 72, 14, 12, colors.text);
    await createText(assistant, "Recording started...", 72, 40, 11, colors.muted);
  }

  const composer = nodes.get("composer");
  if (composer) {
    await createText(composer, "+", 28, 24, 24, colors.muted);
    await createText(composer, "Type translation request or paste Indonesian text...", 110, 30, 13, colors.muted);
    await createText(composer, "mic", 835, 31, 11, colors.text);
    await createText(composer, "send", 905, 31, 11, colors.text);
  }

  const account = nodes.get("account-card");
  if (account) {
    await createText(account, "Marcel Berc...", 58, 17, 12, colors.text);
    await createText(account, "Invisible", 58, 42, 10, colors.muted);
  }
}

async function createMainPage(payload, tokens) {
  const spec = payload.figmaFrames?.mainPage;
  if (!spec) throw new Error("Missing figmaFrames.mainPage in export JSON.");

  const mainFrame = figma.createFrame();
  mainFrame.name = spec.name;
  mainFrame.resize(spec.width, spec.height);
  mainFrame.fills = [solidPaint(tokenColor(tokens, "color/bg", "#050609"))];
  figma.currentPage.appendChild(mainFrame);

  const nodes = new Map();
  for (const child of spec.children ?? []) {
    nodes.set(child.id, createFrame(mainFrame, child, tokens));
  }

  await addMainPageContent(nodes, tokens);
  return mainFrame;
}

async function createComponentLibrary(payload, tokens, startY) {
  const colors = {
    surface: tokenColor(tokens, "color/surface", "#11141a"),
    borderStrong: tokenColor(tokens, "color/borderStrong", "#37404b"),
    text: tokenColor(tokens, "color/text", "#f5f6f8"),
    muted: tokenColor(tokens, "color/muted", "#a5adba"),
  };

  const library = figma.createFrame();
  library.name = "TranslateIT / Component Registry";
  library.x = 0;
  library.y = startY + 80;
  library.resize(1200, 720);
  library.fills = [solidPaint(tokenColor(tokens, "color/bg", "#050609"))];
  figma.currentPage.appendChild(library);

  await createText(library, "Component Registry", 40, 34, 28, colors.text);
  await createText(library, "Editable component cards generated from main-page.components.json", 40, 76, 13, colors.muted);

  for (const [index, component] of (payload.components ?? []).entries()) {
    const frame = figma.createFrame();
    frame.name = component.name;
    frame.x = 40 + (index % 2) * 540;
    frame.y = 128 + Math.floor(index / 2) * 150;
    frame.resize(500, 118);
    frame.cornerRadius = 18;
    frame.fills = [solidPaint(colors.surface)];
    frame.strokes = [solidPaint(colors.borderStrong)];
    frame.strokeWeight = 1;
    library.appendChild(frame);

    await createText(frame, component.name, 24, 18, 16, colors.text, 430);
    await createText(frame, component.cssScope, 24, 44, 10, colors.muted, 430);
    await createText(frame, `Editable: ${component.editable.join(", ")}`, 24, 72, 10, colors.muted, 430);
  }

  return library;
}

async function createTokenPage(payload, tokens, startY) {
  const colors = {
    text: tokenColor(tokens, "color/text", "#f5f6f8"),
    muted: tokenColor(tokens, "color/muted", "#a5adba"),
  };

  const frame = figma.createFrame();
  frame.name = "TranslateIT / Tokens";
  frame.x = 1240;
  frame.y = startY + 80;
  frame.resize(900, 720);
  frame.fills = [solidPaint(tokenColor(tokens, "color/bg", "#050609"))];
  figma.currentPage.appendChild(frame);

  await createText(frame, "Design Tokens", 40, 34, 28, colors.text);
  await createText(frame, "Source of truth for Figma styling and code styling.", 40, 76, 13, colors.muted);

  for (const [index, variable] of (payload.variables ?? []).slice(0, 26).entries()) {
    const row = figma.createFrame();
    row.name = variable.name;
    row.x = 40;
    row.y = 122 + index * 22;
    row.resize(800, 18);
    row.fills = [];
    frame.appendChild(row);
    await createText(row, variable.name, 0, 0, 10, colors.muted, 320);
    await createText(row, String(variable.value), 360, 0, 10, colors.text, 220);
  }

  return frame;
}

async function importDesignSystem(payload) {
  await figma.loadFontAsync(FONT);

  const page = figma.createPage();
  page.name = payload.meta?.name ?? "TranslateIT Design System";
  figma.currentPage = page;

  const tokens = tokenMap(payload);
  const mainFrame = await createMainPage(payload, tokens);
  const library = await createComponentLibrary(payload, tokens, mainFrame.height);
  const tokenFrame = await createTokenPage(payload, tokens, mainFrame.height);

  figma.viewport.scrollAndZoomIntoView([mainFrame, library, tokenFrame]);
  figma.notify("TranslateIT design system imported.");
}

figma.ui.onmessage = async (message) => {
  if (message.type !== "import-design-system") return;
  try {
    await importDesignSystem(message.payload);
  } catch (error) {
    figma.notify(`Import failed: ${error.message}`);
  }
};
