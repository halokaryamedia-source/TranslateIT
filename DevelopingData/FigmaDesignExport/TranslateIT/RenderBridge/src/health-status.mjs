import { ok } from './shared-contract.mjs';

export function healthStatus() {
  return ok({
    adapter: 'clean-render-bridge',
    activeServer: 'server.mjs',
    activeRenderer: 'plugin/code-framework-production.js',
    userFacingInput: 'url-link',
    payloadJsonRole: 'internal-report-and-debug-only',
    renderPolicy: 'external-visual-engine-required',
    internalLayoutFallback: false,
    internalLayoutFallbackEnv: 'TRANSLATEIT_ALLOW_INTERNAL_LAYOUT_FALLBACK=1',
    externalVisualEngine: {
      required: true,
      preferred: 'OmniParser V2 endpoint',
      endpoint: process.env.OMNIPARSER_ENDPOINT || 'http://127.0.0.1:7860/parse',
      fallback: process.env.UIED_CLI_PATH ? 'UIED_CLI_PATH' : null
    },
    contract: 'cloneModel',
    cloneMode: 'external-visual-layout-required',
    rendererMode: 'production-safe-url-render-output',
    visualBacking: 'external-visual-engine-required',
    editableOverlay: 'visual-engine-primary-output',
    visualModel: 'screenshot-first-external-parser-required',
    visualMatching: 'external-regions-to-figma-layout',
    imageFit: 'source-object-fit-preserved',
    textRender: 'source-text-rendering-preserved',
    retiredWorkflowActive: false
  });
}
