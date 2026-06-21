import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureSite } from './src/capture-site.mjs';
import { extractLayout } from './src/extract-layout.mjs';
import { buildDesignModel } from './src/build-design-model.mjs';
import { visualAudit } from './src/visual-audit.mjs';
import { PUBLIC_VERSION, ENGINE, ENGINE_BUILD, ok, error, assertCleanPayload, normalizeUrl } from './src/shared-contract.mjs';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const here = path.dirname(fileURLToPath(import.meta.url));
const reportDir = path.join(here, 'reports');

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniq(values, limit = 12) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = clean(value);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function hasRole(item, roles) {
  return roles.includes(item.role);
}

function byRole(elements, roles) {
  return (elements || []).filter((item) => hasRole(item, roles));
}

function textValues(elements, roles, limit = 12) {
  const hits = byRole(elements, roles).filter((item) => clean(item.text));
  hits.sort((a, b) => ((a.rect && a.rect.y) || 0) - ((b.rect && b.rect.y) || 0) || ((a.rect && a.rect.x) || 0) - ((b.rect && b.rect.x) || 0));
  return uniq(hits.map((item) => item.text), limit);
}

function bestText(elements, roles, fallback = '') {
  const hits = byRole(elements, roles).filter((item) => clean(item.text));
  hits.sort((a, b) => {
    const af = (a.style && a.style.fontSize) || 0;
    const bf = (b.style && b.style.fontSize) || 0;
    const aw = (a.style && a.style.fontWeight) || 0;
    const bw = (b.style && b.style.fontWeight) || 0;
    return (bf + bw / 100) - (af + aw / 100) || clean(b.text).length - clean(a.text).length;
  });
  return hits.length ? clean(hits[0].text) : clean(fallback);
}

function sectionByRole(model, roleName) {
  return (model.sections || []).find((section) => section.role === roleName) || null;
}

function sectionElements(model, roleName) {
  const section = sectionByRole(model, roleName);
  if (!section) return [];
  return (model.elements || []).filter((item) => item.sectionId === section.id);
}

function imageElements(elements) {
  return (elements || []).filter((item) => item.type === 'image').sort((a, b) => {
    const aa = ((a.rect && a.rect.w) || 0) * ((a.rect && a.rect.h) || 0);
    const ba = ((b.rect && b.rect.w) || 0) * ((b.rect && b.rect.h) || 0);
    return ba - aa;
  });
}

function safeBody(elements, fallback = '') {
  const hits = byRole(elements, ['body', 'label', 'footer-text']).filter((item) => clean(item.text).length > 16);
  hits.sort((a, b) => clean(b.text).length - clean(a.text).length);
  return hits.length ? clean(hits[0].text) : clean(fallback);
}

function buildCards(model) {
  const contentSections = (model.sections || []).filter((section) => !['header', 'hero', 'footer'].includes(section.role));
  let contentElements = [];
  for (const section of contentSections) {
    contentElements = contentElements.concat((model.elements || []).filter((item) => item.sectionId === section.id));
  }
  if (!contentElements.length) contentElements = model.elements || [];
  const images = imageElements(contentElements);
  const titles = textValues(contentElements, ['section-title', 'subheading', 'title', 'label'], 8);
  const bodies = textValues(contentElements, ['body', 'label'], 8).filter((item) => item.length > 14);
  const count = Math.max(2, Math.min(3, Math.max(images.length, titles.length, 2)));
  const cards = [];
  for (let index = 0; index < count; index += 1) {
    const image = images[index] || null;
    cards.push({
      title: titles[index + 1] || titles[index] || (image && (image.alt || image.name)) || `Content ${index + 1}`,
      body: bodies[index + 1] || bodies[index] || 'Editable grouped content generated from the source website structure.',
      assetId: image ? image.assetId : null,
      imageName: image ? image.name : null
    });
  }
  return cards;
}

