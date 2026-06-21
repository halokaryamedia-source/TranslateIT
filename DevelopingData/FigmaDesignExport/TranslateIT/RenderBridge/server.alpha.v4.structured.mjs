import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const PUBLIC_VERSION = 'Version 0.1 - Alpha';
const MODE = 'translateit-design-clone-alpha';
const VIEWPORT = { width: 1440, height: 1600 };
let browserPromise;

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const cut = (value, limit) => {
  const text = clean(value);
  return text.length > limit ? text.slice(0, limit - 1) + '…' : text;
};

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function normalizeUrl(value) {
  const raw = clean(value);
  return raw ? (/^https?:\/\//i.test(raw) ? raw : 'https://' + raw) : '';
}

async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true });
  return browserPromise;
}

function colorFromCss(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return '';
  const hex = raw.match(/#[\da-fA-F]{6}|#[\da-fA-F]{3}/);
  if (hex) return hex[0].length === 4 ? '#' + hex[0][1] + hex[0][1] + hex[0][2] + hex[0][2] + hex[0][3] + hex[0][3] : hex[0];
  const rgba = raw.match(/rgba?\(([^)]+)\)/);
  if (!rgba) return '';
  const parts = rgba[1].split(',').map((x) => parseFloat(x));
  if (parts.length < 3 || (parts.length >= 4 && parts[3] === 0)) return '';
  return '#' + parts.slice(0, 3).map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
}

function unique(items, limit = 20) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const text = clean(item);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

async function captureElement(page, selector, fallbackName) {
  try {
    const handle = await page.$(selector);
    if (!handle) return null;
    const box = await handle.boundingBox();
    if (!box || box.width < 10 || box.height < 10) return null;
    const bytes = await handle.screenshot({ type: 'png' });
    return {
      name: fallbackName || 'Image',
      contentType: 'image/png',
      base64: bytes.toString('base64'),
      width: Math.round(box.width),
      height: Math.round(box.height)
    };
  } catch (_) {
    return null;
  }
}

