import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const here = path.dirname(new URL(import.meta.url).pathname).replace(/^\/(.:\/)/, '$1');
const sourcePath = path.join(here, 'server.mjs');
const generatedPath = path.join(here, 'server.alpha.generated.mjs');

const source = fs.readFileSync(sourcePath, 'utf8');

const improvedClusterSections = [
"function clusterSections(layers, viewport, pageHeight) {",
"  const safeLayers = (layers || [])",
"    .filter((layer) => layer && layer.rect && layer.rect.w > 2 && layer.rect.h > 2)",
"    .filter((layer) => {",
"      const area = layer.rect.w * layer.rect.h;",
"      const pageArea = Math.max(1, viewport.width * Math.max(viewport.height, Math.min(pageHeight || viewport.height, viewport.height * 2)));",
"      if (layer.type === 'box' && area > pageArea * 0.62 && !['navigation', 'footer'].includes(layer.role)) return false;",
"      return true;",
"    })",
"    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);",
"",
"  const anchors = safeLayers.filter((layer) => {",
"    if (layer.type === 'text' && clean(layer.text || layer.name).length >= 2) return true;",
"    if (layer.type === 'image') return true;",
"    if (['button-bg', 'button-label', 'navigation', 'section', 'footer', 'link', 'heading'].includes(layer.role)) return true;",
"    return false;",
"  });",
"",
"  const source = anchors.length ? anchors : safeLayers;",
"  const sections = [];",
"  const minBand = 180;",
"  const largeGap = Math.max(180, Math.min(360, viewport.height * 0.16));",
"",
"  for (const layer of source) {",
"    const layerTop = layer.rect.y;",
"    const layerBottom = layer.rect.y + layer.rect.h;",
"    let current = sections[sections.length - 1];",
"    const forced = layer.role === 'navigation' || layer.role === 'section' || layer.role === 'footer';",
"    const currentBottom = current ? current.rect.y + current.rect.h : -Infinity;",
"    const gap = current ? layerTop - currentBottom : Infinity;",
"    const currentHeight = current ? current.rect.h : 0;",
"    const roleBreak = forced && current && current.layers.length > 3;",
"    const bandBreak = current && gap > largeGap && currentHeight > minBand;",
"    const tallBreak = current && layerTop - current.rect.y > Math.max(520, viewport.height * 0.36) && gap > 72;",
"",
"    if (!current || roleBreak || bandBreak || tallBreak) {",
"      current = { id: 'section-' + String(sections.length + 1), role: layer.role === 'footer' ? 'footer' : layer.role === 'navigation' && !sections.length ? 'header' : 'section', layers: [] };",
"      sections.push(current);",
"    }",
"",
"    current.layers.push(layer);",
"    current.rect = union(current.layers.map((item) => item.rect));",
"    if (layerBottom > current.rect.y + current.rect.h) current.rect.h = layerBottom - current.rect.y;",
"  }",
"",
"  if (sections.length <= 1 && source.length > 8 && (pageHeight || viewport.height) > viewport.height * 1.35) {",
"    const fallback = [];",
"    const bandHeight = Math.max(420, Math.min(760, viewport.height * 0.45));",
"    const maxY = Math.max(pageHeight || viewport.height, Math.max(...source.map((layer) => layer.rect.y + layer.rect.h)));",
"    for (let y = 0; y < maxY; y += bandHeight) {",
"      const bandLayers = safeLayers.filter((layer) => {",
"        const mid = layer.rect.y + layer.rect.h / 2;",
"        return mid >= y - 40 && mid < y + bandHeight + 40;",
"      });",
"      const meaningful = bandLayers.filter((layer) => layer.type === 'text' || layer.type === 'image' || layer.role === 'button-bg' || layer.role === 'button-label' || layer.role === 'navigation' || layer.role === 'footer');",
"      if (!meaningful.length) continue;",
"      fallback.push({ id: 'section-' + String(fallback.length + 1), role: y < 220 ? 'header' : y > maxY * 0.72 ? 'footer' : 'section', layers: bandLayers, rect: expand(union(bandLayers.map((item) => item.rect)), 32) });",
"    }",
"    if (fallback.length > 1) sections.splice(0, sections.length, ...fallback);",
"  }",
"",
"  sections.forEach((section, index) => {",
"    section.layers = safeLayers.filter((layer) => {",
"      const mid = layer.rect.y + layer.rect.h / 2;",
"      return mid >= section.rect.y - 56 && mid <= section.rect.y + section.rect.h + 56;",
"    });",
"    section.rect = expand(union(section.layers.map((item) => item.rect)), 32);",
"    section.rect.x = Math.max(0, section.rect.x);",
"    section.rect.y = Math.max(0, section.rect.y);",
"    section.rect.w = Math.min(viewport.width, Math.max(section.rect.w, viewport.width * 0.35));",
"    if (index === 0 && section.rect.y < 260) section.role = 'header';",
"    if (index === sections.length - 1 && section.rect.y > (pageHeight || viewport.height) * 0.55) section.role = 'footer';",
"    section.name = section.role === 'header' ? 'Header' : section.role === 'footer' ? 'Footer' : 'Section ' + String(index + 1).padStart(2, '0');",
"    buildComponents(section);",
"  });",
"",
"  return sections.length ? sections : [buildComponents({ id: 'section-1', role: 'section', name: 'Section 01', rect: { x: 0, y: 0, w: viewport.width, h: pageHeight || viewport.height }, layers: safeLayers })];",
"}"
].join('\n');

const patched = source.replace(/function clusterSections\(layers, viewport, pageHeight\) \{[\s\S]*?\n\}\n\nfunction sectionIntent/, improvedClusterSections + '\n\nfunction sectionIntent');

if (patched === source) {
  throw new Error('Could not patch clusterSections. server.mjs structure changed.');
}

fs.writeFileSync(generatedPath, patched, 'utf8');
console.log('Generated improved Alpha server:', generatedPath);
await import(pathToFileURL(generatedPath).href);
