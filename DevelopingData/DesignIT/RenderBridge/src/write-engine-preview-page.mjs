import fs from 'node:fs';
import path from 'node:path';
function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return null}}
export function writeEnginePreviewPage(reportDir){
  const engine=readJson(path.join(reportDir,'translateit-engine-pipeline-readiness.json'))||{};
  const status=engine.figmaTestAllowed?'PREVIEW REVIEWABLE':'NOT READY FOR FIGMA TEST';
  const html=`<!doctype html><meta charset="utf-8"><title>TranslateIT Engine Preview</title><style>body{font-family:Inter,Arial,sans-serif;background:#0f172a;color:#e5e7eb;padding:28px}.bad{color:#fca5a5}.ok{color:#86efac}pre{background:#020617;border:1px solid #334155;border-radius:14px;padding:16px;white-space:pre-wrap}</style><h1 class="${engine.figmaTestAllowed?'ok':'bad'}">${status}</h1><p>Manual Figma test is blocked until external parser, visual intent, layout intent, blueprint, and preview gates pass.</p><h2>Engine Pipeline Report</h2><pre>${esc(JSON.stringify(engine,null,2))}</pre>`;
  const out=path.join(reportDir,'translateit-engine-preview.html');
  fs.writeFileSync(out,html,'utf8');
  return out;
}
if(process.argv[1]&&process.argv[1].endsWith('write-engine-preview-page.mjs')) console.log(writeEnginePreviewPage(process.argv[2]||path.join(process.cwd(),'reports')));
