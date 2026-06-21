const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

const round = (v) => Math.round(v * 10) / 10;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const key = (v) => String(v || '').replace(/\s+/g, ' ').trim().toLowerCase();

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

function countUnique(items, fn) {
  const seen = new Set();
  for (const item of items || []) {
    const value = fn(item);
    if (value) seen.add(value);
  }
  return seen.size;
}

function classifyIntent(value) {
  const raw = key(value);
  if (raw.includes('navigation') || raw.includes('header')) return 'header';
  if (raw.includes('hero') || raw.includes('landing')) return 'hero';
  if (raw.includes('gallery') || raw.includes('grid') || raw.includes('card')) return 'gallery';
  if (raw.includes('footer')) return 'footer';
  return 'content';
}

function score(payload) {
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const plan = payload.rebuildPlan || {};
  const tokens = plan.tokens || {};
  const planSections = Array.isArray(plan.sections) ? plan.sections : [];
  const colors = Array.isArray(tokens.colors) ? tokens.colors.length : 0;
  const typography = Array.isArray(tokens.typography) ? tokens.typography.length : 0;
  const spacing = Array.isArray(tokens.spacing) ? tokens.spacing.length : 0;
  const responsiveCount = plan.responsive ? ['desktop', 'tablet', 'mobile'].filter((k) => !!plan.responsive[k]).length : 0;
  const images = layers.filter((layer) => layer.type === 'image').length;
  const texts = layers.filter((layer) => layer.type === 'text').length;
  const components = sections.flatMap((section) => section.components || []);
  const usefulComponents = components.filter((component) => (component.layers || []).length >= 2).length;
  const intentTypes = countUnique(planSections, (section) => classifyIntent(section.intent || section.role));

  const screenshotScore = payload.screenshot && payload.screenshot.base64 ? 9 : 0;
  const extractionScore = clamp(1 + Math.min(layers.length, 120) / 120 * 2 + Math.min(sections.length, 8) / 8 * 2 + Math.min(texts, 80) / 80 * 1.5 + Math.min(images, 8) / 8 * 1, 0, 8);
  const tokenScore = clamp(1 + Math.min(colors, 10) / 10 * 1.5 + Math.min(typography, 8) / 8 * 1.5 + Math.min(spacing, 8) / 8 * 2 + Math.min(responsiveCount, 3) / 3 * 1.5, 0, 8);
  const templateReadinessScore = clamp(1 + Math.min(planSections.length, 8) / 8 * 2 + Math.min(intentTypes, 4) / 4 * 2 + Math.min(usefulComponents, 8) / 8 * 1.5, 0, 8);

  const noCanvasValidationPenalty = 1.5;
  const finalScore = Math.min(screenshotScore, extractionScore, tokenScore, templateReadinessScore) - noCanvasValidationPenalty;
  const safeFinal = clamp(finalScore, 0, 10);

  return {
    screenshotScore: round(screenshotScore),
    extractionScore: round(extractionScore),
    tokenScore: round(tokenScore),
    templateReadinessScore: round(templateReadinessScore),
    finalScore: round(safeFinal),
    readinessLabel: safeFinal >= 9 ? 'professional-ready' : safeFinal >= 7 ? 'usable-prototype' : safeFinal >= 5 ? 'early-usable-prototype' : 'not-ready',
    passesV11_2TemplateReadiness: safeFinal >= 7,
    rule: 'This audit is intentionally conservative. V11.2 can only be considered professional-ready after visual Figma canvas validation.',
    penalties: { noCanvasValidationPenalty },
    basis: {
      mode: payload.mode,
      adapter: payload.adapter,
      layers: layers.length,
      sections: sections.length,
      planSections: planSections.length,
      intentTypes,
      texts,
      images,
      components: components.length,
      usefulComponents,
      colors,
      typography,
      spacing,
      responsiveCount,
      hasScreenshot: !!(payload.screenshot && payload.screenshot.base64)
    }
  };
}

const health = await getJson(`${bridge}/health`);
const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const scores = score(payload);
console.log(JSON.stringify({ health, targetUrl, title: payload.title, diagnostics: payload.diagnostics, scores }, null, 2));
if (!scores.passesV11_2TemplateReadiness) process.exitCode = 2;
