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

if (pkg.quality?.readinessLevel === 'BLOCKED') {
  console.error('Package readiness is BLOCKED. Fix the Figma export before codegen.');
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

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function inferComponentType(name = '', binding = {}) {
  const explicit = binding.componentType || binding['component-type'];
  if (explicit) return explicit;
  const lower = name.toLowerCase();
  if (lower.includes('button')) return 'button';
  if (lower.includes('input') || lower.includes('composer')) return 'input';
  if (lower.includes('card')) return 'card';
  if (lower.includes('toolbar')) return 'toolbar';
  if (lower.includes('modal') || lower.includes('dialog')) return 'modal';
  if (lower.includes('status')) return 'status';
  if (lower.includes('screen')) return 'screen';
  if (lower.includes('icon')) return 'icon';
  return 'frame';
}

function inferComponentVariant(name = '', binding = {}) {
  if (binding.variant) return binding.variant;
  const lower = name.toLowerCase();
  if (lower.includes('primary')) return 'primary';
  if (lower.includes('secondary')) return 'secondary';
  if (lower.includes('danger')) return 'danger';
  if (lower.includes('ghost')) return 'ghost';
  if (lower.includes('warning')) return 'warning';
  if (lower.includes('success')) return 'success';
  return 'default';
}

function inferComponentState(binding = {}) {
  return binding.state || 'default';
}

function inferComponentSize(name = '', binding = {}, layout = {}) {
  if (binding.size) return binding.size;
  const lower = name.toLowerCase();
  if (lower.includes('small') || lower.includes('/ sm')) return 'sm';
  if (lower.includes('large') || lower.includes('/ lg')) return 'lg';
  const width = Number(layout.width || 0);
  const height = Number(layout.height || 0);
  if (width && width <= 96) return 'sm';
  if (height && height >= 72) return 'lg';
  return 'md';
}

function componentMetaFor(node = {}) {
  const binding = node.binding || {};
  const name = normalize(binding.component || (node.kind === 'component-candidate' ? node.name : ''));
  if (!name) return null;
  return {
    id: safeName(name),
    name,
    type: inferComponentType(name, binding),
    variant: inferComponentVariant(name, binding),
    state: inferComponentState(binding),
    size: inferComponentSize(name, binding, node.layout || {})
  };
}

const iconByComponent = new Map();
const iconByName = new Map();
for (const icon of pkg.assets?.icons || []) {
  if (icon.componentName) iconByComponent.set(icon.componentName, icon);
  if (icon.name) iconByName.set(icon.name, icon);
}

const cssRules = [];
const bindings = [];
const componentRegistry = {
  schema: 'translateit.component-registry.v1',
  generatedAt: new Date().toISOString(),
  source: pkg.source || {},
  quality: pkg.quality || null,
  components: [],
  stats: { total: 0, byType: {}, actions: 0, stateBindings: 0, slots: 0 },
  warnings: []
};
const registrySeen = new Set();
let idSeq = 0;

function registerComponent(node) {
  const meta = componentMetaFor(node);
  if (!meta) return meta;
  const key = `${meta.id}:${node.name}`;
  if (!registrySeen.has(key)) {
    registrySeen.add(key);
    const binding = node.binding || {};
    const item = {
      ...meta,
      figmaNodeName: node.name,
      source: node.source || '',
      action: binding.action || null,
      backend: binding.backend || null,
      bind: binding.bind || null,
      slot: binding.slot || null,
      route: binding.route || null,
      layout: node.layout || {},
      style: node.style || {}
    };
    componentRegistry.components.push(item);
    componentRegistry.stats.total += 1;
    componentRegistry.stats.byType[item.type] = (componentRegistry.stats.byType[item.type] || 0) + 1;
    if (item.action) componentRegistry.stats.actions += 1;
    if (item.bind) componentRegistry.stats.stateBindings += 1;
    if (item.slot) componentRegistry.stats.slots += 1;
    if (item.action && !item.backend) componentRegistry.warnings.push(`${item.name} has data-action but no data-backend.`);
  }
  return meta;
}

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
  const componentMeta = registerComponent(node);

  if (componentMeta) {
    attrs.push(attr('data-component-id', componentMeta.id));
    attrs.push(attr('data-component-type', componentMeta.type));
    attrs.push(attr('data-variant', componentMeta.variant));
    attrs.push(attr('data-state', componentMeta.state));
    attrs.push(attr('data-size', componentMeta.size));
  }

  if (node.binding) {
    if (node.binding.action) attrs.push(attr('data-action', node.binding.action));
    if (node.binding.bind) attrs.push(attr('data-bind', node.binding.bind));
    if (node.binding.slot) attrs.push(attr('data-slot', node.binding.slot));
    if (node.binding.backend) attrs.push(attr('data-backend', node.binding.backend));
    if (node.binding.component) attrs.push(attr('data-component', node.binding.component));
    if (node.binding.role) attrs.push(attr('role', node.binding.role));
    if (node.binding['aria-label']) attrs.push(attr('aria-label', node.binding['aria-label']));
    if (Object.keys(node.binding).length) bindings.push({ node: node.name, binding: node.binding, component: componentMeta });
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
componentRegistry.components.sort((a, b) => a.name.localeCompare(b.name));
componentRegistry.warnings = Array.from(new Set(componentRegistry.warnings));
const bindingsJson = JSON.stringify({ bindings, packageSource: pkg.source, quality: pkg.quality || null, integrationContract: pkg.integrationContract, componentRegistry }, null, 2);
const runtimePackage = JSON.stringify({ source: pkg.source, target: pkg.target, quality: pkg.quality || null, bindings, componentRegistry }, null, 2);

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
[data-component-type="button"] { cursor: pointer; }
[data-state="disabled"] { pointer-events: none; opacity: .5; }

${cssRules.join('\n\n')}
`;

const runtime = `import { backend } from './backend-adapter.js';

export const uiPackage = ${runtimePackage};
export const uiBindings = ${bindingsJson};
export const componentRegistry = uiPackage.componentRegistry;

document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.getAttribute('data-action');
  const backendCommand = target.getAttribute('data-backend') || action;
  await backend.invoke(backendCommand, {
    action,
    node: target.getAttribute('data-ui-node'),
    componentId: target.getAttribute('data-component-id'),
    componentType: target.getAttribute('data-component-type'),
    variant: target.getAttribute('data-variant'),
    state: target.getAttribute('data-state'),
    size: target.getAttribute('data-size'),
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

export function setComponentState(componentId, state) {
  document.querySelectorAll('[data-component-id]').forEach(node => {
    if (node.getAttribute('data-component-id') !== componentId) return;
    node.setAttribute('data-state', state || 'default');
  });
}

console.log('[Generated UI ready]', uiBindings);
console.log('[Component registry]', componentRegistry);
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

const quality = pkg.quality || {};
const qualityReport = `# Generated UI Package Report

Source: ${pkg.source?.importRun || 'unknown'}
Readiness: ${quality.readinessLevel || 'UNKNOWN'} (${quality.readinessScore ?? 'unknown'}/100)
Warnings: ${Array.isArray(quality.warnings) ? quality.warnings.length : 0}
Bindings: ${bindings.length}
Icons: ${(pkg.assets?.icons || []).length}
Components: ${componentRegistry.stats.total}
Component types: ${Object.entries(componentRegistry.stats.byType).map(([key, value]) => `${key}=${value}`).join(' / ') || 'none'}

## Warnings

${Array.isArray(quality.warnings) && quality.warnings.length ? quality.warnings.map(item => `- ${item}`).join('\n') : '- None recorded.'}

## Component Registry Warnings

${componentRegistry.warnings.length ? componentRegistry.warnings.map(item => `- ${item}`).join('\n') : '- None recorded.'}

## Safety

This generated frontend is a scaffold. Do not copy it into app runtime without visual approval and sync gate approval.
`;

fs.writeFileSync(path.join(output, 'index.html'), html);
fs.writeFileSync(path.join(output, 'styles.css'), css);
fs.writeFileSync(path.join(output, 'ui-runtime.js'), runtime);
fs.writeFileSync(path.join(output, 'backend-adapter.js'), adapter);
fs.writeFileSync(path.join(output, 'ui-bindings.json'), bindingsJson);
fs.writeFileSync(path.join(output, 'component-registry.json'), `${JSON.stringify(componentRegistry, null, 2)}\n`);
fs.writeFileSync(path.join(output, 'ui-package-report.md'), qualityReport);
fs.writeFileSync(path.join(output, 'README.md'), `# Generated Frontend\n\nGenerated from TranslateIT UI Build Package.\n\n## Files\n\n- index.html\n- styles.css\n- ui-runtime.js\n- backend-adapter.js\n- ui-bindings.json\n- component-registry.json\n- ui-package-report.md\n\n## Backend Integration\n\nSet \`globalThis.TranslateITBackend.invoke(command, payload)\` or replace \`backend-adapter.js\` with a Tauri invoke adapter.\n\n## Binding Helpers\n\n- \`updateBinding(name, value)\` updates nodes with \`data-bind\`.\n- \`updateSlotText(name, value)\` updates text for nodes with \`data-slot\`.\n- \`setComponentState(componentId, state)\` updates generated nodes with matching \`data-component-id\`.\n`);

console.log(`Generated frontend scaffold: ${output}`);
console.log(`Readiness: ${quality.readinessLevel || 'UNKNOWN'} (${quality.readinessScore ?? 'unknown'}/100)`);
console.log(`Component registry: ${componentRegistry.stats.total} component(s)`);
