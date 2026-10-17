#!/usr/bin/env node
/**
 * Headless stills of a generated tree against a plain sky: node tools/tree-gen/shots.mjs [outDir] [--glb path] [--tag name]
 *
 * Serves the repository root on a loopback port, opens tools/tree-gen/preview.html in headless Chrome through
 * tools/cdp.mjs (software GL: slow but deterministic) and saves 3 m, 10 m and 30 m stills plus a base close-up.
 * Extra views: --view dist,yaw,aim,height,name (repeatable).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from '../cdp.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const all = (k) => args.flatMap((a, i) => (a === k ? [args[i + 1]] : []));
const outDir = path.resolve(args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1]?.startsWith('--') === false) ?? flag('--out', 'tools/tree-gen/out/shots'));
const glb = flag('--glb', '/public/models/flora/hero/hero-oak-near.glb'), tag = flag('--tag', 'oak'), near = flag('--near', '');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
fs.mkdirSync(outDir, { recursive: true });
const views = [
  { name: '03m', dist: 3, yaw: 25, aim: 4.5, height: 1.7, fov: 70 },
  { name: '03m-up', dist: 3.4, yaw: 130, aim: 9, height: 1.7, fov: 75 },
  { name: '10m', dist: 10, yaw: 25, aim: 7.5, height: 1.7, fov: 55 },
  { name: '30m', dist: 30, yaw: 25, aim: 8, height: 1.7, fov: 40 },
  { name: 'base', dist: 3.2, yaw: 200, aim: 0.7, height: 1.4, fov: 60 },
  ...all('--view').map((v) => { const [dist, yaw, aim, height, name, fov] = v.split(','); return { name, dist: +dist, yaw: +yaw, aim: +aim, height: +height, fov: +(fov || 55) }; }),
];
const only = flag('--only', ''); const list = only ? views.filter((v) => only.split(',').includes(v.name)) : views;
const url = `http://127.0.0.1:${port}/tools/tree-gen/preview.html?${flag('--fast', '') ? 'fast=1&' : ''}glb=${encodeURIComponent(glb)}${near ? `&near=${encodeURIComponent(near)}` : ''}`;
const page = await openPage(url, { w: 1280, h: 720 });
try {
  for (let i = 0; i < 600; i++) { if (await page.eval('window.tvReady === true')) break; if (await page.eval('!!window.tvError')) throw new Error(await page.eval('window.tvError')); await page.wait(500); }
  console.log('stats', JSON.stringify(await page.eval('window.tvShot({})')));
  for (const v of list) {
    await page.eval(`window.tvShot(${JSON.stringify(v)})`);
    const file = path.join(outDir, `${tag}-${v.name}.png`); await page.shot(file); console.log(file);
  }
} finally { await page.close?.(); server.close(); }
