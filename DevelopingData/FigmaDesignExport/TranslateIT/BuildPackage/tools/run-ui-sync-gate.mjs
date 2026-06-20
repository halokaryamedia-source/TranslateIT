#!/usr/bin/env node
import fs from 'node:fs';

const input = process.argv[2] || 'ui-build-package.json';

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

const errors = [];
const warnings = [];

function walk(node, fn) {
  if (!node) return;
  fn(node);
  for (const child of node.children || []) walk(child, fn);
}

if (pkg.schema !== 'translateit.ui-build-package.v1') errors.push('Unsupported package schema.');
if (!pkg.quality) warnings.push('Missing quality metadata. Re-export using plugin v3 or newer.');

const readinessLevel = pkg.quality?.readinessLevel || 'UNKNOWN';
const readinessScore = Number(pkg.quality?.readinessScore || 0);

if (readinessLevel === 'BLOCKED') errors.push('Readiness level is BLOCKED. Do not sync.');
if (readinessLevel === 'NEEDS_CLEANUP') warnings.push('Readiness level is NEEDS_CLEANUP. Manual review required before sync.');
if (readinessScore && readinessScore < 70) errors.push(`Readiness score is below sync threshold: ${readinessScore}/100.`);
if (Array.isArray(pkg.quality?.warnings) && pkg.quality.warnings.length > 10) warnings.push(`High warning count from plugin export: ${pkg.quality.warnings.length}.`);

const tree = pkg.screens?.[0]?.tree;
if (!tree) errors.push('Missing screens[0].tree.');

const stats = {
  nodes: 0,
  actions: 0,
  actionsWithoutBackend: 0,
  stateBindings: 0,
  iconInstances: 0,
  componentCandidates: 0,
  designOnlyLeaks: 0
};

if (tree) {
  walk(tree, node => {
    stats.nodes += 1;
    if (/Component Preview|Import Report|Archive/i.test(node.name || '')) stats.designOnlyLeaks += 1;
    if (node.kind === 'component-candidate' || node.binding?.component) stats.componentCandidates += 1;
    if (node.binding?.action) {
      stats.actions += 1;
      if (!node.binding?.backend) stats.actionsWithoutBackend += 1;
    }
    if (node.binding?.bind || node.binding?.slot) stats.stateBindings += 1;
    if (node.figmaType === 'INSTANCE' || node.componentRef) stats.iconInstances += 1;
  });
}

if (stats.designOnlyLeaks) errors.push(`Design-only section leaked into exported UI tree: ${stats.designOnlyLeaks}.`);
if (!stats.componentCandidates) warnings.push('No component candidates found. Add data-component attributes.');
if (!stats.actions) warnings.push('No actions found. Interactive UI may not work.');
if (stats.actionsWithoutBackend) warnings.push(`${stats.actionsWithoutBackend} action(s) do not define data-backend.`);
if (!stats.stateBindings) warnings.push('No state/slot bindings found. Runtime data handoff may be incomplete.');
if (!stats.iconInstances) warnings.push('No icon instances found. Icon master/instance workflow may be unused.');

const icons = pkg.assets?.icons || [];
if (!Array.isArray(icons)) errors.push('assets.icons must be an array.');
if (Array.isArray(icons)) {
  const missingSvg = icons.filter(icon => !icon.svg).length;
  if (icons.length && missingSvg) warnings.push(`${missingSvg} exported icon(s) have no SVG payload.`);
}

console.log('TranslateIT UI Sync Gate');
console.log(`Input: ${input}`);
console.log(`Readiness: ${readinessLevel} (${readinessScore || 'unknown'}/100)`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Stats: nodes=${stats.nodes} / components=${stats.componentCandidates} / actions=${stats.actions} / stateBindings=${stats.stateBindings} / iconInstances=${stats.iconInstances}`);

if (errors.length) {
  console.log('\nErrors:');
  errors.forEach(item => console.log(`- ${item}`));
}

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach(item => console.log(`- ${item}`));
}

if (errors.length) {
  console.log('\nFAIL: package is not safe to sync into app runtime.');
  process.exit(1);
}

console.log('\nPASS: package passed sync gate. Manual visual approval may still be required.');
