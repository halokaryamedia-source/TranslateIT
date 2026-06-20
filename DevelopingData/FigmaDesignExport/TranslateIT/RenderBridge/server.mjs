import http from 'node:http';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const PORT = Number(process.env.TRANSLATEIT_RENDER_PORT || 8844);
const IDLE_EXIT_MS = Number(process.env.TRANSLATEIT_RENDER_IDLE_EXIT_MS || 180000);
const MAX_CSS_FILES = 24;
const MAX_IMAGE_ASSETS = 80;
const VIEWPORT = { width: 1440, height: 1600 };

let idleTimer = null;
let activeJobs = 0;
let server = null;
let browserPromise = null;

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true });
  return browserPromise;
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (activeJobs > 0) {
      resetIdleTimer();
      return;
    }

    try {
      if (browserPromise) {
        const browser = await browserPromise;
        await browser.close();
      }
    } catch (_) {}

    if (server) {
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 3000).unref();
    }
  }, IDLE_EXIT_MS);
  idleTimer.unref();
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function absoluteUrl(value, baseUrl) {
  try {
    return new URL(String(value || '').trim(), baseUrl).href;
  } catch (_) {
    return String(value || '').trim();
  }
}

function stripQuotes(value) {
  return String(value || '').trim().replace(/^['"]|['"]$/g, '');
}

function cleanText(value) {
  return String(value || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 TranslateIT Hybrid Source Bundle Compiler',
      'Accept': '*/*'
    },
    redirect: 'follow'
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const contentType = response.headers.get('content-type') || '';
  const bytes = Buffer.from(await response.arrayBuffer());
  return { bytes, contentType, finalUrl: response.url || url };
}

async function fetchText(url) {
  const { bytes, contentType, finalUrl } = await fetchBuffer(url);
  return { text: bytes.toString('utf8'), contentType, finalUrl };
}

async function renderClientHtml(url) {
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch (_) {}
    await page.waitForTimeout(1800);
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let total = 0;
        const step = 700;
        const timer = setInterval(() => {
          window.scrollBy(0, step);
          total += step;
          const height = Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0);
          if (total >= height || total > 8000) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 80);
      });
    });
    await page.waitForTimeout(600);
    const result = await page.evaluate(() => ({
      title: document.title || location.hostname,
      html: '<!doctype html>\n' + document.documentElement.outerHTML,
      finalUrl: location.href,
      bodyText: document.body ? document.body.innerText : ''
    }));
    return result;
  } finally {
    await page.close();
  }
}

function extractTitle(html, url) {
  const match = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (match) return cleanText(match[1]) || new URL(url).hostname;
  return new URL(url).hostname;
}

function extractAttrs(raw) {
  const attrs = {};
  String(raw || '').replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/g, (_, key, value) => {
    attrs[key.toLowerCase()] = stripQuotes(value);
    return '';
  });
  return attrs;
}

function extractStylesheetUrls(html, baseUrl) {
  const urls = [];
  String(html || '').replace(/<link\b([^>]*?)>/gi, (_, rawAttrs) => {
    const attrs = extractAttrs(rawAttrs);
    const rel = String(attrs.rel || '').toLowerCase();
    if (!rel.includes('stylesheet')) return '';
    if (!attrs.href) return '';
    urls.push(absoluteUrl(attrs.href, baseUrl));
    return '';
  });
  return Array.from(new Set(urls)).slice(0, MAX_CSS_FILES);
}

function extractInlineCss(html) {
  const blocks = [];
  String(html || '').replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    blocks.push(css || '');
    return '';
  });
  return blocks.join('\n\n');
}

function normalizeCssUrls(css, baseUrl) {
  return String(css || '').replace(/url\(([^)]+)\)/gi, (_, raw) => {
    const value = stripQuotes(raw);
    if (!value || value.startsWith('data:') || value.startsWith('#')) return `url(${raw})`;
    return `url("${absoluteUrl(value, baseUrl)}")`;
  });
}

