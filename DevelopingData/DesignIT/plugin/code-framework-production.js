figma.showUI(__html__, { width: 580, height: 860 });

var PUBLIC_VERSION = 'Version 0.1 - Alpha';
var ENGINE = 'translateit-core';
var ENGINE_BUILD = 'alpha-clean-1';
var PAGE_NAME = 'DesignIT Import / Production Renderer';
var regular = { family: 'Inter', style: 'Regular' };
var bold = { family: 'Inter', style: 'Bold' };
var lastFrame = null;
var stats = null;

function arr(v){return Array.isArray(v)?v:[]}
function clean(v){return String(v||'').replace(/\s+/g,' ').trim()}
function num(v,f){v=Number(v);return isFinite(v)?v:(f||0)}
function clamp(v,a,b){v=Number(v);if(!isFinite(v))v=0;return Math.max(a,Math.min(b,v))}
function nameOf(v){return(clean(v)||'Layer').slice(0,100)}
function rgb(h){var raw=/^#[0-9a-fA-F]{6}$/.test(h||'')?h.slice(1):'111827';var n=parseInt(raw,16);return{r:((n>>16)&255)/255,g:((n>>8)&255)/255,b:(n&255)/255}}
function paint(h){return[{type:'SOLID',color:rgb(h||'#111827')}]}
function stat(){if(!stats)stats={rendered:0,skipped:0,fallback:0,errors:[],frames:0,groups:0,text:0,image:0,button:0,input:0,shape:0,effects:0,gradients:0,strokes:0,imageFit:0,responsiveFrames:0,desktopOnly:true,visualBackplate:0};return stats}
function post(t){figma.ui.postMessage({type:'status',text:t})}
function err(k,n,e){var s=stat();s.errors.push({kind:k,name:nameOf(n),message:e&&e.message?e.message:String(e)});if(s.errors.length>80)s.errors=s.errors.slice(0,80)}
function gradientPaint(st,fallback){var g=st&&st.backgroundGradient;var colors=arr(g&&g.colors).filter(function(c){return /^#[0-9a-fA-F]{6}$/.test(c)});if(g&&g.type==='linear'&&colors.length>=2){stat().gradients++;return[{type:'GRADIENT_LINEAR',gradientTransform:[[1,0,0],[0,1,0]],gradientStops:colors.slice(0,4).map(function(c,i,a){return{position:i/(a.length-1),color:rgb(c)}})}]}return fallback?paint(fallback):[]}
function shadowColor(s){var m=String(s||'').match(/rgba?\(([^)]+)\)/i);if(!m)return{r:0,g:0,b:0,a:.18};var p=m[1].split(',').map(function(x){return parseFloat(x)});return{r:clamp(p[0]||0,0,255)/255,g:clamp(p[1]||0,0,255)/255,b:clamp(p[2]||0,0,255)/255,a:clamp(p.length>3?p[3]:.2,0,1)}}
function shadowNums(s){return String(s||'').replace(/rgba?\([^)]+\)/ig,'').match(/-?\d+(\.\d+)?/g)||[]}
function effects(node,st){st=st||{};var bw=num(st.borderWidth,0);var bc=clean(st.borderColor);if(bw>0&&/^#[0-9a-fA-F]{6}$/.test(bc)){try{node.strokes=paint(bc);node.strokeWeight=Math.max(1,bw);node.strokeAlign='INSIDE';stat().strokes++}catch(e){err('stroke',node.name,e)}}var sh=clean(st.boxShadow);if(sh&&sh!=='none'){try{var ns=shadowNums(sh).map(function(x){return parseFloat(x)});node.effects=[{type:'DROP_SHADOW',color:shadowColor(sh),offset:{x:ns[0]||0,y:ns[1]||2},radius:Math.max(0,ns[2]||12),spread:ns[3]||0,visible:true,blendMode:'NORMAL'}];stat().effects++}catch(e){err('shadow',node.name,e)}}}
function bytes(v){try{var b=atob(v||'');var o=new Uint8Array(b.length);for(var i=0;i<b.length;i++)o[i]=b.charCodeAt(i);return o}catch(e){err('bytes','asset',e);return null}}
function scaleModeFrom(layer,style){var mode=clean(layer&&layer.imageFitPlan&&layer.imageFitPlan.scaleMode).toUpperCase();if(mode==='FIT'||mode==='FILL'||mode==='CROP'||mode==='TILE')return mode;if(mode==='STRETCH')return 'FILL';var fit=clean(style&&style.objectFit).toLowerCase();if(fit==='contain'||fit==='scale-down')return 'FIT';return 'FILL'}
function fillImage(asset,layer,style){try{var b=bytes(asset&&asset.base64);if(!b)return null;var im=figma.createImage(b);stat().imageFit++;return[{type:'IMAGE',imageHash:im.hash,scaleMode:scaleModeFrom(layer,style)}]}catch(e){err('image',asset&&asset.id,e);return null}}
function radius(v){return clamp(parseFloat(v||0),0,999)}
function frame(n,w,h,c,st){var f=figma.createFrame();f.name=nameOf(n);f.resize(Math.max(1,num(w,1)),Math.max(1,num(h,1)));f.fills=c?gradientPaint(st,c):[];try{f.opacity=clamp(num(st&&st.opacity,1),0,1)}catch(e){}f.strokes=[];f.clipsContent=false;effects(f,st);stat().frames++;return f}
function group(parent,n,r,c,st){var f=frame(n,num(r&&r.w,1),num(r&&r.h,1),c,st);f.x=num(r&&r.x,0);f.y=num(r&&r.y,0);parent.appendChild(f);stat().groups++;return f}
function asset(assets,id){for(var i=0;i<assets.length;i++)if(assets[i].id===id)return assets[i];return null}
function area(layer){var r=layer&&layer.rect||{};return Math.max(0,num(r.w,0))*Math.max(0,num(r.h,0))}
function isIconLike(layer,assetValue){var hint=(clean(layer&&layer.name)+' '+clean(layer&&layer.role)+' '+clean(layer&&layer.groupName)+' '+clean(assetValue&&assetValue.kind)+' '+clean(assetValue&&assetValue.name)).toLowerCase();if(/logo|brand/.test(hint))return false;return /icon|svg|svganimatedstring|content\s*\/\s*icon/.test(hint)}
function policyOf(payload){var p=payload&&payload.pluginRenderPolicy||{};return{renderResponsiveVariants:p.renderResponsiveVariants===true,skipNoisyIcons:p.skipNoisyIcons===true,skipMissingImageFallback:p.skipMissingImageFallback===true,maxIconImageArea:num(p.maxIconImageArea,48000),minimumRenderableImageArea:num(p.minimumRenderableImageArea,64)}}
function shouldSkipLayer(layer,assets,policy){var k=clean(layer&&layer.kind||layer&&layer.type);if(!layer)return true;if(layer.visualBackplate===true)return false;if(k==='text'&&!clean(layer.text))return true;if(k==='shape'&&area(layer)<24)return true;if(k==='image'){var a=asset(assets,layer.assetId);if(policy.skipNoisyIcons&&isIconLike(layer,a)&&area(layer)<=policy.maxIconImageArea){stat().skipped++;return true}if(area(layer)<policy.minimumRenderableImageArea){stat().skipped++;return true}if(policy.skipMissingImageFallback&&(!a||!a.base64)){stat().skipped++;return true}}return false}
async function ready(){try{await figma.loadFontAsync(regular)}catch(e){regular={family:'Roboto',style:'Regular'};await figma.loadFontAsync(regular)}try{await figma.loadFontAsync(bold)}catch(e){bold=regular}var p=null;for(var i=0;i<figma.root.children.length;i++)if(figma.root.children[i].name===PAGE_NAME)p=figma.root.children[i];if(!p)p=figma.createPage();p.name=PAGE_NAME;if(figma.setCurrentPageAsync)await figma.setCurrentPageAsync(p)}
function text(parent,n,value,r,style){var node=figma.createText();style=style||{};node.name=nameOf(n);try{node.locked=false}catch(e){}node.fontName=num(style.fontWeight,400)>=600?bold:regular;node.characters=clean(value)||' ';node.fontSize=clamp(num(style.fontSize,14),7,140);node.fills=paint(style.color||'#111827');try{node.opacity=clamp(num(style.opacity,1),0,1)}catch(e){}node.x=num(r&&r.x,0);node.y=num(r&&r.y,0);try{node.lineHeight=num(style.lineHeight,0)>0?{unit:'PIXELS',value:num(style.lineHeight,0)}:{unit:'AUTO'}}catch(e){}try{node.textAutoResize='HEIGHT';node.resize(Math.max(8,num(r&&r.w,220)),Math.max(10,num(r&&r.h,node.fontSize*1.4)))}catch(e){}parent.appendChild(node);stat().rendered++;stat().text++;return node}
function rect(parent,n,r,c,rad,st){var node=figma.createRectangle();st=st||{};node.name=nameOf(n);node.x=num(r&&r.x,0);node.y=num(r&&r.y,0);node.resize(Math.max(1,num(r&&r.w,1)),Math.max(1,num(r&&r.h,1)));node.fills=gradientPaint(st,c||'#E5E7EB');try{node.opacity=clamp(num(st&&st.opacity,1),0,1)}catch(e){}node.cornerRadius=radius(rad);node.strokes=[];effects(node,st);parent.appendChild(node);stat().rendered++;stat().shape++;return node}
function image(parent,n,assetValue,layer,policy){var r=layer.rect||{};var style=layer.style||{};var fill=assetValue&&assetValue.base64?fillImage(assetValue,layer,style):null;if(!fill&&policy&&policy.skipMissingImageFallback){stat().skipped++;return null}var node=figma.createRectangle();node.name=nameOf(n);node.x=num(r&&r.x,0);node.y=num(r&&r.y,0);node.resize(Math.max(1,num(r&&r.w,1)),Math.max(1,num(r&&r.h,1)));node.cornerRadius=radius(style.borderRadius);try{node.opacity=clamp(num(style.opacity,1),0,1)}catch(e){}if(fill){node.fills=fill;stat().image++}else{node.fills=gradientPaint(style,'#E5E7EB');stat().fallback++;stat().shape++}node.strokes=[];effects(node,style);parent.appendChild(node);stat().rendered++;return node}
function inputField(parent,n,layer){var r=layer.rect||{};var st=layer.style||{};var g=group(parent,n||'Input Field',r,st.backgroundColor||'#FFFFFF',st);g.cornerRadius=radius(st.borderRadius||12);try{g.strokes=paint(st.borderColor||'#D0D5DD');g.strokeWeight=Math.max(1,num(st.borderWidth,1));g.strokeAlign='INSIDE'}catch(e){err('input-stroke',n,e)}text(g,'Input Text',clean(layer.input&&layer.input.value||layer.input&&layer.input.placeholder||layer.text||'Input value'),{x:12,y:Math.max(5,Math.round(num(r.h,44)/2-10)),w:Math.max(24,num(r.w,160)-24),h:Math.max(12,num(r.h,44)-10)},{fontSize:num(st.fontSize,14),fontWeight:num(st.fontWeight,400),color:st.color||'#344054',lineHeight:num(st.lineHeight,0)});stat().input++;return g}
function renderLayer(parent,layer,assets,policy) {
  /* DESIGNIT_GENERIC_NESTED_GROUP_RENDER_V3 */
  if (layer && (layer.kind === 'group' || Array.isArray(layer.children))) {
    var nestedGroup = layer;
    var nestedFrame = group(parent, nestedGroup.name || 'Group', nestedGroup.rect || { x: 0, y: 0, w: 1, h: 1 }, null, nestedGroup.style || {});
    var nestedChildren = Array.isArray(nestedGroup.children) ? nestedGroup.children : [];
    for (var ngi = 0; ngi < nestedChildren.length; ngi++) renderLayer(nestedFrame, nestedChildren[ngi], assets, policy);
    return nestedFrame;
  }

  /* DESIGNIT_GENERIC_NESTED_GROUP_RENDER_V2 */
  if (layer && (layer.kind === 'group' || Array.isArray(layer.children))) {
    var nestedGroup = layer;
    var nestedFrame = group(parent, nestedGroup.name || 'Group', nestedGroup.rect || { x: 0, y: 0, w: 1, h: 1 }, null, nestedGroup.style || {});
    var nestedChildren = Array.isArray(nestedGroup.children) ? nestedGroup.children : [];
    for (var ngi = 0; ngi < nestedChildren.length; ngi++) renderLayer(nestedFrame, nestedChildren[ngi], assets, policy);
    return nestedFrame;
  }
try{if(shouldSkipLayer(layer,assets,policy))return null;var k=clean(layer.kind||layer.type);var r=layer.rect||{x:0,y:0,w:1,h:1};var st=layer.style||{};if(k==='text')return text(parent,layer.name||'Text',layer.text,r,st);if(k==='image')return image(parent,layer.name||'Image',asset(assets,layer.assetId),layer,policy);if(k==='button'){var g=group(parent,layer.name||'Button',r,st.backgroundColor||'#111827',st);text(g,'Button Label',layer.component&&layer.component.label||layer.text||'Button',{x:8,y:6,w:Math.max(10,num(r.w,80)-16),h:Math.max(10,num(r.h,34)-12)},{fontSize:num(st.fontSize,13),fontWeight:700,color:layer.component&&layer.component.textColor||'#FFFFFF'});stat().button++;return g}if(k==='input')return inputField(parent,layer.name||'Input Field',layer);if(k==='shape')return rect(parent,layer.name||'Shape',r,st.backgroundColor||'#FFFFFF',st.borderRadius,st);stat().skipped++;return null}catch(e){err('layer',layer&&layer.name,e);stat().fallback++;return null}}
function renderVisualBackplate(wrap,plan,assets){var vb=plan&&plan.visualBackplate;if(!vb||vb.enabled!==true)return;var a=asset(assets,vb.assetId);if(!a||!a.base64)return;var layer={kind:'image',visualBackplate:true,assetId:vb.assetId,rect:vb.rect||{x:0,y:0,w:plan.page.width,h:plan.page.height},style:{objectFit:'fill'}};var node=image(wrap,vb.name||'Visual Reference / Full Page Screenshot',a,layer,{});if(node){try{node.locked=true}catch(e){}stat().visualBackplate++}}
function renderPlanBounds(plan){
  var page = plan && plan.page || {};
  var width = Math.max(1, num(page.width, 1440));
  var height = Math.max(1, num(page.height, 1600));
  var frames = arr(plan && plan.frames);

  for (var i = 0; i < frames.length; i++) {
    var r = frames[i] && frames[i].rect || {};
    width = Math.max(width, num(r.x, 0) + num(r.w, width));
    height = Math.max(height, num(r.y, 0) + num(r.h, height));

    var groups = arr(frames[i] && frames[i].groups);
    for (var g = 0; g < groups.length; g++) {
      var gr = groups[g] && groups[g].rect || {};
      width = Math.max(width, num(r.x, 0) + num(gr.x, 0) + num(gr.w, 1));
      height = Math.max(height, num(r.y, 0) + num(gr.y, 0) + num(gr.h, 1));
    }
  }

  return { width: Math.ceil(width), height: Math.ceil(height) };
}



/* DESIGNIT_PLUGIN_BASE64_IMAGE_RENDER_16E_B */
function d16eBFirstDefined() {
  for (var i = 0; i < arguments.length; i++) {
    if (arguments[i] !== undefined && arguments[i] !== null) return arguments[i];
  }
  return 0;
}
function d16eBToText(value) {
  try { return String(value || "").toLowerCase(); } catch (_) { return ""; }
}

function d16eBHash(value) {
  let h = 5381;
  const s = String(value || "");
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return "d16eb_" + (h >>> 0).toString(36);
}

function d16eBBase64ToBytes(base64) {
  const clean = String(base64 || "").replace(/^data:[^,]+,/, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function d16eBRect(layer) {
  if (!layer || typeof layer !== "object") return null;
  const raw = layer.rect || layer.bounds || layer.box || layer.frame || layer;
  if (!raw || typeof raw !== "object") return null;

  const x = Number(d16eBFirstDefined(raw.x, raw.left, 0));
  const y = Number(d16eBFirstDefined(raw.y, raw.top, 0));
  const width = Number(d16eBFirstDefined(raw.width, raw.w, layer.width, 0));
  const height = Number(d16eBFirstDefined(raw.height, raw.h, layer.height, 0));

  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;

  return { x, y, width, height, key: [Math.round(x), Math.round(y), Math.round(width), Math.round(height)].join(",") };
}

function d16eBWalk(node, visit) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const item of node) d16eBWalk(item, visit);
    return;
  }

  if (typeof node !== "object") return;

  visit(node);

  for (const key of Object.keys(node)) {
    if (key === "base64" || key === "screenshot") continue;
    const value = node[key];
    if (value && typeof value === "object") d16eBWalk(value, visit);
  }
}

function d16eBCollectAssets(plan) {
  const map = new Map();

  d16eBWalk(plan, function(node) {
    if (!node || typeof node !== "object") return;
    if (!node.base64) return;

    const asset = node;
    const keys = [
      asset.id,
      asset.assetId,
      asset.url,
      asset.sourceUrl,
      asset.rawSourceUrl,
      asset.currentSrc,
      asset.src
    ].filter(Boolean).map(String);

    for (const key of keys) {
      map.set(key, asset);
    }
  });

  return map;
}

function d16eBLayerUrl(layer) {
  if (!layer || typeof layer !== "object") return "";
  return String(layer.rawSourceUrl || layer.sourceUrl || layer.currentSrc || layer.src || layer.url || "");
}

function d16eBAssetForLayer(layer, assetMap) {
  if (!layer || !assetMap) return null;

  const keys = [
    layer.assetId,
    layer.id,
    layer.rawSourceUrl,
    layer.sourceUrl,
    layer.currentSrc,
    layer.src,
    layer.url
  ].filter(Boolean).map(String);

  for (const key of keys) {
    if (assetMap.has(key)) return assetMap.get(key);
  }

  return null;
}

function d16eBIsRenderableImageLayer(layer) {
  if (!layer || typeof layer !== "object") return false;

  const text = [
    layer.kind,
    layer.type,
    layer.role,
    layer.name,
    layer.assetKind,
    layer.assetId,
    layer.rawSourceUrl,
    layer.sourceUrl,
    layer.currentSrc,
    layer.src,
    layer.url,
    layer.sourceReason
  ].map(d16eBToText).join(" ");

  if (text.includes("raw website screenshot")) return false;
  if (text.includes("internal screenshot reference")) return false;
  if (text.includes("raw-reference-screenshot")) return false;
  if (text.includes("backplate")) return false;

  if (text.includes("raw-dom-image")) return true;
  if (text.includes("16e-lite-injected-raw-website-image")) return true;
  if (text.includes("image") && (text.includes("raw-url-") || text.includes(".webp") || text.includes(".png") || text.includes(".jpg") || text.includes(".jpeg"))) return true;

  return false;
}

function d16eBCollectImageLayers(plan) {
  const layers = [];
  const seen = new Set();

  d16eBWalk(plan && plan.figmaRenderPlan ? plan.figmaRenderPlan : plan, function(node) {
    if (!d16eBIsRenderableImageLayer(node)) return;

    const rect = d16eBRect(node);
    if (!rect) return;

    if (rect.width < 8 || rect.height < 8) return;

    const key = rect.key + "::" + (node.assetId || d16eBLayerUrl(node) || node.name || "");
    if (seen.has(key)) return;
    seen.add(key);

    layers.push({ layer: node, rect });
  });

  layers.sort(function(a, b) {
    return (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height);
  });

  return layers.slice(0, 80);
}

function d16eBApplyAssetFill(rectNode, asset) {
  if (!rectNode || !asset || !asset.base64) return false;

  const bytes = d16eBBase64ToBytes(asset.base64);
  const image = figma.createImage(bytes);

  rectNode.fills = [{
    type: "IMAGE",
    scaleMode: "FILL",
    imageHash: image.hash
  }];

  return true;
}

function d16eBFindHost(root) {
  if (root && typeof root.appendChild === "function") return root;
  if (figma && figma.currentPage && typeof figma.currentPage.appendChild === "function") return figma.currentPage;
  return null;
}

function d16eBRenderHydratedImages(root, plan) {
  try {
    if (!plan || !figma || !figma.createRectangle) return;

    const host = d16eBFindHost(root);
    if (!host) return;

    const assetMap = d16eBCollectAssets(plan);
    const layers = d16eBCollectImageLayers(plan);

    if (!assetMap.size || !layers.length) return;

    const created = [];
    const used = new Set();

    for (const item of layers) {
      const layer = item.layer;
      const rect = item.rect;
      const asset = d16eBAssetForLayer(layer, assetMap);

      if (!asset || !asset.base64) continue;

      const key = rect.key + "::" + (asset.id || asset.assetId || asset.sourceUrl || asset.url || d16eBHash(asset.base64));
      if (used.has(key)) continue;
      used.add(key);

      const node = figma.createRectangle();
      node.name = String(layer.name || "Image / Raw Website");
      node.x = rect.x;
      node.y = rect.y;
      node.resize(Math.max(1, rect.width), Math.max(1, rect.height));

      if (!d16eBApplyAssetFill(node, asset)) continue;

      if (typeof host.insertChild === "function") {
        host.insertChild(0, node);
      } else {
        host.appendChild(node);
      }

      created.push(node);
    }

    if (created.length && figma.notify) {
      figma.notify("DesignIT images rendered: " + created.length);
    }
  } catch (error) {
    console.warn("[DesignIT 16E-B] image render failed:", error && error.message ? error.message : error);
  }
}
/* END DESIGNIT_PLUGIN_BASE64_IMAGE_RENDER_16E_B */




/* DESIGNIT_PLUGIN_RENDERPLAN_V2_RENDERER_17B */
function d17bText(value) {
  try { return String(value || ""); } catch (error) { return ""; }
}

function d17bBytes(base64) {
  var clean = String(base64 || "").replace(/^data:[^,]+,/, "");
  var binary = atob(clean);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function d17bRect(node) {
  if (!node || typeof node !== "object") return { x: 0, y: 0, width: 1, height: 1 };

  var r = node.rect || node.bounds || node.frame || node;
  var x = Number(r.x !== undefined ? r.x : 0);
  var y = Number(r.y !== undefined ? r.y : 0);
  var width = Number(r.width !== undefined ? r.width : 1);
  var height = Number(r.height !== undefined ? r.height : 1);

  if (!Number.isFinite(x)) x = 0;
  if (!Number.isFinite(y)) y = 0;
  if (!Number.isFinite(width) || width <= 0) width = 1;
  if (!Number.isFinite(height) || height <= 0) height = 1;

  return { x: x, y: y, width: width, height: height };
}

function d17bRgb(hex, fallback) {
  var h = String(hex || fallback || "#ffffff").trim();

  if (h.indexOf("rgb") === 0) return { r: 1, g: 1, b: 1 };
  if (h.charAt(0) !== "#") h = String(fallback || "#ffffff");

  h = h.slice(1);
  if (h.length === 3) {
    h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  }

  var n = parseInt(h.slice(0, 6), 16);
  if (!Number.isFinite(n)) n = 16777215;

  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255
  };
}

function d17bSolid(color, fallback) {
  return [{ type: "SOLID", color: d17bRgb(color, fallback) }];
}

function d17bAssetMap(plan) {
  var map = {};
  var assets = plan && Array.isArray(plan.assets) ? plan.assets : [];

  for (var i = 0; i < assets.length; i++) {
    var asset = assets[i];
    if (!asset) continue;
    if (asset.id) map[String(asset.id)] = asset;
    if (asset.assetId) map[String(asset.assetId)] = asset;
    if (asset.sourceUrl) map[String(asset.sourceUrl)] = asset;
    if (asset.url) map[String(asset.url)] = asset;
  }

  return map;
}

function d17bAppend(parent, node) {
  if (parent && typeof parent.appendChild === "function") parent.appendChild(node);
  else figma.currentPage.appendChild(node);
}

async function d17bTextNode(node, parent, stats) {
  var r = d17bRect(node);
  var t = figma.createText();

  t.name = d17bText(node.name || "Text");
  t.x = r.x;
  t.y = r.y;
  t.resize(Math.max(1, r.width), Math.max(1, r.height));

  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    t.fontName = { family: "Inter", style: "Regular" };
  } catch (error) {}

  try { t.characters = d17bText(node.text || ""); } catch (error) {}

  try {
    if (node.style && node.style.fontSize) t.fontSize = Number(node.style.fontSize) || 14;
    if (node.style && node.style.color) t.fills = d17bSolid(node.style.color, "#111111");
  } catch (error) {}

  d17bAppend(parent, t);
  stats.rendered++;
  stats.text++;
  return t;
}

function d17bRectNode(node, parent, stats) {
  var r = d17bRect(node);
  var rect = figma.createRectangle();

  rect.name = d17bText(node.name || "Rectangle");
  rect.x = r.x;
  rect.y = r.y;
  rect.resize(Math.max(1, r.width), Math.max(1, r.height));

  var bg = node.style && (node.style.background || node.style.fill || node.style.color);
  rect.fills = d17bSolid(bg || "#ffffff", "#ffffff");

  d17bAppend(parent, rect);
  stats.rendered++;
  stats.rect++;
  return rect;
}

function d17bImageNode(node, parent, assetMap, stats) {
  var r = d17bRect(node);
  var rect = figma.createRectangle();

  rect.name = d17bText(node.name || "Image");
  rect.x = r.x;
  rect.y = r.y;
  rect.resize(Math.max(1, r.width), Math.max(1, r.height));

  var asset = assetMap[String(node.assetId || "")] || assetMap[String(node.sourceUrl || "")];

  if (!asset || !asset.base64) {
    rect.fills = d17bSolid("#dddddd", "#dddddd");
    stats.imageMissingAsset++;
  } else {
    try {
      var img = figma.createImage(d17bBytes(asset.base64));
      rect.fills = [{ type: "IMAGE", scaleMode: "FILL", imageHash: img.hash }];
      stats.image++;
    } catch (error) {
      rect.fills = d17bSolid("#dddddd", "#dddddd");
      stats.imageFailed++;
    }
  }

  d17bAppend(parent, rect);
  stats.rendered++;
  return rect;
}

async function d17bButtonNode(node, parent, assetMap, stats) {
  var r = d17bRect(node);
  var frame = figma.createFrame();

  frame.name = d17bText(node.name || "Button");
  frame.x = r.x;
  frame.y = r.y;
  frame.resize(Math.max(1, r.width), Math.max(1, r.height));
  frame.fills = d17bSolid(node.style && node.style.background, "#111827");
  frame.clipsContent = true;

  d17bAppend(parent, frame);
  stats.rendered++;
  stats.button++;

  if (node.text) {
    await d17bTextNode({
      type: "text",
      name: "Button Label",
      text: node.text,
      rect: { x: 8, y: 4, width: Math.max(1, r.width - 16), height: Math.max(1, r.height - 8) },
      style: { color: node.style && node.style.color ? node.style.color : "#ffffff", fontSize: node.style && node.style.fontSize ? node.style.fontSize : 12 }
    }, frame, stats);
  }

  return frame;
}

async function d17bFrameNode(node, parent, assetMap, stats) {
  var r = d17bRect(node);
  var frame = figma.createFrame();

  frame.name = d17bText(node.name || "Frame");
  frame.x = r.x;
  frame.y = r.y;
  frame.resize(Math.max(1, r.width), Math.max(1, r.height));
  frame.clipsContent = false;

  var bg = node.style && node.style.background;
  if (bg === "transparent") frame.fills = [];
  else frame.fills = d17bSolid(bg || "#ffffff", "#ffffff");

  d17bAppend(parent, frame);
  stats.rendered++;
  stats.frame++;

  var children = Array.isArray(node.children) ? node.children : [];
  for (var i = 0; i < children.length; i++) {
    await d17bRenderNode(children[i], frame, assetMap, stats);
  }

  return frame;
}

async function d17bRenderNode(node, parent, assetMap, stats) {
  if (!node || typeof node !== "object") return null;

  stats.planned++;

  if (node.type === "frame" || node.type === "group") return await d17bFrameNode(node, parent, assetMap, stats);
  if (node.type === "rect") return d17bRectNode(node, parent, stats);
  if (node.type === "image") return d17bImageNode(node, parent, assetMap, stats);
  if (node.type === "text") return await d17bTextNode(node, parent, stats);
  if (node.type === "button") return await d17bButtonNode(node, parent, assetMap, stats);

  stats.skipped++;
  stats.unsupported.push(String(node.type || "unknown"));
  return null;
}

function d17bPlan(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.renderPlanV2 && payload.renderPlanV2.version === "render-plan-v2") return payload.renderPlanV2;
  if (payload.figmaRenderPlan && payload.figmaRenderPlan.renderPlanV2 && payload.figmaRenderPlan.renderPlanV2.version === "render-plan-v2") return payload.figmaRenderPlan.renderPlanV2;
  if (payload.version === "render-plan-v2") return payload;
  return null;
}

async function d17bRenderPlanV2IfPresent(payload) {
  var plan = d17bPlan(payload);
  if (!plan) return false;

  var stats = {
    marker: "DESIGNIT_PLUGIN_RENDERPLAN_V2_RENDERER_17B",
    planned: 0,
    rendered: 0,
    skipped: 0,
    unsupported: [],
    frame: 0,
    rect: 0,
    text: 0,
    button: 0,
    image: 0,
    imageMissingAsset: 0,
    imageFailed: 0
  };

  var assetMap = d17bAssetMap(plan);
  await d17bRenderNode(plan.root, null, assetMap, stats);

  try {
    figma.root.setPluginData("designit-renderplan-v2-stats", JSON.stringify(stats));
  } catch (error) {}

  if (figma.notify) {
    figma.notify("DesignIT V2 rendered " + stats.rendered + "/" + stats.planned + ", images " + stats.image);
  }

  return true;
}
/* END DESIGNIT_PLUGIN_RENDERPLAN_V2_RENDERER_17B */




/* DESIGNIT_PLUGIN_RENDERPLAN_V2_HARD_INTERCEPT_17C_FIX */
function d17cFixString(value) {
  try { return String(value || ""); } catch (error) { return ""; }
}

function d17cFixIsObject(value) {
  return value && typeof value === "object";
}

function d17cFixFindPlan(value, depth, seen) {
  if (!d17cFixIsObject(value)) return null;
  if (depth > 8) return null;

  seen = seen || [];
  for (var i = 0; i < seen.length; i++) {
    if (seen[i] === value) return null;
  }
  seen.push(value);

  if (value.version === "render-plan-v2" && value.root && value.assets) return value;
  if (value.renderPlanV2 && value.renderPlanV2.version === "render-plan-v2") return value.renderPlanV2;
  if (value.figmaRenderPlan && value.figmaRenderPlan.renderPlanV2 && value.figmaRenderPlan.renderPlanV2.version === "render-plan-v2") return value.figmaRenderPlan.renderPlanV2;

  var keys = Object.keys(value);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    if (key === "base64" || key === "screenshot") continue;

    var found = d17cFixFindPlan(value[key], depth + 1, seen);
    if (found) return found;
  }

  return null;
}

