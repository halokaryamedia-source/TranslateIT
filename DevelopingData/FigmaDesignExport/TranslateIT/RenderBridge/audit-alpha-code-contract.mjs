import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const bridgePath = path.resolve(process.cwd(), 'server.mjs');
const pluginPath = path.resolve(root, 'plugin', 'code.js');
const uiPath = path.resolve(root, 'plugin', 'ui.html');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function has(text, pattern) {
  return typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
}

const bridge = read(bridgePath);
const plugin = read(pluginPath);
const ui = read(uiPath);

const checks = [
  ['bridge public version locked', bridge, 'Version 0.1 - Alpha'],
  ['bridge alpha mode', bridge, 'translateit-design-clone-alpha'],
  ['bridge semantic priorityText', bridge, 'priorityText'],
  ['bridge semantic contentBudget', bridge, 'contentBudget'],
  ['bridge semantic suggestedLayout', bridge, 'suggestedLayout'],
  ['bridge component blueprints', bridge, 'componentBlueprints'],
  ['bridge quality hints', bridge, 'qualityHints'],
  ['plugin public version locked', plugin, 'Version 0.1 - Alpha'],
  ['plugin alpha renderer', plugin, 'translateit-alpha-figma-design-renderer'],
  ['plugin reads priorityText', plugin, 'priorityText'],
  ['plugin reads contentBudget', plugin, 'contentBudget'],
  ['plugin renders componentBlueprints', plugin, 'componentBlueprints'],
  ['plugin tracks overflow risk', plugin, 'overflowRiskCount'],
  ['plugin schema alpha', plugin, 'translateit.design-clone.alpha'],
  ['ui public version locked', ui, 'Version 0.1 - Alpha'],
  ['ui no public V11 label', ui, (text) => !/V11\.\d|V11 Design Clone Dev Build/.test(text)]
];

const results = checks.map(([name, text, rule]) => {
  const ok = typeof rule === 'function' ? rule(text) : has(text, rule);
  return { name, ok };
});

const failed = results.filter((item) => !item.ok);
const score = Math.round(((results.length - failed.length) / results.length) * 1000) / 100;

const report = {
  publicVersion: 'Version 0.1 - Alpha',
  score,
  passed: results.length - failed.length,
  total: results.length,
  failed,
  readiness: failed.length === 0 ? 'contract-clean' : 'contract-needs-fix',
  note: 'Static code contract audit only. It does not replace runtime smoke test or Figma validation.'
};

console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 2;
