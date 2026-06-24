function list(value) { return Array.isArray(value) ? value : []; }
function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function n(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }

export function applyVisualBackplatePass(payload) {
  const screenshot = payload?.source?.screenshot;
  const cloneModel = payload?.cloneModel;
  const plan = payload?.figmaRenderPlan;
  if (!screenshot?.base64 || !cloneModel || !plan) return payload;

  const assetId = 'designit-visual-backplate-full-page';
  const width = Math.max(1, Math.round(n(screenshot.width, plan.page?.width || 1440)));
  const height = Math.max(1, Math.round(n(screenshot.height, plan.page?.height || 1600)));

  cloneModel.assets = list(cloneModel.assets).filter((asset) => asset.id !== assetId);
  cloneModel.assets.unshift({
    id: assetId,
    kind: 'visual-backplate',
    name: 'Full Page Visual Reference',
    contentType: screenshot.contentType || 'image/png',
    base64: screenshot.base64,
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
    objectFit: 'fill',
    objectPosition: '0% 0%'
  });

  plan.visualBackplate = {
    enabled: true,
    assetId,
    name: 'Visual Reference / Full Page Screenshot',
    rect: { x: 0, y: 0, w: width, h: height },
    renderMode: 'locked-background-reference',
    opacity: 1
  };

  plan.frames = list(plan.frames).map((frame) => ({
    ...frame,
    backgroundColor: '',
    directChildren: list(frame.directChildren).filter((layer) => {
      const role = clean(layer.role || layer.name || '').toLowerCase();
      const kind = clean(layer.kind || layer.type).toLowerCase();
      if (kind === 'shape' && /section-background|background|card.*safe|surface.*container/.test(role)) return false;
      return true;
    })
  }));

  plan.page = {
    ...(plan.page || {}),
    width: Math.max(n(plan.page?.width, width), width),
    height: Math.max(n(plan.page?.height, height), height)
  };

  plan.diagnostics = {
    ...(plan.diagnostics || {}),
    visualBackplatePass: true,
    visualBackplate: {
      assetId,
      width,
      height,
      mode: 'screenshot-backed-editable-overlay'
    }
  };

  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.visualBackplate = plan.diagnostics.visualBackplate;
  return payload;
}
