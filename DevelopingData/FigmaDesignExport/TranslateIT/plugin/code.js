figma.showUI(__html__,{width:580,height:860});
figma.ui.postMessage({type:'status',text:'Legacy renderer disabled. TranslateIT Version 0.1 - Alpha now requires strict V5. Use plugin/manifest.json with main: code.v5.strict.js and start RenderBridge through start-alpha-v5.mjs or start-alpha-v5-gated.ps1.'});
figma.ui.onmessage=async()=>{figma.ui.postMessage({type:'status',text:'Plugin error: legacy code.js is disabled. Reload plugin using manifest.json that points to code.v5.strict.js.'})};
