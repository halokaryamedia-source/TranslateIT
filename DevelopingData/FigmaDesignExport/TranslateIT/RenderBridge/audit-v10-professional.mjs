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
  items.forEach((item) => { const value = fn(item); if (value) seen.add(value); });
  return seen.size;
}

function score(payload) {
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const components = sections.flatMap((section) => section.components || []);
  const texts = layers.filter((layer) => layer.type === 'text');
  const images = layers.filter((layer) => layer.type === 'image');
  const boxes = layers.filter((layer) => layer.type === 'box');
  const links = uniqueCount(texts.filter((layer) => layer.role === 'link'), (layer) => key(layer.text || layer.name));
  const headings = uniqueCount(texts.filter((layer) => layer.role === 'heading'), (layer) => key(layer.text || layer.name));
  const buttons = layers.filter((layer) => layer.role === 'button-bg' || layer.role === 'button-label').length;
  const textStyles = uniqueCount(texts, (layer) => {
    const style = layer.style || {};
    return [layer.role, style.fontSize, style.fontWeight, style.color].join('|');
  });
  const colors = uniqueCount(layers, (layer) => {
    const style = layer.style || {};
    return [style.color, style.backgroundColor, style.borderTopColor, style.borderBottomColor].join('|');
  });
  const usefulComponents = components.filter((component) => (component.layers || []).length >= 1).length;
  const hasScreenshot = !!(payload.screenshot && payload.screenshot.base64);
  const hasOutputContract = Array.isArray(payload.outputRules) && payload.outputRules.length >= 4;

  const visualReferenceScore = hasScreenshot ? 10 : 0;
  const layoutUnderstandingScore = clamp(2.5 + Math.min(sections.length, 8) / 8 * 3 + Math.min(usefulComponents, 16) / 16 * 3 + Math.min(headings + links, 12) / 12 * 1.5, 0, 10);
  const editableLayerScore = clamp(2.5 + Math.min(texts.length, 80) / 80 * 2.5 + Math.min(images.length, 10) / 10 * 2 + Math.min(boxes.length, 50) / 50 * 1.5 + Math.min(usefulComponents, 16) / 16 * 1.5, 0, 10);
  const designSystemScore = clamp(2 + Math.min(colors, 12) / 12 * 2 + Math.min(textStyles, 10) / 10 * 2 + Math.min(buttons, 8) / 8 * 1.5 + Math.min(links, 8) / 8 * 1.2 + Math.min(images.length, 8) / 8 * 1.3, 0, 10);
  const workflowScore = hasOutputContract ? 9.5 : 6;
  const finalScore = Math.min(visualReferenceScore, layoutUnderstandingScore, editableLayerScore, designSystemScore, workflowScore);

  return {
    visualReferenceScore: round(visualReferenceScore),
    layoutUnderstandingScore: round(layoutUnderstandingScore),
    editableLayerScore: round(editableLayerScore),
    designSystemScore: round(designSystemScore),
    workflowScore: round(workflowScore),
    finalScore: round(finalScore),
    passesProfessionalTarget: finalScore >= 9,
    rule: 'Professional gate: finalScore is the lowest category score. Visual reference cannot cover weak structure or editability.',
    basis: {
      mode: payload.mode,
      adapter: payload.adapter,
      layers: layers.length,
      sections: sections.length,
      components: components.length,
      usefulComponents,
      texts: texts.length,
      images: images.length,
      boxes: boxes.length,
      links,
      headings,
      buttons,
      textStyles,
      colors,
      hasScreenshot,
      hasOutputContract
    }
  };
}

const health = await getJson(`${bridge}/health`);
const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const scores = score(payload);
console.log(JSON.stringify({ health, targetUrl, title: payload.title, diagnostics: payload.diagnostics, outputRules: payload.outputRules || [], scores }, null, 2));
if (!scores.passesProfessionalTarget) process.exitCode = 2;
