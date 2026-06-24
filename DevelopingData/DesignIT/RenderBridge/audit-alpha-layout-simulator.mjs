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

function templateHeight(section) {
  const type = section.templateIntent || 'content';
  if (type === 'header') return 132;
  if (type === 'hero') return 600;
  if (type === 'gallery') return 520;
  if (type === 'footer') return 188;
  return 430;
}

function textPressure(section) {
  const texts = Array.isArray(section.priorityText) ? section.priorityText : [];
  const total = texts.reduce((sum, item) => sum + clean(item.text || item).length, 0);
  const budget = section.contentBudget || {};
  const allowed = Number(budget.headingChars || 80) + Number(budget.bodyChars || 220) + 120;
  return allowed ? total / allowed : 1;
}

function simulate(sections) {
  let y = 0;
  const gap = 30;
  return sections.map((section, index) => {
    const h = templateHeight(section);
    const pressure = textPressure(section);
    const item = {
      index: index + 1,
      name: section.name || `Section ${index + 1}`,
      templateIntent: section.templateIntent || 'content',
      suggestedLayout: section.suggestedLayout || 'unknown',
      y,
      height: h,
      bottom: y + h,
      density: section.density || 'unknown',
      textPressure: Math.round(pressure * 100) / 100,
      overflowRisk: !!section.overflowRisk || pressure > 1.25,
      priorityTextCount: count(section.priorityText),
      mediaSlots: Number(section.mediaSlots || 0)
    };
    y += h + gap;
    return item;
  });
}

function analyze(payload) {
  const plan = payload.rebuildPlan || {};
  const sections = Array.isArray(plan.sections) ? plan.sections : [];
  const simulated = simulate(sections);
  const blockers = [];
  const warnings = [];

  if (!sections.length) blockers.push('No semantic sections available for layout simulation.');
  if (!sections.every((section) => section.templateIntent)) blockers.push('Missing templateIntent in one or more sections.');
  if (!sections.every((section) => section.contentBudget)) blockers.push('Missing contentBudget in one or more sections.');
  if (!sections.every((section) => Array.isArray(section.priorityText))) blockers.push('Missing priorityText in one or more sections.');

  const overflowItems = simulated.filter((item) => item.overflowRisk);
  const weakTextItems = simulated.filter((item) => item.priorityTextCount === 0);
  const unknownLayoutItems = simulated.filter((item) => item.suggestedLayout === 'unknown');
  const totalHeight = simulated.length ? simulated[simulated.length - 1].bottom : 0;

  if (overflowItems.length) warnings.push(`${overflowItems.length} simulated section(s) may still need stronger truncation.`);
  if (weakTextItems.length) warnings.push(`${weakTextItems.length} section(s) have no priority text.`);
  if (unknownLayoutItems.length) warnings.push(`${unknownLayoutItems.length} section(s) have unknown layout strategy.`);
  if (totalHeight > 7200) warnings.push('Generated canvas may become too tall for quick review.');

  const structureScore = clamp(8.4 - blockers.length * 1.1 - overflowItems.length * 0.25 - weakTextItems.length * 0.5 - unknownLayoutItems.length * 0.35);

  return {
    publicVersion: 'Version 0.1 - Alpha',
    targetUrl,
    score: structureScore,
    readiness: blockers.length === 0 && structureScore >= 7.5 ? 'layout-simulation-ready' : 'layout-needs-hardening',
    blockers,
    warnings,
    summary: {
      sections: sections.length,
      simulatedCanvasHeight: totalHeight,
      overflowRiskSections: overflowItems.length,
      weakTextSections: weakTextItems.length,
      unknownLayoutSections: unknownLayoutItems.length
    },
    simulated,
    note: 'This simulates the professional Alpha Figma layout structure. It does not replace real Figma visual validation.'
  };
}

const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const report = analyze(payload);
console.log(JSON.stringify(report, null, 2));
if (report.blockers.length || report.score < 7) process.exitCode = 2;
