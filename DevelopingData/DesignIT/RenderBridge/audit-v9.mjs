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
  items.forEach((item) => { const k = fn(item); if (k) seen.add(k); });
  return seen.size;
}

function score(payload) {
  const layers = Array.isArray(payload.layers) ? payload.layers : [];
  const sections = Array.isArray(payload.sections) ? payload.sections : [];
  const components = sections.flatMap((s) => s.components || []);
  const texts = layers.filter((l) => l.type === 'text');
  const images = layers.filter((l) => l.type === 'image');
  const buttons = layers.filter((l) => l.role === 'button-bg' || l.role === 'button-label');
  const links = uniqueCount(texts.filter((l) => l.role === 'link'), (l) => key(l.text || l.name));
  const headings = uniqueCount(texts.filter((l) => l.role === 'heading'), (l) => key(l.text || l.name));
  const textStyles = uniqueCount(texts, (l) => {
    const s = l.style || {};
    return [l.role, s.fontSize, s.fontWeight, s.color].join('|');
  });
  const usefulComponents = components.filter((c) => (c.layers || []).length >= 1).length;
  const hasScreenshot = !!(payload.screenshot && payload.screenshot.base64);

  const screenshotScore = hasScreenshot ? 10 : 0;
  const libraryScore = clamp(3 + Math.min(textStyles, 8) / 8 * 2 + Math.min(links, 8) / 8 * 1.5 + Math.min(buttons.length, 8) / 8 * 1.5 + Math.min(images.length, 8) / 8 * 1.5 + Math.min(sections.length, 8) / 8 * 1.5, 0, 10);
  const editableScore = clamp(3 + Math.min(texts.length, 70) / 70 * 2.5 + Math.min(images.length, 8) / 8 * 2 + Math.min(sections.length, 8) / 8 * 1.5 + Math.min(usefulComponents, 14) / 14 * 1, 0, 10);
  const coverageScore = clamp(3 + Math.min(texts.length, 70) / 70 * 2.5 + Math.min(headings, 6) / 6 * 1.5 + Math.min(links, 8) / 8 * 1.5 + Math.min(images.length, 8) / 8 * 1.5, 0, 10);
  const finalScore = Math.min(screenshotScore, libraryScore, editableScore, coverageScore);

  return {
    screenshotScore: round(screenshotScore),
    libraryScore: round(libraryScore),
    editableScore: round(editableScore),
    coverageScore: round(coverageScore),
    finalScore: round(finalScore),
    passesV9UsefulOutput: finalScore >= 9,
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
      textStyles,
      hasScreenshot
    }
  };
}

const health = await getJson(`${bridge}/health`);
const payload = await getJson(`${bridge}/render?url=${encodeURIComponent(targetUrl)}`);
const result = score(payload);
console.log(JSON.stringify({ health, targetUrl, title: payload.title, diagnostics: payload.diagnostics, scores: result }, null, 2));
if (!result.passesV9UsefulOutput) process.exitCode = 2;