function buildRenderPlan(model) {
  const all = model.elements || [];
  const header = sectionElements(model, 'header');
  const hero = sectionElements(model, 'hero');
  const footer = sectionElements(model, 'footer');
  const images = imageElements(all);
  const pageTitle = clean((model.page && model.page.title) || 'Website');
  const headerLinks = textValues(header, ['nav-item', 'link', 'label'], 7).filter((item) => item.length <= 28);
  const footerLinks = textValues(footer, ['footer-link', 'link', 'label'], 12).filter((item) => item.length <= 48);
  const brand = bestText(header, ['title', 'label', 'nav-item'], pageTitle.split('|')[0]);
  const heroTitle = bestText(hero, ['title', 'section-title', 'subheading'], bestText(all, ['title', 'section-title'], pageTitle));
  const heroBody = safeBody(hero, safeBody(all, 'Clean editable reconstruction generated from the website source.'));
  const cta = bestText(hero, ['button'], bestText(all, ['button'], 'Learn More'));
  const footerText = textValues(footer, ['footer-text', 'body', 'label'], 8).filter((item) => item.length > 10);
  return {
    mode: 'professional-section-based-ui-library',
    layout: {
      width: 1280,
      sections: [
        { id: 'header', y: 0, h: 92 },
        { id: 'hero', y: 92, h: 590 },
        { id: 'content', y: 682, h: 560 },
        { id: 'footer', y: 1242, h: 280 }
      ]
    },
    header: {
      brand,
      navLinks: headerLinks.slice(0, 6),
      cta: headerLinks.length ? headerLinks[headerLinks.length - 1] : cta
    },
    hero: {
      eyebrow: 'Website Import',
      title: heroTitle,
      body: heroBody,
      cta,
      primaryAssetId: images[0] ? images[0].assetId : null,
      secondaryAssetId: images[1] ? images[1].assetId : null
    },
    content: {
      title: textValues(all, ['section-title', 'subheading'], 1)[0] || 'Editable Content System',
      body: safeBody(all, 'Clean grouped cards generated from the website structure.'),
      cards: buildCards(model)
    },
    footer: {
      brand: footerText[0] || brand,
      body: footerText[1] || heroBody,
      links: footerLinks.length ? footerLinks : textValues(all, ['footer-link', 'link', 'label'], 12),
      columns: ['Recent Works', 'Program', 'Contact']
    }
  };
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function writeLatestReport(name, payload) {
  fs.mkdirSync(reportDir, { recursive: true });
  const file = path.join(reportDir, name);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
  return file;
}

async function buildPayload(targetUrl) {
  const capture = await captureSite(targetUrl);
  const layout = extractLayout(capture);
  const designModel = buildDesignModel(layout);
  designModel.renderPlan = buildRenderPlan(designModel);
  const payload = ok({
    source: {
      ...capture.source,
      screenshot: capture.source.screenshot
    },
    designModel,
    diagnostics: {
      capture: {
        rawElements: capture.rawElements.length,
        assets: capture.assets.length
      },
      layout: layout.stats,
      model: designModel.diagnostics,
      renderPlan: {
        mode: designModel.renderPlan.mode,
        cards: designModel.renderPlan.content.cards.length,
        navLinks: designModel.renderPlan.header.navLinks.length,
        footerLinks: designModel.renderPlan.footer.links.length
      }
    }
  });
  const contractFailures = assertCleanPayload(payload);
  if (contractFailures.length) {
    throw new Error(`Clean contract failed: ${contractFailures.join(', ')}`);
  }
  return payload;
}

async function handleRender(req, res, url) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  try {
    const payload = await buildPayload(target);
    return sendJson(res, 200, payload);
  } catch (err) {
    return sendJson(res, 500, error(err?.message || err));
  }
}

async function handleAudit(req, res, url) {
  const target = normalizeUrl(url.searchParams.get('url'));
  if (!target) return sendJson(res, 400, error('Missing url parameter.'));
  try {
    const payload = await buildPayload(target);
    const audit = visualAudit(payload);
    const report = {
      publicVersion: PUBLIC_VERSION,
      engine: ENGINE,
      engineBuild: ENGINE_BUILD,
      targetUrl: target,
      generatedAt: new Date().toISOString(),
      readyForFigmaTest: audit.visualReadiness === 'pass',
      audit,
      diagnostics: payload.diagnostics
    };
    report.reportPath = writeLatestReport('translateit-clean-latest.json', report);
    return sendJson(res, 200, report);
  } catch (err) {
    const report = {
      publicVersion: PUBLIC_VERSION,
      engine: ENGINE,
      engineBuild: ENGINE_BUILD,
      targetUrl: target,
      generatedAt: new Date().toISOString(),
      readyForFigmaTest: false,
      error: err?.message || String(err)
    };
    report.reportPath = writeLatestReport('translateit-clean-latest.json', report);
    return sendJson(res, 500, report);
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 200, { ok: true });
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/health') {
    return sendJson(res, 200, ok({
      adapter: 'clean-render-bridge',
      activeServer: 'server.mjs',
      activeRenderer: 'plugin/code.js',
      contract: 'designModel+renderPlan',
      legacyActive: false
    }));
  }
  if (url.pathname === '/render') return handleRender(req, res, url);
  if (url.pathname === '/audit') return handleAudit(req, res, url);
  return sendJson(res, 404, error('Route not found. Use /health, /render, or /audit.'));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Clean RenderBridge running on http://127.0.0.1:${PORT}`);
  console.log(`Engine: ${ENGINE}`);
  console.log(`Engine Build: ${ENGINE_BUILD}`);
  console.log(`Public Version: ${PUBLIC_VERSION}`);
});
