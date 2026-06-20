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

function attr(name, value) {
  return `${name}="${escapeHtml(value || '')}"`;
}

function styleToCss(node = {}) {
  const style = node.style || {};
  const lines = [];
  const isText = node.figmaType === 'TEXT';

  if (style.fill && isText) lines.push(`color: ${style.fill};`);
  if (style.fill && !isText) lines.push(`background: ${style.fill};`);
  if (style.stroke) lines.push(`border: ${style.strokeWeight || 1}px solid ${style.stroke};`);
  if (style.radius) lines.push(`border-radius: ${style.radius}px;`);
  if (style.opacity !== undefined && style.opacity !== 1) lines.push(`opacity: ${style.opacity};`);
  if (style.fontSize) lines.push(`font-size: ${style.fontSize}px;`);
  if (style.fontWeight) lines.push(`font-weight: ${style.fontWeight};`);

  return lines.join(' ');
}

const iconByComponent = new Map();
const iconByName = new Map();
for (const icon of pkg.assets?.icons || []) {
  if (icon.componentName) iconByComponent.set(icon.componentName, icon);
  if (icon.name) iconByName.set(icon.name, icon);
}

const cssRules = [];
const bindings = [];
let idSeq = 0;

function iconMarkup(componentRef) {
  const icon = iconByComponent.get(componentRef) || iconByName.get(String(componentRef || '').replace(/^Icon\//, ''));
  if (icon && icon.svg) return `<span class="ui-icon-svg" data-icon-ref="${escapeHtml(componentRef)}">${icon.svg}</span>`;
  return `<span class="ui-icon-label">${escapeHtml(componentRef || 'icon')}</span>`;
}

function renderNode(node, depth = 0) {
  const isText = node.figmaType === 'TEXT';
  const tag = isText ? 'span' : 'div';
  const className = `ui-${safeName(node.name)}-${idSeq++}`;
  const attrs = [attr('class', className), attr('data-ui-node', node.name || '')];

  if (node.binding) {
    if (node.binding.action) attrs.push(attr('data-action', node.binding.action));
    if (node.binding.bind) attrs.push(attr('data-bind', node.binding.bind));
    if (node.binding.slot) attrs.push(attr('data-slot', node.binding.slot));
    if (node.binding.backend) attrs.push(attr('data-backend', node.binding.backend));
    if (Object.keys(node.binding).length) bindings.push({ node: node.name, binding: node.binding });
  }

  if (node.figmaType === 'INSTANCE' && node.componentRef) attrs.push(attr('data-icon-ref', node.componentRef));

  const layout = node.layout || {};
  const direction = layout.layoutMode === 'HORIZONTAL' ? 'row' : 'column';
  const pad = layout.padding || {};
  const width = Number.isFinite(Number(layout.width)) && Number(layout.width) > 0 ? `${layout.width}px` : 'auto';
  const minHeight = Number.isFinite(Number(layout.height)) && Number(layout.height) > 0 ? `${layout.height}px` : 'auto';
  const display = isText ? 'inline-flex' : 'flex';
  cssRules.push(`.${className} { ${styleToCss(node)} width: ${width}; min-height: ${minHeight}; display: ${display}; flex-direction: ${direction}; gap: ${layout.itemSpacing || 0}px; padding: ${pad.top || 0}px ${pad.right || 0}px ${pad.bottom || 0}px ${pad.left || 0}px; box-sizing: border-box; }`);

  if (isText) return `${'  '.repeat(depth)}<${tag} ${attrs.join(' ')}>${escapeHtml(node.text || '')}</${tag}>`;
  if (node.figmaType === 'INSTANCE' && node.componentRef) return `${'  '.repeat(depth)}<${tag} ${attrs.join(' ')}>${iconMarkup(node.componentRef)}</${tag}>`;

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
.ui-icon-svg, .ui-icon-svg svg { width: 24px; height: 24px; display: inline-flex; }

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
  document.querySelectorAll('[data-bind]').forEach(node => {
    if (node.getAttribute('data-bind') !== name) return;
    node.textContent = value == null ? '' : String(value);
  });
}

export function updateSlotText(name, value) {
  document.querySelectorAll('[data-slot]').forEach(node => {
    if (node.getAttribute('data-slot') !== name) return;
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
