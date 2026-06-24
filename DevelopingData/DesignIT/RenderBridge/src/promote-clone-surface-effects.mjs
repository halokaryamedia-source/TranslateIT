function effectFields(style = {}) { return { borderWidth: style.borderWidth || 0, borderColor: style.borderColor || '', borderStyle: style.borderStyle || '', boxShadow: style.boxShadow || '', filter: style.filter || '', backdropFilter: style.backdropFilter || '' }; }
function hasEffect(style = {}) { return Number(style.borderWidth || 0) > 0 || !!style.boxShadow || !!style.filter || !!style.backdropFilter; }
export function promoteCloneSurfaceEffects(cloneModel, designModel) {
  const elementById = new Map((designModel.elements || []).map((element) => [element.id, element]));
  let strokeLayers = 0;
  let shadowLayers = 0;
  let filterLayers = 0;
  const layers = (cloneModel.layers || []).map((layer) => {
    const elementId = String(layer.id || '').replace(/^layer-/, '');
    const source = elementById.get(elementId);
    if (!source || !source.style || !hasEffect(source.style)) return layer;
    const fields = effectFields(source.style);
    if (Number(fields.borderWidth || 0) > 0 && fields.borderColor) strokeLayers += 1;
    if (fields.boxShadow) shadowLayers += 1;
    if (fields.filter || fields.backdropFilter) filterLayers += 1;
    return { ...layer, style: { ...(layer.style || {}), ...fields }, visualEffects: { ...(layer.visualEffects || {}), ...fields, source: 'css-computed-style' } };
  });
  return { ...cloneModel, layers, diagnostics: { ...(cloneModel.diagnostics || {}), cloneStrokeLayers: strokeLayers, cloneShadowLayers: shadowLayers, cloneFilterLayers: filterLayers } };
}