function d17cFixPlanFromArguments(argsLike) {
  for (var i = 0; i < argsLike.length; i++) {
    var plan = d17cFixFindPlan(argsLike[i], 0, []);
    if (plan) return plan;
  }
  return null;
}

function d17cFixBytes(base64) {
  var clean = String(base64 || "").replace(/^data:[^,]+,/, "");
  var binary = atob(clean);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function d17cFixRect(node) {
  if (!node || typeof node !== "object") return { x: 0, y: 0, width: 1, height: 1 };

  var raw = node.rect || node.bounds || node.frame || node || {};

  var x = Number(raw.x);
  var y = Number(raw.y);
  var width = Number(raw.width);
  var height = Number(raw.height);

  if (!isFinite(x)) x = 0;
  if (!isFinite(y)) y = 0;
  if (!isFinite(width) || width <= 0) width = 1;
  if (!isFinite(height) || height <= 0) height = 1;

  return { x: x, y: y, width: width, height: height };
}

function d17cFixRgb(hex, fallback) {
  var h = String(hex || fallback || "#ffffff").trim();

  if (h.indexOf("rgb") === 0) return { r: 1, g: 1, b: 1 };
  if (h.charAt(0) !== "#") h = String(fallback || "#ffffff");

  h = h.slice(1);

  if (h.length === 3) {
    h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  }

  var n = parseInt(h.slice(0, 6), 16);
  if (!isFinite(n)) n = 16777215;

  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255
  };
}

