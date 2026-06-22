import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pluginRoot = path.resolve(root, '..', 'plugin');
const failures = [];
function read(file) { return fs.readFileSync(file, 'utf8'); }
function must(name, text, marker) { if (!text.includes(marker)) failures.push(`${name} missing ${marker}`); }
function mustNot(name, text, marker) { if (text.includes(marker)) failures.push(`${name} must not include ${marker}`); }
const manifest = JSON.parse(read(path.join(pluginRoot, 'manifest.json')));
const health = read(path.join(root, 'src', 'health-status.mjs'));
const renderer = read(path.join(pluginRoot, manifest.main || 'code.js'));
const ui = read(path.join(pluginRoot, manifest.ui || 'ui.html'));
if (manifest.main !== 'code-framework-editable.js') failures.push('manifest main must be code-framework-editable.js');
if (manifest.ui !== 'ui-framework.html') failures.push('manifest ui must be ui-framework.html');
must('health', health, 'plugin/code-framework-editable.js');
must('health', health, 'framework-editable-output');
must('renderer', renderer, '01 Native Editable Working Frame');
must('renderer', renderer, 'renderFramework');
must('renderer', renderer, '02 Screenshot Reference / Source Below');
must('renderer', renderer, 'Screenshot reference is below only');
must('renderer', renderer, 'No screenshot inside working frame');
mustNot('renderer', renderer, 'Visual Backing / Source Screenshot');
mustNot('renderer', renderer, 'Editable Reconstruction / Low Opacity');
mustNot('renderer', renderer, '01 Visual-Backed Editable Clone');
must('ui', ui, 'Framework Editable Output');
must('ui', ui, 'plugin/code-framework-editable.js');
must('ui', ui, 'Screenshot: locked reference below only');
const report = { gate: 'translateit-framework-output-contract', status: failures.length ? 'fail' : 'pass', manifestMain: manifest.main, manifestUi: manifest.ui, failures };
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'translateit-framework-output-contract.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