async function extractStructuredModel(page) {
  const model = await page.evaluate(() => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      if (!el) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 4 && rect.height > 4;
    };
    const textOf = (el) => clean(el ? (el.innerText || el.textContent || '') : '');
    const uniq = (items, limit = 12) => {
      const seen = new Set();
      const out = [];
      for (const item of items) {
        const text = clean(item);
        const key = text.toLowerCase();
        if (!text || seen.has(key)) continue;
        seen.add(key);
        out.push(text);
        if (out.length >= limit) break;
      }
      return out;
    };
    const rectOf = (el) => {
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const scoreHeading = (el) => {
      const text = textOf(el);
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const size = parseFloat(style.fontSize || '16');
      let score = size * 3 + Math.min(120, text.length) - rect.top / 8;
      if (/^H1$/i.test(el.tagName)) score += 80;
      if (/^H2$/i.test(el.tagName)) score += 45;
      if (rect.top < innerHeight * 0.8) score += 40;
      if (text.length < 8) score -= 80;
      if (text.length > 120) score -= 40;
      return score;
    };

    const header = document.querySelector('header') || document.querySelector('nav') || document.body;
    const navLinks = uniq(Array.from(document.querySelectorAll('header a, nav a')).filter(visible).map(textOf).filter((t) => t.length <= 28), 7);
    const logoText = clean(document.querySelector('header img, nav img')?.alt || document.querySelector('header a, nav a')?.getAttribute('aria-label') || document.title || location.hostname);
    const ctas = uniq(Array.from(document.querySelectorAll('a, button')).filter(visible).map(textOf).filter((t) => /contact|contribute|talk|start|learn|view|open|visit|explore/i.test(t) && t.length <= 32), 4);

    const headingCandidates = Array.from(document.querySelectorAll('h1, h2, h3, [class*=title], [class*=heading], [class*=hero]')).filter(visible).map((el) => ({ el, text: textOf(el), score: scoreHeading(el), rect: rectOf(el) })).filter((item) => item.text.length >= 8 && item.text.length <= 140).sort((a, b) => b.score - a.score);
    const heroHeading = headingCandidates[0]?.text || document.title || 'Untitled Website';
    const heroRect = headingCandidates[0]?.rect || { x: 80, y: 160, w: 520, h: 120 };
    const paragraphCandidates = Array.from(document.querySelectorAll('p, h2 + p, h1 + p, [class*=description], [class*=subtitle]')).filter(visible).map((el) => ({ text: textOf(el), rect: rectOf(el) })).filter((item) => item.text.length >= 24 && item.text.length <= 260).sort((a, b) => Math.abs(a.rect.y - heroRect.y) - Math.abs(b.rect.y - heroRect.y));
    const heroBody = paragraphCandidates[0]?.text || '';

    const images = Array.from(document.querySelectorAll('img')).filter(visible).map((el, index) => {
      const rect = rectOf(el);
      return {
        selectorIndex: index,
        alt: clean(el.alt || el.getAttribute('aria-label') || ''),
        rect,
        area: rect.w * rect.h,
        src: el.currentSrc || el.src || ''
      };
    }).filter((img) => img.area > 4000).sort((a, b) => b.area - a.area).slice(0, 8);

    const cards = [];
    const imageElements = Array.from(document.querySelectorAll('img')).filter(visible);
    imageElements.forEach((img, index) => {
      const rect = rectOf(img);
      if (rect.w * rect.h < 8000) return;
      let parent = img.closest('article, li, section, div') || img.parentElement;
      let depth = 0;
      while (parent && depth < 4) {
        const parentText = textOf(parent);
        if (parentText.length > 12 && parentText.length < 500) break;
        parent = parent.parentElement;
        depth += 1;
      }
      const texts = uniq(Array.from(parent ? parent.querySelectorAll('h1,h2,h3,h4,p,a,span') : []).filter(visible).map(textOf).filter((t) => t.length > 2 && t.length < 140), 6);
      cards.push({
        title: texts[0] || img.alt || 'Visual Item',
        body: texts.slice(1, 3).join(' '),
        imageIndex: index,
        imageAlt: img.alt || 'Image',
        rect
      });
    });

    const footer = document.querySelector('footer');
    const footerLinks = uniq(Array.from((footer || document).querySelectorAll('a')).filter(visible).map(textOf).filter((t) => t.length <= 40), 12);
    const footerText = footer ? textOf(footer).slice(0, 260) : '';

    const styles = Array.from(document.querySelectorAll('body *')).slice(0, 500).map((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, backgroundColor: s.backgroundColor, fontSize: s.fontSize, fontWeight: s.fontWeight };
    });

    return {
      title: document.title || location.hostname,
      url: location.href,
      viewport: { width: innerWidth, height: innerHeight },
      pageHeight: Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0, innerHeight),
      header: { logoText, navLinks, ctas, rect: rectOf(header) },
      hero: { heading: heroHeading, body: heroBody, ctas, primaryImageIndex: images[0]?.selectorIndex ?? null, secondaryImageIndex: images[1]?.selectorIndex ?? null, rect: heroRect },
      images,
      cards: cards.slice(0, 6),
      footer: { text: footerText, links: footerLinks },
      styles
    };
  });

  const capturedImages = [];
  for (let i = 0; i < Math.min(6, model.images.length); i += 1) {
    const img = model.images[i];
    const shot = await captureElement(page, `img:nth-of-type(${img.selectorIndex + 1})`, img.alt || `Image ${i + 1}`);
    if (shot) capturedImages.push({ ...img, image: shot });
  }

  model.images = model.images.map((img) => ({
    ...img,
    image: capturedImages.find((captured) => captured.selectorIndex === img.selectorIndex)?.image || null
  }));

  return model;
}

