#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2] || 'ui-build-package.json';
const output = process.argv[3] || 'GeneratedFrontend';

if (!fs.existsSync(input)) {
  console.error(`Missing input package: ${input}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(input, 'utf8'));
if (pkg.schema !== 'translateit.ui-build-package.v1') {
  console.error(`Unsupported schema: ${pkg.schema}`);
  process.exit(1);
}

fs.mkdirSync(output, { recursive: true });

function safeName(value) {
  return String(value || 'node').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'node';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function styleToCss(style = {}) {
  const lines = [];
  if (style.fill) lines.push(`background: ${style.fill};`);
  if (style.stroke) lines.push(`border: ${style.strokeWeight || 1}px solid ${style.stroke};`);
  if (style.radius) lines.push(`border-radius: ${style.radius}px;`);
  if (style.opacity !== undefined && style.opacity !== 1) lines.push(`opacity: ${style.opacity};`);
  return lines.join(' ');
}

const cssRules = [];
const bindings = [];
let idSeq = 0;

function attr(name, value) {
  return `${name}="${escapeHtml(value || '')}"`;
}

function renderNode(node, depth = 0) {
  const tag = node.figmaType === 'TEXT' ? 'span' : 'div';
  const className = `ui-${safeName(node.name)}-${idSeq++}`;
  const attrs = [attr('class', className), attr('data-ui-node', node.name || '')];

  if (node.binding) {
    if (node.binding.action) attrs.push(attr('data-action', node.binding.action));
    if (node.binding.bind) attrs.push(attr('data-bind', node.binding.bind));
    if (node.binding.slot) attrs.push(attr('data-slot', node.binding.slot));
    if (node.binding.backend) attrs.push(attr('data-backend', node.binding.backend));
    if (Object.keys(node.binding).length) bindings.push({ node: node.name, binding: node.binding });
  }

  if (node.figmaType === 'INSTANCE' && node.componentRef) {
    attrs.push(attr('data-icon-ref', node.componentRef));
  }

  const layout = node.layout || {};
  const direction = layout.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
  const pad = layout.padding || {};
  cssRules.push(`.${className} { ${styleToCss(node.style)} width: ${layout.width || 0}px; min-height: ${layout.height || 0}px; display: flex; flex-direction: ${direction}; gap: ${layout.itemSpacing || 0}px; padding: ${pad.top || 0}px ${pad.right || 0}px ${pad.bottom || 0}px ${pad.left || 0}px; box-sizing: border-box; }`);

  if (node.figmaType === 'TEXT') {
    return `${'  '.repeat(depth)}<${tag} ${attrs.join(' ')}>${escapeHtml(node.text || '')}</${tag}>`;
  }

  if (node.figmaType === 'INSTANCE' && node.componentRef) {
    return `${'  '.repeat(depth)}<${tag} ${attrs.join(' ')}><span class="ui-icon-label">${escapeHtml(node.componentRef)}</span></${tag}>`;
  }

  const children = (node.children || []).map(child => renderNode(child, depth + 1)).join('\n');
  return `${'  '.repeat(depth)}<${tag} ${attrs.join(' ')}>\n${children}\n${'  '.repeat(depth)}</${tag}>`;
}

const screen = pkg.screens?.[0]?.tree;
if (!screen) {
  console.error('Package has no screen tree.');
  process.exit(1);
}

const htmlBody = renderNode(screen, 2);
const bindingsJson = JSON.stringify({ bindings, packageSource: pkg.source, integrationContract: pkg.integrationContract }, null, 2);
const runtimePackage = JSON.stringify({ source: pkg.source, target: pkg.target, bindings }, null, 2);

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pkg.source?.importRun || 'Generated UI')}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main id="app-root">
${htmlBody}
  </main>
  <script type="module" src="ui-runtime.js"></script>
</body>
</html>
`;

const css = `:root {
${(pkg.tokens?.colors || []).map((color, index) => `  --ui-color-${index + 1}: ${color};`).join('\n')}
}

html, body { margin: 0; min-height: 100%; background: #030407; color: #f5f7fa; font-family: Inter, system-ui, sans-serif; }
#app-root { min-height: 100vh; }
.ui-icon-label { font-size: 9px; opacity: .65; }

${cssRules.join('\n\n')}
`;

const runtime = `import { backend } from './backend-adapter.js';

export const uiPackage = ${runtimePackage};
export const uiBindings = ${bindingsJson};

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');
  const backendCommand = target.getAttribute('data-backend') || action;
  await backend.invoke(backendCommand, {
    action,
    node: target.getAttribute('data-ui-node'),
    slot: target.getAttribute('data-slot') || null
  });
});

export function updateBinding(name, value) {
  document.querySelectorAll('[data-bind="' + name + '"]').forEach(node => {
    node.textContent = value == null ? '' : String(value);
  });
}

export function updateSlotText(name, value) {
  document.querySelectorAll('[data-slot="' + name + '"]').forEach(node => {
    node.textContent = value == null ? '' : String(value);
  });
}

console.log('[Generated UI ready]', uiBindings);
`;

const adapter = `export const backend = {
  async invoke(command, payload) {
    const custom = globalThis.TranslateITBackend;
    if (custom && typeof custom.invoke === 'function') return custom.invoke(command, payload);
    console.log('[TranslateIT backend stub]', command, payload);
    return null;
  }
};
`;

fs.writeFileSync(path.join(output, 'index.html'), html);
fs.writeFileSync(path.join(output, 'styles.css'), css);
fs.writeFileSync(path.join(output, 'ui-runtime.js'), runtime);
fs.writeFileSync(path.join(output, 'backend-adapter.js'), adapter);
fs.writeFileSync(path.join(output, 'ui-bindings.json'), bindingsJson);
fs.writeFileSync(path.join(output, 'README.md'), `# Generated Frontend\n\nGenerated from TranslateIT UI Build Package.\n\n## Files\n\n- index.html\n- styles.css\n- ui-runtime.js\n- backend-adapter.js\n- ui-bindings.json\n\n## Backend Integration\n\nSet \`globalThis.TranslateITBackend.invoke(command, payload)\` or replace \`backend-adapter.js\` with a Tauri invoke adapter.\n\n## Binding Helpers\n\n- \`updateBinding(name, value)\` updates nodes with \`data-bind\`.\n- \`updateSlotText(name, value)\` updates text for nodes with \`data-slot\`.\n`);

console.log(`Generated frontend scaffold: ${output}`);
