import {
  CONTRACT_VERSION,
  FRAME_NAMES,
  assetIds,
  isValidRect,
  walkTree
} from "../designit-contract/schema.mjs";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRect(rect, fallback) {
  const input = rect && typeof rect === "object" ? rect : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};

  return {
    x: numberOr(input.x, numberOr(base.x, 0)),
    y: numberOr(input.y, numberOr(base.y, 0)),
    width: Math.max(1, numberOr(input.width, numberOr(base.width, 1))),
    height: Math.max(1, numberOr(input.height, numberOr(base.height, 1)))
  };
}

function sanitizeNode(node, context) {
  if (!node || typeof node !== "object") return null;

  const copy = cloneJson(node);
  copy.rect = normalizeRect(copy.rect, { x: 0, y: 0, width: 1, height: 1 });

  if (!isValidRect(copy.rect)) {
    context.invalidRectsFixed++;
    copy.rect = { x: 0, y: 0, width: 1, height: 1 };
  }

  if (Array.isArray(copy.children)) {
    const cleanChildren = [];

    for (const child of copy.children) {
      const next = sanitizeNode(child, context);
      if (next) cleanChildren.push(next);
    }

    copy.children = cleanChildren;
  } else {
    copy.children = [];
  }

  return copy;
}

function removeReferenceLeakFromRight(node, referenceAssetIds, context) {
  if (!node || typeof node !== "object") return null;

  const name = String(node.name || "").toLowerCase();
  const id = String(node.id || "").toLowerCase();
  const text = name + " " + id;

  if (text.includes("reference screenshot") || text.includes("left_reference") || text.includes("leftreference")) {
    context.referenceNodesRemoved++;
    return null;
  }

  if (node.type === "image" && node.assetId && referenceAssetIds.has(String(node.assetId))) {
    context.referenceNodesRemoved++;
    return null;
  }

  if (Array.isArray(node.children)) {
    const nextChildren = [];

    for (const child of node.children) {
      const next = removeReferenceLeakFromRight(child, referenceAssetIds, context);
      if (next) nextChildren.push(next);
    }

    node.children = nextChildren;
  }

  return node;
}

function countNodes(root) {
  const stats = {
    total: 0,
    frame: 0,
    image: 0,
    text: 0,
    button: 0
  };

  walkTree(root, node => {
    stats.total++;

    if (node.type === "frame") stats.frame++;
    if (node.type === "image") stats.image++;
    if (node.type === "text") stats.text++;
    if (node.type === "button") stats.button++;
  });

  return stats;
}

export function composeComparePlan(options = {}) {
  const sourcePlan = options.sourcePlan || {};
  const assets = Array.isArray(options.assets) ? cloneJson(options.assets) : [];
  const leftReference = cloneJson(options.leftReference);
  const rightEditableInput = cloneJson(options.rightEditable);

  const pageWidth = Math.max(1, numberOr(options.targetWidth || sourcePlan.page && (sourcePlan.page.targetWidth || sourcePlan.page.width), 1440));
  const pageHeight = Math.max(1, numberOr(options.targetHeight || sourcePlan.page && (sourcePlan.page.targetHeight || sourcePlan.page.height), 3000));
  const gap = Math.max(0, numberOr(options.gap, 120));

  const context = {
    invalidRectsFixed: 0,
    referenceNodesRemoved: 0
  };

  const referenceAssetIds = new Set();

  for (const asset of assets) {
    if (asset && asset.referenceScreenshot === true) {
      if (asset.id) referenceAssetIds.add(String(asset.id));
      if (asset.assetId) referenceAssetIds.add(String(asset.assetId));
    }
  }

  const left = sanitizeNode(leftReference, context);
  left.id = "clean_left_reference_screenshot";
  left.name = FRAME_NAMES.left;
  left.type = "frame";
  left.rect = {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight
  };
  left.editable = false;
  left.locked = true;

  let right = sanitizeNode(rightEditableInput, context);
  right = removeReferenceLeakFromRight(right, referenceAssetIds, context);

  if (!right) {
    right = {
      id: "clean_right_editable_result",
      type: "frame",
      name: FRAME_NAMES.right,
      children: []
    };
  }

  right.id = "clean_right_editable_result";
  right.name = FRAME_NAMES.right;
  right.type = "frame";
  right.rect = {
    x: pageWidth + gap,
    y: 0,
    width: pageWidth,
    height: pageHeight
  };
  right.editable = true;

  const root = {
    id: "clean_compare_root",
    type: "frame",
    name: FRAME_NAMES.root,
    rect: {
      x: 0,
      y: 0,
      width: pageWidth * 2 + gap,
      height: pageHeight
    },
    style: {
      background: "#ffffff"
    },
    children: [
      left,
      right
    ]
  };

  const ids = assetIds(assets);
  const missing = [];

  walkTree(root, (node, path) => {
    if (node.type === "image") {
      if (!node.assetId || !ids.has(String(node.assetId))) {
        missing.push({ path, assetId: node.assetId || "" });
      }
    }
  });

  const stats = countNodes(root);

  return {
    version: "designit-render-plan",
    contractVersion: CONTRACT_VERSION,
    readyForFigma: missing.length === 0,
    page: {
      targetWidth: pageWidth,
      targetHeight: pageHeight,
      compareWidth: pageWidth * 2 + gap,
      compareHeight: pageHeight,
      width: pageWidth * 2 + gap,
      height: pageHeight,
      gap
    },
    assets,
    compareView: {
      type: "compareView",
      name: "DesignIT Compare View",
      leftReference: left,
      rightEditable: right
    },
    root,
    diagnostics: {
      cleanPlan: true,
      sourceContractVersion: sourcePlan.contractVersion || "",
      invalidRectsFixed: context.invalidRectsFixed,
      referenceNodesRemoved: context.referenceNodesRemoved,
      missingImageAssets: missing,
      nodeStats: stats
    }
  };
}