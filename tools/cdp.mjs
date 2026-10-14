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
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Bounded protocol requests: closing Chrome or timing out must settle every awaiting check. */
export function cdpRequests(write, timeoutMs = 120000) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid CDP request timeout');
  let id = 0, closed = false;
  const pending = new Map();
  const nextId = () => ++id;
  return {
    nextId,
    send(method, params = {}) {
      if (closed) return Promise.reject(new Error('CDP connection closed'));
      return new Promise((resolve, reject) => {
        const i = nextId();
        const timer = setTimeout(() => { pending.delete(i); reject(new Error(`CDP ${method} timed out`)); }, timeoutMs);
        pending.set(i, { resolve, reject, timer, method });
        try { write({ id: i, method, params }); }
        catch (error) { clearTimeout(timer); pending.delete(i); reject(error); }
      });
    },
    reply(message) {
      const request = pending.get(message.id);
      if (!request) return false;
      pending.delete(message.id); clearTimeout(request.timer);
      if (message.error) request.reject(new Error(`CDP ${request.method} failed: ${message.error.message}`));
      else request.resolve(message);
      return true;
    },
    close() {
      closed = true;
      for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('CDP connection closed')); }
      pending.clear();
    },
  };
}

/** Read only the endpoint file created inside this launch's unique profile; partial writes are retried. */
export function ownedDebugPort(contents) {
  const [port, endpoint] = contents.split(/\r?\n/);
  if (!/^\d+$/.test(port ?? '') || !/^\/devtools\/browser\/[A-Za-z0-9-]+$/.test(endpoint ?? '')) return null;
  const value = Number(port);
  return Number.isSafeInteger(value) && value > 0 && value <= 65535 ? value : null;
}

const candidates = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export async function openPage(url = process.env.TERVAIN_URL ?? 'http://127.0.0.1:5173/', { w = 1280, h = 720, init = null, flags = [], headed = false, requestTimeoutMs = Number(process.env.CDP_TIMEOUT_MS ?? 120000) } = {}) {
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) throw new Error('Invalid CDP request timeout');
  const browser = candidates.find((c) => fs.existsSync(c));
  if (!browser) throw new Error('no Chrome/Edge found; set CHROME');
  let port = null;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tervain-cdp-'));
  // Headed runs draw on the machine's own GPU (benchmarks on real hardware); headless ones fall back to software.
  const browserArgs = [
    ...(headed ? [] : ['--headless=new']), '--no-sandbox', '--hide-scrollbars', '--ignore-gpu-blocklist', ...(headed ? [] : ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--disable-dev-shm-usage']),
    `--window-size=${w},${h}`, ...flags, '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ];
  if (process.platform === 'win32' && headed) browserArgs.splice(4, 0, '--use-angle=d3d11');
  const proc = spawn(browser, browserArgs, { stdio: 'ignore', detached: process.platform !== 'win32' });
  let ws, requests, cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      requests?.close();
      ws?.close();
      // On Windows killing the browser leaves its GPU and renderer children running, and the next launch then fails
      // or shares a GPU process with them: end the whole tree.
      if (process.platform === 'win32' && proc.pid) spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
      else {
        process.kill(-proc.pid, 'SIGTERM');
        setTimeout(() => { try { process.kill(-proc.pid, 'SIGKILL'); } catch { /* already exited */ } }, 2000);
        // Keep the grace timer alive until stubborn browser workers are stopped.
      }
    } catch {
      /* already gone */
    }
    // Each run made a throwaway profile; remove it once the browser has let go of its files.
    const remove = (tries) => {
      try {
        fs.rmSync(profile, { recursive: true, force: true });
      } catch {
        if (tries > 0) setTimeout(() => remove(tries - 1), 500);
      }
    };
    proc.once('exit', () => remove(20));
    if (proc.exitCode !== null || !proc.pid) remove(20);
  };
  let launchFailed = false;
  proc.once('error', () => { launchFailed = true; });
  let targets = null;
  // A first launch after a browser update can take well over 15 s.
  const startupDeadline = Date.now() + Number(process.env.CDP_STARTUP_MS ?? 120000);
  for (let i = 0; i < 120 && !targets && Date.now() < startupDeadline; i++) {
    if (launchFailed || proc.exitCode !== null) break;
    try {
      port ??= ownedDebugPort(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8'));
      if (port) {
        const r = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(2000) });
        const list = await r.json();
        targets = list.find((t) => t.type === 'page');
      }
    } catch {
      /* not up yet */
    }
    if (!targets) await new Promise((r) => setTimeout(r, 250));
  }
  if (!targets) { cleanup(); throw new Error('browser did not start'); }
  try { ws = new WebSocket(targets.webSocketDebuggerUrl); await new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('browser connection timed out')), 10000);
    ws.onopen = () => { clearTimeout(timer); res(); };
    ws.onerror = () => { clearTimeout(timer); rej(new Error('browser connection failed')); };
  }); } catch (error) { cleanup(); throw error; }
  requests = cdpRequests(message => ws.send(JSON.stringify(message)), requestTimeoutMs);
  ws.addEventListener('close', () => requests.close());
  ws.addEventListener('error', () => requests.close());
  const logs = [];
  const frames = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    // Presented frames while a screencast runs (Page.startScreencast); each is acknowledged so the next one comes.
    if (msg.method === 'Page.screencastFrame') {
      frames.push({ data: msg.params.data, t: msg.params.metadata?.timestamp });
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ id: requests.nextId(), method: 'Page.screencastFrameAck', params: { sessionId: msg.params.sessionId } }));
      return;
    }
    if (requests.reply(msg)) return;
    if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push(`[${msg.params.type}] ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(`[exception] ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
    }
  };
  const send = (method, params = {}) => requests.send(method, params);
  try {
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    // A headless window never holds focus on some platforms; without this the game sees a blur and pauses itself.
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    // Runs before any of the page's own scripts (for example, a seeded Math.random for repeatable captures).
    if (init) await send('Page.addScriptToEvaluateOnNewDocument', { source: init });
    await send('Page.navigate', { url });
  } catch (error) { cleanup(); throw error; }
  const page = {
    frames,
    async eval(js) {
      const r = await send('Runtime.evaluate', { expression: `(async()=>{${js}})()`, awaitPromise: true, returnByValue: true, timeout: requestTimeoutMs });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'eval failed');
      return r.result?.result?.value;
    },
    async shot(file) {
      const r = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
      return file;
    },
    /** The current frame as an image buffer (png or jpeg), for piping into an encoder. */
    async image(format = 'png', quality) {
      const r = await send('Page.captureScreenshot', { format, ...(quality ? { quality } : {}), optimizeForSpeed: true });
      return Buffer.from(r.result.data, 'base64');
    },
    /** A transparent page background, so captures keep their alpha (caption overlays). */
    transparent() {
      return send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    },
    key(type, code, key = code) {
      return send('Input.dispatchKeyEvent', { type, code, key, windowsVirtualKeyCode: 0 });
    },
    click(x, y) {
      return send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }).then(() => send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }));
    },
    wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    /** Any DevTools protocol command (e.g. Profiler.start), for tools beyond the helpers above. */
    cdp: (method, params = {}) => send(method, params),
    console: () => logs.splice(0),
    close: cleanup,
  };
  return page;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2]) {
  const mod = await import(path.resolve(process.argv[2]).replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  const page = await openPage();
  try {
    await mod.default({ page });
  } finally {
    page.close();
  }
}
