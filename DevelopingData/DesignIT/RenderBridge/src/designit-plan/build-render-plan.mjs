import { extractPlan, compareFrames } from "../designit-contract/schema.mjs";
import { validateRenderPlanContract } from "../designit-contract/validate.mjs";
import { buildReferencePlan, findReferenceScreenshotAsset } from "./build-reference-plan.mjs";
import { composeComparePlan } from "./compose-compare-plan.mjs";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function numberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function rightFromSourcePlan(plan) {
  const frames = compareFrames(plan);

  if (frames.rightEditable) {
    return cloneJson(frames.rightEditable);
  }

  const children = plan && plan.root && Array.isArray(plan.root.children) ? plan.root.children : [];

  return {
    id: "clean_right_editable_result",
    type: "frame",
    name: "02 Editable Result",
    rect: {
      x: 0,
      y: 0,
      width: numberOr(plan && plan.page && (plan.page.targetWidth || plan.page.width), 1440),
      height: numberOr(plan && plan.page && (plan.page.targetHeight || plan.page.height), 3000)
    },
    children: cloneJson(children)
  };
}

export function buildCleanRenderPlanFromExistingPlan(payloadOrPlan, options = {}) {
  const sourcePlan = extractPlan(payloadOrPlan);

  if (!sourcePlan) {
    return {
      ok: false,
      plan: null,
      validation: null,
      errors: ["SOURCE_PLAN_MISSING"]
    };
  }

  const assets = Array.isArray(sourcePlan.assets) ? cloneJson(sourcePlan.assets) : [];
  const referenceAsset = findReferenceScreenshotAsset(assets);

  const page = sourcePlan.page || {};
  const targetWidth = numberOr(page.targetWidth || page.width, options.targetWidth || 1440);
  const targetHeight = numberOr(page.targetHeight || page.height, options.targetHeight || 3000);

  const leftReference = buildReferencePlan({
    page: {
      targetWidth,
      targetHeight
    },
    asset: referenceAsset
  });

  const rightEditable = rightFromSourcePlan(sourcePlan);

  const cleanPlan = composeComparePlan({
    sourcePlan,
    assets,
    leftReference,
    rightEditable,
    targetWidth,
    targetHeight,
    gap: options.gap || 120
  });

  const validation = validateRenderPlanContract(cleanPlan, {
    allowTransitionalContract: false,
    minReferenceBytes: options.minReferenceBytes || 10000,
    minRightText: options.minRightText || 1,
    minRightImages: options.minRightImages || 0
  });

  cleanPlan.readyForFigma = validation.ok;
  cleanPlan.diagnostics.validation = {
    ok: validation.ok,
    errors: validation.errors,
    warnings: validation.warnings,
    stats: validation.stats
  };

  return {
    ok: validation.ok,
    plan: cleanPlan,
    validation,
    errors: validation.errors
  };
}