#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { openPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, all) => arg.startsWith('--') ? [[arg.slice(2), all[i + 1]]] : []));
const out = args.out ?? 'software-webgl-proof';
const timeout = Number(args.timeout ?? 180000);
if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('Invalid check timeout');
fs.mkdirSync(out, { recursive: true });
const url = new URL(args.url ?? 'http://127.0.0.1:4173/');
for (const [key, value] of Object.entries({ shot: '1', place: 'rillford', quality: 'low', settle: '1', hud: '0' })) url.searchParams.set(key, value);
const report = { schema: 1, preset: 'low', width: 640, height: 360, assertions: {}, performanceGate: false };
let page;
try {
  page = await openPage(url.href, { w: 640, h: 360, requestTimeoutMs: Math.min(timeout, 120000) });
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await page.eval('return window.tervain?.mode === "play" && !!window.tervain?.renderer;');
    if (ready) { report.assertions.gameReady = true; break; }
    await page.wait(250);
  }
  if (!report.assertions.gameReady) throw new Error('Game readiness assertion failed');
  const context = await page.eval(`const gl = window.tervain.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return { webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext, software: !!ext && /swiftshader/i.test(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) };`);
  report.assertions.webgl2 = context.webgl2;
  report.assertions.swiftShader = context.software;
  // Verify the artifact's own published stamp, without including its source URL in public evidence.
  const version = await page.eval(`const r = await fetch(new URL('version.json', document.baseURI)); return r.ok ? await r.json() : null;`);
  if (version) report.build = { version: version.version, revision: version.revision ?? version.commit };
  await page.shot(path.join(out, 'game.png'));
  const { data, info } = await sharp(path.join(out, 'game.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let min = 255, max = 0;
  for (const byte of data) { min = Math.min(min, byte); max = Math.max(max, byte); }
  report.assertions.captureDimensions = info.width === 640 && info.height === 360;
  report.assertions.nonBlankCapture = max - min > 32;
  // A never-resolving page promise must reject when this check closes its browser.
  const pending = page.eval('return new Promise(() => {});').then(() => false, error => /connection closed/.test(error.message));
  page.close();
  report.assertions.disconnectSettlesRequest = await pending;
  report.pass = Object.values(report.assertions).every(value => value === true);
  if (!report.pass) throw new Error('Software WebGL assertion failed');
  console.log(JSON.stringify(report));
} catch (error) {
  report.pass = false;
  // Error text and browser logs can contain private URLs and paths; keep public artifacts structural.
  report.failure = 'Software WebGL verification failed';
  console.error(report.failure);
  process.exitCode = 1;
} finally {
  page?.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
