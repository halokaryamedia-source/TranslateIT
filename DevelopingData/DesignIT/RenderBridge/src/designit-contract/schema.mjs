export const CONTRACT_VERSION = "compare-view-v1";
export const TRANSITIONAL_CONTRACTS = Object.freeze(["compare-view-v1", "compare-view-17n-fix2"]);

export const FRAME_NAMES = Object.freeze({
  root: "DesignIT Compare Result",
  left: "01 Reference Screenshot",
  right: "02 Editable Result"
});

export const NODE_TYPES = Object.freeze(["frame", "group", "image", "text", "button", "rect"]);

export function extractPlan(payloadOrPlan) {
  if (!payloadOrPlan || typeof payloadOrPlan !== "object") return null;
  if (payloadOrPlan.root && payloadOrPlan.assets) return payloadOrPlan;
  if (payloadOrPlan.renderPlanV2) return payloadOrPlan.renderPlanV2;
  if (payloadOrPlan.figmaRenderPlan && payloadOrPlan.figmaRenderPlan.renderPlanV2) return payloadOrPlan.figmaRenderPlan.renderPlanV2;
  if (payloadOrPlan.designitRenderPlan) return payloadOrPlan.designitRenderPlan;
  return null;
}

export function isValidRect(rect) {
  return Boolean(
    rect &&
    Number.isFinite(Number(rect.x)) &&
    Number.isFinite(Number(rect.y)) &&
    Number.isFinite(Number(rect.width)) &&
    Number.isFinite(Number(rect.height)) &&
    Number(rect.width) > 0 &&
    Number(rect.height) > 0
  );
}

export function childrenOf(node) {
  return node && Array.isArray(node.children) ? node.children : [];
}

export function walkTree(node, visit, path = "$") {
  if (!node || typeof node !== "object") return;
  visit(node, path);

  const children = childrenOf(node);
  for (let i = 0; i < children.length; i++) {
    walkTree(children[i], visit, path + ".children[" + i + "]");
  }
}

export function assetIds(assets) {
  const set = new Set();

  for (const asset of Array.isArray(assets) ? assets : []) {
    if (!asset || typeof asset !== "object") continue;
    if (asset.id) set.add(String(asset.id));
    if (asset.assetId) set.add(String(asset.assetId));
  }

  return set;
}

export function assetMap(assets) {
  const map = new Map();

  for (const asset of Array.isArray(assets) ? assets : []) {
    if (!asset || typeof asset !== "object") continue;
    if (asset.id) map.set(String(asset.id), asset);
    if (asset.assetId) map.set(String(asset.assetId), asset);
  }

  return map;
}

export function isImageAsset(asset) {
  if (!asset || typeof asset !== "object") return false;

  const kind = String(asset.type || asset.kind || asset.assetKind || "").toLowerCase();
  const mime = String(asset.contentType || asset.mimeType || "").toLowerCase();

  return kind.includes("image") || mime.startsWith("image/");
}

export function base64Bytes(value) {
  if (!value) return 0;

  try {
    return Buffer.from(String(value), "base64").length;
  } catch {
    return 0;
  }
}

export function compareFrames(plan) {
  if (!plan || !plan.compareView) {
    return { leftReference: null, rightEditable: null };
  }

  return {
    leftReference: plan.compareView.leftReference || null,
    rightEditable: plan.compareView.rightEditable || null
  };
}

export function nodeStats(root, assets = []) {
  const ids = assetIds(assets);

  const stats = {
    total: 0,
    frame: 0,
    group: 0,
    image: 0,
    text: 0,
    button: 0,
    rect: 0,
    unsupported: 0,
    invalidRects: 0,
    imageMissingAsset: 0
  };

  walkTree(root, node => {
    stats.total++;

    const type = String(node.type || "");

    if (type === "frame") stats.frame++;
    else if (type === "group") stats.group++;
    else if (type === "image") {
      stats.image++;
      if (!node.assetId || !ids.has(String(node.assetId))) stats.imageMissingAsset++;
    }
    else if (type === "text") stats.text++;
    else if (type === "button") stats.button++;
    else if (type === "rect") stats.rect++;
    else stats.unsupported++;

    if (!isValidRect(node.rect)) stats.invalidRects++;
  });

  return stats;
}