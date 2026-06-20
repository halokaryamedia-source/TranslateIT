#!/usr/bin/env node
import fs from 'node:fs';

const input = process.argv[2] || 'ui-build-package.json';
const output = process.argv[3] || 'component-registry.json';

if (!fs.existsSync(input)) {
  console.error(`Missing package file: ${input}`);
  process.exit(1);
}

let pkg;
try {
  pkg = JSON.parse(fs.readFileSync(input, 'utf8'));
} catch (error) {
  console.error(`Invalid package JSON: ${error.message}`);
  process.exit(1);
}

function walk(node, fn) {
  if (!node) return;
  fn(node);
  for (const child of node.children || []) walk(child, fn);
}

function slug(value) {
  return String(value || 'component')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'component';
}

function normalizeName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function inferType(name = '', binding = {}) {
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

function inferVariant(name = '', binding = {}) {
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

function inferState(binding = {}) {
  return binding.state || 'default';
}

function inferSize(name = '', binding = {}, layout = {}) {
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

const registry = {
  schema: 'translateit.component-registry.v1',
  generatedAt: new Date().toISOString(),
  source: pkg.source || {},
  quality: pkg.quality || null,
  components: [],
  stats: {
    total: 0,
    byType: {},
    actions: 0,
    stateBindings: 0,
    slots: 0
  },
  warnings: []
};

const seen = new Set();
const tree = pkg.screens?.[0]?.tree;
if (!tree) {
  console.error('Missing screens[0].tree.');
  process.exit(1);
}

walk(tree, node => {
  const binding = node.binding || {};
  const componentName = normalizeName(binding.component || (node.kind === 'component-candidate' ? node.name : ''));
  if (!componentName) return;
  const id = slug(componentName);
  const key = `${id}:${node.name}`;
  if (seen.has(key)) return;
  seen.add(key);

  const component = {
    id,
    name: componentName,
    figmaNodeName: node.name,
    source: node.source || '',
    type: inferType(componentName || node.name, binding),
    variant: inferVariant(componentName || node.name, binding),
    state: inferState(binding),
    size: inferSize(componentName || node.name, binding, node.layout || {}),
    action: binding.action || null,
    backend: binding.backend || null,
    bind: binding.bind || null,
    slot: binding.slot || null,
    route: binding.route || null,
    layout: node.layout || {},
    style: node.style || {}
  };

  registry.components.push(component);
  registry.stats.total += 1;
  registry.stats.byType[component.type] = (registry.stats.byType[component.type] || 0) + 1;
  if (component.action) registry.stats.actions += 1;
  if (component.bind) registry.stats.stateBindings += 1;
  if (component.slot) registry.stats.slots += 1;
  if (component.action && !component.backend) registry.warnings.push(`${component.name} has data-action but no data-backend.`);
});

registry.components.sort((a, b) => a.name.localeCompare(b.name));
registry.warnings = Array.from(new Set(registry.warnings));

fs.writeFileSync(output, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Component registry generated: ${output}`);
console.log(`Components: ${registry.stats.total}`);
console.log(`Types: ${Object.entries(registry.stats.byType).map(([key, value]) => `${key}=${value}`).join(' / ') || 'none'}`);
console.log(`Warnings: ${registry.warnings.length}`);