function d17cFixSolid(color, fallback) {
  return [{ type: "SOLID", color: d17cFixRgb(color, fallback) }];
}

function d17cFixAssetMap(plan) {
  var map = {};
  var assets = plan && Array.isArray(plan.assets) ? plan.assets : [];

  for (var i = 0; i < assets.length; i++) {
    var asset = assets[i];
    if (!asset) continue;

    if (asset.id) map[String(asset.id)] = asset;
    if (asset.assetId) map[String(asset.assetId)] = asset;
    if (asset.sourceUrl) map[String(asset.sourceUrl)] = asset;
    if (asset.url) map[String(asset.url)] = asset;
  }

  return map;
}

function d17cFixAppend(parent, node) {
  if (parent && typeof parent.appendChild === "function") parent.appendChild(node);
  else figma.currentPage.appendChild(node);
}

async function d17cFixRenderText(node, parent, stats) {
  var r = d17cFixRect(node);
  var t = figma.createText();

  t.name = d17cFixString(node.name || "Text");
  t.x = r.x;
  t.y = r.y;
  t.resize(Math.max(1, r.width), Math.max(1, r.height));

  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    t.fontName = { family: "Inter", style: "Regular" };
  } catch (error) {}

  try { t.characters = d17cFixString(node.text || ""); } catch (error) {}

  try {
    if (node.style && node.style.fontSize) t.fontSize = Number(node.style.fontSize) || 14;
    if (node.style && node.style.color) t.fills = d17cFixSolid(node.style.color, "#111111");
  } catch (error) {}

  d17cFixAppend(parent, t);
  stats.rendered++;
  stats.text++;
  return t;
}

