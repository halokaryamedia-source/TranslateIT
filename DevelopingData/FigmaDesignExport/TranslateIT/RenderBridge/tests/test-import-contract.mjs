import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workspaceRoot = path.resolve(root, '..');
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

function has(name, text, marker) {
  if (!String(text || '').includes(marker)) failures.push(`${name} missing contract marker: ${marker}`);
}

const approvedNodeTypes = new Set(['frame', 'group', 'text', 'image', 'shape', 'button', 'input', 'icon', 'card', 'section']);
const manifest = readJson(path.join(pluginRoot, 'manifest.json'));
const buildCloneModel = read(path.join(root, 'src', 'build-clone-model.mjs'));
const buildFigmaRenderPlan = read(path.join(root, 'src', 'build-figma-render-plan.mjs'));
const finalPayload = read(path.join(root, 'src', 'build-final-payload.mjs'));
const renderer = read(path.join(pluginRoot, manifest.main || ''));

const fixtureNodes = [
  { id: 'section-hero', type: 'section', name: 'Section / Hero', bounds: { x: 0, y: 0, width: 1440, height: 720 }, editable: true, children: [] },
  { id: 'frame-main', type: 'frame', name: 'Hero / Content Frame', bounds: { x: 80, y: 96, width: 640, height: 420 }, editable: true, children: [] },
  { id: 'group-nav', type: 'group', name: 'Header / Navigation', bounds: { x: 80, y: 24, width: 520, height: 44 }, editable: true, children: [] },
  { id: 'text-title', type: 'text', name: 'Hero / Title / Build faster with DesignIT', bounds: { x: 80, y: 120, width: 600, height: 96 }, text: 'Build faster with DesignIT', editable: true, style: { fontSize: 56, fontWeight: 700, color: '#111827' } },
  { id: 'image-hero', type: 'image', name: 'Hero / Image / Product preview', bounds: { x: 780, y: 120, width: 520, height: 360 }, asset: { id: 'asset-hero', kind: 'image', source: 'fixture' }, editable: true },
  { id: 'shape-surface', type: 'shape', name: 'Hero / Surface / Card background', bounds: { x: 760, y: 100, width: 560, height: 400 }, editable: true, style: { fill: '#FFFFFF', radius: 24 } },
  { id: 'button-primary', type: 'button', name: 'Button / Primary / Start import', bounds: { x: 80, y: 320, width: 180, height: 48 }, text: 'Start import', editable: true },
  { id: 'input-email', type: 'input', name: 'Form / Input / Email address', bounds: { x: 80, y: 392, width: 320, height: 48 }, text: 'Email address', editable: true },
  { id: 'icon-plus', type: 'icon', name: 'Icon / Plus', bounds: { x: 96, y: 334, width: 20, height: 20 }, asset: { id: 'asset-plus', kind: 'svg', source: 'fixture' }, editable: true },
  { id: 'card-feature', type: 'card', name: 'Card / Feature / Real-time import', bounds: { x: 80, y: 500, width: 360, height: 180 }, editable: true, children: [] }
];

function validBounds(bounds) {
  return bounds && Number.isFinite(Number(bounds.x)) && Number.isFinite(Number(bounds.y)) && Number(bounds.width) >= 1 && Number(bounds.height) >= 1;
}

function validateNode(node) {
  const issues = [];
  if (!node.id || typeof node.id !== 'string') issues.push('missing id');
  if (!approvedNodeTypes.has(node.type)) issues.push(`invalid type: ${node.type}`);
  if (!node.name || /^(Layer|undefined|null)$/i.test(node.name)) issues.push('weak name');
  if (!validBounds(node.bounds)) issues.push('invalid bounds');
  if (typeof node.editable !== 'boolean') issues.push('editable must be boolean');
  if (node.type === 'text' && !String(node.text || '').trim()) issues.push('text node must include text');
  if ((node.type === 'image' || node.type === 'icon') && !node.asset?.id) issues.push(`${node.type} node must include asset id`);
  if (node.asset && !['image', 'svg', 'background', 'icon'].includes(node.asset.kind)) issues.push(`invalid asset kind: ${node.asset.kind}`);
  if (node.children && !Array.isArray(node.children)) issues.push('children must be an array');
  return issues;
}

for (const node of fixtureNodes) {
  const issues = validateNode(node);
  if (issues.length) failures.push(`${node.id || 'unknown node'}: ${issues.join(', ')}`);
}

const observedTypes = new Set(fixtureNodes.map((node) => node.type));
for (const requiredType of approvedNodeTypes) {
  if (!observedTypes.has(requiredType)) failures.push(`contract fixture missing node type: ${requiredType}`);
}

has('build-clone-model', buildCloneModel, 'layout-preserving-editable-clone');
has('build-clone-model', buildCloneModel, 'editable: true');
has('build-clone-model', buildCloneModel, 'groupPath');
has('build-clone-model', buildCloneModel, 'assets');
has('build-figma-render-plan', buildFigmaRenderPlan, 'buildFigmaRenderPlan');
has('build-figma-render-plan', buildFigmaRenderPlan, 'warnings');
has('build-figma-render-plan', buildFigmaRenderPlan, 'editable');
has('build-figma-render-plan', buildFigmaRenderPlan, 'missing-image-asset');
has('final-payload', finalPayload, 'figmaRenderPlan');
has('final-payload', finalPayload, 'cloneModel');
has('renderer', renderer, 'figmaRenderPlan');
has('renderer', renderer, 'createText');
has('renderer', renderer, 'createRectangle');
has('renderer', renderer, 'createImage');

if (!renderer.includes('input')) warnings.push('The active renderer does not yet expose a dedicated input primitive path. Inputs remain a planned quality improvement.');
if (!renderer.includes('icon')) warnings.push('The active renderer does not yet expose a dedicated vector icon primitive path. Icon fidelity remains a planned quality improvement.');

const report = {
  gate: 'designit-import-contract',
  status: failures.length ? 'fail' : 'pass',
  approvedNodeTypes: Array.from(approvedNodeTypes),
  fixtureNodes: fixtureNodes.length,
  activeContract: {
    payloadModel: 'cloneModel',
    renderPlan: 'figmaRenderPlan',
    renderer: manifest.main || null,
    ui: manifest.ui || null
  },
  warnings,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
