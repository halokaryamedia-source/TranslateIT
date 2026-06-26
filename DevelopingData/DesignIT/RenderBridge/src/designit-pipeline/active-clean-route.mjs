import { buildCleanRenderPayload } from "./build-clean-render-payload.mjs";
import { summarizeValidation } from "../designit-contract/validate.mjs";

function cleanErrorPayload(message, details) {
  return {
    ok: false,
    publicVersion: "designit-clean-only",
    engine: "DesignIT",
    generatedAt: new Date().toISOString(),
    designitCleanRoute: {
      enabled: true,
      mode: "clean-only",
      ok: false,
      error: message,
      details: details || null
    }
  };
}

function nodeChildren(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node.children)) return node.children;
  if (Array.isArray(node.items)) return node.items;
  if (Array.isArray(node.nodes)) return node.nodes;
  return [];
}

function nodeKind(node) {
  if (!node || typeof node !== "object") return "";
  return String(node.type || node.kind || node.nodeType || node.role || "").toLowerCase();
}

function isImageNode(node) {
  const kind = nodeKind(node);
  if (kind.includes("image")) return true;
  if (kind.includes("bitmap")) return true;
  if (node && typeof node === "object") {
    if (node.assetId || node.assetKey || node.imageAssetId || node.imageHash) return true;
    if (node.fills && JSON.stringify(node.fills).toLowerCase().includes("image")) return true;
  }
  return false;
}

function isTextNode(node) {
  const kind = nodeKind(node);
  if (kind.includes("text")) return true;
  if (node && typeof node === "object") {
    if (typeof node.text === "string" && node.text.trim()) return true;
    if (typeof node.characters === "string" && node.characters.trim()) return true;
    if (typeof node.content === "string" && node.content.trim() && kind !== "image") return true;
  }
  return false;
}

function isButtonNode(node) {
  const kind = nodeKind(node);
  return kind.includes("button") || kind.includes("cta");
}

function isFrameNode(node) {
  const kind = nodeKind(node);
  return kind.includes("frame") || kind.includes("group") || kind.includes("section") || kind.includes("container");
}

function walkStats(root) {
  const stats = {
    total: 0,
    frame: 0,
    image: 0,
    text: 0,
    button: 0
  };

  function walk(node) {
    if (!node || typeof node !== "object") return;
    stats.total += 1;

    if (isFrameNode(node)) stats.frame += 1;
    if (isImageNode(node)) stats.image += 1;
    if (isTextNode(node)) stats.text += 1;
    if (isButtonNode(node)) stats.button += 1;

    for (const child of nodeChildren(node)) walk(child);
  }

  walk(root);
  return stats;
}

