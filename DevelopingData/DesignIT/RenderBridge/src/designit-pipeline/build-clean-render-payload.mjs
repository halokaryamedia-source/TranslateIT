import { extractPlan } from "../designit-contract/schema.mjs";
import { validateRenderPlanContract, summarizeValidation } from "../designit-contract/validate.mjs";
import { buildCleanRenderPlanFromExistingPlan } from "../designit-plan/build-render-plan.mjs";
import { ensureReferenceScreenshotAsset } from "../designit-assets/reference-screenshot.mjs";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function cleanOptions(options = {}) {
  return {
    minReferenceBytes: options.minReferenceBytes || 10000,
    minRightText: options.minRightText || 1,
    minRightImages: options.minRightImages || 0,
    gap: options.gap || 120
  };
}

function withAugmentedPlan(payload, augmentedPlan) {
  const output = cloneJson(payload || {});

  if (output.renderPlanV2) {
    output.renderPlanV2 = augmentedPlan;
  }

  if (output.figmaRenderPlan && output.figmaRenderPlan.renderPlanV2) {
    output.figmaRenderPlan.renderPlanV2 = augmentedPlan;
  }

  if (output.designitRenderPlan) {
    output.designitRenderPlan = augmentedPlan;
  }

  if (!output.renderPlanV2 && !(output.figmaRenderPlan && output.figmaRenderPlan.renderPlanV2) && !output.designitRenderPlan) {
    output.renderPlanV2 = augmentedPlan;
  }

  return output;
}

export function buildCleanRenderPayload(payload, options = {}) {
  const sourcePlan = extractPlan(payload);
  const opts = cleanOptions(options);

  if (!sourcePlan) {
    return {
      ok: false,
      payload: null,
      plan: null,
      validation: null,
      errors: [{ code: "SOURCE_PLAN_MISSING", message: "Source render plan is missing.", path: "" }]
    };
  }

  const augmentedSourcePlan = ensureReferenceScreenshotAsset(payload, sourcePlan);
  const buildInput = withAugmentedPlan(payload, augmentedSourcePlan);

  const build = buildCleanRenderPlanFromExistingPlan(buildInput, opts);

  if (!build.plan) {
    return {
      ok: false,
      payload: null,
      plan: null,
      validation: build.validation || null,
      errors: build.errors || [{ code: "CLEAN_PLAN_BUILD_FAILED", message: "Clean plan build failed.", path: "" }]
    };
  }

  const validation = validateRenderPlanContract(build.plan, {
    allowTransitionalContract: false,
    minReferenceBytes: opts.minReferenceBytes,
    minRightText: opts.minRightText,
    minRightImages: opts.minRightImages
  });

  const cleanPlan = build.plan;
  cleanPlan.readyForFigma = validation.ok;
  cleanPlan.diagnostics = cleanPlan.diagnostics || {};
  cleanPlan.diagnostics.cleanPipeline = {
    ok: validation.ok,
    sourceContractVersion: sourcePlan.contractVersion || "",
    outputContractVersion: cleanPlan.contractVersion || "",
    referencePromotion: {
      sourceAssetsBefore: Array.isArray(sourcePlan.assets) ? sourcePlan.assets.length : 0,
      sourceAssetsAfter: Array.isArray(augmentedSourcePlan.assets) ? augmentedSourcePlan.assets.length : 0,
      promoted: (Array.isArray(augmentedSourcePlan.assets) ? augmentedSourcePlan.assets.length : 0) > (Array.isArray(sourcePlan.assets) ? sourcePlan.assets.length : 0)
    },
    validation: summarizeValidation(validation)
  };

  const output = cloneJson(payload);

  output.designitCleanPipeline = {
    enabled: true,
    mode: "clean-render-payload-v1",
    sourceContractVersion: sourcePlan.contractVersion || "",
    outputContractVersion: cleanPlan.contractVersion || "",
    ok: validation.ok,
    referencePromotion: cleanPlan.diagnostics.cleanPipeline.referencePromotion,
    validation: summarizeValidation(validation)
  };

  output.designitRenderPlan = cleanPlan;
  output.renderPlanV2Clean = cleanPlan;

  output.figmaRenderPlanClean = {
    contractVersion: cleanPlan.contractVersion,
    readyForFigma: cleanPlan.readyForFigma,
    assets: cleanPlan.assets,
    renderPlanV2: cleanPlan
  };

  return {
    ok: validation.ok,
    payload: output,
    plan: cleanPlan,
    validation,
    errors: validation.errors
  };
}