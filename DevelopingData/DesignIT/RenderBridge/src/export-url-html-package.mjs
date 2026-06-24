import path from 'node:path';
import { buildPayload } from './build-payload.mjs';
import { writeHtmlPackage } from './export-html-package.mjs';

const targetUrl = process.argv[2] || 'https://www.mivubi.com/';
const outDir = process.argv[3] || path.join(process.cwd(), 'reports', 'html-export-package');
const payload = await buildPayload(targetUrl);
writeHtmlPackage(payload, outDir);
console.log(JSON.stringify({ ok: true, targetUrl, outDir, blueprint: payload.designBlueprint?.diagnostics || null }, null, 2));
