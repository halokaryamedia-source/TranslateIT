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
  const components = sections.flatMap((section) => section.components || []);
  const texts = layers.filter((layer) => layer.type === 'text');
  const images = layers.filter((layer) => layer.type === 'image');
  const buttons = layers.filter((layer) => layer.role === 'button-bg' || layer.role === 'button-label');
  const links = uniqueCount(texts.filter((layer) => layer.role === 'link'), (layer) => key(layer.text || layer.name));
  const headings = uniqueCount(texts.filter((layer) => layer.role === 'heading'), (layer) => key(layer.text || layer.name));
  const styles = uniqueCount(texts, (layer) => {
    const s = layer.style || {};
    return [layer.role, s.fontSize, s.fontWeight, s.color].join('|');
  });
  const colors = uniqueCount(layers, (layer) => {
    const s = layer.style || {};
    return [s.color, s.backgroundColor, s.borderTopColor, s.borderBottomColor].filter(Boolean).join('|');
  });
  const usefulComponents = components.filter((component) => (component.layers || []).length >= 1).length;
  const hasScreenshot = !!(payload.screenshot && payload.screenshot.base64);
  const hasRules = Array.isArray(payload.outputRules) && payload.outputRules.length >= 3;

  const screenshotPurityScore = hasScreenshot ? 10 : 0;
  const rebuildPlanReadinessScore = clamp(2.5 + Math.min(sections.length, 8) / 8 * 3 + Math.min(headings, 6) / 6 * 2 + Math.min(links, 8) / 8 * 1.5 + Math.min(usefulComponents, 12) / 12 * 1, 0, 10);
  const uiLibraryStructureScore = clamp(2 + Math.min(colors, 12) / 12 * 1.8 + Math.min(styles, 10) / 10 * 1.8 + Math.min(links, 8) / 8 * 1.2 + Math.min(buttons.length, 8) / 8 * 1.2 + Math.min(images.length, 8) / 8 * 1.2 + Math.min(sections.length, 8) / 8 * 1.8, 0, 10);
  const editableDraftScore = clamp(2.5 + Math.min(texts.length, 80) / 80 * 2.5 + Math.min(images.length, 10) / 10 * 2 + Math.min(sections.length, 8) / 8 * 2 + Math.min(usefulComponents, 12) / 12 * 1, 0, 10);
  const workflowDisciplineScore = hasRules ? 9.5 : 6;
  const finalScore = Math.min(screenshotPurityScore, rebuildPlanReadinessScore, uiLibraryStructureScore, editableDraftScore, workflowDisciplineScore);

  return {
    screenshotPurityScore: round(screenshotPurityScore),
    rebuildPlanReadinessScore: round(rebuildPlanReadinessScore),
    uiLibraryStructureScore: round(uiLibraryStructureScore),
    editableDraftScore: round(editableDraftScore),
    workflowDisciplineScore: round(workflowDisciplineScore),
    finalScore: round(finalScore),
    passesProfessionalDesignClone: finalScore >= 9,
    rule: 'Final score is the lowest category score. A good screenshot cannot hide weak UI library or editable structure.',
    basis: {
      mode: payload.mode,
      adapter: payload.adapter,
      layers: layers.length,
      sections: sections.length,
      components: components.length,
      usefulComponents,
      texts: texts.length,
      images: images.length,
      buttons: buttons.length,
      links,
      headings,
      styles,
      colors,
      hasScreenshot,
      hasOutputRules: hasRules
    }
  };
}

const health = await getJson(`${bridge}/health`);
const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const scores = score(payload);
console.log(JSON.stringify({ health, targetUrl, title: payload.title, diagnostics: payload.diagnostics, outputRules: payload.outputRules || [], scores }, null, 2));
if (!scores.passesProfessionalDesignClone) process.exitCode = 2;