function d17cFixRenderRect(node, parent, stats) {
  var r = d17cFixRect(node);
  var rect = figma.createRectangle();

  rect.name = d17cFixString(node.name || "Rectangle");
  rect.x = r.x;
  rect.y = r.y;
  rect.resize(Math.max(1, r.width), Math.max(1, r.height));

  var bg = node.style && (node.style.background || node.style.fill || node.style.color);
  rect.fills = d17cFixSolid(bg || "#ffffff", "#ffffff");

  d17cFixAppend(parent, rect);
  stats.rendered++;
  stats.rect++;
  return rect;
}

function d17cFixRenderImage(node, parent, assetMap, stats) {
  var r = d17cFixRect(node);
  var rect = figma.createRectangle();

  rect.name = d17cFixString(node.name || "Image");
  rect.x = r.x;
  rect.y = r.y;
  rect.resize(Math.max(1, r.width), Math.max(1, r.height));

  var asset = assetMap[String(node.assetId || "")] || assetMap[String(node.sourceUrl || "")];

  if (asset && asset.base64) {
    try {
      var image = figma.createImage(d17cFixBytes(asset.base64));
      rect.fills = [{ type: "IMAGE", scaleMode: "FILL", imageHash: image.hash }];
      stats.image++;
    } catch (error) {
      rect.fills = d17cFixSolid("#dddddd", "#dddddd");
      stats.imageFailed++;
    }
  } else {
    rect.fills = d17cFixSolid("#dddddd", "#dddddd");
    stats.imageMissingAsset++;
  }

  d17cFixAppend(parent, rect);
  stats.rendered++;
  return rect;
}

