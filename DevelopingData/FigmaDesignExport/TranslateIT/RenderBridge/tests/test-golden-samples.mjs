import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fixturePath = path.join(root, 'tests', 'fixtures', 'designit-golden-samples.json');
const failures = [];
const warnings = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    failures.push(`cannot read golden sample fixture: ${error.message}`);
    return { samples: [] };
  }
}

const config = readJson(fixturePath);
const samples = Array.isArray(config.samples) ? config.samples : [];
const expectedIds = new Set(['simple-landing-page', 'dashboard-settings-page', 'card-grid', 'form-input-page', 'navbar-content-section']);
const scoringKeys = ['textPreservation', 'layoutAccuracy', 'layerCleanliness', 'componentEditability', 'assetHandling', 'garbageLayerControl'];
const minimumKeys = ['editableText', 'editableImages', 'editableButtons', 'editableInputs', 'cards', 'sections'];

if (config.schema !== 'designit-golden-samples') failures.push('golden sample schema mismatch');
if (Number(config.minimumPassScore) !== 80) failures.push('minimumPassScore must be 80');
if (samples.length !== 5) failures.push(`expected 5 golden samples, found ${samples.length}`);

for (const sample of samples) {
  if (!sample.id || !expectedIds.has(sample.id)) failures.push(`unexpected or missing sample id: ${sample.id || 'missing'}`);
  if (!sample.name || sample.name.length < 4) failures.push(`${sample.id || 'unknown'}: sample name is too weak`);
  if (!sample.purpose || sample.purpose.length < 30) failures.push(`${sample.id || 'unknown'}: purpose must be clear`);
  if (sample.sourceType !== 'html-fixture') failures.push(`${sample.id}: sourceType must be html-fixture`);
  if (!Array.isArray(sample.requiredSections) || sample.requiredSections.length < 2) failures.push(`${sample.id}: requiredSections must include at least 2 sections`);
  if (!Array.isArray(sample.requiredGrouping) || sample.requiredGrouping.length < 2) failures.push(`${sample.id}: requiredGrouping must include at least 2 groups`);
  if (!Array.isArray(sample.failureConditions) || sample.failureConditions.length < 3) failures.push(`${sample.id}: failureConditions must include at least 3 conditions`);

  for (const key of minimumKeys) {
    if (!Number.isFinite(Number(sample.minimums?.[key]))) failures.push(`${sample.id}: minimums.${key} must be numeric`);
  }

  let scoreTotal = 0;
  for (const key of scoringKeys) {
    const value = Number(sample.scoring?.[key]);
    if (!Number.isFinite(value) || value <= 0) failures.push(`${sample.id}: scoring.${key} must be positive`);
    scoreTotal += Number.isFinite(value) ? value : 0;
  }
  if (scoreTotal !== 100) failures.push(`${sample.id}: scoring total must be 100, got ${scoreTotal}`);

  if (sample.minimums?.editableText < 8) warnings.push(`${sample.id}: editable text minimum is low for professional output`);
  if (sample.id === 'form-input-page' && sample.minimums?.editableInputs < 4) failures.push('form-input-page must require at least 4 editable inputs');
  if (sample.id === 'card-grid' && sample.minimums?.cards < 6) failures.push('card-grid must require at least 6 cards');
}

for (const expectedId of expectedIds) {
  if (!samples.some((sample) => sample.id === expectedId)) failures.push(`missing required golden sample: ${expectedId}`);
}

const report = {
  gate: 'designit-golden-samples',
  status: failures.length ? 'fail' : 'pass',
  fixture: path.relative(root, fixturePath).replace(/\\/g, '/'),
  minimumPassScore: config.minimumPassScore || null,
  samples: samples.map((sample) => ({
    id: sample.id,
    name: sample.name,
    minimums: sample.minimums,
    requiredSections: sample.requiredSections,
    requiredGrouping: sample.requiredGrouping
  })),
  warnings,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
