const target = process.argv[2] || 'https://www.mivubi.com/';
const bridge = process.env.TRANSLATEIT_RENDER_BRIDGE || 'http://127.0.0.1:8844';
async function json(res){const t=await res.text();let p={};try{p=t?JSON.parse(t):{}}catch{}if(!res.ok)throw new Error('HTTP '+res.status+': '+(p.error||t));return p}
const health=await json(await fetch(bridge+'/health'));
if(health.engine!=='translateit-core')throw new Error('Wrong engine: '+(health.engine||'missing'));
if(health.engineBuild!=='alpha-clean-1')throw new Error('Wrong engine build: '+(health.engineBuild||'missing'));
if(health.legacyActive!==false)throw new Error('legacyActive must be false');
if(health.contract!=='cloneModel')throw new Error('Wrong contract: '+(health.contract||'missing'));
if(health.visualModel!=='screenshot-first-html-assisted-v2')throw new Error('Wrong visualModel: '+(health.visualModel||'missing'));
if(health.visualMatching!=='dom-to-visual-foundation')throw new Error('Wrong visualMatching: '+(health.visualMatching||'missing'));
if(health.clonePreview!=='html-png-preview-foundation')throw new Error('Wrong clonePreview: '+(health.clonePreview||'missing'));
if(health.visualComparison!=='visual-comparison-v2')throw new Error('Wrong visualComparison: '+(health.visualComparison||'missing'));
if(health.visualDiffOverlay!==true)throw new Error('visualDiffOverlay must be true');
const report=await json(await fetch(bridge+'/audit?url='+encodeURIComponent(target)));
const cp=report.diagnostics&&report.diagnostics.clonePreview||{};
console.log(JSON.stringify({publicVersion:report.publicVersion,engine:report.engine,engineBuild:report.engineBuild,targetUrl:report.targetUrl,readyForFigmaTest:report.readyForFigmaTest,visualReadiness:report.audit&&report.audit.visualReadiness,score:report.audit&&report.audit.score,layoutScore:report.audit&&report.audit.layoutScore,overlapScore:report.audit&&report.audit.overlapScore,imageScore:report.audit&&report.audit.imageScore,textScore:report.audit&&report.audit.textScore,sectionScore:report.audit&&report.audit.sectionScore,layerCleanlinessScore:report.audit&&report.audit.layerCleanlinessScore,cloneFidelityScore:report.audit&&report.audit.cloneFidelityScore,visualMatchScore:report.audit&&report.audit.visualMatchScore,visualSimilarityScore:report.audit&&report.audit.visualSimilarityScore,metrics:report.audit&&report.audit.metrics,visualModel:report.diagnostics&&report.diagnostics.visualModel||null,visualMatching:report.diagnostics&&report.diagnostics.visualMatching||null,clonePreview:{htmlPath:cp.htmlPath,pngPath:cp.pngPath,metrics:cp.metrics,comparison:cp.comparison||null,visualDiff:cp.visualDiff||null},cloneModel:report.diagnostics&&report.diagnostics.cloneModel||null,reportPath:report.reportPath,failures:report.audit&&report.audit.failures||[],warnings:report.audit&&report.audit.warnings||[]},null,2));
if(!report.readyForFigmaTest)process.exitCode=2;
