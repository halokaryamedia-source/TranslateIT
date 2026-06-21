const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

const count = (value) => Array.isArray(value) ? value.length : 0;
const clamp = (value) => Math.max(0, Math.min(10, Math.round(value * 10) / 10));
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const coverage = (items, fn) => items.length ? items.filter(fn).length / items.length : 0;

function textPressure(section) {
  const texts = Array.isArray(section.priorityText) ? section.priorityText : [];
  const total = texts.reduce((sum, item) => sum + clean(item.text || item).length, 0);
  const budget = section.contentBudget || {};
  const allowed = Number(budget.headingChars || 80) + Number(budget.bodyChars || 220) + 120;
  return allowed ? total / allowed : 1;
}

function analyzePayload(payload) {
  const plan = payload.rebuildPlan || {};
  const tokens = plan.tokens || {};
  const sections = Array.isArray(plan.sections) ? plan.sections : [];
  const hints = plan.qualityHints || {};

  const templateCoverage = coverage(sections, (section) => !!section.templateIntent);
  const priorityCoverage = coverage(sections, (section) => Array.isArray(section.priorityText));
  const budgetCoverage = coverage(sections, (section) => !!section.contentBudget);
  const layoutCoverage = coverage(sections, (section) => !!section.suggestedLayout);
  const pressureIssues = sections.filter((section) => textPressure(section) > 1.25).length;

  const extractionScore = clamp(2 + Math.min(count(payload.layers), 180) / 180 * 3 + Math.min(sections.length, 10) / 10 * 3 + (payload.screenshot && payload.screenshot.base64 ? 2 : 0));
  const semanticScore = clamp(1 + templateCoverage * 2 + priorityCoverage * 2 + budgetCoverage * 2 + layoutCoverage * 1.5 + Math.min(count(plan.componentBlueprints), 7) / 7 * 1.5);
  const tokenScore = clamp(1 + Math.min(count(tokens.colors), 8) / 8 * 2 + Math.min(count(tokens.typography), 6) / 6 * 2 + Math.min(count(tokens.spacing), 8) / 8 * 2 + Math.min(count(tokens.radius), 4) / 4 * 2);
  const layoutScore = clamp(8.4 - pressureIssues * 0.35 - Number(hints.overflowRiskCount || 0) * 0.25 - Number(hints.denseSectionCount || 0) * 0.1);
  const designProfileScore = clamp(8.2 - (count(tokens.colors) ? 0 : 1) - (count(tokens.typography) ? 0 : 1) - (count(plan.componentBlueprints) >= 4 ? 0 : 1));
  const toolingScore = clamp(8.0);
  const figmaUnknownPenalty = 1.2;

  const blockers = [];
  if (payload.publicVersion !== 'Version 0.1 - Alpha') blockers.push('Public version is not Alpha.');
  if (payload.mode !== 'translateit-design-clone-alpha') blockers.push('Render mode is not Alpha semantic mode.');
  if (!payload.screenshot || !payload.screenshot.base64) blockers.push('Missing screenshot reference.');
  if (!sections.length) blockers.push('Missing semantic sections.');
  if (templateCoverage < 0.95) blockers.push('Weak template coverage.');
  if (priorityCoverage < 0.95) blockers.push('Weak priority text coverage.');
  if (budgetCoverage < 0.95) blockers.push('Weak content budget coverage.');
  if (count(plan.componentBlueprints) < 4) blockers.push('Weak component blueprints.');
  if (count(tokens.spacing) < 6) blockers.push('Weak spacing tokens.');
  if (count(tokens.radius) < 2) blockers.push('Weak radius tokens.');

  const rawPreFigmaScore = clamp(
    extractionScore * 0.16 +
    semanticScore * 0.20 +
    tokenScore * 0.14 +
    layoutScore * 0.18 +
    designProfileScore * 0.12 +
    toolingScore * 0.20
  );

  const honestScore = clamp(rawPreFigmaScore - figmaUnknownPenalty - blockers.length * 0.35);

  return {
    url: payload.url,
    title: payload.title,
    mode: payload.mode,
    publicVersion: payload.publicVersion,
    scores: {
      extractionScore,
      semanticScore,
      tokenScore,
      layoutScore,
      designProfileScore,
      toolingScore,
      rawPreFigmaScore,
      figmaUnknownPenalty,
      honestScore
    },
    blockers,
    metrics: {
      layers: count(payload.layers),
      sections: sections.length,
      templateCoverage: Math.round(templateCoverage * 100) + '%',
      priorityCoverage: Math.round(priorityCoverage * 100) + '%',
      budgetCoverage: Math.round(budgetCoverage * 100) + '%',
      layoutCoverage: Math.round(layoutCoverage * 100) + '%',
      pressureIssues,
      colors: count(tokens.colors),
      typography: count(tokens.typography),
      spacing: count(tokens.spacing),
      radius: count(tokens.radius),
      componentBlueprints: count(plan.componentBlueprints),
      qualityHints: hints
    }
  };
}

const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const result = analyzePayload(payload);
const report = {
  publicVersion: 'Version 0.1 - Alpha',
  targetUrl,
  readiness: result.blockers.length === 0 && result.scores.honestScore >= 7.8 ? 'max-pre-figma-ready' : result.scores.honestScore >= 7.2 ? 'near-max-pre-figma-ready' : 'needs-hardening',
  result,
  ceiling: {
    currentPreFigmaCeiling: 'around 7.8 / 10',
    reason: '9+ requires real Figma visual validation, actual canvas review, and fix cycles across multiple websites.'
  },
  nextRequiredStep: 'Run real Figma import validation and fix actual canvas issues before claiming 8+ or 9+.',
  note: 'Unified readiness evaluator. It intentionally applies a Figma unknown penalty.'
};

console.log(JSON.stringify(report, null, 2));
if (result.blockers.length || result.scores.honestScore < 7) process.exitCode = 2;
