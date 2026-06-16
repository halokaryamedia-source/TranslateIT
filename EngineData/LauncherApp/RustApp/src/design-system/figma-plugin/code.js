figma.showUI(__html__, { width: 420, height: 460 });

function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");
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

function findVariable(payload, name) {
  return payload.variables.find((variable) => variable.name === name)?.value ?? null;
}

function createText(parent, text, x, y, size, colorHex) {
  const node = figma.createText();
  node.characters = text;
  node.x = x;
  node.y = y;
  node.fontSize = size;
  node.fills = [solidPaint(colorHex)];
  parent.appendChild(node);
  return node;
}

function createComponentFrame(parent, component, index, colors) {
  const frame = figma.createFrame();
  frame.name = component.name;
  frame.x = 40 + (index % 2) * 420;
  frame.y = 120 + Math.floor(index / 2) * 190;
  frame.resize(360, 140);
  frame.cornerRadius = 18;
  frame.fills = [solidPaint(colors.surface)];
  frame.strokes = [solidPaint(colors.borderStrong)];
  frame.strokeWeight = 1;
  parent.appendChild(frame);

  createText(frame, component.name, 24, 22, 18, colors.text);
  createText(frame, component.cssScope, 24, 54, 11, colors.muted);
  createText(frame, `Editable: ${component.editable.join(", ")}`, 24, 84, 10, colors.muted);

  return frame;
}

async function importDesignSystem(payload) {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" }).catch(() => undefined);

  const page = figma.createPage();
  page.name = payload.meta?.name ?? "TranslateIT Design System";
  figma.currentPage = page;

  const colors = {
    bg: findVariable(payload, "color/bg") ?? "#050609",
    surface: findVariable(payload, "color/surface") ?? "#11141a",
    borderStrong: findVariable(payload, "color/borderStrong") ?? "#37404b",
    text: findVariable(payload, "color/text") ?? "#f5f6f8",
    muted: findVariable(payload, "color/muted") ?? "#a5adba",
  };

  const cover = figma.createFrame();
  cover.name = "TranslateIT / Design System Import";
  cover.resize(900, 980);
  cover.x = 0;
  cover.y = 0;
  cover.fills = [solidPaint(colors.bg)];
  page.appendChild(cover);

  createText(cover, "TranslateIT Design System", 40, 34, 28, colors.text);
  createText(cover, "Imported from translateit.figma-export.json", 40, 76, 13, colors.muted);
  createText(cover, "Components are generated as editable frames. Tokens remain the source of truth in code.", 40, 98, 12, colors.muted);

  payload.components.forEach((component, index) => createComponentFrame(cover, component, index, colors));

  figma.viewport.scrollAndZoomIntoView([cover]);
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
