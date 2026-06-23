const target = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
async function json(res){const t=await res.text();let p={};try{p=t?JSON.parse(t):{}}catch{}if(!res.ok)throw new Error('HTTP '+res.status+': '+(p.error||t));return p}
const health=await json(await fetch(bridge+'/health'));
if(health.engine!=='translateit-core')throw new Error('Wrong engine: '+(health.engine||'missing'));
if(health.engineBuild!=='alpha-clean-1')throw new Error('Wrong engine build: '+(health.engineBuild||'missing'));
if(health.retiredWorkflowActive!==false)throw new Error('retiredWorkflowActive must be false');
if(health.contract!=='cloneModel')throw new Error('Wrong contract: '+(health.contract||'missing'));
if(health.visualModel!=='screenshot-first-external-parser-required')throw new Error('Wrong visualModel: '+(health.visualModel||'missing'));
if(health.visualMatching!=='external-regions-to-figma-layout')throw new Error('Wrong visualMatching: '+(health.visualMatching||'missing'));
const report=await json(await fetch(bridge+'/audit?url='+encodeURIComponent(target)));
const cp=report.diagnostics&&report.diagnostics.clonePreview||{};
console.log(JSON.stringify({publicVersion:report.publicVersion,engine:report.engine,engineBuild:report.engineBuild,targetUrl:report.targetUrl,readyForFigmaTest:report.readyForFigmaTest,visualReadiness:report.audit&&report.audit.visualReadiness,score:report.audit&&report.audit.score,metrics:report.audit&&report.audit.metrics,visualModel:report.diagnostics&&report.diagnostics.visualModel||null,visualMatching:report.diagnostics&&report.diagnostics.visualMatching||null,clonePreview:{htmlPath:cp.htmlPath,pngPath:cp.pngPath,metrics:cp.metrics,comparison:cp.comparison||null,visualDiff:cp.visualDiff||null},cloneModel:report.diagnostics&&report.diagnostics.cloneModel||null,reportPath:report.reportPath,failures:report.audit&&report.audit.failures||[],warnings:report.audit&&report.audit.warnings||[]},null,2));
if(!report.readyForFigmaTest)process.exitCode=2;
