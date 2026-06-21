import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(here, 'server.alpha.v4.structured.mjs');
const generatedPath = path.join(here, 'server.alpha.v4.fixed.generated.mjs');

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
  "adapter: 'translateit-alpha-v4-fixed-structured-site-model'"
);

source = source.replace(
  "adapter: 'alpha-v4-structured-site-model'",
  "adapter: 'alpha-v4-fixed-structured-site-model'"
);

source = source.replace(
  "Alpha V4 Structured Bridge running",
  "Alpha V4 Fixed Structured Bridge running"
);

fs.writeFileSync(generatedPath, source, 'utf8');
console.log('Generated Alpha V4 fixed server:', generatedPath);
await import(pathToFileURL(generatedPath).href);
