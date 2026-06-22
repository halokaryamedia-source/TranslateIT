function list(value) { return Array.isArray(value) ? value : []; }
function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function scaleRect(rect = {}, factor = 1, yOffset = 0) { return { x: Math.round(n(rect.x) * factor), y: Math.round(n(rect.y) * factor + yOffset), w: Math.max(1, Math.round(n(rect.w, 1) * factor)), h: Math.max(1, Math.round(n(rect.h, 1) * factor)) }; }
function modeFor(width) { return width <= 480 ? 'mobile' : width <= 900 ? 'tablet' : 'desktop'; }
function stackSection(frame, width, cursorY) {
  const sourceWidth = Math.max(1, n(frame.rect?.w, width));
  const factor = Math.min(1, width / sourceWidth);
  const next = clone(frame);
  const scaledHeight = Math.max(80, Math.round(n(frame.rect?.h, 200) * factor));
  next.rect = { x: 0, y: cursorY, w: width, h: scaledHeight };
  const transformLayer = (layer) => ({ ...layer, rect: scaleRect(layer.rect || {}, factor, -n(frame.rect?.y, 0) * factor) });
  next.directChildren = list(next.directChildren).map(transformLayer);
  next.children = list(next.children).map(transformLayer);
  next.groups = list(next.groups).map((group) => ({ ...group, rect: scaleRect(group.rect || {}, factor, -n(frame.rect?.y, 0) * factor), children: list(group.children).map(transformLayer) }));
  next.responsiveMode = modeFor(width);
  next.responsiveScale = Number(factor.toFixed(4));
  return next;
}
function buildVariant(plan, width) {
  let y = 0;
  const frames = list(plan.frames).map((frame) => { const next = stackSection(frame, width, y); y += next.rect.h; return next; });
  return { mode: modeFor(width), width, height: Math.max(640, y), frames };
}
export function buildResponsiveRenderPlan(figmaRenderPlan, widths = [1024, 768, 390]) {
  const desktopWidth = n(figmaRenderPlan?.page?.width, 1440);
  const variants = widths.map((width) => buildVariant(figmaRenderPlan || {}, width));
  return { version: 'responsive-render-plan-v1', sourceWidth: desktopWidth, status: variants.length ? 'ready' : 'missing', variants, diagnostics: { variants: variants.length, widths, strategy: 'section-stack-scale-from-desktop-render-plan' } };
}
