const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

const pct = (value) => Math.round(value * 100) / 100;
const score = (value) => Math.max(0, Math.min(10, pct(value)));

function count(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

function analyze(payload) {
  const plan = payload.rebuildPlan || {};
  const tokens = plan.tokens || {};
  const sections = Array.isArray(plan.sections) && plan.sections.length ? plan.sections : payload.sections || [];
  const diagnostics = payload.diagnostics || {};

  const templateIntentCoverage = sections.length ? sections.filter((section) => !!section.templateIntent).length / sections.length : 0;
  const screenshotScore = payload.screenshot && payload.screenshot.base64 ? 9 : 0;
  const structureScore = score(2 + Math.min(count(payload.layers), 120) / 120 * 2 + Math.min(count(sections), 8) / 8 * 2 + templateIntentCoverage * 2);
  const tokenScore = score(1 + Math.min(count(tokens.colors), 10) / 10 * 1.5 + Math.min(count(tokens.typography), 8) / 8 * 1.5 + Math.min(count(tokens.spacing), 8) / 8 * 1.5 + Math.min(count(tokens.radius), 4) / 4 * 1.5);
  const outputRuleScore = Array.isArray(payload.outputRules) && payload.outputRules.length >= 5 ? 8 : 4;
  const noFigmaPenalty = 1.5;
  const finalScore = score(Math.min(screenshotScore, structureScore, tokenScore, outputRuleScore) - noFigmaPenalty);

  const blockers = [];
  if (!payload.screenshot || !payload.screenshot.base64) blockers.push('Missing screenshot reference.');
  if (!sections.length) blockers.push('Missing rebuild sections.');
  if (templateIntentCoverage < 0.8) blockers.push('Weak templateIntent coverage.');
  if (count(tokens.spacing) < 6) blockers.push('Weak spacing tokens.');
  if (count(tokens.radius) < 2) blockers.push('Weak radius tokens.');

  return {
    publicVersion: 'Version 0.1 - Alpha',
    targetUrl,
    mode: payload.mode,
    adapter: payload.adapter,
    scores: {
      screenshotScore,
      structureScore,
      tokenScore,
      outputRuleScore,
      finalScore
    },
    readiness: finalScore >= 7 && blockers.length === 0 ? 'ready-for-figma-visual-validation' : finalScore >= 5 ? 'needs-alpha-hardening' : 'not-ready',
    blockers,
    basis: {
      layers: count(payload.layers),
      sections: count(sections),
      templateIntentCoverage: pct(templateIntentCoverage),
      colors: count(tokens.colors),
      typography: count(tokens.typography),
      spacing: count(tokens.spacing),
      radius: count(tokens.radius),
      outputRules: count(payload.outputRules),
      diagnostics
    },
    note: 'This is a pre-Figma quality gate. It does not replace visual validation in Figma.'
  };
}

const health = await getJson(`${bridge}/health`);
const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const report = analyze(payload);
console.log(JSON.stringify({ health, report }, null, 2));
if (report.blockers.length || report.scores.finalScore < 5) process.exitCode = 2;