async function d17cFixRenderButton(node, parent, assetMap, stats) {
  var r = d17cFixRect(node);
  var frame = figma.createFrame();

  frame.name = d17cFixString(node.name || "Button");
  frame.x = r.x;
  frame.y = r.y;
  frame.resize(Math.max(1, r.width), Math.max(1, r.height));
  frame.fills = d17cFixSolid(node.style && node.style.background, "#111827");
  frame.clipsContent = true;

  d17cFixAppend(parent, frame);
  stats.rendered++;
  stats.button++;

  if (node.text) {
    await d17cFixRenderText({
      type: "text",
      name: "Button Label",
      text: node.text,
      rect: {
        x: 8,
        y: 4,
        width: Math.max(1, r.width - 16),
        height: Math.max(1, r.height - 8)
      },
      style: {
        color: node.style && node.style.color ? node.style.color : "#ffffff",
        fontSize: node.style && node.style.fontSize ? node.style.fontSize : 12
      }
    }, frame, stats);
  }

  return frame;
}

async function d17cFixRenderFrame(node, parent, assetMap, stats) {
  var r = d17cFixRect(node);
  var frame = figma.createFrame();

  frame.name = d17cFixString(node.name || "Frame");
  frame.x = r.x;
  frame.y = r.y;
  frame.resize(Math.max(1, r.width), Math.max(1, r.height));
  frame.clipsContent = false;

  var bg = node.style && node.style.background;

  if (bg === "transparent") frame.fills = [];
  else frame.fills = d17cFixSolid(bg || "#ffffff", "#ffffff");

  d17cFixAppend(parent, frame);
  stats.rendered++;
  stats.frame++;

  var children = Array.isArray(node.children) ? node.children : [];
  for (var i = 0; i < children.length; i++) {
    await d17cFixRenderNode(children[i], frame, assetMap, stats);
  }

  return frame;
}

