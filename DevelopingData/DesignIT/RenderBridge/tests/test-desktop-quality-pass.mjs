import assert from 'node:assert/strict';
import { applyDesktopQualityPass } from '../src/apply-desktop-quality-pass.mjs';

const plan = {
  status: 'pass',
  page: { width: 1440, height: 900 },
  frames: [
    {
      name: '02 Content',
      rect: { x: 0, y: 600, w: 1440, h: 400 },
      children: [],
      directChildren: [
        { id: 'text-a', kind: 'text', text: 'Content title', rect: { x: 80, y: 80, w: 300, h: 40 } },
        { id: 'text-a-dup', kind: 'text', text: 'Content title', rect: { x: 80, y: 80, w: 300, h: 40 } },
        { id: 'tiny', kind: 'shape', rect: { x: 0, y: 0, w: 2, h: 2 } }
      ],
      groups: []
    },
    {
      name: '01 Hero',
      rect: { x: 0, y: 0, w: 1440, h: 600 },
      children: [],
      directChildren: [
        { id: 'hero-title', kind: 'text', text: 'Hero title', rect: { x: 80, y: 100, w: 420, h: 60 } },
        { id: 'hero-image', kind: 'image', name: 'Hero Image', assetId: 'hero', rect: { x: 700, y: 100, w: 480, h: 320 } }
      ],
      groups: []
    }
  ]
};

const next = applyDesktopQualityPass(plan);

assert.equal(next.diagnostics.desktopQualityPass, true);
assert.equal(next.frames[0].name, '01 Hero');
assert.equal(next.frames[1].name, '02 Content');
assert.ok(next.diagnostics.desktopQuality.removedLayers >= 2);
assert.ok(next.diagnostics.desktopQuality.score >= 50);

console.log(JSON.stringify({
  gate: 'designit-desktop-quality-pass',
  status: 'pass',
  quality: next.diagnostics.desktopQuality
}, null, 2));
