import { validateRenderPlanContract } from "../../RenderBridge/src/designit-contract/validate.mjs";
import { extractPlan } from "../../RenderBridge/src/designit-contract/schema.mjs";

export function validatePluginPayload(payloadOrPlan, options = {}) {
  const plan = extractPlan(payloadOrPlan);

  if (!plan) {
    return {
      ok: false,
      plan: null,
      errors: [{ code: "PLAN_MISSING", message: "Render plan is missing.", path: "" }],
      warnings: [],
      validation: null
    };
  }

  const validation = validateRenderPlanContract(plan, {
    allowTransitionalContract: false,
    minReferenceBytes: options.minReferenceBytes || 10000,
    minRightText: options.minRightText || 1,
    minRightImages: options.minRightImages || 0
  });

  return {
    ok: validation.ok,
    plan,
    errors: validation.errors,
    warnings: validation.warnings,
    validation
  };
}

export function assertPluginPayload(payloadOrPlan, options = {}) {
  const result = validatePluginPayload(payloadOrPlan, options);

  if (!result.ok) {
    const message = result.errors.map(item => item.code + ": " + item.message).join(" | ");
    throw new Error("Invalid DesignIT plugin payload: " + message);
  }

  return result.plan;
}