function buildPayload(model, screenshot) {
  const colors = unique(model.styles.flatMap((style) => [colorFromCss(style.color), colorFromCss(style.backgroundColor)]).filter(Boolean), 20);
  const typography = unique(model.styles.map((style) => `${style.fontSize}|${style.fontWeight}|${colorFromCss(style.color)}`).filter(Boolean), 12).map((value) => {
    const [fontSize, fontWeight, color] = value.split('|');
    return { role: 'text', sample: 'Typography Sample', fontSize, fontWeight, color };
  });

  const structuredLayout = {
    type: 'structured-site-model',
    header: model.header,
    hero: model.hero,
    images: model.images,
    cards: model.cards,
    footer: model.footer
  };

  const sections = [
    { id: 'section-header', role: 'header', name: 'Header', layers: [], rect: model.header.rect || { x: 0, y: 0, w: 1440, h: 96 } },
    { id: 'section-hero', role: 'hero', name: 'Hero', layers: [], rect: model.hero.rect || { x: 0, y: 96, w: 1440, h: 600 } },
    { id: 'section-content', role: 'content', name: 'Content Cards', layers: [], rect: { x: 0, y: 760, w: 1440, h: 520 } },
    { id: 'section-footer', role: 'footer', name: 'Footer', layers: [], rect: { x: 0, y: model.pageHeight - 240, w: 1440, h: 240 } }
  ];

  const rebuildPlanSections = [
    { name: 'Header', role: 'header', templateIntent: 'header', suggestedLayout: 'brand-navigation-cta', density: 'airy', priorityText: [{ role: 'brand', text: model.header.logoText }], contentBudget: { maxItems: 6, headingChars: 32, bodyChars: 0, maxHeight: 96 }, mediaSlots: 1, overflowRisk: false },
    { name: 'Hero', role: 'hero', templateIntent: 'hero', suggestedLayout: 'editorial-hero-with-media', density: 'normal', priorityText: [{ role: 'heading', text: cut(model.hero.heading, 90) }, { role: 'body', text: cut(model.hero.body, 180) }].filter((x) => x.text), contentBudget: { maxItems: 4, headingChars: 90, bodyChars: 180, maxHeight: 620 }, mediaSlots: 2, overflowRisk: false },
    { name: 'Content Cards', role: 'content', templateIntent: 'gallery', suggestedLayout: 'card-grid', density: model.cards.length > 4 ? 'normal' : 'airy', priorityText: model.cards.slice(0, 6).map((card) => ({ role: 'card', text: cut(card.title, 80) })), contentBudget: { maxItems: 6, headingChars: 80, bodyChars: 80, maxHeight: 520 }, mediaSlots: Math.min(3, model.cards.length), overflowRisk: false },
    { name: 'Footer', role: 'footer', templateIntent: 'footer', suggestedLayout: 'brand-footer-link-groups', density: 'normal', priorityText: [{ role: 'footer', text: cut(model.footer.text, 120) }].filter((x) => x.text), contentBudget: { maxItems: 5, headingChars: 42, bodyChars: 120, maxHeight: 220 }, mediaSlots: 0, overflowRisk: false }
  ];

  return {
    ok: true,
    mode: MODE,
    publicVersion: PUBLIC_VERSION,
    adapter: 'translateit-alpha-v4-structured-site-model',
    capturedAt: new Date().toISOString(),
    title: model.title,
    url: model.url,
    viewport: model.viewport,
    pageHeight: model.pageHeight,
    screenshot,
    structuredLayout,
    layers: [],
    sections,
    rebuildPlan: {
      title: model.title,
      url: model.url,
      publicVersion: PUBLIC_VERSION,
      summary: 'Structured UI model generated from semantic website sections. This avoids raw layer dumping.',
      tokens: {
        colors,
        typography,
        spacing: [{ name: 'Space / XS', value: 4 }, { name: 'Space / SM', value: 8 }, { name: 'Space / MD', value: 16 }, { name: 'Space / LG', value: 24 }, { name: 'Space / XL', value: 40 }, { name: 'Section Gap', value: 72 }, { name: 'Card Padding', value: 24 }, { name: 'Grid Gap', value: 20 }],
        radius: [{ name: 'Radius / SM', value: 8 }, { name: 'Radius / MD', value: 16 }, { name: 'Radius / LG', value: 24 }, { name: 'Radius / XL', value: 32 }]
      },
      componentBlueprints: [
        { name: 'Header / Navigation', purpose: 'Brand, navigation links, and CTA.' },
        { name: 'Hero / Editorial', purpose: 'Main headline with supporting images.' },
        { name: 'Card / Project', purpose: 'Reusable content/project card.' },
        { name: 'Footer / Link Groups', purpose: 'Footer brand and grouped links.' }
      ],
      responsive: { desktop: 'Structured desktop layout.', tablet: 'Stack card groups.', mobile: 'Single column.' },
      counts: { sections: sections.length, text: 1 + model.header.navLinks.length + model.cards.length + model.footer.links.length, images: model.images.length, buttons: model.header.ctas.length + model.hero.ctas.length },
      sections: rebuildPlanSections,
      qualityHints: { overflowRiskCount: 0, denseSectionCount: 0, templateIntentCoverage: 1, professionalTarget: 'Compare structured output against screenshot reference, then tune section model.' },
      uncertainties: ['Some highly custom visual details may still require manual adjustment.']
    },
    diagnostics: {
      layerCount: 0,
      sectionCount: sections.length,
      componentCount: 4,
      imageCount: model.images.length,
      textCount: 1 + model.header.navLinks.length + model.cards.length + model.footer.links.length,
      rebuildPlanSectionCount: rebuildPlanSections.length,
      colorTokenCount: colors.length,
      typographyTokenCount: typography.length,
      spacingTokenCount: 8,
      radiusTokenCount: 4,
      componentBlueprintCount: 4,
      overflowRiskCount: 0,
      denseSectionCount: 0,
      responsiveCount: 3,
      templateIntentCount: 4
    },
    outputRules: [
      '01 Structured UI Clone / Main Output: clean editable UI framework.',
      '02 Screenshot Reference / Pure Source: locked screenshot only.',
      'No raw layer dump as main output.'
    ],
    warnings: ['Version 0.1 - Alpha is design-only.', 'Visual validation is still required.']
  };
}

