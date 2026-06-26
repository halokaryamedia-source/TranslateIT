import { FRAME_NAMES, isValidRect } from "../designit-contract/schema.mjs";

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
    width: Math.max(1, numberOr(input.width, numberOr(base.width, 1440))),
    height: Math.max(1, numberOr(input.height, numberOr(base.height, 3000)))
  };
}

export function findReferenceScreenshotAsset(assets) {
  for (const asset of Array.isArray(assets) ? assets : []) {
    if (asset && asset.referenceScreenshot === true && asset.base64) {
      return asset;
    }
  }

  return null;
}

export function buildReferencePlan(options = {}) {
  const page = options.page || {};
  const asset = options.asset || null;

  const width = Math.max(1, numberOr(page.targetWidth || page.width, 1440));
  const height = Math.max(1, numberOr(page.targetHeight || page.height, 3000));

  const frame = {
    id: "clean_left_reference_screenshot",
    type: "frame",
    name: FRAME_NAMES.left,
    rect: {
      x: 0,
      y: 0,
      width,
      height
    },
    style: {
      background: "#ffffff"
    },
    editable: false,
    locked: true,
    children: []
  };

  if (asset && asset.id) {
    frame.children.push({
      id: "clean_reference_screenshot_image",
      type: "image",
      name: "Reference Screenshot Image",
      rect: {
        x: 0,
        y: 0,
        width,
        height
      },
      assetId: String(asset.id),
      editable: false,
      locked: true
    });
  }

  if (!isValidRect(frame.rect)) {
    frame.rect = normalizeRect(frame.rect, { x: 0, y: 0, width, height });
  }

  return frame;
}