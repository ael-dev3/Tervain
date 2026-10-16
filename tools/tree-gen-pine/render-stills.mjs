#!/usr/bin/env node
/** Stills of the generated hero pines: node tools/tree-gen-pine/render-stills.mjs <outDir> [lod]  (headless Chrome over CDP, no Playwright). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from '../cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.resolve(process.argv[2] ?? 'stills');
const lod = process.argv[3] ?? 'near';
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const page = await openPage(`http://127.0.0.1:${server.address().port}/tools/tree-gen-pine/preview.html`, { w: 1280, h: 720 });
try {
  for (let i = 0; i < 100 && !(await page.eval('return !!window.ready')); i++) await page.wait(200);
  const shots = [
    ['3m_trunk', { variants: [1], dist: 3, camY: 1.7, lookY: 3.2, az: 0.6, fov: 60 }],
    ['3m_base', { variants: [1], dist: 3.2, camY: 1.2, lookY: 0.8, az: 0.2, fov: 60 }],
    ['10m_crown', { variants: [1], dist: 10, camY: 1.7, lookY: 10, az: 0.5 }],
    ['30m_all', { variants: [0, 1, 2, 3], spacing: 12, dist: 34, camY: 1.7, lookY: 9, az: 0.2, fov: 55 }],
    ['30m_single', { variants: [2], dist: 30, camY: 1.7, lookY: 11, az: 0.9, fov: 45 }],
    ['lookup', { variants: [1], dist: 4, camY: 1.5, lookY: 12, az: 0.5, fov: 75 }],
    ['10m_wood', { variants: [2], dist: 12, camY: 1.7, lookY: 10, az: 0.5, hide: 'leaf' }],
  ];
  for (const [name, args] of shots) {
    await page.eval(`return await window.show(${JSON.stringify({ lod, ...args })})`);
    await page.shot(path.join(out, `${lod}_${name}.png`));
  }
  console.log(page.console().join('\n'));
} finally { page.close(); server.close(); }