async function d17cFixRenderNode(node, parent, assetMap, stats) {
  if (!node || typeof node !== "object") return null;

  stats.planned++;

  if (node.type === "frame" || node.type === "group") return await d17cFixRenderFrame(node, parent, assetMap, stats);
  if (node.type === "rect") return d17cFixRenderRect(node, parent, stats);
  if (node.type === "image") return d17cFixRenderImage(node, parent, assetMap, stats);
  if (node.type === "text") return await d17cFixRenderText(node, parent, stats);
  if (node.type === "button") return await d17cFixRenderButton(node, parent, assetMap, stats);

  stats.skipped++;
  stats.unsupported.push(d17cFixString(node.type || "unknown"));
  return null;
}



/* DESIGNIT_PLUGIN_COMPARE_CONTRACT_GUARD_17N_FIX2 */
function d17nFix2HasCompareContract(plan) {
  return Boolean(
    plan &&
    plan.version === "render-plan-v2" &&
    plan.compareView &&
    plan.compareView.leftReference &&
    plan.compareView.rightEditable &&
    plan.root &&
    Array.isArray(plan.root.children) &&
    plan.root.children.length === 2
  );
}
/* END DESIGNIT_PLUGIN_COMPARE_CONTRACT_GUARD_17N_FIX2 */

