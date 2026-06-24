function clean(value) { return String(value || '').trim(); }
function ratio(ok, total) { return Math.round((ok / Math.max(1, total)) * 100); }

export function evaluateSectionLayerQuality(payload = {}) {
  const clone = payload.cloneModel || {};
  const sections = clone.sections || [];
  const layers = clone.layers || [];
  const namedLayers = layers.filter((layer) => clean(layer.name).length > 2).length;
  const textLayers = layers.filter((layer) => layer.type === 'text' && clean(layer.text)).length;
  const imageLayers = layers.filter((layer) => layer.type === 'image').length;
  const sectionScore = sections.length >= 4 ? 100 : ratio(sections.length, 4);
  const namingScore = ratio(namedLayers, layers.length);
  const textScore = textLayers >= 8 ? 100 : ratio(textLayers, 8);
  const imageScore = imageLayers >= 1 ? 100 : ratio(imageLayers, 1);
  const score = Math.round((sectionScore + namingScore + textScore + imageScore) / 4);
  const failures = [];
  if (sectionScore < 100) failures.push('section grouping is not enough');
  if (namingScore < 80) failures.push('layer naming needs improvement');
  if (textScore < 100) failures.push('editable text layer count is low');
  return {
    version: 'section-layer-quality-v1',
    status: failures.length ? 'not-ready' : 'ready',
    score,
    scores: { sectionScore, namingScore, textScore, imageScore },
    diagnostics: { sections: sections.length, layers: layers.length, textLayers, imageLayers, namedLayers },
    failures
  };
}
