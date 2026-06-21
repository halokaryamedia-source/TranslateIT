import fs from 'node:fs';
import path from 'node:path';

const bridgeRoot = process.cwd();
const projectRoot = path.resolve(bridgeRoot, '..');
const read = (file) => fs.readFileSync(path.join(projectRoot, file), 'utf8');

const files = {
  packageJson: read('RenderBridge/package.json'),
  serverMain: read('RenderBridge/server.mjs'),
  startFixed: read('RenderBridge/start-alpha-fixed.mjs'),
  startV5: read('RenderBridge/start-alpha-v5.mjs'),
  startCmd: read('RenderBridge/Start-Render-Bridge.cmd'),
  session: read('RenderBridge/Start-Render-Bridge-Session.ps1'),
  background: read('RenderBridge/Start-Render-Bridge-Background.ps1'),
  autoInstall: read('RenderBridge/Install-Auto-Bridge.ps1'),
  gated: read('RenderBridge/start-alpha-v5-gated.ps1'),
  manifest: read('plugin/manifest.json'),
  manifestV5: read('plugin/manifest.v5.json'),
  legacyCode: read('plugin/code.js'),
  nonStrictCode: read('plugin/code.v5.js'),
  strictCode: read('plugin/code.v5.strict.js')
};

const failures = [];
if (!files.packageJson.includes('"start": "node start-alpha-v5.mjs"')) failures.push('npm start is not V5');
if (!files.serverMain.includes('start-alpha-v5.mjs')) failures.push('server.mjs is not V5 alias');
if (!files.startFixed.includes('start-alpha-v5.mjs')) failures.push('start-alpha-fixed.mjs is not V5 alias');
if (!files.startV5.includes('start-alpha-v4-fixed.mjs')) failures.push('start-alpha-v5.mjs does not generate enhanced bridge');
if (!files.startCmd.includes('npm start')) failures.push('Start-Render-Bridge.cmd does not use npm start');
if (!files.session.includes('start-alpha-v5.mjs')) failures.push('session launcher does not use V5');
if (!files.background.includes('start-alpha-v5.mjs')) failures.push('background launcher does not use V5');
if (!files.autoInstall.includes('Strict V5 Auto Bridge')) failures.push('auto installer does not require strict V5');
if (!files.gated.includes('audit-alpha-v5-media.mjs')) failures.push('gated launcher still misses V5 media audit');
if (!files.manifest.includes('code.v5.strict.js')) failures.push('manifest is not strict V5');
if (!files.manifestV5.includes('code.v5.strict.js')) failures.push('alternate manifest is not strict V5');
if (!files.legacyCode.includes('Legacy renderer disabled')) failures.push('legacy code.js is not disabled');
if (!files.nonStrictCode.includes('Non-strict V5 renderer disabled')) failures.push('non-strict code.v5.js is not disabled');
if (!files.strictCode.includes('V5.1 visual layout')) failures.push('strict renderer is not V5.1 polished');

const report = {
  publicVersion: 'Version 0.1 - Alpha',
  gate: 'alpha-v5-single-active-engine',
  status: failures.length ? 'fail' : 'pass',
  activeBridge: 'start-alpha-v5.mjs',
  activeRenderer: 'code.v5.strict.js',
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 2;
