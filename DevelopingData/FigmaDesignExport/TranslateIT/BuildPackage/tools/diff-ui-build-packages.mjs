#!/usr/bin/env node
import fs from 'node:fs';

const [oldFile, newFile, outFile = 'ui-package-diff-report.md'] = process.argv.slice(2);

if (!oldFile || !newFile) {
  console.error('Usage: node tools/diff-ui-build-packages.mjs <old-package.json> <new-package.json> [report.md]');
  process.exit(1);
}

for (const file of [oldFile, newFile]) {
  if (!fs.existsSync(file)) {
    console.error(`Missing package file: ${file}`);
    process.exit(1);
  }
}

function readPkg(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`Invalid JSON in ${file}: ${error.message}`);
    process.exit(1);
  }
}

function walk(node, fn) {
  if (!node) return;
  fn(node);
  for (const child of node.children || []) walk(child, fn);
}

function key(value) {
  return String(value || '').trim();
}

function collect(pkg) {
  const result = {
    components: new Map(),
    bindings: new Map(),
    icons: new Map(),
    colors: new Set(pkg.tokens?.colors || []),
    quality: pkg.quality || {},
    source: pkg.source || {}
  };

  for (const component of pkg.components || []) {
    const name = key(component.name || component.binding?.component || component.source);
    if (name) result.components.set(name, component);
  }

  const tree = pkg.screens?.[0]?.tree;
  if (tree) {
    walk(tree, node => {
      const binding = node.binding || {};
      const componentName = key(binding.component || (node.kind === 'component-candidate' ? node.name : ''));
      if (componentName && !result.components.has(componentName)) result.components.set(componentName, { name: componentName, nodeName: node.name, binding });
      if (binding.action) result.bindings.set(`action:${binding.action}`, { nodeName: node.name, binding });
      if (binding.bind) result.bindings.set(`bind:${binding.bind}`, { nodeName: node.name, binding });
      if (binding.slot) result.bindings.set(`slot:${binding.slot}`, { nodeName: node.name, binding });
    });
  }

  for (const icon of pkg.assets?.icons || []) {
    const name = key(icon.name || icon.componentName);
    if (name) result.icons.set(name, icon);
  }

  return result;
}

function diffMap(oldMap, newMap) {
  const added = [];
  const removed = [];
  const changed = [];
  for (const [name, value] of newMap) {
    if (!oldMap.has(name)) added.push(name);
    else if (JSON.stringify(oldMap.get(name)) !== JSON.stringify(value)) changed.push(name);
  }
  for (const [name] of oldMap) {
    if (!newMap.has(name)) removed.push(name);
  }
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
}

function diffSet(oldSet, newSet) {
  const added = [...newSet].filter(item => !oldSet.has(item)).sort();
  const removed = [...oldSet].filter(item => !newSet.has(item)).sort();
  return { added, removed };
}

function section(title, items) {
  if (!items.length) return `## ${title}\n\n- None\n`;
  return `## ${title}\n\n${items.map(item => `- ${item}`).join('\n')}\n`;
}

const oldPkg = readPkg(oldFile);
const newPkg = readPkg(newFile);
const oldData = collect(oldPkg);
const newData = collect(newPkg);

const componentDiff = diffMap(oldData.components, newData.components);
const bindingDiff = diffMap(oldData.bindings, newData.bindings);
const iconDiff = diffMap(oldData.icons, newData.icons);
const colorDiff = diffSet(oldData.colors, newData.colors);

const warnings = [];
if (newData.quality.readinessLevel === 'BLOCKED') warnings.push('New package readiness is BLOCKED. Do not sync.');
if (Number(newData.quality.readinessScore || 0) < Number(oldData.quality.readinessScore || 0)) warnings.push(`Readiness score decreased: ${oldData.quality.readinessScore || 'unknown'} -> ${newData.quality.readinessScore || 'unknown'}.`);
if (bindingDiff.removed.length) warnings.push(`${bindingDiff.removed.length} binding(s) were removed. Confirm this is intentional.`);
if (componentDiff.removed.length) warnings.push(`${componentDiff.removed.length} component(s) were removed. Confirm this is intentional.`);
if (iconDiff.removed.length) warnings.push(`${iconDiff.removed.length} icon(s) were removed. Confirm this is intentional.`);

const report = `# TranslateIT UI Package Diff Report

Old package: ${oldFile}
New package: ${newFile}
Generated at: ${new Date().toISOString()}

## Quality

- Old readiness: ${oldData.quality.readinessLevel || 'UNKNOWN'} (${oldData.quality.readinessScore ?? 'unknown'}/100)
- New readiness: ${newData.quality.readinessLevel || 'UNKNOWN'} (${newData.quality.readinessScore ?? 'unknown'}/100)

${section('Warnings', warnings)}
${section('Added Components', componentDiff.added)}
${section('Removed Components', componentDiff.removed)}
${section('Changed Components', componentDiff.changed)}
${section('Added Bindings', bindingDiff.added)}
${section('Removed Bindings', bindingDiff.removed)}
${section('Changed Bindings', bindingDiff.changed)}
${section('Added Icons', iconDiff.added)}
${section('Removed Icons', iconDiff.removed)}
${section('Changed Icons', iconDiff.changed)}
${section('Added Color Tokens', colorDiff.added)}
${section('Removed Color Tokens', colorDiff.removed)}
## Review Rule

Do not sync the new package into app runtime until removed bindings/components/icons are confirmed intentional and readiness has not regressed.
`;

fs.writeFileSync(outFile, report);
console.log(`Diff report generated: ${outFile}`);
console.log(`Components: +${componentDiff.added.length} / -${componentDiff.removed.length} / changed ${componentDiff.changed.length}`);
console.log(`Bindings: +${bindingDiff.added.length} / -${bindingDiff.removed.length} / changed ${bindingDiff.changed.length}`);
console.log(`Icons: +${iconDiff.added.length} / -${iconDiff.removed.length} / changed ${iconDiff.changed.length}`);
console.log(`Warnings: ${warnings.length}`);
if (warnings.length) process.exitCode = 2;
