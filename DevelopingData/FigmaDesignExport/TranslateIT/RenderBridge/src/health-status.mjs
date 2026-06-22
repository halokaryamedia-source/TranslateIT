import { ok } from './shared-contract.mjs';

export function healthStatus() {
  return ok({
    adapter: 'clean-render-bridge',
    activeServer: 'server.mjs',
    activeRenderer: 'plugin/code-visual-backed.js',
    contract: 'cloneModel',
    cloneMode: 'layout-preserving-editable-clone',
    rendererMode: 'visual-backed-editable-clone',
    visualBacking: true,
    editableOverlay: 'grouped-low-opacity',
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
