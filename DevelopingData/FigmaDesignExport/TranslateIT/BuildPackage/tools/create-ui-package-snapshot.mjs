#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const input = process.argv[2] || 'ui-build-package.json';
const snapshotDir = process.argv[3] || 'Snapshots';

if (!fs.existsSync(input)) {
  console.error(`Missing package file: ${input}`);
  process.exit(1);
}

let raw = fs.readFileSync(input, 'utf8');
let pkg;
try {
  pkg = JSON.parse(raw);
} catch (error) {
  console.error(`Invalid package JSON: ${error.message}`);
  process.exit(1);
}

function safeName(value) {
  return String(value || 'ui-package')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'ui-package';
}

const generatedAt = new Date().toISOString();
const hash = crypto.createHash('sha256').update(raw).digest('hex');
const shortHash = hash.slice(0, 12);
const sourceName = safeName(pkg.source?.importRun || pkg.source?.exportedRoot || 'ui-package');
const stamp = generatedAt.replace(/[:.]/g, '-');
const baseName = `${stamp}-${sourceName}-${shortHash}`;

fs.mkdirSync(snapshotDir, { recursive: true });
const packagePath = path.join(snapshotDir, `${baseName}.json`);
const manifestPath = path.join(snapshotDir, `${baseName}.manifest.json`);

const manifest = {
  schema: 'translateit.ui-package-snapshot.v1',
  generatedAt,
  sourceFile: input,
  packageFile: packagePath,
  sha256: hash,
  source: pkg.source || {},
  quality: pkg.quality || null,
  stats: {
    screens: Array.isArray(pkg.screens) ? pkg.screens.length : 0,
    components: Array.isArray(pkg.components) ? pkg.components.length : 0,
    backendBindings: Array.isArray(pkg.backendBindings) ? pkg.backendBindings.length : 0,
    icons: Array.isArray(pkg.assets?.icons) ? pkg.assets.icons.length : 0,
    colors: Array.isArray(pkg.tokens?.colors) ? pkg.tokens.colors.length : 0
  }
};

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Snapshot package: ${packagePath}`);
console.log(`Snapshot manifest: ${manifestPath}`);
console.log(`SHA256: ${hash}`);
console.log(`Readiness: ${manifest.quality?.readinessLevel || 'UNKNOWN'} (${manifest.quality?.readinessScore ?? 'unknown'}/100)`);
