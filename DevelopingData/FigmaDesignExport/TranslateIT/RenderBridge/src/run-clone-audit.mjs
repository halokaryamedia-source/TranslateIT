import { renderClonePreview } from './render-clone-preview.mjs';
import { compareSourceAndClonePreview } from './compare-visual-screenshots.mjs';
import { visualAudit } from './visual-audit.mjs';

export async function runCloneAudit(payload, reportDir) {
  const preview = await renderClonePreview(payload, reportDir);
  const comparison = await compareSourceAndClonePreview(payload, preview);
  payload.diagnostics.clonePreview = { ...preview, comparison };
  const audit = visualAudit(payload);
  return { payload, audit, preview, comparison };
}
