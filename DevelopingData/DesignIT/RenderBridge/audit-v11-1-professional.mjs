const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const round = (v) => Math.round(v * 10) / 10;
const key = (v) => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

function uniqueCount(items, fn) {
  const seen = new Set();
  items.forEach((item) => {
    const value = fn(item);
    if (value) seen.add(value);
  });
  return seen.size;
}

function honestScore(value, strictPenalty) {
  return round(clamp(value - strictPenalty, 0, 10));
}

function score(payload) {
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const plan = payload.rebuildPlan || {};
  const tokens = plan.tokens || {};
  const colors = Array.isArray(tokens.colors) ? tokens.colors.length : 0;
  const typography = Array.isArray(tokens.typography) ? tokens.typography.length : 0;
  const spacing = Array.isArray(tokens.spacing) ? tokens.spacing.length : 0;
  const responsive = plan.responsive || {};
  const responsiveCount = ['desktop', 'tablet', 'mobile'].filter((key) => !!responsive[key]).length;
  const components = sections.flatMap((section) => section.components || []);
  const texts = layers.filter((layer) => layer.type === 'text');
  const images = layers.filter((layer) => layer.type === 'image');
  const buttons = layers.filter((layer) => layer.role === 'button-bg' || layer.role === 'button-label');
  const links = uniqueCount(texts.filter((layer) => layer.role === 'link'), (layer) => key(layer.text || layer.name));
  const headings = uniqueCount(texts.filter((layer) => layer.role === 'heading'), (layer) => key(layer.text || layer.name));
  const usefulComponents = components.filter((component) => (component.layers || []).length >= 2).length;
  const planSections = Array.isArray(plan.sections) ? plan.sections.length : 0;
  const hasScreenshot = !!(payload.screenshot && payload.screenshot.base64);
  const hasPlan = !!(plan && planSections >= 3);
  const hasRules = Array.isArray(payload.outputRules) && payload.outputRules.length >= 5;

  // Honest audit note:
  // This script cannot inspect the final Figma canvas after import.
  // Scores are intentionally capped and penalized unless the payload contains enough evidence
  // to suggest the result can become a clean structured design clone.
  const missingSpacingPenalty = spacing >= 5 ? 0 : 1.2;
  const missingResponsivePenalty = responsiveCount === 3 ? 0 : 1.2;
  const weakComponentsPenalty = usefulComponents >= 8 ? 0 : 1.4;
  const weakPlanPenalty = hasPlan ? 0 : 1.2;
  const noPostFigmaValidationPenalty = 1.4;
  const strictPenalty = missingSpacingPenalty + missingResponsivePenalty + weakComponentsPenalty + weakPlanPenalty + noPostFigmaValidationPenalty;

  const screenshotScore = hasScreenshot ? 9 : 0;
  const rawPlanScore = 1.5 + (hasPlan ? 1.5 : 0) + Math.min(planSections, 8) / 8 * 1.8 + Math.min(headings, 6) / 6 * 1.2 + Math.min(responsiveCount, 3) / 3 * 1.2;
  const rawLibraryScore = 1.5 + Math.min(colors, 12) / 12 * 1.4 + Math.min(typography, 10) / 10 * 1.4 + Math.min(spacing, 6) / 6 * 1.4 + Math.min(links, 8) / 8 * 0.8 + Math.min(buttons.length, 8) / 8 * 0.8 + Math.min(images.length, 8) / 8 * 0.8 + Math.min(usefulComponents, 12) / 12 * 1.4;
  const rawEditableScore = 1.5 + Math.min(texts.length, 80) / 80 * 1.7 + Math.min(images.length, 10) / 10 * 1.2 + Math.min(sections.length, 8) / 8 * 1.5 + Math.min(usefulComponents, 14) / 14 * 1.1;
  const workflowScore = hasRules ? 8 : 5;

  const planScore = honestScore(rawPlanScore, missingResponsivePenalty + weakPlanPenalty + noPostFigmaValidationPenalty);
  const libraryScore = honestScore(rawLibraryScore, missingSpacingPenalty + weakComponentsPenalty + noPostFigmaValidationPenalty);
  const editableScore = honestScore(rawEditableScore, weakComponentsPenalty + noPostFigmaValidationPenalty);
  const finalScore = Math.min(screenshotScore, planScore, libraryScore, editableScore, workflowScore);

  return {
    screenshotScore: round(screenshotScore),
    rebuildPlanScore: round(planScore),
    structuredLibraryScore: round(libraryScore),
    editableDraftScore: round(editableScore),
    workflowScore: round(workflowScore),
    finalScore: round(finalScore),
    passesV11_1ProfessionalReadiness: finalScore >= 9,
    readinessLabel: finalScore >= 9 ? 'professional-ready' : finalScore >= 7 ? 'usable-prototype' : finalScore >= 5 ? 'early-usable-prototype' : 'not-ready',
    rule: 'This is a strict pre-Figma audit. Final score is capped by the weakest category and penalized because the script cannot validate the final Figma canvas.',
    honestLimitations: [
      'This audit only sees the RenderBridge payload, not the final imported Figma layout.',
      'A high screenshot score does not mean the design clone is usable.',
      'Professional-ready requires post-import Figma validation and visually clean UI Library output.',
      'Missing spacing tokens, responsive notes, or useful components lowers the score intentionally.'
    ],
    penalties: {
      missingSpacingPenalty: round(missingSpacingPenalty),
      missingResponsivePenalty: round(missingResponsivePenalty),
      weakComponentsPenalty: round(weakComponentsPenalty),
      weakPlanPenalty: round(weakPlanPenalty),
      noPostFigmaValidationPenalty: round(noPostFigmaValidationPenalty),
      totalStrictPenalty: round(strictPenalty)
    },
    basis: {
      mode: payload.mode,
      adapter: payload.adapter,
      layers: layers.length,
      sections: sections.length,
      planSections,
      components: components.length,
      usefulComponents,
      texts: texts.length,
      images: images.length,
      buttons: buttons.length,
      links,
      headings,
      colors,
      typography,
      spacing,
      responsiveCount,
      hasScreenshot,
      hasPlan,
      hasOutputRules: hasRules
    }
  };
}

const health = await getJson(`${bridge}/health`);
const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const scores = score(payload);
console.log(JSON.stringify({ health, targetUrl, title: payload.title, diagnostics: payload.diagnostics, outputRules: payload.outputRules || [], scores }, null, 2));
if (!scores.passesV11_1ProfessionalReadiness) process.exitCode = 2;
