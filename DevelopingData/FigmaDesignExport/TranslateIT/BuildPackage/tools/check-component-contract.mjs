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
const notes = [];

function walk(node, fn) {
  if (!node) return;
  fn(node);
  for (const child of node.children || []) walk(child, fn);
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function componentCategory(name) {
  const parts = normalize(name).split('/').map(part => part.trim()).filter(Boolean);
  return parts[0] || '';
}

const tree = pkg.screens?.[0]?.tree;
if (!tree) errors.push('Missing screens[0].tree.');

const components = [];
if (tree) {
  walk(tree, node => {
    const binding = node.binding || {};
    const name = normalize(binding.component || (node.kind === 'component-candidate' ? node.name : ''));
    if (!name) return;
    components.push({ node, binding, name, category: componentCategory(name) });
  });
}

if (!components.length) errors.push('No components found. Add data-component attributes before import.');

const seenNames = new Map();
for (const item of components) {
  const { name, category, binding, node } = item;
  if (!name.includes('/')) warnings.push(`${name} does not follow "Category / Name" naming.`);
  if (!category) warnings.push(`${name} has no component category.`);
  seenNames.set(name, (seenNames.get(name) || 0) + 1);

  const lower = name.toLowerCase();
  const looksInteractive = lower.includes('button') || binding.action || binding.role === 'button';
  if (looksInteractive && !binding.action) warnings.push(`${name} looks interactive but has no data-action.`);
  if (binding.action && !binding.backend) warnings.push(`${name} has data-action but no data-backend.`);
  if (binding.action && !binding.role && !lower.includes('button')) warnings.push(`${name} has action but no role. Add role="button" for non-button elements.`);
  if ((lower.includes('status') || lower.includes('output')) && !binding.bind && !binding.slot) warnings.push(`${name} looks dynamic but has no data-bind/data-slot.`);
  if (!node.layout || !Number(node.layout.width) || !Number(node.layout.height)) warnings.push(`${name} has missing or invalid layout dimensions.`);
}

for (const [name, count] of seenNames) {
  if (count > 1) notes.push(`${name} appears ${count} times. This can be valid for repeated instances.`);
}

const categories = Array.from(new Set(components.map(item => item.category).filter(Boolean))).sort();
const actionCount = components.filter(item => item.binding.action).length;
const stateCount = components.filter(item => item.binding.bind || item.binding.slot).length;

console.log('TranslateIT Component Contract Check');
console.log(`Input: ${input}`);
console.log(`Components: ${components.length}`);
console.log(`Categories: ${categories.join(', ') || 'none'}`);
console.log(`Actions: ${actionCount}`);
console.log(`State/slots: ${stateCount}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Notes: ${notes.length}`);

if (errors.length) {
  console.log('\nErrors:');
  errors.forEach(item => console.log(`- ${item}`));
}

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach(item => console.log(`- ${item}`));
}

if (notes.length) {
  console.log('\nNotes:');
  notes.forEach(item => console.log(`- ${item}`));
}

if (errors.length) process.exit(1);
