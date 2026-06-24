import assert from 'node:assert/strict';
import { applyDesktopQualityPass } from '../src/apply-desktop-quality-pass.mjs';

const plan = {
  version: 'figma-render-plan-v1',
  status: 'pass',
  page: { width: 1440, height: 2200, backgroundColor: '#FFFFFF' },
  frames: [
    {
      id: 'footer',
      name: '03 Footer',
      role: 'footer',
      rect: { x: 0, y: 1700, w: 1440, h: 300 },
      children: [],
      directChildren: [{ id: 'tiny-shape', name: 'Tiny Shape', kind: 'shape', role: 'decorative', rect: { x: 4, y: 4, w: 2, h: 2 }, style: { backgroundColor: '#FFFFFF' } }],
      groups: [
        {
          id: 'footer-text',
          name: '50 Text',
          rect: { x: 80, y: 80, w: 500, h: 80 },
          children: [
            { id: 'footer-copy', name: 'Footer Copy', kind: 'text', text: 'Footer text', rect: { x: 0, y: 0, w: 240, h: 24 }, style: { fontSize: 14 } }
          ]
        }
      ]
    },
    {
      id: 'hero',
      name: '01 Hero',
      role: 'hero',
      rect: { x: 0, y: 0, w: 1440, h: 680 },
      children: [],
      directChildren: [
        { id: 'bg', name: 'Background', kind: 'shape', role: 'section-background', rect: { x: 0, y: 0, w: 1440, h: 680 }, style: { backgroundColor: '#F8FAFC' } },
        { id: 'offscreen', name: 'Offscreen', kind: 'image', rect: { x: 5000, y: 0, w: 120, h: 120 }, assetId: 'x', style: {} }
      ],
      groups: [
        {
          id: 'hero-text',
          name: '10 Headings',
          rect: { x: 80, y: 100, w: 640, h: 220 },
          children: [
            { id: 'title', name: 'Title', kind: 'text', text: 'Build better worlds', rect: { x: 0, y: 0, w: 500, h: 60 }, style: { fontSize: 48 } },
            { id: 'body', name: 'Body', kind: 'text', text: 'A professional import benchmark.', rect: { x: 0, y: 80, w: 500, h: 32 }, style: { fontSize: 18 } },
            { id: 'body-dup', name: 'Body Duplicate', kind: 'text', text: 'A professional import benchmark.', rect: { x: 0, y: 80, w: 500, h: 32 }, style: { fontSize: 18 } }
          ]
        },
        {
          id: 'hero-media',
          name: '30 Media',
          rect: { x: 820, y: 120, w: 420, h: 360 },
          children: [
            { id: 'hero-image', name: 'Hero Image', kind: 'image', rect: { x: 0, y: 0, w: 420, h: 300 }, assetId: 'hero', style: {} },
            { id: 'icon-noise', name: 'Content / Icon SVGAnimatedString', kind: 'image', rect: { x: 0, y: 320, w: 24, h: 24 }, assetId: 'icon', style: {} }
          ]
        }
      ]
    },
    {
      id: 'content',
      name: '02 Content',
      role: 'content',
      rect: { x: 0, y: 760, w: 1440, h: 720 },
      children: [],
      directChildren: [],
      groups: [
        {
          id: 'cards',
          name: 'Cards',
          rect: { x: 80, y: 80, w: 1100, h: 340 },
          children: [
            { id: 'card-title-1', name: 'Card Title 1', kind: 'text', text: 'Card One', rect: { x: 0, y: 0, w: 200, h: 36 }, style: { fontSize: 24 } },
            { id: 'card-body-1', name: 'Card Body 1', kind: 'text', text: 'Description one.', rect: { x: 0, y: 50, w: 240, h: 28 }, style: { fontSize: 16 } },
            { id: 'card-title-2', name: 'Card Title 2', kind: 'text', text: 'Card Two', rect: { x: 360, y: 0, w: 200, h: 36 }, style: { fontSize: 24 } },
            { id: 'card-body-2', name: 'Card Body 2', kind: 'text', text: 'Description two.', rect: { x: 360, y: 50, w: 240, h: 28 }, style: { fontSize: 16 } }
          ]
        }
      ]
    }
  ]
};

const next = applyDesktopQualityPass(plan);

assert.equal(next.diagnostics.desktopQualityPass, true);
assert.equal(next.page.width, 1440);
assert.ok(next.page.height >= 640);
assert.deepEqual(next.frames.map((frame) => frame.id), ['hero', 'content', 'footer']);
assert.deepEqual(next.frames.map((frame) => frame.rect.y), [0, 680, 1400]);
assert.equal(next.frames[0].directChildren.some((layer) => layer.id === 'offscreen'), false);
assert.equal(next.frames[0].groups.flatMap((group) => group.children).some((layer) => layer.id === 'body-dup'), false);
assert.equal(next.frames[0].groups.flatMap((group) => group.children).some((layer) => layer.id === 'icon-noise'), false);
assert.ok(next.diagnostics.desktopQuality.score >= 55, 'quality score should be reviewable');
assert.equal(next.diagnostics.desktopQuality.removedReasons['duplicate-layer'], 1);
assert.ok(next.diagnostics.desktopQuality.removedReasons['tiny-noise'] >= 1);

console.log(JSON.stringify({
  gate: 'designit-desktop-quality-pass',
  status: 'pass',
  quality: next.diagnostics.desktopQuality,
  frames: next.frames.map((frame) => ({ id: frame.id, rect: frame.rect, layers: frame.children.length }))
}, null, 2));
