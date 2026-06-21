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

function isDark(hex) {
  const raw = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) return false;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 95;
}

function isLight(hex) {
  const raw = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(raw)) return false;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 210;
}

function isAccent(hex) {
  const h = String(hex || '').toLowerCase();
  return /^#[0-9a-f]{6}$/.test(h) && !isDark(h) && !isLight(h);
}

function inferProfile(payload) {
  const plan = payload.rebuildPlan || {};
  const tokens = plan.tokens || {};
  const sections = Array.isArray(plan.sections) ? plan.sections : [];
  const colors = Array.isArray(tokens.colors) ? tokens.colors : [];
  const typography = Array.isArray(tokens.typography) ? tokens.typography : [];
  const spacing = Array.isArray(tokens.spacing) ? tokens.spacing : [];
  const radius = Array.isArray(tokens.radius) ? tokens.radius : [];
  const hints = plan.qualityHints || {};
  const allText = sections.flatMap((section) => Array.isArray(section.priorityText) ? section.priorityText : []).map((item) => clean(item.text)).join(' ').toLowerCase();

  const profile = {
    paletteRole: {
      primary: colors.find(isAccent) || '#2563EB',
      dark: colors.find(isDark) || '#0B1020',
      light: colors.find(isLight) || '#F8FAFC',
      neutral: '#64748B'
    },
    tone: /museum|culture|education|creative|art|project|team|community/.test(allText) ? 'creative-institutional' : /shop|buy|pricing|product|sale/.test(allText) ? 'commercial-product' : 'general-professional',
    layoutStrategy: sections.some((section) => section.templateIntent === 'gallery') ? 'editorial-grid' : sections.some((section) => section.templateIntent === 'hero') ? 'landing-page' : 'structured-content',
    densityStrategy: Number(hints.denseSectionCount || 0) || Number(hints.overflowRiskCount || 0) ? 'controlled-truncation' : 'balanced-airy',
    componentStrategy: count(plan.componentBlueprints) >= 6 ? 'component-rich' : 'component-basic',
    contentStrategy: sections.every((section) => Array.isArray(section.priorityText)) ? 'priority-text-driven' : 'fallback-text-driven'
  };

  const blockers = [];
  if (payload.publicVersion !== 'Version 0.1 - Alpha') blockers.push('wrong-public-version');
  if (payload.mode !== 'translateit-design-clone-alpha') blockers.push('wrong-alpha-mode');
  if (!colors.length) blockers.push('missing-color-tokens');
  if (!typography.length) blockers.push('missing-typography-tokens');
  if (spacing.length < 6) blockers.push('weak-spacing-system');
  if (radius.length < 2) blockers.push('weak-radius-system');
  if (!sections.length) blockers.push('missing-sections');
  if (!sections.every((section) => section.suggestedLayout)) blockers.push('missing-layout-strategy');
  if (!sections.every((section) => Array.isArray(section.priorityText))) blockers.push('missing-priority-text');
  if (count(plan.componentBlueprints) < 4) blockers.push('weak-component-strategy');

  const score = clamp(8.2 - blockers.length * 0.7 - Math.min(1.2, Number(hints.overflowRiskCount || 0) * 0.2));

  return {
    publicVersion: 'Version 0.1 - Alpha',
    targetUrl,
    score,
    readiness: blockers.length === 0 && score >= 7.5 ? 'design-profile-ready' : 'design-profile-needs-hardening',
    profile,
    blockers,
    metrics: {
      colors: count(colors),
      typography: count(typography),
      spacing: count(spacing),
      radius: count(radius),
      sections: count(sections),
      componentBlueprints: count(plan.componentBlueprints),
      overflowRiskCount: Number(hints.overflowRiskCount || 0),
      denseSectionCount: Number(hints.denseSectionCount || 0)
    },
    note: 'Design Profile Gate checks whether the payload has enough semantic and visual direction for a professional Figma draft. It does not replace Figma visual validation.'
  };
}

const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const report = inferProfile(payload);
console.log(JSON.stringify(report, null, 2));
if (report.blockers.length || report.score < 7) process.exitCode = 2;
