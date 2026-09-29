#!/usr/bin/env node
/**
 * A tiny Chrome DevTools Protocol driver for developer checks (no dependencies; Node 22+ has WebSocket).
 *
 *   node tools/cdp.mjs <script.mjs>
 *
 * The script's default export receives { page } where page.eval(js) runs JavaScript in the game page
 * (awaiting promises), page.shot(path) saves a PNG, page.wait(ms) sleeps, page.console() returns logged messages.
 * Needs `npm run dev` on http://127.0.0.1:5173 and Chrome or Edge.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const candidates = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export async function openPage(url = process.env.TERVAIN_URL ?? 'http://127.0.0.1:5173/', { w = 1280, h = 720 } = {}) {
  const browser = candidates.find((c) => fs.existsSync(c));
  if (!browser) throw new Error('no Chrome/Edge found; set CHROME');
  const port = 9300 + Math.floor(Math.random() * 500);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tervain-cdp-'));
  const proc = spawn(browser, [
    '--headless=new', '--no-sandbox', '--hide-scrollbars', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${w},${h}`, 'about:blank',
  ], { stdio: 'ignore' });
  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await r.json();
      targets = list.find((t) => t.type === 'page');
    } catch {
      /* not up yet */
    }
    if (!targets) await new Promise((r) => setTimeout(r, 250));
  }
  if (!targets) throw new Error('browser did not start');
  const ws = new WebSocket(targets.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  let id = 0;
  const pending = new Map();
  const logs = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push(`[${msg.params.type}] ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(`[exception] ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  const page = {
    async eval(js) {
      const r = await send('Runtime.evaluate', { expression: `(async()=>{${js}})()`, awaitPromise: true, returnByValue: true, timeout: 120000 });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval failed');
      return r.result?.result?.value;
    },
    async shot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
      return file;
    },
    key(type, code, key = code) {
      return send('Input.dispatchKeyEvent', { type, code, key, windowsVirtualKeyCode: 0 });
    },
    click(x, y) {
      return send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }).then(() => send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }));
    },
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    console: () => logs.splice(0),
    close() {
      try {
        ws.close();
        proc.kill();
      } catch {
        /* already gone */
      }
    },
  };
  return page;
}

if (process.argv[2]) {
  const mod = await import(path.resolve(process.argv[2]).replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  const page = await openPage();
  try {
    await mod.default({ page });
  } finally {
    page.close();
  }
}