async function compile(target) {
  const targetUrl = normalizeUrl(target);
  if (!targetUrl) throw new Error('Missing url query parameter.');
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(1800);
    const model = await extractStructuredModel(page);
    const shot = await page.screenshot({ type: 'png', fullPage: true });
    const screenshot = { contentType: 'image/png', base64: shot.toString('base64'), width: model.viewport.width, height: model.pageHeight };
    return buildPayload(model, screenshot);
  } finally {
    await page.close();
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,OPTIONS' });
    res.end();
    return;
  }
  const requestUrl = new URL(req.url, 'http://127.0.0.1:' + PORT);
  if (requestUrl.pathname === '/health') return json(res, 200, { ok: true, service: 'translateit-render-bridge', mode: MODE, publicVersion: PUBLIC_VERSION, adapter: 'alpha-v4-structured-site-model', port: PORT });
  if (requestUrl.pathname !== '/render') return json(res, 404, { ok: false, error: 'Use /render?url=https://example.com' });
  try {
    json(res, 200, await compile(requestUrl.searchParams.get('url')));
  } catch (error) {
    json(res, 500, { ok: false, error: error && error.stack ? error.stack : String(error) });
  }
});

server.listen(PORT, '127.0.0.1', () => console.log('TranslateIT ' + PUBLIC_VERSION + ' Alpha V4 Structured Bridge running at http://127.0.0.1:' + PORT));