function extractImports(css, baseUrl) {
  const imports = [];
  String(css || '').replace(/@import\s+(?:url\()?['"]?([^'";)]+)['"]?\)?[^;]*;/gi, (_, href) => {
    imports.push(absoluteUrl(href, baseUrl));
    return '';
  });
  return imports;
}

async function collectCss(html, pageUrl) {
  const visited = new Set();
  const cssFiles = [];
  const cssTexts = [normalizeCssUrls(extractInlineCss(html), pageUrl)];
  const queue = extractStylesheetUrls(html, pageUrl);

  while (queue.length && visited.size < MAX_CSS_FILES) {
    const cssUrl = queue.shift();
    if (!cssUrl || visited.has(cssUrl)) continue;
    visited.add(cssUrl);

    try {
      const result = await fetchText(cssUrl);
      const normalized = normalizeCssUrls(result.text, result.finalUrl || cssUrl);
      cssTexts.push(normalized);
      cssFiles.push({ url: cssUrl, bytes: Buffer.byteLength(result.text, 'utf8') });
      extractImports(result.text, result.finalUrl || cssUrl).forEach((nextUrl) => {
        if (!visited.has(nextUrl) && queue.length + visited.size < MAX_CSS_FILES) queue.push(nextUrl);
      });
    } catch (error) {
      cssFiles.push({ url: cssUrl, error: error && error.message ? error.message : String(error) });
    }
  }

  return { css: cssTexts.join('\n\n'), cssFiles };
}

