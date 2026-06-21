const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

const count = (v) => Array.isArray(v) ? v.length : 0;
const clamp = (v) => Math.max(0, Math.min(10, Math.round(v * 10) / 10));
const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();

function textLength(section) {
  return (section.layers || [])
    .filter((layer) => layer.type === 'text')
    .map((layer) => clean(layer.text || layer.name).length)
    .reduce((a, b) => a + b, 0);
}

function analyze(payload) {
  const plan = payload.rebuildPlan || {};
  const tokens = plan.tokens || {};
  const planSections = Array.isArray(plan.sections) ? plan.sections : [];
  const rawSections = Array.isArray(payload.sections) ? payload.sections : [];
  const sections = planSections.length ? planSections : rawSections;
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const components = rawSections.flatMap((section) => section.components || []);

  const templateCoverage = sections.length ? sections.filter((section) => !!section.templateIntent).length / sections.length : 0;
  const denseSections = rawSections.filter((section) => textLength(section) > 900).length;
  const veryLongTextSections = rawSections.filter((section) => textLength(section) > 1400).length;

  const blockers = [];
  const warnings = [];

  if (!payload.screenshot || !payload.screenshot.base64) blockers.push('Missing pure screenshot reference.');
  if (!sections.length) blockers.push('Missing rebuild sections.');
  if (templateCoverage < 0.8) blockers.push('Weak templateIntent coverage.');
  if (count(tokens.spacing) < 6) blockers.push('Weak spacing tokens.');
  if (count(tokens.radius) < 2) blockers.push('Weak radius tokens.');
  if (count(tokens.colors) < 3) warnings.push('Color tokens are weak.');
  if (count(tokens.typography) < 3) warnings.push('Typography tokens are weak.');
  if (!components.length) warnings.push('No detected reusable components from source sections.');
  if (denseSections) warnings.push(`${denseSections} section(s) may need text truncation.`);
  if (veryLongTextSections) warnings.push(`${veryLongTextSections} section(s) have high overflow risk.`);

  const dataScore = clamp(2 + Math.min(layers.length, 160) / 160 * 2 + Math.min(sections.length, 8) / 8 * 2);
  const tokenScore = clamp(1 + Math.min(count(tokens.colors), 8) / 8 * 1.5 + Math.min(count(tokens.typography), 6) / 6 * 1.5 + Math.min(count(tokens.spacing), 8) / 8 * 1.5 + Math.min(count(tokens.radius), 4) / 4 * 1.5);
  const templateScore = clamp(2 + templateCoverage * 4 - denseSections * 0.35 - veryLongTextSections * 0.75);
  const toolingScore = clamp(7.5);
  const figmaUnknownPenalty = 1.4;
  const finalScore = clamp(Math.min(dataScore, tokenScore, templateScore, toolingScore) - figmaUnknownPenalty - blockers.length * 1.2 - warnings.length * 0.15);

  return {
    publicVersion: 'Version 0.1 - Alpha',
    targetUrl,
    readiness: blockers.length === 0 && finalScore >= 7 ? 'ready-for-first-figma-validation' : finalScore >= 5 ? 'continue-alpha-hardening' : 'not-ready',
    score: finalScore,
    scores: { dataScore, tokenScore, templateScore, toolingScore, figmaUnknownPenalty },
    blockers,
    warnings,
    basis: {
      mode: payload.mode,
      adapter: payload.adapter,
      layers: layers.length,
      rawSections: rawSections.length,
      planSections: planSections.length,
      templateCoverage: Math.round(templateCoverage * 100) + '%',
      components: components.length,
      colors: count(tokens.colors),
      typography: count(tokens.typography),
      spacing: count(tokens.spacing),
      radius: count(tokens.radius),
      denseSections,
      veryLongTextSections
    },
    note: 'Pre-test gate only. It does not replace real Figma visual validation.'
  };
}

const health = await getJson(`${bridge}/health`);
const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const report = analyze(payload);
console.log(JSON.stringify({ health, report }, null, 2));
if (report.blockers.length || report.score < 5) process.exitCode = 2;
