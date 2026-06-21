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
  const usefulComponents = components.filter((component) => (component.layers || []).length >= 1).length;
  const hasScreenshot = !!(payload.screenshot && payload.screenshot.base64);
  const hasPlan = !!(plan && Array.isArray(plan.sections) && plan.sections.length);
  const hasRules = Array.isArray(payload.outputRules) && payload.outputRules.length >= 5;

  const screenshotScore = hasScreenshot ? 10 : 0;
  const planScore = clamp(2 + (hasPlan ? 2 : 0) + Math.min(sections.length, 8) / 8 * 2 + Math.min(headings, 6) / 6 * 1.5 + Math.min(responsiveCount, 3) / 3 * 2.5, 0, 10);
  const libraryScore = clamp(2 + Math.min(colors, 12) / 12 * 1.6 + Math.min(typography, 10) / 10 * 1.6 + Math.min(spacing, 6) / 6 * 1.6 + Math.min(links, 8) / 8 * 1.1 + Math.min(buttons.length, 8) / 8 * 1.1 + Math.min(images.length, 8) / 8 * 1, 0, 10);
  const editableScore = clamp(2.5 + Math.min(texts.length, 80) / 80 * 2.5 + Math.min(images.length, 10) / 10 * 1.5 + Math.min(sections.length, 8) / 8 * 2 + Math.min(usefulComponents, 14) / 14 * 1.5, 0, 10);
  const workflowScore = hasRules ? 9.5 : 6;
  const finalScore = Math.min(screenshotScore, planScore, libraryScore, editableScore, workflowScore);

  return {
    screenshotScore: round(screenshotScore),
    rebuildPlanScore: round(planScore),
    structuredLibraryScore: round(libraryScore),
    editableDraftScore: round(editableScore),
    workflowScore: round(workflowScore),
    finalScore: round(finalScore),
    passesV11_1ProfessionalReadiness: finalScore >= 9,
    rule: 'Final score is the lowest category. Professional output needs screenshot, plan, structured library, editable draft, and workflow discipline.',
    basis: {
      mode: payload.mode,
      adapter: payload.adapter,
      layers: layers.length,
      sections: sections.length,
      planSections: Array.isArray(plan.sections) ? plan.sections.length : 0,
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
