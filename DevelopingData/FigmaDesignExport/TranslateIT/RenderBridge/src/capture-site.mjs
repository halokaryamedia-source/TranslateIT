import { chromium } from 'playwright';
import { DEFAULT_VIEWPORT, normalizeUrl } from './shared-contract.mjs';

let browserPromise;

async function getBrowser() {
  if (!browserPromise) browserPromise = chromium.launch({ headless: true });
  return browserPromise;
}

function toBase64(buffer) {
  return Buffer.from(buffer).toString('base64');
}

export async function captureSite(inputUrl, options = {}) {
  const url = normalizeUrl(inputUrl);
  if (!url) throw new Error('URL is required.');

  const viewport = options.viewport || DEFAULT_VIEWPORT;
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: options.timeout || 45000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});

    await page.evaluate(() => {
      Array.from(document.images || []).forEach((img, index) => img.setAttribute('data-translateit-image-index', String(index)));
    });

    const raw = await page.evaluate(() => {
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const parseColor = (value) => String(value || '').trim();
      const directTextOf = (el) => clean(Array.from(el.childNodes || []).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent || '').join(' '));
      const rectOf = (el) => {
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.left + scrollX),
          y: Math.round(r.top + scrollY),
          w: Math.round(r.width),
          h: Math.round(r.height)
        };
      };
      const visible = (el) => {
        if (!el) return false;
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (s.display === 'none' || s.visibility === 'hidden') return false;
        if (Number(s.opacity || 1) <= 0.03) return false;
        if (r.width < 3 || r.height < 3) return false;
        return true;
      };
      const roleOf = (el, text, directText, style, rect, childElementCount) => {
        const tag = String(el.tagName || '').toLowerCase();
        const cls = String(el.className || '');
        const aria = String(el.getAttribute('aria-label') || '');
        const id = String(el.id || '');
        const hint = `${tag} ${cls} ${aria} ${id}`.toLowerCase();
        if (tag === 'img' || tag === 'picture' || tag === 'svg') return 'image';
        if (tag === 'button' || el.getAttribute('role') === 'button' || /\b(btn|button|cta)\b/i.test(cls)) return 'button';
        if (tag === 'a' && text.length <= 96) return 'link';
        if (/header|nav|navbar|menu/.test(hint) && rect.y < 260) return 'navigation';
        if (/footer/.test(hint)) return 'footer';
        if (/h1/.test(tag)) return 'heading-1';
        if (/h2/.test(tag)) return 'heading-2';
        if (/h3|h4/.test(tag)) return 'heading-3';
        if (/^(p|span|strong|em|small|label|li)$/i.test(tag) && text && text.length <= 260) return 'text';
        if (directText && directText.length <= 180 && childElementCount <= 2) return 'text';
        const hasBg = style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
        if (hasBg && rect.w * rect.h > 10000) return 'container';
        return 'decorative';
      };

      const elements = Array.from(document.querySelectorAll('body *')).filter(visible).map((el, index) => {
        const style = getComputedStyle(el);
        const rect = rectOf(el);
        const text = clean(el.innerText || el.textContent || '');
        const directText = directTextOf(el);
        const childElementCount = el.children ? el.children.length : 0;
        const tag = String(el.tagName || '').toLowerCase();
        const role = roleOf(el, text, directText, style, rect, childElementCount);
        return {
          id: `raw-${index}`,
          index,
          tag,
          role,
          text: text.slice(0, 320),
          directText: directText.slice(0, 220),
          childElementCount,
          textDensity: text.length ? Number((text.length / Math.max(1, rect.w * rect.h)).toFixed(6)) : 0,
          rect,
          area: rect.w * rect.h,
          imageIndex: tag === 'img' ? Number(el.getAttribute('data-translateit-image-index') || -1) : null,
          alt: clean(el.getAttribute('alt') || el.getAttribute('aria-label') || ''),
          href: el.href || '',
          style: {
            color: parseColor(style.color),
            backgroundColor: parseColor(style.backgroundColor),
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            fontFamily: style.fontFamily,
            lineHeight: style.lineHeight,
            borderRadius: style.borderRadius,
            textAlign: style.textAlign,
            display: style.display,
            position: style.position,
            zIndex: style.zIndex
          }
        };
      }).filter((item) => {
        if (item.role === 'decorative') return item.area >= 16000 && item.area < innerWidth * Math.max(innerHeight, document.documentElement.scrollHeight) * 0.85;
        if (item.role === 'container') return item.area >= 12000;
        if (item.role === 'image') return item.area >= 4000;
        if (item.role === 'navigation') return item.text.length <= 160 && item.rect.w >= 8 && item.rect.h >= 8;
        if (item.role === 'footer') return item.text.length <= 260 && item.rect.w >= 8 && item.rect.h >= 8;
        if (item.text) return item.rect.w >= 8 && item.rect.h >= 8;
        return false;
      }).slice(0, 260);

      const title = clean(document.title || location.hostname);
      const pageHeight = Math.max(document.documentElement.scrollHeight || 0, document.body.scrollHeight || 0, innerHeight);
      return {
        title,
        finalUrl: location.href,
        viewport: { width: innerWidth, height: innerHeight },
        pageHeight,
        elements
      };
    });

    const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
    const screenshot = {
      contentType: 'image/png',
      base64: toBase64(screenshotBuffer),
      width: raw.viewport.width,
      height: raw.pageHeight
    };

    const imageAssets = [];
    const imageElements = raw.elements.filter((item) => item.role === 'image' && Number.isFinite(item.imageIndex)).slice(0, 24);
    for (const item of imageElements) {
      try {
        const handle = await page.$(`[data-translateit-image-index="${item.imageIndex}"]`);
        if (!handle) continue;
        const box = await handle.boundingBox();
        if (!box || box.width < 12 || box.height < 12) continue;
        const buffer = await handle.screenshot({ type: 'png' });
        imageAssets.push({
          id: `asset-image-${item.imageIndex}`,
          kind: 'image',
          imageIndex: item.imageIndex,
          name: item.alt || `Image ${item.imageIndex + 1}`,
          rect: item.rect,
          contentType: 'image/png',
          base64: toBase64(buffer),
          width: Math.round(box.width),
          height: Math.round(box.height)
        });
      } catch (_) {}
    }

    return {
      source: {
        url,
        finalUrl: raw.finalUrl,
        title: raw.title,
        viewport: raw.viewport,
        pageHeight: raw.pageHeight,
        screenshot
      },
      rawElements: raw.elements,
      assets: imageAssets
    };
  } finally {
    await page.close().catch(() => {});
  }
}
