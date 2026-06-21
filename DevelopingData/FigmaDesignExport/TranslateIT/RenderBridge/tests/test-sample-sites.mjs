const target = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
async function json(res){const t=await res.text();let p={};try{p=t?JSON.parse(t):{}}catch{}if(!res.ok)throw new Error('HTTP '+res.status+': '+(p.error||t));return p}
const health=await json(await fetch(bridge+'/health'));
if(health.engine!=='translateit-core')throw new Error('Wrong engine: '+(health.engine||'missing'));
if(health.engineBuild!=='alpha-clean-1')throw new Error('Wrong engine build: '+(health.engineBuild||'missing'));
if(health.legacyActive!==false)throw new Error('legacyActive must be false');
if(health.contract!=='cloneModel')throw new Error('Wrong contract: '+(health.contract||'missing'));
const report=await json(await fetch(bridge+'/audit?url='+encodeURIComponent(target)));
console.log(JSON.stringify({publicVersion:report.publicVersion,engine:report.engine,engineBuild:report.engineBuild,targetUrl:report.targetUrl,readyForFigmaTest:report.readyForFigmaTest,visualReadiness:report.audit&&report.audit.visualReadiness,score:report.audit&&report.audit.score,layoutScore:report.audit&&report.audit.layoutScore,overlapScore:report.audit&&report.audit.overlapScore,imageScore:report.audit&&report.audit.imageScore,textScore:report.audit&&report.audit.textScore,sectionScore:report.audit&&report.audit.sectionScore,layerCleanlinessScore:report.audit&&report.audit.layerCleanlinessScore,cloneFidelityScore:report.audit&&report.audit.cloneFidelityScore,metrics:report.audit&&report.audit.metrics,cloneModel:report.diagnostics&&report.diagnostics.cloneModel||null,reportPath:report.reportPath,failures:report.audit&&report.audit.failures||[],warnings:report.audit&&report.audit.warnings||[]},null,2));
if(!report.readyForFigmaTest)process.exitCode=2;
