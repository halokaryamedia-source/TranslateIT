const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const PUBLIC_VERSION = 'Version 0.1 - Alpha';

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

const pct = (value) => Math.round(value * 100) / 100;
const score = (value) => Math.max(0, Math.min(10, pct(value)));
const count = (arr) => Array.isArray(arr) ? arr.length : 0;
const coverage = (sections, fn) => sections.length ? sections.filter(fn).length / sections.length : 0;

function analyze(payload) {
  const plan = payload.rebuildPlan || {};
  const tokens = plan.tokens || {};
  const sections = Array.isArray(plan.sections) && plan.sections.length ? plan.sections : payload.sections || [];
  const diagnostics = payload.diagnostics || {};
  const hints = plan.qualityHints || {};

  const templateIntentCoverage = coverage(sections, (section) => !!section.templateIntent);
  const priorityTextCoverage = coverage(sections, (section) => Array.isArray(section.priorityText));
  const contentBudgetCoverage = coverage(sections, (section) => !!section.contentBudget);
  const suggestedLayoutCoverage = coverage(sections, (section) => !!section.suggestedLayout);
  const componentBlueprintCount = count(plan.componentBlueprints);

  const screenshotScore = payload.screenshot && payload.screenshot.base64 ? 9 : 0;
  const structureScore = score(2 + Math.min(count(payload.layers), 160) / 160 * 2 + Math.min(count(sections), 10) / 10 * 1.5 + templateIntentCoverage * 1.5 + priorityTextCoverage * 1.5 + contentBudgetCoverage * 1.5);
  const tokenScore = score(1 + Math.min(count(tokens.colors), 10) / 10 * 1.4 + Math.min(count(tokens.typography), 8) / 8 * 1.4 + Math.min(count(tokens.spacing), 8) / 8 * 1.4 + Math.min(count(tokens.radius), 4) / 4 * 1.4);
  const blueprintScore = score(1 + Math.min(componentBlueprintCount, 7) / 7 * 3 + suggestedLayoutCoverage * 2 + priorityTextCoverage * 2);
  const outputRuleScore = Array.isArray(payload.outputRules) && payload.outputRules.length >= 5 ? 8 : 4;
  const noFigmaPenalty = 1.4;
  const riskPenalty = Math.min(1.2, (Number(hints.overflowRiskCount || 0) * 0.2) + (Number(hints.denseSectionCount || 0) * 0.1));
  const finalScore = score(Math.min(screenshotScore, structureScore, tokenScore, blueprintScore, outputRuleScore) - noFigmaPenalty - riskPenalty);

  const blockers = [];
  if (payload.publicVersion !== PUBLIC_VERSION) blockers.push('Public version is not locked to Version 0.1 - Alpha.');
  if (payload.mode !== 'translateit-design-clone-alpha') blockers.push('Payload mode is not Alpha semantic mode.');
  if (!payload.screenshot || !payload.screenshot.base64) blockers.push('Missing screenshot reference.');
  if (!sections.length) blockers.push('Missing rebuild sections.');
  if (templateIntentCoverage < 0.95) blockers.push('Weak templateIntent coverage.');
  if (priorityTextCoverage < 0.95) blockers.push('Weak priorityText coverage.');
  if (contentBudgetCoverage < 0.95) blockers.push('Weak contentBudget coverage.');
  if (componentBlueprintCount < 4) blockers.push('Weak componentBlueprints.');
  if (count(tokens.spacing) < 6) blockers.push('Weak spacing tokens.');
  if (count(tokens.radius) < 2) blockers.push('Weak radius tokens.');

  return {
    publicVersion: PUBLIC_VERSION,
    targetUrl,
    mode: payload.mode,
    adapter: payload.adapter,
    scores: { screenshotScore, structureScore, tokenScore, blueprintScore, outputRuleScore, riskPenalty, noFigmaPenalty, finalScore },
    readiness: finalScore >= 7.2 && blockers.length === 0 ? 'ready-for-first-figma-visual-validation' : finalScore >= 6.5 ? 'near-pretest-ready' : finalScore >= 5 ? 'needs-alpha-hardening' : 'not-ready',
    blockers,
    basis: {
      layers: count(payload.layers),
      sections: count(sections),
      templateIntentCoverage: pct(templateIntentCoverage),
      priorityTextCoverage: pct(priorityTextCoverage),
      contentBudgetCoverage: pct(contentBudgetCoverage),
      suggestedLayoutCoverage: pct(suggestedLayoutCoverage),
      componentBlueprints: componentBlueprintCount,
      colors: count(tokens.colors),
      typography: count(tokens.typography),
      spacing: count(tokens.spacing),
      radius: count(tokens.radius),
      outputRules: count(payload.outputRules),
      qualityHints: hints,
      diagnostics
    },
    note: 'This is a pre-Figma semantic quality gate. It does not replace visual validation in Figma.'
  };
}

const health = await getJson(`${bridge}/health`);
const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const report = analyze(payload);
console.log(JSON.stringify({ health, report }, null, 2));
if (report.blockers.length || report.scores.finalScore < 5) process.exitCode = 2;
