#!/usr/bin/env node
/**
 * Headless screenshot of the running dev server, for checking visual changes without a display.
 *
 *   node tools/shot.mjs out.png place=rillford yaw=0.6 pitch=0.3 dist=12 hour=11 [hud=0] [q=high] [w=1280] [h=720]
 *
 * Needs `npm run dev` on http://127.0.0.1:5173 and a Chromium-based browser (Chrome or Edge).
 * Extra key=value pairs are passed to the game as URL parameters (x, z, face, settle, ...).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const [out, ...pairs] = process.argv.slice(2);
if (!out) {
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
const url = `${process.env.TERVAIN_URL ?? 'http://127.0.0.1:5173/'}?${params}`;
const candidates = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);
const browser = candidates.find((c) => fs.existsSync(c));
if (!browser) {
  console.error('no Chrome/Edge found; set CHROME');
  process.exit(1);
}
const args = [
  '--headless=new',
  '--no-sandbox',
  '--hide-scrollbars',
  '--use-angle=d3d11',
  '--ignore-gpu-blocklist',
  '--enable-unsafe-swiftshader',
  `--window-size=${w},${h}`,
  '--virtual-time-budget=60000',
  `--screenshot=${out}`,
  url,
];
const r = spawnSync(browser, args, { encoding: 'utf8', timeout: 180000 });
if (!fs.existsSync(out)) {
  console.error(r.stderr || r.stdout || 'no screenshot produced');
  process.exit(1);
}
console.log(`wrote ${out} (${fs.statSync(out).size} bytes)`);
