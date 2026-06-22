import { ok } from './shared-contract.mjs';

export function healthStatus() {
  return ok({
    adapter: 'clean-render-bridge',
    activeServer: 'server.mjs',
    activeRenderer: 'plugin/code-framework-production.js',
    userFacingInput: 'url-link',
    payloadJsonRole: 'internal-report-and-debug-only',
    contract: 'cloneModel',
    cloneMode: 'layout-preserving-editable-clone',
    rendererMode: 'production-safe-url-render-output',
    visualBacking: 'off',
    editableOverlay: 'framework-primary-output',
    visualModel: 'screenshot-first-html-assisted-v2',
    visualMatching: 'dom-to-visual-foundation',
    paintOrder: 'dom-paint-order-preserved',
    sectionSurface: 'source-derived',
    imageFit: 'source-object-fit-preserved',
    textRender: 'source-text-rendering-preserved',
    heroOcclusionGuard: true,
    textLineReconstruction: true,
    clonePreview: 'html-png-preview-foundation',
    figmaSimulation: 'source-size-fitted-v2',
    visualComparison: 'visual-comparison-v2',
    visualDiffOverlay: true,
    legacyActive: false
  });
}
