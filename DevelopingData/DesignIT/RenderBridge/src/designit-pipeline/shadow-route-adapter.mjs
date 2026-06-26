import { buildCleanRenderPayload } from "./build-clean-render-payload.mjs";
import { extractPlan } from "../designit-contract/schema.mjs";
import { validateRenderPlanContract, summarizeValidation } from "../designit-contract/validate.mjs";

export function buildShadowCleanPayloadFromRoutePayload(routePayload, options = {}) {
  const sourcePlan = extractPlan(routePayload);

  if (!sourcePlan) {
    return {
      ok: false,
      payload: null,
      plan: null,
      source: {
        hasPlan: false,
        contractVersion: "",
        readyForFigma: false
      },
      validation: null,
      errors: [{ code: "SOURCE_PLAN_MISSING", message: "Route payload has no render plan.", path: "" }]
    };
  }

  const built = buildCleanRenderPayload(routePayload, {
    minReferenceBytes: options.minReferenceBytes || 10000,
    minRightText: options.minRightText || 1,
    minRightImages: options.minRightImages || 0,
    gap: options.gap || 120
  });

  const validation = built.plan
    ? validateRenderPlanContract(built.plan, {
        allowTransitionalContract: false,
        minReferenceBytes: options.minReferenceBytes || 10000,
        minRightText: options.minRightText || 1,
        minRightImages: options.minRightImages || 0
      })
    : null;

  return {
    ok: Boolean(built.ok && validation && validation.ok),
    payload: built.payload,
    plan: built.plan,
    source: {
      hasPlan: true,
      contractVersion: String(sourcePlan.contractVersion || ""),
      readyForFigma: Boolean(sourcePlan.readyForFigma)
    },
    validation,
    validationSummary: validation ? summarizeValidation(validation) : null,
    errors: validation ? validation.errors : built.errors || []
  };
}

export function summarizeShadowCleanPayload(shadowResult) {
  const plan = shadowResult && shadowResult.plan;
  const validation = shadowResult && shadowResult.validation;

  return {
    ok: Boolean(shadowResult && shadowResult.ok),
    sourceContractVersion: shadowResult && shadowResult.source ? shadowResult.source.contractVersion : "",
    sourceReadyForFigma: shadowResult && shadowResult.source ? shadowResult.source.readyForFigma : false,
    cleanContractVersion: plan ? String(plan.contractVersion || "") : "",
    cleanReadyForFigma: plan ? Boolean(plan.readyForFigma) : false,
    rootChildren: plan && plan.root && Array.isArray(plan.root.children) ? plan.root.children.length : 0,
    rootNames: plan && plan.root && Array.isArray(plan.root.children) ? plan.root.children.map(child => String(child.name || "")) : [],
    assets: plan && Array.isArray(plan.assets) ? plan.assets.length : 0,
    pageWidth: plan && plan.page ? Number(plan.page.width || 0) : 0,
    pageHeight: plan && plan.page ? Number(plan.page.height || 0) : 0,
    validationOk: validation ? Boolean(validation.ok) : false,
    validationErrors: validation ? validation.errors.map(item => item.code + ": " + item.message) : [],
    validationWarnings: validation ? validation.warnings.map(item => item.code + ": " + item.message) : [],
    stats: validation ? validation.stats : {}
  };
}