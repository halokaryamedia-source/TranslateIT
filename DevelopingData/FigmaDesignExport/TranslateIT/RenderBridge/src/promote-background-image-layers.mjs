function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function rawIndexFromElement(element) { const match = String(element.id || '').match(/^el-(\d+)$/); return match ? Number(match[1]) : null; }
function backgroundAssetFor(element, assets) { const rawIndex = rawIndexFromElement(element); if (rawIndex == null) return null; return (assets || []).find((asset) => asset.kind === 'background-image' && asset.rawIndex === rawIndex) || null; }
function hasBackgroundImage(element) { const bg = clean(element.style?.backgroundImage || ''); return bg && bg !== 'none' && /url\(/i.test(bg); }
function imageFitFromBackground(element, asset) { const size = clean(element.style?.backgroundSize || 'cover'); return { objectFit: /contain/i.test(size) ? 'contain' : 'cover', objectPosition: clean(element.style?.backgroundPosition || asset?.objectPosition || '50% 50%'), naturalWidth: asset?.naturalWidth || asset?.width || element.rect?.w || 0, naturalHeight: asset?.naturalHeight || asset?.height || element.rect?.h || 0, renderedRatio: element.rect?.w && element.rect?.h ? Number((element.rect.w / element.rect.h).toFixed(4)) : 0, naturalRatio: asset?.width && asset?.height ? Number((asset.width / asset.height).toFixed(4)) : 0, aspectDrift: 0 } }
export function promoteBackgroundImageLayers(model) {
  const assets = model.assets || [];
  let promoted = 0;
  const elements = (model.elements || []).map((element) => {
    if (!['container', 'decorative'].includes(element.role) && element.type !== 'container') return element;
    if (!hasBackgroundImage(element)) return element;
    const asset = backgroundAssetFor(element, assets);
    if (!asset) return element;
    promoted += 1;
    return { ...element, type: 'image', role: 'background-image', name: `Background Image / ${clean(asset.name || element.name).slice(0, 44) || promoted}`, assetId: asset.id, alt: clean(asset.name || element.alt || ''), imageFit: imageFitFromBackground(element, asset), layout: { clip: true, objectFit: imageFitFromBackground(element, asset).objectFit, objectPosition: imageFitFromBackground(element, asset).objectPosition, preserveAspectIntent: true }, sourceReason: 'css-background-image-captured-as-editable-image' };
  });
  const sections = (model.sections || []).map((section) => ({ ...section, elementIds: elements.filter((item) => item.sectionId === section.id).map((item) => item.id) }));
  return { ...model, elements, sections, diagnostics: { ...(model.diagnostics || {}), backgroundImageLayers: promoted } };
}
