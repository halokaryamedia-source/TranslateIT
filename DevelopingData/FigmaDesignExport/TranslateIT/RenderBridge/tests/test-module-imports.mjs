const modules = [
  '../src/shared-contract.mjs',
  '../src/capture-site.mjs',
  '../src/extract-layout.mjs',
  '../src/build-visual-model.mjs',
  '../src/build-design-model.mjs',
  '../src/reconstruct-text-lines.mjs',
  '../src/guard-hero-occlusion.mjs',
  '../src/match-dom-visual.mjs',
  '../src/build-clone-model.mjs',
  '../src/render-clone-preview.mjs',
  '../src/compare-visual-screenshots.mjs',
  '../src/run-clone-audit.mjs',
  '../src/route-handlers.mjs',
  '../src/health-status.mjs'
];

const failures = [];
for (const mod of modules) {
  try {
    await import(mod);
  } catch (err) {
    failures.push({ module: mod, error: err && err.message ? err.message : String(err) });
  }
}

const report = {
  gate: 'translateit-module-imports',
  status: failures.length ? 'fail' : 'pass',
  modules: modules.length,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
