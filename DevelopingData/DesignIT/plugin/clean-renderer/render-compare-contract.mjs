import { validatePluginPayload } from "./validate-plugin-payload.mjs";
import { assetMap, walkTree } from "../../RenderBridge/src/designit-contract/schema.mjs";

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeRect(node) {
  const rect = node && node.rect ? node.rect : {};

  return {
    x: numberOr(rect.x, 0),
    y: numberOr(rect.y, 0),
    width: Math.max(1, numberOr(rect.width, 1)),
    height: Math.max(1, numberOr(rect.height, 1))
  };
}

function colorToPaint(value, fallback) {
  const input = String(value || fallback || "#ffffff").trim();
  let hex = input;

  if (!/^#[0-9a-f]{3,8}$/i.test(hex)) {
    hex = fallback || "#ffffff";
  }

  let r = 255;
  let g = 255;
  let b = 255;

  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  }

  return {
    type: "SOLID",
    color: {
      r: Math.max(0, Math.min(1, r / 255)),
      g: Math.max(0, Math.min(1, g / 255)),
      b: Math.max(0, Math.min(1, b / 255))
    }
  };
}

function base64ToBytes(base64) {
  const text = String(base64 || "");

  if (typeof atob === "function") {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
  }

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(text, "base64"));
  }

  throw new Error("No base64 decoder available.");
}

function applyGeometry(figmaNode, planNode, stats) {
  const rect = safeRect(planNode);

  figmaNode.x = rect.x;
  figmaNode.y = rect.y;

  try {
    if (typeof figmaNode.resize === "function") {
      figmaNode.resize(rect.width, rect.height);
    } else if (typeof figmaNode.resizeWithoutConstraints === "function") {
      figmaNode.resizeWithoutConstraints(rect.width, rect.height);
    } else {
      figmaNode.width = rect.width;
      figmaNode.height = rect.height;
    }
  } catch (error) {
    stats.resizeErrors.push({
      name: planNode && planNode.name || "",
      type: planNode && planNode.type || "",
      width: rect.width,
      height: rect.height,
      error: error && error.message ? error.message : String(error)
    });
    throw error;
  }
}

function applyName(figmaNode, planNode) {
  figmaNode.name = String(planNode && planNode.name || planNode && planNode.type || "DesignIT Node");
}

function append(parent, child) {
  if (parent && typeof parent.appendChild === "function") {
    parent.appendChild(child);
  }
}

function createFrame(figma, node, stats) {
  const out = figma.createFrame();
  stats.frame++;

  applyName(out, node);
  applyGeometry(out, node, stats);

  const bg = node && node.style && node.style.background ? node.style.background : "#ffffff";
  out.fills = [colorToPaint(bg, "#ffffff")];

  return out;
}

function createRect(figma, node, stats) {
  const out = figma.createRectangle();
  stats.rect++;

  applyName(out, node);
  applyGeometry(out, node, stats);

  const bg = node && node.style && (node.style.background || node.style.fill || node.style.color) ? (node.style.background || node.style.fill || node.style.color) : "#ffffff";
  out.fills = [colorToPaint(bg, "#ffffff")];

  return out;
}

async function createText(figma, node, stats) {
  const out = figma.createText();
  stats.text++;

  applyName(out, node);
  applyGeometry(out, node, stats);

  if (typeof figma.loadFontAsync === "function") {
    try {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      out.fontName = { family: "Inter", style: "Regular" };
    } catch {
      try {
        await figma.loadFontAsync({ family: "Arial", style: "Regular" });
        out.fontName = { family: "Arial", style: "Regular" };
      } catch {}
    }
  }

  out.characters = String(node && node.text || "");
  out.fontSize = Math.max(1, numberOr(node && node.style && node.style.fontSize, 14));
  out.fills = [colorToPaint(node && node.style && node.style.color, "#111111")];

  return out;
}

function createImage(figma, node, assets, stats) {
  const asset = assets.get(String(node && node.assetId || ""));

  if (!asset || !asset.base64) {
    stats.imageMissingAsset++;
    throw new Error("Missing image asset: " + String(node && node.assetId || ""));
  }

  const bytes = base64ToBytes(asset.base64);
  const image = figma.createImage(bytes);
  const out = figma.createRectangle();

  stats.image++;

  applyName(out, node);
  applyGeometry(out, node, stats);

  out.fills = [{
    type: "IMAGE",
    imageHash: image.hash,
    scaleMode: "FILL"
  }];

  return out;
}