async function d17cFixRenderV2Only(plan) {
  if (!d17nFix2HasCompareContract(plan)) {
    if (figma && figma.notify) {
      figma.notify("DesignIT compare contract missing. Import stopped safely.");
    }
    return true;
  }

  if (!plan || plan.version !== "render-plan-v2" || !plan.root) return false;

  var stats = {
    marker: "DESIGNIT_PLUGIN_RENDERPLAN_V2_HARD_INTERCEPT_17C_FIX",
    planned: 0,
    rendered: 0,
    skipped: 0,
    unsupported: [],
    frame: 0,
    rect: 0,
    text: 0,
    button: 0,
    image: 0,
    imageMissingAsset: 0,
    imageFailed: 0
  };

  var assetMap = d17cFixAssetMap(plan);
  await d17cFixRenderNode(plan.root, null, assetMap, stats);

  try {
    figma.root.setPluginData("designit-renderplan-v2-hard-intercept-stats", JSON.stringify(stats));
  } catch (error) {}

  if (figma.notify) {
    figma.notify("DesignIT V2-only rendered " + stats.rendered + "/" + stats.planned + ", images " + stats.image);
  }

  return true;
}

async function d17cFixRenderV2FromArguments(argsLike) {
  var plan = d17cFixPlanFromArguments(argsLike);
  if (!plan) return false;
  return await d17cFixRenderV2Only(plan);
}
/* END DESIGNIT_PLUGIN_RENDERPLAN_V2_HARD_INTERCEPT_17C_FIX */


