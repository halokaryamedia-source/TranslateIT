const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
const urls = process.argv.slice(2).length ? process.argv.slice(2) : [
  'https://www.mivubi.com/',
  'https://www.minecraft.net/',
  'https://www.figma.com/'
];

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

const count = (value) => Array.isArray(value) ? value.length : 0;
const clamp = (value) => Math.max(0, Math.min(10, Math.round(value * 10) / 10));
const coverage = (items, fn) => items.length ? items.filter(fn).length / items.length : 0;

function scorePayload(payload) {
  const plan = payload.rebuildPlan || {};
  const tokens = plan.tokens || {};
  const sections = Array.isArray(plan.sections) ? plan.sections : [];
  const hints = plan.qualityHints || {};
  const templateCoverage = coverage(sections, (section) => !!section.templateIntent);
  const priorityCoverage = coverage(sections, (section) => Array.isArray(section.priorityText));
  const budgetCoverage = coverage(sections, (section) => !!section.contentBudget);
  const layoutCoverage = coverage(sections, (section) => !!section.suggestedLayout);
  const riskPenalty = Math.min(1.2, Number(hints.overflowRiskCount || 0) * 0.25 + Number(hints.denseSectionCount || 0) * 0.1);

  const scores = {
    screenshot: payload.screenshot && payload.screenshot.base64 ? 9 : 0,
    sections: clamp(2 + Math.min(sections.length, 10) / 10 * 3),
    blueprint: clamp(1 + templateCoverage * 2 + priorityCoverage * 2 + budgetCoverage * 2 + layoutCoverage * 1.5 + Math.min(count(plan.componentBlueprints), 7) / 7 * 1.5),
    tokens: clamp(1 + Math.min(count(tokens.colors), 8) / 8 * 2 + Math.min(count(tokens.typography), 6) / 6 * 2 + Math.min(count(tokens.spacing), 8) / 8 * 2 + Math.min(count(tokens.radius), 4) / 4 * 2),
    riskPenalty
  };

  const finalScore = clamp(Math.min(scores.screenshot, scores.sections, scores.blueprint, scores.tokens) - riskPenalty - 1.2);
  const blockers = [];
  if (payload.publicVersion !== 'Version 0.1 - Alpha') blockers.push('wrong-public-version');
  if (payload.mode !== 'translateit-design-clone-alpha') blockers.push('wrong-mode');
  if (!sections.length) blockers.push('missing-sections');
  if (templateCoverage < 0.95) blockers.push('weak-template-coverage');
  if (priorityCoverage < 0.95) blockers.push('weak-priority-text');
  if (budgetCoverage < 0.95) blockers.push('weak-content-budget');
  if (count(plan.componentBlueprints) < 4) blockers.push('weak-component-blueprints');

  return {
    url: payload.url,
    title: payload.title,
    mode: payload.mode,
    publicVersion: payload.publicVersion,
    finalScore,
    scores,
    blockers,
    metrics: {
      layers: count(payload.layers),
      sections: sections.length,
      templateCoverage: Math.round(templateCoverage * 100) + '%',
      priorityCoverage: Math.round(priorityCoverage * 100) + '%',
      budgetCoverage: Math.round(budgetCoverage * 100) + '%',
      layoutCoverage: Math.round(layoutCoverage * 100) + '%',
      componentBlueprints: count(plan.componentBlueprints),
      colors: count(tokens.colors),
      typography: count(tokens.typography),
      spacing: count(tokens.spacing),
      radius: count(tokens.radius),
      qualityHints: hints
    }
  };
}

const health = await getJson(`${bridge}/health`);
const results = [];
for (const url of urls) {
  try {
    const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(url)}`);
    results.push({ ok: true, ...scorePayload(payload) });
  } catch (error) {
    results.push({ ok: false, url, finalScore: 0, blockers: ['render-error'], error: error && error.message ? error.message : String(error) });
  }
}

const averageScore = clamp(results.reduce((sum, item) => sum + (item.finalScore || 0), 0) / Math.max(1, results.length));
const failed = results.filter((item) => !item.ok || item.blockers.length || item.finalScore < 6.5);
const report = {
  publicVersion: 'Version 0.1 - Alpha',
  health,
  urls: urls.length,
  averageScore,
  readiness: failed.length === 0 && averageScore >= 7 ? 'multi-site-preflight-pass' : 'multi-site-needs-hardening',
  failed,
  results,
  note: 'This benchmark checks multi-site payload stability only. It does not replace Figma visual validation.'
};

console.log(JSON.stringify(report, null, 2));
if (failed.length || averageScore < 6.5) process.exitCode = 2;
