import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workspaceRoot = path.resolve(root, '..');
const repoRoot = path.resolve(root, '../../../..');
const pluginRoot = path.join(workspaceRoot, 'plugin');
const failures = [];
const warnings = [];

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    failures.push(`missing file: ${path.relative(workspaceRoot, file)} (${error.message})`);
    return '';
  }
}

function readJson(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    failures.push(`invalid json: ${path.relative(workspaceRoot, file)} (${error.message})`);
    return {};
  }
}

function exists(file) {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

function listFiles(dir, out = []) {
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

const manifest = readJson(path.join(pluginRoot, 'manifest.json'));
const pkg = readJson(path.join(root, 'package.json'));
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'translateit-renderbridge-self-audit.yml');
const workflow = read(workflowPath);

const activeFiles = new Set([
  path.join(pluginRoot, manifest.main || ''),
  path.join(pluginRoot, manifest.ui || ''),
  path.join(pluginRoot, 'manifest.json'),
  path.join(root, 'server.mjs'),
  path.join(root, 'src', 'route-handlers.mjs'),
  path.join(root, 'src', 'capture-site.mjs'),
  path.join(root, 'src', 'extract-layout-dom-faithful.mjs'),
  path.join(root, 'src', 'build-payload.mjs'),
  path.join(root, 'src', 'build-payload-core-v5.mjs'),
  path.join(root, 'src', 'build-payload-core-v4.mjs'),
  path.join(root, 'src', 'build-final-payload.mjs'),
  path.join(root, 'src', 'build-figma-render-plan.mjs')
].map((file) => path.normalize(file)));

const knownCleanupCandidates = [
  'plugin/code.js',
  'plugin/code-visual-backed.js',
  'plugin/code-native-editable.js',
  'plugin/code-framework-editable.js',
  'plugin/ui.html',
  'RenderBridge/src/build-payload-core-v3.mjs',
  'RenderBridge/src/professionalize-clone-model-v2.mjs',
  'RenderBridge/tests/test-v2-markers.mjs'
];

const pluginFiles = listFiles(pluginRoot).map((file) => path.normalize(file));
const testFiles = listFiles(path.join(root, 'tests')).map((file) => path.normalize(file));
const scripts = pkg.scripts || {};
const scriptText = JSON.stringify(scripts, null, 2);
const workflowText = String(workflow || '');

if (manifest.main !== 'code-framework-production.js') failures.push(`manifest points to non-approved renderer: ${manifest.main || 'missing'}`);
if (manifest.ui !== 'ui-framework.html') failures.push(`manifest points to non-approved UI: ${manifest.ui || 'missing'}`);
if (scripts['test:v2']) failures.push('package.json must not expose test:v2 as an active script');
if (scriptText.includes('test-v2-markers.mjs')) failures.push('package scripts must not reference test-v2-markers.mjs');
if (workflowText.includes('npm run test:v2') || workflowText.includes('run_step "v2"')) failures.push('workflow must not run the stale v2 gate');

for (const candidate of knownCleanupCandidates) {
  const absolute = path.normalize(path.join(workspaceRoot, candidate));
  if (exists(absolute)) warnings.push({ type: 'cleanup-candidate-present', path: candidate, action: 'verify references before deletion' });
}

for (const file of pluginFiles) {
  const rel = path.relative(workspaceRoot, file).replace(/\\/g, '/');
  const isActive = activeFiles.has(path.normalize(file));
  const isKnownCandidate = knownCleanupCandidates.includes(rel);
  if (!isActive && !isKnownCandidate) warnings.push({ type: 'unclassified-plugin-file', path: rel, action: 'classify before editing' });
}

for (const file of testFiles) {
  const rel = path.relative(workspaceRoot, file).replace(/\\/g, '/');
  if (/legacy|archive|backup|deprecated|\.bak$/i.test(rel)) failures.push(`forbidden cleanup-style test file found: ${rel}`);
}

const forbiddenDirectoryNames = ['legacy', 'archive', 'backup', 'old', 'deprecated'];
for (const dirName of forbiddenDirectoryNames) {
  const directWorkspacePath = path.join(workspaceRoot, dirName);
  const directRenderBridgePath = path.join(root, dirName);
  if (exists(directWorkspacePath)) failures.push(`forbidden folder exists in workspace: ${dirName}`);
  if (exists(directRenderBridgePath)) failures.push(`forbidden folder exists in RenderBridge: ${dirName}`);
}

const report = {
  gate: 'designit-workspace-clean',
  status: failures.length ? 'fail' : 'pass',
  policy: {
    noNewVersionedFiles: 'planned by review; existing versioned candidates are reported until cleanup is approved',
    noLegacyArchiveBackupFolders: true,
    noParallelActiveRenderer: true,
    activeRenderer: manifest.main || null,
    activeUi: manifest.ui || null
  },
  cleanupCandidates: warnings.filter((item) => item.type === 'cleanup-candidate-present'),
  warnings,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
