function num(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function rect(layer = {}) { const r = layer.rect || {}; return { x: num(r.x), y: num(r.y), w: Math.max(1, num(r.w, 1)), h: Math.max(1, num(r.h, 1)) }; }
function overlapY(a, b) { return Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); }
function overlapX(a, b) { return Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)); }
function inferDirection(children) {
  if (children.length < 2) return 'absolute';
  const sortedY = children.slice().sort((a, b) => a.rect.y - b.rect.y);
  const sortedX = children.slice().sort((a, b) => a.rect.x - b.rect.x);
  const verticalOverlap = sortedX.slice(1).reduce((sum, item, i) => sum + overlapY(sortedX[i].rect, item.rect), 0);
  const horizontalOverlap = sortedY.slice(1).reduce((sum, item, i) => sum + overlapX(sortedY[i].rect, item.rect), 0);
  if (verticalOverlap > horizontalOverlap * 1.4) return 'horizontal';
  if (horizontalOverlap > verticalOverlap * 1.4) return 'vertical';
  return 'absolute';
}
function gapsFor(children, direction) {
  const sorted = children.slice().sort((a, b) => direction === 'horizontal' ? a.rect.x - b.rect.x : a.rect.y - b.rect.y);
  const gaps = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1].rect;
    const next = sorted[i].rect;
    gaps.push(direction === 'horizontal' ? next.x - (prev.x + prev.w) : next.y - (prev.y + prev.h));
  }
  const useful = gaps.filter((gap) => gap >= 0 && gap < 240);
  if (!useful.length) return 0;
  return Math.round(useful.reduce((sum, gap) => sum + gap, 0) / useful.length);
}
function inferPadding(sectionRect, children) {
  if (!children.length) return { left: 0, right: 0, top: 0, bottom: 0 };
  const minX = Math.min(...children.map((child) => child.rect.x));
  const minY = Math.min(...children.map((child) => child.rect.y));
  const maxX = Math.max(...children.map((child) => child.rect.x + child.rect.w));
  const maxY = Math.max(...children.map((child) => child.rect.y + child.rect.h));
  return {
    left: Math.max(0, Math.round(minX)),
    top: Math.max(0, Math.round(minY)),
    right: Math.max(0, Math.round(sectionRect.w - maxX)),
    bottom: Math.max(0, Math.round(sectionRect.h - maxY))
  };
}
function normalizeChild(layer) {
  const r = rect(layer);
  return {
    id: clean(layer.id || layer.name),
    kind: clean(layer.kind || layer.type || 'layer'),
    role: clean(layer.role || ''),
    name: clean(layer.name || layer.id || 'Layer'),
    rect: r,
    canAutoLayout: !['image', 'shape'].includes(clean(layer.kind || layer.type)) || r.w < 900,
    fixedSize: clean(layer.kind || layer.type) === 'image'
  };
}
export function buildFigmaAutoLayoutPlan(figmaRenderPlan) {
  const frames = (figmaRenderPlan?.frames || []).map((frame) => {
    const sectionRect = frame.rect || { x: 0, y: 0, w: 1, h: 1 };
    const children = (frame.children || []).map(normalizeChild).filter((child) => child.rect.w > 1 && child.rect.h > 1);
    const direction = inferDirection(children);
    const padding = inferPadding(sectionRect, children);
    const gap = direction === 'absolute' ? 0 : gapsFor(children, direction);
    const autoLayoutAllowed = direction !== 'absolute' && children.length >= 2;
    return {
      id: frame.id,
      name: frame.name,
      role: frame.role,
      rect: sectionRect,
      direction,
      autoLayoutAllowed,
      padding,
      gap,
      children: children.map((child) => ({ id: child.id, name: child.name, kind: child.kind, role: child.role, fixedSize: child.fixedSize, canAutoLayout: child.canAutoLayout })),
      warnings: autoLayoutAllowed ? [] : ['kept-absolute-positioning']
    };
  });
  const autoFrames = frames.filter((frame) => frame.autoLayoutAllowed).length;
  return {
    version: 'figma-auto-layout-plan-v1',
    engine: 'yoga-layout-adapter',
    status: frames.length ? 'pass' : 'fail',
    frames,
    diagnostics: {
      frames: frames.length,
      autoLayoutFrames: autoFrames,
      absoluteFrames: frames.length - autoFrames,
      note: 'Yoga dependency is installed; this adapter creates a safe auto-layout plan before mutating Figma frames.'
    }
  };
}
