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
  model.uiLibrary = { ...(model.uiLibrary || {}), layerNaming: 'professional-semantic-v2', layerTree: 'hybrid-section-visual-blocks-v1', hybridEditableMode: 'component-slices-plus-editable-text' };
  model.diagnostics = { ...(model.diagnostics || {}), layerNaming: 'professional-semantic-v2', layerTree: 'hybrid-section-visual-blocks-v1', visualBlockLayers: (model.layers || []).filter((layer) => layer.role === 'component-slice').length };
  model.professionalLayerTree = { ...(model.professionalLayerTree || {}), version: 'hybrid-section-visual-blocks-v1', visualBlockLayers: model.diagnostics.visualBlockLayers };
  return model;
}
