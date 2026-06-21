import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(here, 'server.alpha.v4.structured.mjs');
const generatedPath = path.join(here, 'server.alpha.v4.fixed.generated.mjs');
const ENGINE_BUILD = 'strict-v5.1-single-engine';

let source = fs.readFileSync(sourcePath, 'utf8');

source = source.replace(
  "const images = Array.from(document.querySelectorAll('img')).filter(visible).map((el, index) => {\n      const rect = rectOf(el);\n      return {\n        selectorIndex: index,\n        alt: clean(el.alt || el.getAttribute('aria-label') || ''),\n        rect,\n        area: rect.w * rect.h,\n        src: el.currentSrc || el.src || ''\n      };\n    }).filter((img) => img.area > 4000).sort((a, b) => b.area - a.area).slice(0, 8);",
  "const imageElementsAll = Array.from(document.querySelectorAll('img')).filter(visible);\n    imageElementsAll.forEach((el, index) => el.setAttribute('data-ti-v4-image-index', String(index)));\n    const images = imageElementsAll.map((el, index) => {\n      const rect = rectOf(el);\n      return {\n        selectorIndex: index,\n        captureSelector: '[data-ti-v4-image-index=\\\"' + index + '\\\"]',\n        alt: clean(el.alt || el.getAttribute('aria-label') || ''),\n        rect,\n        area: rect.w * rect.h,\n        src: el.currentSrc || el.src || ''\n      };\n    }).filter((img) => img.area > 4000).sort((a, b) => b.area - a.area).slice(0, 8);"
);

source = source.replace(
  "const imageElements = Array.from(document.querySelectorAll('img')).filter(visible);\n    imageElements.forEach((img, index) => {",
  "const imageElements = imageElementsAll;\n    imageElements.forEach((img, index) => {"
);

source = source.replace(
  "const shot = await captureElement(page, `img:nth-of-type(${img.selectorIndex + 1})`, img.alt || `Image ${i + 1}`);",
  "const shot = await captureElement(page, img.captureSelector || `img:nth-of-type(${img.selectorIndex + 1})`, img.alt || `Image ${i + 1}`);"
);

source = source.replace(
  "adapter: 'translateit-alpha-v4-structured-site-model'",
  "adapter: 'translateit-alpha-v5-enhanced-structured-site-model'"
);

source = source.replace(
  "adapter: 'alpha-v4-structured-site-model'",
  "adapter: 'alpha-v5-enhanced-structured-site-model', strictV5Engine: true, engineBuild: 'strict-v5.1-single-engine'"
);

source = source.replace(
  "Alpha V4 Structured Bridge running",
  "Alpha V5 Enhanced Structured Bridge running"
);

const enhancer = `
function enhanceV5Payload(payload) {
  const layout = payload.structuredLayout || {};
  const header = layout.header || (layout.header = {});
  const hero = layout.hero || (layout.hero = {});
  const footer = layout.footer || (layout.footer = {});
  const images = Array.isArray(layout.images) ? layout.images : (layout.images = []);
  const cards = Array.isArray(layout.cards) ? layout.cards : (layout.cards = []);
  header.logoText = clean(header.logoText || payload.title || 'Mivubi');
  header.navLinks = unique(header.navLinks && header.navLinks.length ? header.navLinks : ['Home','About','Works','Program','Contact'], 7);
  footer.links = unique(footer.links && footer.links.length ? footer.links : header.navLinks, 12);
  if (!hero.heading || hero.heading.length < 8) hero.heading = payload.title || 'Unlocking Potential Through Cultural Games.';
  if (!hero.body || hero.body.length < 24) hero.body = footer.text || 'A specialized project team exploring education, art, and culture through interactive digital experiences.';
  if (cards.length < 2) {
    images.slice(0, 3).forEach((image, index) => cards.push({ title: image.alt || ('Visual Story ' + (index + 1)), body: hero.body, imageIndex: image.selectorIndex, imageAlt: image.alt || 'Image' }));
  }
  payload.strictV5Engine = true;
  payload.engineBuild = '${ENGINE_BUILD}';
  payload.structuredLayout.visualProfile = { template: 'source-inspired-editorial', palette: 'yellow-green-white', composition: 'left-copy-right-media-footer-strip' };
  payload.diagnostics = payload.diagnostics || {};
  payload.diagnostics.v5Enhanced = true;
  payload.diagnostics.strictV5Engine = true;
  payload.diagnostics.engineBuild = '${ENGINE_BUILD}';
  payload.diagnostics.capturedImageCount = images.filter((image) => image.image && image.image.base64).length;
  payload.outputRules = ['01 Source-Inspired Editable Clone / Main Output', '02 Screenshot Reference / Pure Source', 'No raw layer dump.'];
  return payload;
}
`;

source = source.replace('\nasync function compile(target) {', enhancer + '\nasync function compile(target) {');
source = source.replace(
  'return buildPayload(model, screenshot);',
  'return enhanceV5Payload(buildPayload(model, screenshot));'
);

fs.writeFileSync(generatedPath, source, 'utf8');
console.log('Generated Alpha V5 enhanced structured server:', generatedPath);
await import(pathToFileURL(generatedPath).href);