async function renderPlanInto(parent,plan,assets,label,policy){
  /* DESIGNIT_PLUGIN_RENDERPLAN_V2_ONLY_BOUNDARY_17H */
  try {
    if (await d17cFixRenderV2FromArguments(arguments)) {
      return;
    }
  } catch (error) {
    console.warn("[DesignIT 17H] V2 render boundary failed:", error && error.message ? error.message : error);
    if (figma && figma.notify) {
      figma.notify("DesignIT V2 render failed. Legacy renderer is disabled for safety.");
    }
    return;
  }

  console.warn("[DesignIT 17H] renderPlanV2 missing. Legacy renderer disabled to prevent broken output.");
  if (figma && figma.notify) {
    figma.notify("DesignIT renderPlanV2 missing. Import stopped safely.");
  }
  return;
  /* END DESIGNIT_PLUGIN_RENDERPLAN_V2_ONLY_BOUNDARY_17H */
}
function basePlan(payload){return payload.figmaRenderPlan&&payload.figmaRenderPlan.status==='pass'?payload.figmaRenderPlan:null}
function summaryText(payload){var q=payload.diagnostics&&payload.diagnostics.desktopQuality;var vb=payload.diagnostics&&payload.diagnostics.visualBackplate;return 'Desktop quality: '+(q?q.score+'/100 ('+q.grade+')':'missing')+'\nVisual backplate: '+(vb?vb.mode:'missing')}
function storeSummary(root,payload){try{root.setPluginData('designitSummaryText',summaryText(payload));root.setPluginData('designitDesktopQuality',JSON.stringify(payload.diagnostics&&payload.diagnostics.desktopQuality||null));root.setPluginData('designitVisualBackplate',JSON.stringify(payload.diagnostics&&payload.diagnostics.visualBackplate||null))}catch(e){}}
function qualityMessage(s,policy){var msg='Import complete. Rendered '+s.rendered+' layers, skipped '+s.skipped+', fallback '+s.fallback+', errors '+s.errors.length+', imageFit '+s.imageFit+', visualBackplate '+s.visualBackplate+', inputs '+s.input+', responsive '+s.responsiveFrames+'.';if(policy&&!policy.renderResponsiveVariants)msg+='\nDefault mode: semantic editable result only. Internal screenshot reference is hidden. Responsive variants are disabled.';if(s.errors.length>0||s.fallback>20)msg+='\nQuality warning: renderer still reported errors/fallbacks. Review output before production use.';return msg}
async function importPayload(payload){if(!payload||payload.ok!==true)throw new Error('Invalid payload');stats=null;await ready();var assets=arr((payload.cloneModel||{}).assets);var plan=basePlan(payload);if(!plan)throw new Error('Render plan missing');var policy=policyOf(payload);var root=frame('DesignIT Import / '+new Date().toISOString().replace(/[:.]/g,'-'),Math.max(320,(plan.page&&plan.page.width||1440)+160),Math.max(640,(plan.page&&plan.page.height||1600)+160),'#FFFFFF',{});root.clipsContent=false;storeSummary(root,payload);var renderLabel=(payload.diagnostics&&payload.diagnostics.rawReferenceFrame&&payload.diagnostics.rawReferenceFrame.parentFrameName)||(arr(plan.frames)[0]&&arr(plan.frames)[0].name)||'Desktop / Semantic Editable Result';var main=renderPlanInto(root,plan,assets,renderLabel,policy);main.x=80;main.y=80;root.resize(main.x+main.width+80,main.y+main.height+80);figma.currentPage.appendChild(root);lastFrame=root;var s=stat();try{root.setPluginData('designitImportSummary',JSON.stringify(s));root.setPluginData('translateitImportSummary',JSON.stringify(s))}catch(e){}figma.viewport.scrollAndZoomIntoView([main]);post(qualityMessage(s,policy))}
function exportData(){figma.ui.postMessage({exportJson:JSON.stringify({publicVersion:PUBLIC_VERSION,engine:ENGINE,engineBuild:ENGINE_BUILD,lastFrame:lastFrame?lastFrame.name:null,summary:lastFrame?lastFrame.getPluginData('designitImportSummary'):null},null,2)})}
figma.ui.onmessage=async function(m){try{if(m&&m.type==='import-design-model')return await importPayload(m.payload||{});if(m&&m.type==='export-ui-package')return exportData();post('Unsupported command: '+(m&&m.type))}catch(e){console.error(e);post('Plugin error: '+(e&&e.message?e.message:String(e)))}};
post('Production renderer loaded. Screenshot-backed desktop overlay mode is active.');










/* DESIGNIT_PHASE19_CLEAN_ONLY_GUARD */
function designitPhase19FindRenderPlan(value) {
  if (!value || typeof value !== "object") return null;
  if (value.contractVersion) return value;
  if (value.renderPlanV2) return value.renderPlanV2;
  if (value.designitRenderPlan) return value.designitRenderPlan;
  if (value.figmaRenderPlan && value.figmaRenderPlan.renderPlanV2) return value.figmaRenderPlan.renderPlanV2;
  return null;
}

function designitPhase19AssertCleanContract(value) {
  const plan = designitPhase19FindRenderPlan(value);

  if (!plan) {
    throw new Error("DesignIT clean-only: missing render plan.");
  }

  if (String(plan.contractVersion || "") !== "compare-view-v1") {
    throw new Error("DesignIT clean-only: rejected non-clean contract " + String(plan.contractVersion || ""));
  }

  if (!plan.compareView || !plan.compareView.leftReference || !plan.compareView.rightEditable) {
    throw new Error("DesignIT clean-only: compareView missing leftReference/rightEditable.");
  }

  if (!plan.root || !Array.isArray(plan.root.children) || plan.root.children.length !== 2) {
    throw new Error("DesignIT clean-only: root must contain exactly 2 frames.");
  }

  return plan;
}

if (typeof renderPlanInto === "function" && !globalThis.__DESIGNIT_PHASE19_CLEAN_ONLY_GUARD__) {
  globalThis.__DESIGNIT_PHASE19_CLEAN_ONLY_GUARD__ = true;
  const designitPhase19OriginalRenderPlanInto = renderPlanInto;

  renderPlanInto = async function() {
    let guarded = false;

    for (let i = 0; i < arguments.length; i++) {
      const candidate = arguments[i];

      if (candidate && typeof candidate === "object") {
        const plan = designitPhase19FindRenderPlan(candidate);

        if (plan) {
          designitPhase19AssertCleanContract(candidate);
          guarded = true;
          break;
        }
      }
    }

    if (!guarded) {
      throw new Error("DesignIT clean-only: renderPlanInto called without compare-view-v1 payload.");
    }

    return await designitPhase19OriginalRenderPlanInto.apply(this, arguments);
  };
}
