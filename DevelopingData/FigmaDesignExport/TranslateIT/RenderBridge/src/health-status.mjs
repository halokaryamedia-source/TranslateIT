import { ok } from './shared-contract.mjs';

export function healthStatus() {
  return ok({ adapter: 'clean-render-bridge', activeServer: 'server.mjs', activeRenderer: 'plugin/code.js', contract: 'cloneModel', cloneMode: 'layout-preserving-editable-clone', visualModel: 'screenshot-first-html-assisted-visual-model', visualMatching: 'dom-to-visual-foundation', clonePreview: 'html-png-preview-foundation', visualComparison: 'source-vs-clone-preview-sampling', legacyActive: false });
}