async function createButton(figma, node, stats) {
  const frame = figma.createFrame();
  stats.button++;

  applyName(frame, node);
  applyGeometry(frame, node, stats);

  const bg = node && node.style && node.style.background ? node.style.background : "#ffffff";
  frame.fills = [colorToPaint(bg, "#ffffff")];

  const label = figma.createText();

  if (typeof figma.loadFontAsync === "function") {
    try {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      label.fontName = { family: "Inter", style: "Regular" };
    } catch {}
  }

  label.name = "Button Label";
  label.characters = String(node && node.text || "");
  label.fontSize = Math.max(1, numberOr(node && node.style && node.style.fontSize, 12));
  label.fills = [colorToPaint(node && node.style && node.style.color, "#111111")];

  const rect = safeRect(node);
  label.x = 8;
  label.y = Math.max(0, Math.floor((rect.height - label.fontSize) / 2));

  try {
    if (typeof label.resize === "function") {
      label.resize(Math.max(1, rect.width - 16), Math.max(1, rect.height));
    }
  } catch {}

  frame.appendChild(label);

  return frame;
}

async function renderNode(figma, node, parent, assets, stats) {
  if (!node || typeof node !== "object") return null;

  stats.planned++;

  let out = null;
  const type = String(node.type || "");

  if (type === "frame" || type === "group") {
    out = createFrame(figma, node, stats);
  } else if (type === "rect") {
    out = createRect(figma, node, stats);
  } else if (type === "text") {
    out = await createText(figma, node, stats);
  } else if (type === "image") {
    out = createImage(figma, node, assets, stats);
  } else if (type === "button") {
    out = await createButton(figma, node, stats);
  } else {
    stats.unsupported++;
    return null;
  }

  append(parent, out);
  stats.rendered++;

  if ((type === "frame" || type === "group") && Array.isArray(node.children)) {
    for (const child of node.children) {
      await renderNode(figma, child, out, assets, stats);
    }
  }

  return out;
}

export function inspectPlanForRenderer(plan) {
  const stats = {
    total: 0,
    frame: 0,
    image: 0,
    text: 0,
    button: 0,
    rect: 0,
    unsupported: 0
  };

  walkTree(plan && plan.root, node => {
    stats.total++;

    if (node.type === "frame") stats.frame++;
    else if (node.type === "image") stats.image++;
    else if (node.type === "text") stats.text++;
    else if (node.type === "button") stats.button++;
    else if (node.type === "rect") stats.rect++;
    else stats.unsupported++;
  });

  return stats;
}

export async function renderCompareContract(figma, payloadOrPlan, options = {}) {
  const validation = validatePluginPayload(payloadOrPlan, {
    minReferenceBytes: options.minReferenceBytes || 10000,
    minRightText: options.minRightText || 1,
    minRightImages: options.minRightImages || 0
  });

  if (!validation.ok) {
    const message = validation.errors.map(item => item.code + ": " + item.message).join(" | ");

    if (figma && typeof figma.notify === "function") {
      figma.notify("DesignIT clean renderer stopped: invalid contract");
    }

    return {
      ok: false,
      stats: null,
      errors: validation.errors,
      message
    };
  }

  const plan = validation.plan;
  const assets = assetMap(plan.assets);

  const stats = {
    planned: 0,
    rendered: 0,
    frame: 0,
    rect: 0,
    image: 0,
    text: 0,
    button: 0,
    imageMissingAsset: 0,
    unsupported: 0,
    resizeErrors: []
  };

  const parent = options.parent || figma.currentPage;

  await renderNode(figma, plan.root, parent, assets, stats);

  if (figma.root && typeof figma.root.setPluginData === "function") {
    figma.root.setPluginData("designit-clean-renderer-stats", JSON.stringify(stats));
  }

  if (figma && typeof figma.notify === "function") {
    figma.notify("DesignIT clean renderer rendered " + stats.rendered + "/" + stats.planned + ", images " + stats.image);
  }

  return {
    ok: stats.resizeErrors.length === 0 && stats.imageMissingAsset === 0 && stats.unsupported === 0,
    stats,
    errors: []
  };
}