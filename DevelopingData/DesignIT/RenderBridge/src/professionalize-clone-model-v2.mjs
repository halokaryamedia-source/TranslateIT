import { professionalizeCloneModel as baseProfessionalize } from './professionalize-clone-model.mjs';

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function sectionName(sectionId, sections) { return sections.find((s) => s.id === sectionId)?.name || 'Unsectioned'; }

export function professionalizeCloneModelV2(cloneModel) {
  const model = baseProfessionalize(cloneModel);
  const counters = new Map();
  for (const layer of model.layers || []) {
    if (layer.role !== 'component-slice') continue;
    const key = layer.sectionId || 'root';
    const next = (counters.get(key) || 0) + 1;
    counters.set(key, next);
    const num = String(next).padStart(2, '0');
    const label = clean(layer.alt || layer.originalName || layer.name).slice(0, 44);
    layer.name = `Visual Block ${num}${label ? ' / ' + label : ''}`;
    layer.groupPath = [sectionName(layer.sectionId, model.sections || []), '05 Visual Blocks'];
    layer.layerTree = { section: sectionName(layer.sectionId, model.sections || []), family: 'Visual Blocks', editable: true };
  }
  const visualBlockLayers = (model.layers || []).filter((layer) => layer.role === 'component-slice').length;
  const cardGroups = model.diagnostics?.cardComponentGroups || new Set((model.layers || []).filter((layer) => layer.componentGroup?.role === 'card').map((layer) => layer.componentGroup.id)).size;
  const cardGroupedLayers = model.diagnostics?.cardGroupedLayers || (model.layers || []).filter((layer) => layer.componentGroup?.role === 'card').length;
  model.uiLibrary = { ...(model.uiLibrary || {}), layerNaming: 'professional-semantic-v2-card-and-visual-blocks', layerTree: 'hybrid-section-cards-visual-blocks-v2', hybridEditableMode: 'component-slices-plus-editable-text', cardComponentGroups: cardGroups };
  model.diagnostics = { ...(model.diagnostics || {}), layerNaming: 'professional-semantic-v2-card-and-visual-blocks', layerTree: 'hybrid-section-cards-visual-blocks-v2', visualBlockLayers, cardComponentGroups: cardGroups, cardGroupedLayers };
  model.professionalLayerTree = { ...(model.professionalLayerTree || {}), version: 'hybrid-section-cards-visual-blocks-v2', visualBlockLayers, cardComponentGroups: cardGroups };
  return model;
}
