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

const risks = [];
const warnings = [];
const notes = [];

function walk(node, fn, path = []) {
  if (!node) return;
  const nextPath = [...path, node.name || node.source || node.figmaType || 'node'];
  fn(node, nextPath);
  for (const child of node.children || []) walk(child, fn, nextPath);
}

function stableKey(node) {
  return String(node.binding?.component || node.name || node.source || '').trim();
}

const tree = pkg.screens?.[0]?.tree;
if (!tree) risks.push('Missing screens[0].tree. Cannot perform roundtrip risk check.');

const componentNames = new Map();
const actionNames = new Map();
const bindingNames = new Map();
const unnamedNodes = [];
const weakSourceNodes = [];
const designOnlyLeaks = [];

if (tree) {
  walk(tree, (node, nodePath) => {
    const name = stableKey(node);
    const binding = node.binding || {};

    if (!name) unnamedNodes.push(nodePath.join(' > '));
    if (!node.source && node.kind !== 'text') weakSourceNodes.push(nodePath.join(' > '));
    if (/Component Preview|Import Report|Archive/i.test(node.name || '')) designOnlyLeaks.push(nodePath.join(' > '));

    if (binding.component) componentNames.set(binding.component, (componentNames.get(binding.component) || 0) + 1);
    if (binding.action) actionNames.set(binding.action, (actionNames.get(binding.action) || 0) + 1);
    if (binding.bind) bindingNames.set(`bind:${binding.bind}`, (bindingNames.get(`bind:${binding.bind}`) || 0) + 1);
    if (binding.slot) bindingNames.set(`slot:${binding.slot}`, (bindingNames.get(`slot:${binding.slot}`) || 0) + 1);
  });
}

const duplicateComponents = [...componentNames.entries()].filter(([, count]) => count > 1);
const duplicateActions = [...actionNames.entries()].filter(([, count]) => count > 1);
const duplicateBindings = [...bindingNames.entries()].filter(([, count]) => count > 1);

if (designOnlyLeaks.length) risks.push(`Design-only sections leaked into exported tree: ${designOnlyLeaks.slice(0, 5).join(' | ')}`);
if (unnamedNodes.length > 10) warnings.push(`${unnamedNodes.length} node(s) have weak or missing stable names.`);
if (weakSourceNodes.length > 10) warnings.push(`${weakSourceNodes.length} non-text node(s) have weak source metadata.`);
if (duplicateComponents.length) notes.push(`${duplicateComponents.length} repeated component name(s). This can be valid for instances, but verify manually.`);
if (duplicateActions.length) warnings.push(`${duplicateActions.length} repeated action name(s). Confirm repeated actions are intentional.`);
if (duplicateBindings.length) notes.push(`${duplicateBindings.length} repeated state/slot binding(s). This can be valid for duplicated views.`);

if (!pkg.quality) warnings.push('Missing quality metadata. Re-export using plugin v3.');
if (pkg.quality?.readinessLevel === 'BLOCKED') risks.push('Package readiness is BLOCKED.');
if (Number(pkg.quality?.readinessScore || 0) < 70) warnings.push(`Readiness score is below recommended threshold: ${pkg.quality?.readinessScore ?? 'unknown'}/100.`);

if (!Array.isArray(pkg.backendBindings) || !pkg.backendBindings.length) warnings.push('No backendBindings exported. Runtime behavior may be incomplete.');
if (!Array.isArray(pkg.components) || !pkg.components.length) warnings.push('No components array entries exported. Component registry may rely only on tree inference.');

console.log('TranslateIT Roundtrip Risk Check');
console.log(`Input: ${input}`);
console.log(`Risks: ${risks.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Notes: ${notes.length}`);
console.log(`Components: ${componentNames.size}`);
console.log(`Actions: ${actionNames.size}`);
console.log(`State/slots: ${bindingNames.size}`);

if (risks.length) {
  console.log('\nRisks:');
  risks.forEach(item => console.log(`- ${item}`));
}

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach(item => console.log(`- ${item}`));
}

if (notes.length) {
  console.log('\nNotes:');
  notes.forEach(item => console.log(`- ${item}`));
}

if (risks.length) process.exit(1);
if (warnings.length) process.exitCode = 2;
