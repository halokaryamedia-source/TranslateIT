import {
  CONTRACT_VERSION,
  TRANSITIONAL_CONTRACTS,
  FRAME_NAMES,
  NODE_TYPES,
  assetIds,
  assetMap,
  base64Bytes,
  compareFrames,
  extractPlan,
  isImageAsset,
  isValidRect,
  nodeStats,
  walkTree
} from "./schema.mjs";

function add(list, code, message, path = "") {
  list.push({ code, message, path });
}

function allowedVersions(options) {
  if (Array.isArray(options.allowedContractVersions)) return options.allowedContractVersions.map(String);
  if (options.allowTransitionalContract === true) return TRANSITIONAL_CONTRACTS.slice();
  return [CONTRACT_VERSION];
}

function referenceNameLeak(node, path) {
  const joined = [
    path,
    node && node.name,
    node && node.id,
    node && node.kind,
    node && node.sourceReason
  ].map(value => String(value || "").toLowerCase()).join(" ");

  return joined.includes("reference screenshot") || joined.includes("left_reference") || joined.includes("leftreference");
}

export function validateRenderPlanContract(payloadOrPlan, options = {}) {
  const errors = [];
  const warnings = [];
  const plan = extractPlan(payloadOrPlan);

  if (!plan) {
    add(errors, "PLAN_MISSING", "Render plan is missing.");
    return { ok: false, plan: null, errors, warnings, stats: {}, contractVersion: "", isTransitional: false };
  }

  const contractVersion = String(plan.contractVersion || "");
  const versions = allowedVersions(options);
  const isTransitional = contractVersion !== CONTRACT_VERSION;

  if (!versions.includes(contractVersion)) {
    add(errors, "CONTRACT_VERSION_INVALID", "Unsupported contract version: " + contractVersion);
  }

  if (isTransitional && versions.includes(contractVersion)) {
    add(warnings, "TRANSITIONAL_CONTRACT", "Plan uses transitional contract version: " + contractVersion);
  }

  if (!plan.root) add(errors, "ROOT_MISSING", "Plan root is missing.");
  if (plan.root && !isValidRect(plan.root.rect)) add(errors, "ROOT_RECT_INVALID", "Plan root rect is invalid.", "$.root.rect");

  const rootChildren = plan.root && Array.isArray(plan.root.children) ? plan.root.children : [];

  if (rootChildren.length !== 2) add(errors, "ROOT_CHILDREN_INVALID", "Root must contain exactly two children.", "$.root.children");
  if (rootChildren[0] && rootChildren[0].name !== FRAME_NAMES.left) add(errors, "LEFT_FRAME_NAME_INVALID", "First root child must be " + FRAME_NAMES.left, "$.root.children[0]");
  if (rootChildren[1] && rootChildren[1].name !== FRAME_NAMES.right) add(errors, "RIGHT_FRAME_NAME_INVALID", "Second root child must be " + FRAME_NAMES.right, "$.root.children[1]");

  if (!plan.compareView) add(errors, "COMPARE_VIEW_MISSING", "compareView is missing.");

  const { leftReference, rightEditable } = compareFrames(plan);

  if (!leftReference) add(errors, "LEFT_REFERENCE_MISSING", "leftReference is missing.");
  if (!rightEditable) add(errors, "RIGHT_EDITABLE_MISSING", "rightEditable is missing.");

  if (leftReference && leftReference.name !== FRAME_NAMES.left) add(errors, "LEFT_REFERENCE_NAME_INVALID", "leftReference name is invalid.", "$.compareView.leftReference");
  if (rightEditable && rightEditable.name !== FRAME_NAMES.right) add(errors, "RIGHT_EDITABLE_NAME_INVALID", "rightEditable name is invalid.", "$.compareView.rightEditable");

  if (leftReference && !isValidRect(leftReference.rect)) add(errors, "LEFT_REFERENCE_RECT_INVALID", "leftReference rect is invalid.", "$.compareView.leftReference.rect");
  if (rightEditable && !isValidRect(rightEditable.rect)) add(errors, "RIGHT_EDITABLE_RECT_INVALID", "rightEditable rect is invalid.", "$.compareView.rightEditable.rect");

  const assets = Array.isArray(plan.assets) ? plan.assets : [];
  const ids = assetIds(assets);
  const map = assetMap(assets);

  let referenceAssetCount = 0;
  let referenceAssetBytes = 0;
  let imageAssetCount = 0;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];

    if (!asset || typeof asset !== "object") {
      add(errors, "ASSET_INVALID", "Asset must be an object.", "$.assets[" + i + "]");
      continue;
    }

    if (!asset.id && !asset.assetId) add(errors, "ASSET_ID_MISSING", "Asset must have id or assetId.", "$.assets[" + i + "]");

    if (isImageAsset(asset)) {
      imageAssetCount++;
      if (!asset.base64) add(errors, "IMAGE_ASSET_BASE64_MISSING", "Image asset is missing base64.", "$.assets[" + i + "]");
    }

    if (asset.referenceScreenshot === true) {
      referenceAssetCount++;
      referenceAssetBytes += base64Bytes(asset.base64);
    }
  }

  const minReferenceBytes = Number.isFinite(Number(options.minReferenceBytes)) ? Number(options.minReferenceBytes) : 10000;

  if (referenceAssetCount < 1) add(errors, "REFERENCE_ASSET_MISSING", "Reference screenshot asset is required.");
  if (referenceAssetBytes < minReferenceBytes) add(errors, "REFERENCE_ASSET_TOO_SMALL", "Reference screenshot asset is too small.");

  let leftImageCount = 0;
  let rightImageCount = 0;
  let rightTextCount = 0;
  let rightReferenceLeakCount = 0;

  if (leftReference) {
    walkTree(leftReference, (node, path) => {
      if (!isValidRect(node.rect)) add(errors, "LEFT_NODE_RECT_INVALID", "Invalid rect in left reference.", path);
      if (node.type && !NODE_TYPES.includes(String(node.type))) add(errors, "LEFT_NODE_TYPE_UNSUPPORTED", "Unsupported node type in left reference: " + node.type, path);
      if (node.type === "image") leftImageCount++;
    }, "$.compareView.leftReference");
  }

  if (rightEditable) {
    walkTree(rightEditable, (node, path) => {
      if (!isValidRect(node.rect)) add(errors, "RIGHT_NODE_RECT_INVALID", "Invalid rect in right editable.", path);
      if (node.type && !NODE_TYPES.includes(String(node.type))) add(errors, "RIGHT_NODE_TYPE_UNSUPPORTED", "Unsupported node type in right editable: " + node.type, path);

      if (node.type === "image") {
        rightImageCount++;

        if (!node.assetId || !ids.has(String(node.assetId))) add(errors, "RIGHT_IMAGE_ASSET_MISSING", "Right editable image references missing asset.", path);

        const asset = node.assetId ? map.get(String(node.assetId)) : null;
        if (asset && asset.referenceScreenshot === true) {
          rightReferenceLeakCount++;
          add(errors, "REFERENCE_ASSET_LEAKED_TO_RIGHT", "Reference screenshot asset must not be used in rightEditable.", path);
        }
      }

      if (node.type === "text") rightTextCount++;

      if (referenceNameLeak(node, path)) {
        rightReferenceLeakCount++;
        add(errors, "REFERENCE_NODE_LEAKED_TO_RIGHT", "Reference screenshot node must not appear inside rightEditable.", path);
      }
    }, "$.compareView.rightEditable");
  }

  if (leftImageCount < 1) add(errors, "LEFT_REFERENCE_IMAGE_MISSING", "Left reference must contain a screenshot image.");

  if (options.requireEditableContent !== false) {
    if (rightImageCount < Number(options.minRightImages || 0)) add(errors, "RIGHT_IMAGE_COUNT_TOO_LOW", "Right editable image count is below minimum.");
    if (rightTextCount < Number(options.minRightText || 1)) add(errors, "RIGHT_TEXT_COUNT_TOO_LOW", "Right editable text count is below minimum.");
  }

  const stats = nodeStats(plan.root, assets);

  if (stats.invalidRects > 0) add(errors, "INVALID_RECTS_FOUND", "Invalid rects found in final tree.");
  if (stats.imageMissingAsset > 0) add(errors, "IMAGE_MISSING_ASSET_FOUND", "Image nodes reference missing assets.");
  if (rightReferenceLeakCount > 0) add(errors, "REFERENCE_LEAK_FOUND", "Reference content leaked into rightEditable.");

  return {
    ok: errors.length === 0,
    plan,
    errors,
    warnings,
    stats: {
      ...stats,
      referenceAssetCount,
      referenceAssetBytes,
      imageAssetCount,
      leftImageCount,
      rightImageCount,
      rightTextCount,
      rightReferenceLeakCount
    },
    contractVersion,
    isTransitional
  };
}

export function summarizeValidation(validation) {
  if (!validation) {
    return { ok: false, errors: ["VALIDATION_MISSING"], warnings: [], stats: {}, contractVersion: "", isTransitional: false };
  }

  return {
    ok: validation.ok,
    errors: validation.errors.map(item => item.code + ": " + item.message),
    warnings: validation.warnings.map(item => item.code + ": " + item.message),
    stats: validation.stats,
    contractVersion: validation.contractVersion,
    isTransitional: validation.isTransitional
  };
}