#!/usr/bin/env node
import fs from 'node:fs';

const input = process.argv[2] || 'ui-build-package.json';

if (!fs.existsSync(input)) {
  console.error(`Missing package file: ${input}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(input, 'utf8'));
const errors = [];
const warnings = [];

function walk(node, fn) {
  if (!node) return;
  fn(node);
  for (const child of node.children || []) walk(child, fn);
}

if (pkg.schema !== 'translateit.ui-build-package.v1') errors.push(`Unsupported schema: ${pkg.schema}`);
if (!pkg.source?.figmaPage) errors.push('Missing source.figmaPage');
if (!pkg.source?.importRun) errors.push('Missing source.importRun');
if (!pkg.source?.exportedRoot) warnings.push('Missing source.exportedRoot');
if (!Array.isArray(pkg.screens) || !pkg.screens.length) errors.push('Missing screens[]');
if (!pkg.screens?.[0]?.tree) errors.push('Missing screens[0].tree');

const tree = pkg.screens?.[0]?.tree;
if (tree) {
  const designOnlyNames = [];
  const nodesWithActions = [];
  const nodesWithBindings = [];
  const iconInstances = [];

  walk(tree, node => {
    if (/Component Preview|Import Report|Archive/i.test(node.name || '')) designOnlyNames.push(node.name);
    if (node.binding?.action) nodesWithActions.push(node.name);
    if (node.binding?.bind || node.binding?.slot) nodesWithBindings.push(node.name);
    if (node.figmaType === 'INSTANCE' || node.componentRef) iconInstances.push(node.name);
  });

  if (designOnlyNames.length) errors.push(`Design-only sections leaked into exported UI tree: ${designOnlyNames.slice(0, 5).join(', ')}`);
  if (!nodesWithActions.length) warnings.push('No data-action bindings found. UI may not call backend actions.');
  if (!nodesWithBindings.length) warnings.push('No data-bind/data-slot bindings found. UI may not receive backend state/output.');
  if (!iconInstances.length) warnings.push('No icon instances found in exported screen tree.');
}

const icons = pkg.assets?.icons || [];
if (!Array.isArray(icons)) errors.push('assets.icons must be an array');
if (Array.isArray(icons)) {
  const missingSvg = icons.filter(icon => !icon.svg);
  if (icons.length && missingSvg.length) warnings.push(`${missingSvg.length} icon asset(s) have no SVG payload.`);
}

const bindings = pkg.backendBindings || [];
if (!Array.isArray(bindings)) errors.push('backendBindings must be an array');

console.log('TranslateIT UI Build Package Validation');
console.log(`Input: ${input}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (errors.length) {
  console.log('\nErrors:');
  errors.forEach(item => console.log(`- ${item}`));
}

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach(item => console.log(`- ${item}`));
}

if (errors.length) process.exit(1);
console.log('\nPASS: package is structurally valid for codegen.');