function findMatchingClose(html, tagName, openEndIndex) {
  const tag = tagName.toLowerCase();
  if (['img', 'input', 'br', 'hr', 'meta', 'link', 'source'].includes(tag)) return openEndIndex;
  const regex = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  regex.lastIndex = openEndIndex;
  let depth = 1;
  let match;
  while ((match = regex.exec(html))) {
    const token = match[0];
    if (/^<\//.test(token)) depth -= 1;
    else if (!/\/>$/.test(token)) depth += 1;
    if (depth === 0) return match.index;
  }
  return openEndIndex;
}

function simplifyClassName(value) {
  return String(value || '').split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
}

function roleOf(tag, attrs, className) {
  const cls = String(className || '').toLowerCase();
  const role = String(attrs.role || '').toLowerCase();
  if (tag === 'body') return 'root';
  if (tag === 'header') return 'header';
  if (tag === 'nav') return 'nav';
  if (tag === 'footer') return 'footer';
  if (['main', 'section', 'article', 'aside'].includes(tag)) return 'section';
  if (tag === 'img' || tag === 'picture' || tag === 'svg') return 'image';
  if (tag === 'button' || role === 'button' || cls.includes('button') || cls.includes('btn') || cls.includes('cta')) return 'button';
  if (tag === 'a') return 'link';
  if (/^h[1-6]$/.test(tag)) return 'heading';
  if (tag === 'p') return 'paragraph';
  if (['span', 'strong', 'em', 'small', 'label'].includes(tag)) return 'text';
  if (['ul', 'ol'].includes(tag)) return 'list';
  if (tag === 'li') return 'list-item';
  if (cls.includes('card') || cls.includes('item') || cls.includes('project') || cls.includes('portfolio') || cls.includes('work')) return 'card';
  return 'group';
}

function nameOf(tag, attrs, text, role) {
  const cls = simplifyClassName(attrs.class || '');
  const value = cleanText(attrs['aria-label'] || attrs.alt || attrs.title || text || attrs.id || cls || role || tag);
  return value.slice(0, 96) || 'Layer';
}

function parseInlineStyle(styleText) {
  const style = {};
  String(styleText || '').split(';').forEach((decl) => {
    const index = decl.indexOf(':');
    if (index < 0) return;
    const key = decl.slice(0, index).trim().toLowerCase();
    const value = decl.slice(index + 1).trim();
    if (key) style[key] = value;
  });
  return style;
}

function createTextNode(text, parentPath, idRef) {
  const value = cleanText(text);
  if (!value || value.length < 2) return null;
  return {
    id: `text-${idRef.value++}`,
    tag: '#text',
    role: 'text',
    name: value.slice(0, 96),
    text: value,
    attrs: {},
    inlineStyle: {},
    path: parentPath,
    children: []
  };
}

function parseHtmlChildren(html, baseUrl, parentPath, idRef, depth = 0) {
  if (depth > 16) return [];
  const output = [];
  const regex = /<([a-zA-Z][a-zA-Z0-9:-]*)(\s[^>]*)?>/g;
  let cursor = 0;
  let match;

  while ((match = regex.exec(html))) {
    const before = html.slice(cursor, match.index);
    const textNode = createTextNode(before, parentPath, idRef);
    if (textNode) output.push(textNode);

    const rawTag = match[1];
    const tag = rawTag.toLowerCase();
    const rawAttrs = match[2] || '';
    const openTag = match[0];
    const openEnd = regex.lastIndex;

    if (['script', 'style', 'meta', 'link', 'noscript', 'template'].includes(tag)) {
      const closeIndex = findMatchingClose(html, tag, openEnd);
      cursor = closeIndex === openEnd ? openEnd : closeIndex + (`</${tag}>`).length;
      regex.lastIndex = cursor;
      continue;
    }

    const selfClosing = /\/>$/.test(openTag) || ['img', 'input', 'br', 'hr', 'source'].includes(tag);
    const closeIndex = selfClosing ? openEnd : findMatchingClose(html, tag, openEnd);
    const innerHtml = selfClosing ? '' : html.slice(openEnd, closeIndex);
    const attrs = extractAttrs(rawAttrs);
    const className = simplifyClassName(attrs.class || '');
    const role = roleOf(tag, attrs, className);
    const plainText = cleanText(innerHtml).slice(0, 180);
    const path = `${parentPath} > ${tag}${attrs.id ? '#' + attrs.id : ''}${className ? '.' + className.split(' ')[0] : ''}`;

    const node = {
      id: `node-${idRef.value++}`,
      tag,
      role,
      name: nameOf(tag, attrs, plainText, role),
      text: ['heading', 'paragraph', 'text', 'button', 'link'].includes(role) ? plainText : '',
      attrs: {
        id: attrs.id || '',
        class: className,
        href: attrs.href ? absoluteUrl(attrs.href, baseUrl) : '',
        src: attrs.src ? absoluteUrl(attrs.src, baseUrl) : '',
        alt: attrs.alt || ''
      },
      inlineStyle: parseInlineStyle(attrs.style || ''),
      path,
      children: []
    };

    if (role === 'image') {
      node.src = attrs.src ? absoluteUrl(attrs.src, baseUrl) : '';
      node.text = attrs.alt || '';
    } else if (!selfClosing) {
      node.children = parseHtmlChildren(innerHtml, baseUrl, path, idRef, depth + 1);
    }

    const keepStructural = ['root', 'header', 'nav', 'footer', 'section', 'card', 'list', 'list-item', 'button', 'link', 'image', 'heading', 'paragraph', 'text'].includes(role);
    if (keepStructural || node.children.length) output.push(node);

    cursor = selfClosing ? openEnd : closeIndex + (`</${tag}>`).length;
    regex.lastIndex = cursor;
  }

  const tail = html.slice(cursor);
  const tailNode = createTextNode(tail, parentPath, idRef);
  if (tailNode) output.push(tailNode);

  return output;
}

function extractBodyHtml(html) {
  const match = String(html || '').match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : String(html || '');
}

function collectImageUrls(node, out = []) {
  if (!node) return out;
  if (node.role === 'image' && node.src) out.push(node.src);
  (node.children || []).forEach((child) => collectImageUrls(child, out));
  return out;
}

function attachImageAssets(node, assetsByUrl) {
  if (!node) return;
  if (node.role === 'image' && node.src && assetsByUrl[node.src]) node.image = assetsByUrl[node.src];
  (node.children || []).forEach((child) => attachImageAssets(child, assetsByUrl));
}

async function collectImages(root) {
  const urls = Array.from(new Set(collectImageUrls(root))).slice(0, MAX_IMAGE_ASSETS);
  const assets = {};

  for (const url of urls) {
    try {
      const result = await fetchBuffer(url);
      if (!/^image\//i.test(result.contentType)) continue;
      assets[url] = { url, contentType: result.contentType, base64: result.bytes.toString('base64'), bytes: result.bytes.length };
    } catch (error) {
      assets[url] = { url, error: error && error.message ? error.message : String(error) };
    }
  }

  return assets;
}

function countNodes(node) {
  if (!node) return 0;
  return 1 + (node.children || []).reduce((sum, child) => sum + countNodes(child), 0);
}

function buildRootFromHtml(html, baseUrl, idRef) {
  return {
    id: 'root-0',
    tag: 'body',
    role: 'root',
    name: 'Website Source Root',
    text: '',
    attrs: {},
    inlineStyle: {},
    path: 'body',
    children: parseHtmlChildren(extractBodyHtml(html), baseUrl, 'body', idRef, 0)
  };
}

function isSparseTree(root) {
  if (!root) return true;
  const nodeCount = countNodes(root);
  const textLength = cleanText(JSON.stringify(root.children || [])).length;
  return nodeCount <= 5 || textLength < 80;
}

async function compileSourceBundle(sourceUrl) {
  const targetUrl = normalizeUrl(sourceUrl);
  if (!targetUrl) throw new Error('Missing url query parameter.');

  const staticResult = await fetchText(targetUrl);
  let finalUrl = staticResult.finalUrl || targetUrl;
  let html = staticResult.text;
  let title = extractTitle(html, finalUrl);
  let sourceKind = 'static-html';
  let idRef = { value: 1 };
  let root = buildRootFromHtml(html, finalUrl, idRef);

  if (isSparseTree(root)) {
    const rendered = await renderClientHtml(finalUrl);
    html = rendered.html || html;
    finalUrl = rendered.finalUrl || finalUrl;
    title = rendered.title || title;
    sourceKind = 'rendered-client-html';
    idRef = { value: 1 };
    root = buildRootFromHtml(html, finalUrl, idRef);
  }

  const cssResult = await collectCss(html, finalUrl);
  const images = await collectImages(root);
  attachImageAssets(root, images);

  return {
    ok: true,
    url: finalUrl,
    title,
    mode: 'hybrid-source-bundle-compiler-v2',
    capturedAt: new Date().toISOString(),
    source: {
      kind: sourceKind,
      htmlBytes: Buffer.byteLength(html, 'utf8'),
      cssBytes: Buffer.byteLength(cssResult.css, 'utf8'),
      cssFiles: cssResult.cssFiles,
      imageCount: Object.keys(images).length,
      nodeCount: countNodes(root)
    },
    css: cssResult.css,
    tree: root,
    html,
    warnings: [
      'Hybrid Source Bundle Compiler downloads source HTML first, then falls back to rendered client HTML when the source is sparse.',
      'This avoids empty output on client-rendered sites while keeping semantic source-tree conversion.',
      'Complex CSS layout is approximated semantically, not pixel-perfect.'
    ]
  };
}

server = http.createServer(async (req, res) => {
  resetIdleTimer();

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,OPTIONS'
    });
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (requestUrl.pathname === '/health') {
    json(res, 200, { ok: true, service: 'translateit-render-bridge', mode: 'hybrid-source-bundle-compiler-v2', port: PORT });
    return;
  }

  if (requestUrl.pathname === '/shutdown') {
    json(res, 200, { ok: true, message: 'Render Bridge shutting down.' });
    setTimeout(async () => {
      try {
        if (browserPromise) {
          const browser = await browserPromise;
          await browser.close();
        }
      } catch (_) {}
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 3000).unref();
    }, 200);
    return;
  }

  if (requestUrl.pathname !== '/render') {
    json(res, 404, { ok: false, error: 'Use /render?url=https://example.com' });
    return;
  }

  activeJobs += 1;
  try {
    const result = await compileSourceBundle(requestUrl.searchParams.get('url'));
    json(res, 200, result);
  } catch (error) {
    json(res, 500, { ok: false, error: error && error.message ? error.message : String(error) });
  } finally {
    activeJobs -= 1;
    resetIdleTimer();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`TranslateIT Hybrid Source Bundle Compiler V2 running at http://127.0.0.1:${PORT}`);
  resetIdleTimer();
});
