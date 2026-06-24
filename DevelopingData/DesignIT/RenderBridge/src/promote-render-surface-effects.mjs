function effectFields(style = {}) { return { borderWidth: Number(style.borderWidth || 0), borderColor: style.borderColor || '', borderStyle: style.borderStyle || '', boxShadow: style.boxShadow || '', filter: style.filter || '', backdropFilter: style.backdropFilter || '' }; }
function hasEffect(style = {}) { const e = effectFields(style); return (e.borderWidth > 0 && e.borderColor) || !!e.boxShadow || !!e.filter || !!e.backdropFilter; }
function apply(layer, sourceById, counters) { const source = sourceById.get(layer.id); if (!source || !source.style || !hasEffect(source.style)) return layer; const effects = effectFields(source.style); if (effects.borderWidth > 0 && effects.borderColor) counters.stroke += 1; if (effects.boxShadow) counters.shadow += 1; if (effects.filter || effects.backdropFilter) counters.filter += 1; return { ...layer, style: { ...(layer.style || {}), ...effects }, visualEffects: { ...(layer.visualEffects || {}), ...effects, source: 'clone-model-css-effects' } }; }
export function promoteRenderSurfaceEffects(renderPlan, cloneModel) {
  const sourceById = new Map((cloneModel.layers || []).map((layer) => [layer.id, layer]));
  const counters = { stroke: 0, shadow: 0, filter: 0 };
  const frames = (renderPlan.frames || []).map((frame) => {
    const directChildren = (frame.directChildren || []).map((layer) => apply(layer, sourceById, counters));
    const groups = (frame.groups || []).map((group) => ({ ...group, children: (group.children || []).map((layer) => apply(layer, sourceById, counters)) }));
    const children = (frame.children || []).map((layer) => apply(layer, sourceById, counters));
    return { ...frame, directChildren, groups, children };
  });
  return { ...renderPlan, frames, diagnostics: { ...(renderPlan.diagnostics || {}), surfaceStrokeLayers: counters.stroke, surfaceShadowLayers: counters.shadow, surfaceFilterLayers: counters.filter, surfaceEffects: 'preserved-in-render-plan' } };
}
