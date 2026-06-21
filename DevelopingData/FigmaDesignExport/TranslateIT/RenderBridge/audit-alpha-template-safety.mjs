const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function typeOf(section) {
  const raw = clean(section.templateIntent || section.intent || section.role).toLowerCase();
  if (raw.includes('header')) return 'header';
  if (raw.includes('hero')) return 'hero';
  if (raw.includes('gallery') || raw.includes('grid')) return 'gallery';
  if (raw.includes('footer')) return 'footer';
  return 'content';
}

function sectionTexts(section) {
  return (section.layers || [])
    .filter((layer) => layer.type === 'text')
    .map((layer) => clean(layer.text || layer.name))
    .filter(Boolean);
}

function sectionImages(section) {
  return (section.layers || []).filter((layer) => layer.type === 'image');
}

function analyze(payload) {
  const plan = payload.rebuildPlan || {};
  const sections = Array.isArray(plan.sections) && plan.sections.length ? plan.sections : payload.sections || [];
  const issues = [];
  const warnings = [];

  if (!payload.screenshot || !payload.screenshot.base64) issues.push('Missing screenshot reference.');
  if (!sections.length) issues.push('Missing rebuild sections.');

  sections.forEach((section, index) => {
    const type = typeOf(section);
    const texts = sectionTexts(section);
    const images = sectionImages(section);
    const longTexts = texts.filter((text) => text.length > 220);

    if (!section.templateIntent) warnings.push(`Section ${index + 1}: missing templateIntent, fallback will be used.`);
    if (texts.length > 10) warnings.push(`Section ${index + 1}: many text nodes (${texts.length}); template may need truncation.`);
    if (longTexts.length) warnings.push(`Section ${index + 1}: long text detected (${longTexts.length}); overflow risk.`);
    if (type === 'hero' && texts.join(' ').length > 420) warnings.push(`Section ${index + 1}: hero text is dense; heading/body may need stronger truncation.`);
    if (type === 'gallery' && images.length > 6) warnings.push(`Section ${index + 1}: gallery has many images; only first cards should be used.`);
    if (type === 'header' && texts.length > 8) warnings.push(`Section ${index + 1}: header has many nav labels; nav row may need collapse.`);
    if (type === 'footer' && texts.join(' ').length > 520) warnings.push(`Section ${index + 1}: footer text is dense; compact footer required.`);
  });

  const safetyScore = Math.max(0, Math.min(10, 8 - issues.length * 2 - warnings.length * 0.35));

  return {
    ok: issues.length === 0,
    targetUrl,
    publicVersion: 'Version 0.1 - Alpha',
    sections: sections.length,
    issues,
    warnings,
    safetyScore: Math.round(safetyScore * 10) / 10,
    readiness: safetyScore >= 7 ? 'usable-alpha-risk' : safetyScore >= 5 ? 'needs-template-hardening' : 'not-safe-yet',
    note: 'This is a pre-Figma safety audit. It does not replace visual validation.'
  };
}

const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const result = analyze(payload);
console.log(JSON.stringify(result, null, 2));
if (!result.ok || result.safetyScore < 5) process.exitCode = 2;