function numberStat(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validationStatsForPlan(plan) {
  const validationStats =
    plan &&
    plan.diagnostics &&
    plan.diagnostics.validation &&
    plan.diagnostics.validation.stats &&
    typeof plan.diagnostics.validation.stats === "object"
      ? plan.diagnostics.validation.stats
      : {};

  return {
    total: numberStat(validationStats.total),
    frame: numberStat(validationStats.frame),
    image: numberStat(validationStats.image),
    text: numberStat(validationStats.text),
    button: numberStat(validationStats.button),
    assets: Array.isArray(plan && plan.assets) ? plan.assets.length : numberStat(validationStats.assets),
    invalidRects: numberStat(validationStats.invalidRects),
    imageMissingAsset: numberStat(validationStats.imageMissingAsset),
    referenceAssetCount: numberStat(validationStats.referenceAssetCount),
    leftImageCount: numberStat(validationStats.leftImageCount),
    rightImageCount: numberStat(validationStats.rightImageCount),
    rightTextCount: numberStat(validationStats.rightTextCount),
    rightReferenceLeakCount: numberStat(validationStats.rightReferenceLeakCount)
  };
}

function mergeStatsForPlan(plan, fallbackStats) {
  const validationStats = validationStatsForPlan(plan);
  const fallback = fallbackStats && typeof fallbackStats === "object" ? fallbackStats : {};

  return {
    total: Math.max(validationStats.total, numberStat(fallback.total)),
    frame: Math.max(validationStats.frame, numberStat(fallback.frame)),
    image: Math.max(validationStats.image, numberStat(fallback.image)),
    text: Math.max(validationStats.text, numberStat(fallback.text)),
    button: Math.max(validationStats.button, numberStat(fallback.button)),
    assets: Math.max(validationStats.assets, numberStat(fallback.assets)),
    invalidRects: validationStats.invalidRects,
    imageMissingAsset: validationStats.imageMissingAsset,
    referenceAssetCount: Math.max(validationStats.referenceAssetCount, numberStat(fallback.referenceAssetCount)),
    leftImageCount: Math.max(validationStats.leftImageCount, numberStat(fallback.leftImageCount)),
    rightImageCount: Math.max(validationStats.rightImageCount, numberStat(fallback.rightImageCount)),
    rightTextCount: Math.max(validationStats.rightTextCount, numberStat(fallback.rightTextCount)),
    rightReferenceLeakCount: validationStats.rightReferenceLeakCount
  };
}

function scoreStats(stats) {
  return (
    numberStat(stats.leftImageCount) * 100000 +
    numberStat(stats.rightTextCount) * 10000 +
    numberStat(stats.assets) * 1000 +
    numberStat(stats.rightImageCount) * 100 +
    numberStat(stats.text) * 10 +
    numberStat(stats.image) * 10 +
    numberStat(stats.total)
  );
}
function planContentStats(plan) {
  const rootChildren =
    plan &&
    plan.root &&
    Array.isArray(plan.root.children)
      ? plan.root.children
      : [];

  const left = rootChildren[0] || null;
  const right = rootChildren[1] || null;

  const totalStats = walkStats(plan && plan.root ? plan.root : null);
  const leftStats = walkStats(left);
  const rightStats = walkStats(right);

  return {
    total: totalStats.total,
    frame: totalStats.frame,
    image: totalStats.image,
    text: totalStats.text,
    button: totalStats.button,
    assets: Array.isArray(plan && plan.assets) ? plan.assets.length : 0,
    leftImageCount: leftStats.image,
    rightImageCount: rightStats.image,
    rightTextCount: rightStats.text,
    rightButtonCount: rightStats.button,
    rightNodeCount: rightStats.total,
    rootChildren: rootChildren.length
  };
}

function planScore(plan) {
  if (!plan || typeof plan !== "object") return -1;
  if (String(plan.contractVersion || "") !== "compare-view-v1") return -1;
  if (!plan.root || !Array.isArray(plan.root.children) || plan.root.children.length !== 2) return -1;

  const stats = planContentStats(plan);

  let score = 0;
  score += stats.assets * 100;
  score += stats.leftImageCount * 500;
  score += stats.rightTextCount * 50;
  score += stats.rightImageCount * 30;
  score += stats.rightButtonCount * 20;
  score += stats.rightNodeCount;
  score += stats.total;

  return score;
}

function addCandidate(candidates, name, plan) {
  if (!plan || typeof plan !== "object") return;
  if (String(plan.contractVersion || "") !== "compare-view-v1") return;
  if (!plan.root || !Array.isArray(plan.root.children) || plan.root.children.length !== 2) return;

  const fallbackStats = planContentStats(plan);
  const stats = mergeStatsForPlan(plan, fallbackStats);
  const score = scoreStats(stats);

  candidates.push({
    name,
    plan,
    score,
    stats
  });
}
function pickCanonicalCleanPlan(built) {
  const payload = built && built.payload && typeof built.payload === "object" ? built.payload : {};
  const candidates = [];

  addCandidate(candidates, "built.plan", built && built.plan);
  addCandidate(candidates, "payload.renderPlanV2Clean", payload.renderPlanV2Clean);
  addCandidate(candidates, "payload.figmaRenderPlanClean.renderPlanV2", payload.figmaRenderPlanClean && payload.figmaRenderPlanClean.renderPlanV2);
  addCandidate(candidates, "payload.renderPlanV2", payload.renderPlanV2);
  addCandidate(candidates, "payload.figmaRenderPlan.renderPlanV2", payload.figmaRenderPlan && payload.figmaRenderPlan.renderPlanV2);
  addCandidate(candidates, "payload.designitRenderPlan", payload.designitRenderPlan);

  candidates.sort((a, b) => b.score - a.score);

  return {
    selected: candidates.length ? candidates[0] : null,
    candidates: candidates.map(item => ({
      name: item.name,
      score: item.score,
      stats: item.stats
    }))
  };
}

function ensurePlanValidation(plan, built, contentStats) {
  if (!plan || typeof plan !== "object") return plan;

  const stats = mergeStatsForPlan(plan, contentStats);

  if (!plan.diagnostics || typeof plan.diagnostics !== "object") {
    plan.diagnostics = {};
  }

  if (!plan.diagnostics.validation || typeof plan.diagnostics.validation !== "object") {
    plan.diagnostics.validation = built && built.validation ? built.validation : {};
  }

  if (!plan.diagnostics.validation.stats || typeof plan.diagnostics.validation.stats !== "object") {
    plan.diagnostics.validation.stats = {};
  }

  plan.diagnostics.validation.stats = {
    ...plan.diagnostics.validation.stats,
    total: stats.total,
    frame: stats.frame,
    image: stats.image,
    text: stats.text,
    button: stats.button,
    assets: stats.assets,
    referenceAssetCount: stats.referenceAssetCount,
    leftImageCount: stats.leftImageCount,
    rightImageCount: stats.rightImageCount,
    rightTextCount: stats.rightTextCount,
    rightReferenceLeakCount: stats.rightReferenceLeakCount,
    imageMissingAsset: stats.imageMissingAsset,
    invalidRects: stats.invalidRects
  };

  return plan;
}
function forceAttachSelectedStats(plan, selectedStats) {
  if (!plan || typeof plan !== "object") return plan;

  const stats = selectedStats && typeof selectedStats === "object" ? selectedStats : {};

  if (!plan.diagnostics || typeof plan.diagnostics !== "object") {
    plan.diagnostics = {};
  }

  if (!plan.diagnostics.validation || typeof plan.diagnostics.validation !== "object") {
    plan.diagnostics.validation = {};
  }

  if (!plan.diagnostics.validation.stats || typeof plan.diagnostics.validation.stats !== "object") {
    plan.diagnostics.validation.stats = {};
  }

  plan.diagnostics.validation.stats = {
    ...plan.diagnostics.validation.stats,
    total: Number(stats.total || plan.diagnostics.validation.stats.total || 0),
    frame: Number(stats.frame || plan.diagnostics.validation.stats.frame || 0),
    image: Number(stats.image || plan.diagnostics.validation.stats.image || 0),
    text: Number(stats.text || plan.diagnostics.validation.stats.text || 0),
    button: Number(stats.button || plan.diagnostics.validation.stats.button || 0),
    assets: Number(stats.assets || plan.diagnostics.validation.stats.assets || 0),
    invalidRects: Number(stats.invalidRects || plan.diagnostics.validation.stats.invalidRects || 0),
    imageMissingAsset: Number(stats.imageMissingAsset || plan.diagnostics.validation.stats.imageMissingAsset || 0),
    referenceAssetCount: Number(stats.referenceAssetCount || stats.leftImageCount || plan.diagnostics.validation.stats.referenceAssetCount || 0),
    leftImageCount: Number(stats.leftImageCount || plan.diagnostics.validation.stats.leftImageCount || 0),
    rightImageCount: Number(stats.rightImageCount || plan.diagnostics.validation.stats.rightImageCount || 0),
    rightTextCount: Number(stats.rightTextCount || plan.diagnostics.validation.stats.rightTextCount || 0),
    rightReferenceLeakCount: Number(stats.rightReferenceLeakCount || plan.diagnostics.validation.stats.rightReferenceLeakCount || 0)
  };

  return plan;
}
function validationSummaryFor(plan, built) {
  const validation =
    plan &&
    plan.diagnostics &&
    plan.diagnostics.validation
      ? plan.diagnostics.validation
      : built && built.validation
        ? built.validation
        : null;

  if (!validation) return null;

  try {
    return summarizeValidation(validation);
  } catch {
    return validation;
  }
}

function assertCleanPlan(plan, selectedMeta) {
  if (!plan || typeof plan !== "object") {
    throw new Error("Canonical clean plan is missing.");
  }

  if (String(plan.contractVersion || "") !== "compare-view-v1") {
    throw new Error("Canonical clean plan has invalid contractVersion: " + String(plan.contractVersion || ""));
  }

  if (!plan.compareView || !plan.compareView.leftReference || !plan.compareView.rightEditable) {
    throw new Error("Canonical clean plan is missing compareView left/right.");
  }

  if (!plan.root || !Array.isArray(plan.root.children) || plan.root.children.length !== 2) {
    throw new Error("Canonical clean plan root must contain exactly two frames.");
  }

  const stats = selectedMeta && selectedMeta.stats ? selectedMeta.stats : planContentStats(plan);

  if (stats.leftImageCount < 1) {
    throw new Error("Canonical clean plan rejected: left reference image missing.");
  }

  if (stats.rightTextCount < 1) {
    throw new Error("Canonical clean plan rejected: right editable text missing.");
  }

  return true;
}

export function buildActiveCleanRoutePayload(sourcePayload, options = {}) {
  try {
    const built = buildCleanRenderPayload(sourcePayload, {
      minReferenceBytes: options.minReferenceBytes || 10000,
      minRightText: options.minRightText || 1,
      minRightImages: options.minRightImages || 0,
      gap: options.gap || 120
    });

    if (!built || !built.ok || !built.payload) {
      const details = built && built.errors ? built.errors : [];
      return {
        ok: false,
        status: 500,
        payload: cleanErrorPayload("Clean-only route failed to build payload.", details)
      };
    }

    const picked = pickCanonicalCleanPlan(built);

    if (!picked.selected) {
      return {
        ok: false,
        status: 500,
        payload: cleanErrorPayload("No usable compare-view-v1 clean plan candidate was found.", picked.candidates)
      };
    }

    const selectedStats = picked.selected.stats || planContentStats(picked.selected.plan);
    const plan = ensurePlanValidation(picked.selected.plan, built, selectedStats);

    assertCleanPlan(plan, picked.selected);

    const validationSummary = validationSummaryFor(plan, built);
    const payload = { ...built.payload };

    payload.ok = true;
    payload.readyForFigma = Boolean(plan.readyForFigma);
    payload.designitCleanRoute = {
      enabled: true,
      mode: "clean-only",
      ok: true,
      selectedPlan: picked.selected.name,
      selectedScore: picked.selected.score,
      candidates: picked.candidates,
      contractVersion: plan.contractVersion,
      readyForFigma: Boolean(plan.readyForFigma),
      validation: validationSummary
    };

    payload.renderPlanV2 = plan;
    payload.figmaRenderPlan = {
      contractVersion: plan.contractVersion,
      readyForFigma: Boolean(plan.readyForFigma),
      assets: Array.isArray(plan.assets) ? plan.assets : [],
      renderPlanV2: plan
    };

    delete payload.designitRenderPlan;
    delete payload.renderPlanV2Clean;
    delete payload.figmaRenderPlanClean;

    return {
      ok: true,
      status: 200,
      payload
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      payload: cleanErrorPayload(
        error && error.message ? error.message : String(error),
        null
      )
    };
  }
}


