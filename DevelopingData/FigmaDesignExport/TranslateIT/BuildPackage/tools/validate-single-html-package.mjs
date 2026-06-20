#!/usr/bin/env node
import fs from 'node:fs';

const input = process.argv[2];

if (!input) {
  console.error('Usage: node tools/validate-single-html-package.mjs <single-html-file>');
  process.exit(1);
}

if (!fs.existsSync(input)) {
  console.error(`Missing HTML file: ${input}`);
  process.exit(1);
}

const html = fs.readFileSync(input, 'utf8');
const errors = [];
const warnings = [];
const info = [];

function count(pattern) {
  return (html.match(pattern) || []).length;
}

function has(pattern) {
  return pattern.test(html);
}

const styleBlocks = count(/<style\b[\s\S]*?<\/style>/gi);
const symbols = count(/<symbol\b/gi);
const dataComponents = count(/data-component\s*=/gi);
const dataActions = count(/data-action\s*=/gi);
const dataBackend = count(/data-backend\s*=/gi);
const dataBind = count(/data-bind\s*=/gi);
const dataSlot = count(/data-slot\s*=/gi);
const dataIcon = count(/data-icon\s*=/gi);
const externalStyles = count(/<link\b[^>]*rel=["']?stylesheet/gi);
const images = count(/<img\b/gi);
const scripts = count(/<script\b/gi);

if (!html.trim()) errors.push('HTML file is empty.');
if (!styleBlocks) warnings.push('No embedded <style> block found. Plugin will use generic layout.');
if (externalStyles) warnings.push(`${externalStyles} external stylesheet link(s) found. Embed CSS inside <style>.`);
if (scripts) warnings.push(`${scripts} script tag(s) found. Plugin ignores scripts; use data-action/data-backend.`);
if (!dataComponents) warnings.push('No data-component attributes found. Figma/code component handoff will be weak.');
if (!dataActions) warnings.push('No data-action attributes found. UI may not call backend actions.');
if (dataActions > dataBackend) warnings.push(`${dataActions - dataBackend} action(s) may not have data-backend override.`);
if (!dataBind && !dataSlot) warnings.push('No data-bind or data-slot attributes found. Runtime state/output handoff will be weak.');
if (dataIcon && !symbols) warnings.push('data-icon usage found but no SVG <symbol> definitions found. Fallback icons may be used.');
if (images) warnings.push(`${images} image tag(s) found. Plugin converts images to placeholders.`);

const unsupportedPatterns = [
  ['CSS grid', /display\s*:\s*(inline-)?grid/i],
  ['absolute/fixed/sticky positioning', /position\s*:\s*(absolute|fixed|sticky)/i],
  ['media queries', /@media\b/i],
  ['container queries', /@container\b/i],
  ['pseudo selectors', /::?[a-z-]+/i],
  ['animation/keyframes', /@keyframes\b|animation\s*:/i],
  ['transform', /transform\s*:/i],
  ['external url assets', /url\(/i],
  ['box-shadow', /box-shadow\s*:/i],
  ['filter/backdrop-filter', /(backdrop-filter|filter)\s*:/i]
];

for (const [label, pattern] of unsupportedPatterns) {
  if (has(pattern)) warnings.push(`${label} detected. Plugin will approximate or ignore it.`);
}

info.push(`styleBlocks=${styleBlocks}`);
info.push(`symbols=${symbols}`);
info.push(`dataComponents=${dataComponents}`);
info.push(`dataActions=${dataActions}`);
info.push(`dataBackend=${dataBackend}`);
info.push(`dataBind=${dataBind}`);
info.push(`dataSlot=${dataSlot}`);
info.push(`dataIcon=${dataIcon}`);

const score = Math.max(0, Math.min(100,
  100
  - errors.length * 50
  - Math.min(40, warnings.length * 4)
  - (!styleBlocks ? 10 : 0)
  - (!dataComponents ? 8 : 0)
  - (!dataActions ? 5 : 0)
  - (!dataBind && !dataSlot ? 5 : 0)
));

const level = errors.length ? 'BLOCKED' : score >= 85 ? 'READY' : score >= 70 ? 'USABLE_WITH_WARNINGS' : 'NEEDS_CLEANUP';

console.log('TranslateIT Single HTML Package Validation');
console.log(`Input: ${input}`);
console.log(`Readiness: ${level} (${score}/100)`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Info: ${info.join(' / ')}`);

if (errors.length) {
  console.log('\nErrors:');
  errors.forEach(item => console.log(`- ${item}`));
}

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach(item => console.log(`- ${item}`));
}

if (errors.length) process.exit(1);
