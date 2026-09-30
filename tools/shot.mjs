#!/usr/bin/env node
/**
 * Capture a deterministic view of the running dev server after the game reports READY.
 *
 *   node tools/shot.mjs out.png place=rillford yaw=0.6 pitch=0.3 dist=12 hour=11 [hud=0] [q=high] [w=1280] [h=720]
 *
 * Needs `npm run dev` on http://127.0.0.1:5173 and Chrome/Edge (set CHROME to override).
 */
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';

const [requestedOut, ...pairs] = process.argv.slice(2);
if (!requestedOut) {
  console.error('usage: node tools/shot.mjs out.png key=value ...');
  process.exit(1);
}

const params = new URLSearchParams({ shot: '1' });
let w = 1280;
let h = 720;
for (const p of pairs) {
  const [k, v] = p.split('=');
  if (k === 'w') w = Number(v);
  else if (k === 'h') h = Number(v);
  else if (k === 'q') params.set('quality', v);
  else params.set(k, v);
}

const baseUrl = process.env.TERVAIN_URL ?? 'http://127.0.0.1:5173/';
const url = new URL(baseUrl);
for (const [key, value] of params) url.searchParams.set(key, value);
const out = path.resolve(requestedOut);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.rmSync(out, { force: true });

const page = await openPage(url.href, { w, h });
try {
  let ready = false;
  for (let i = 0; i < 240; i++) {
    if ((await page.eval('document.title')) === 'READY') {
      ready = true;
      break;
    }
    await page.wait(250);
  }
  if (!ready) throw new Error(`game did not report READY at ${url.href}`);
  await page.shot(out);
  const logs = page.console();
  const errors = logs.filter((line) => line.startsWith('[exception]') || line.startsWith('[error]'));
  console.log(`captured ${out} (${fs.statSync(out).size} bytes) after READY`);
  console.log(`url ${url.href}`);
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  }
} finally {
  page.close();
}
