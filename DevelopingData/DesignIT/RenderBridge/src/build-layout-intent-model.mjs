function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function hasSection(blueprint, type) { return (blueprint.sections || []).some((section) => section.type === type); }
function confidence(base, checks) { return Math.min(1, base + checks.reduce((sum, item) => sum + (item[0] ? item[1] : 0), 0)); }
export function buildLayoutIntentModel({ designBlueprint, visualIntentModel, cloneModel }) {
  const bp = designBlueprint || {};
  const visual = visualIntentModel || {};
  const layers = cloneModel?.layers || [];
  const textLayers = layers.filter((layer) => layer.type === 'text' && clean(layer.text));
  const imageLayers = layers.filter((layer) => layer.type === 'image' && layer.role !== 'component-slice');
  const usefulVisual = !!visual.diagnostics?.hasUsefulVisualParse;
  const intents = [
    { id: 'header', type: 'header', confidence: confidence(0.25, [[hasSection(bp, 'header'), 0.35], [visual.diagnostics?.headerCandidates > 0, 0.25], [usefulVisual, 0.15]]), required: true },
    { id: 'hero', type: 'hero', confidence: confidence(0.2, [[hasSection(bp, 'hero'), 0.35], [textLayers.length >= 3, 0.15], [imageLayers.length >= 1, 0.15], [usefulVisual, 0.15]]), required: true },
    { id: 'content-grid', type: 'content-grid', confidence: confidence(0.2, [[hasSection(bp, 'content-grid'), 0.35], [textLayers.length >= 8, 0.15], [imageLayers.length >= 2, 0.15], [usefulVisual, 0.15]]), required: true },
    { id: 'footer', type: 'footer', confidence: confidence(0.25, [[hasSection(bp, 'footer'), 0.35], [visual.diagnostics?.footerCandidates > 0, 0.25], [usefulVisual, 0.15]]), required: true }
  ];
  const blockers = [];
  for (const intent of intents) if (intent.required && intent.confidence < 0.7) blockers.push({ code: `low-confidence-${intent.type}`, message: `Layout intent confidence for ${intent.type} is too low: ${intent.confidence}` });
  if (!usefulVisual) blockers.push({ code: 'missing-useful-visual-parse', message: 'External visual parser did not provide useful UI regions. DOM-only intent is blocked from Figma test.' });
  return { version: 'layout-intent-model-v1', status: blockers.length ? 'not-ready' : 'ready', figmaTestAllowed: blockers.length === 0, intents, diagnostics: { usefulVisual, textLayers: textLayers.length, imageLayers: imageLayers.length, blockers: blockers.length }, blockers };
}
