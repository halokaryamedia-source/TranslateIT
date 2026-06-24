function list(value) { return Array.isArray(value) ? value : []; }
function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function intentForWidth(width) {
  if (width <= 430) return { mode: 'mobile', columns: 1, margin: 20, gap: 16, maxTextWidth: width - 40 };
  if (width <= 820) return { mode: 'tablet', columns: 1, margin: 40, gap: 24, maxTextWidth: width - 80 };
  return { mode: 'desktop-compact', columns: 2, margin: 64, gap: 32, maxTextWidth: 680 };
}
function frameIntent(frame, width) {
  const base = intentForWidth(width);
  const layers = list(frame.directChildren).length + list(frame.children).length + list(frame.groups).reduce((sum, group) => sum + list(group.children).length, 0);
  return { id: frame.id, name: frame.name, role: frame.role, width, mode: base.mode, columns: base.columns, margin: base.margin, gap: base.gap, maxTextWidth: base.maxTextWidth, sourceHeight: n(frame.rect?.h, 0), sourceLayerCount: layers, recommendation: layers > 18 && base.columns === 1 ? 'stack-and-prioritize-content' : 'preserve-section-order' };
}
export function buildResponsiveLayoutIntent(figmaRenderPlan, widths = [1024, 768, 390]) {
  const frames = list(figmaRenderPlan?.frames);
  return { version: 'responsive-layout-intent-v1', status: frames.length ? 'ready' : 'missing', variants: widths.map((width) => ({ width, intent: intentForWidth(width), sections: frames.map((frame) => frameIntent(frame, width)) })), diagnostics: { widths, sections: frames.length } };
}
