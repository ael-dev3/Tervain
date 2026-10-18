import { expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function run(failure = '') {
  const fixture = mkdtempSync(join(tmpdir(), 'tervain-budget-start-'));
  try {
    for (const name of ['play-gate.mjs', 'webgl-upload-bytes.mjs']) writeFileSync(join(fixture, name), readFileSync(`tools/${name}`));
    writeFileSync(join(fixture, 'cdp.mjs'), `
      import fs from 'node:fs';
      const all = [];
      export async function openPage(url) {
        const head = url.includes('/head/'), fail = process.env.GATE_FIXTURE_FAIL;
        const trace = { titlePolls: 0, mouseEvents: 0, waitMs: 0, samples: 0 };
        all.push(trace);
        return {
          async eval(js) {
            if (js.includes('mode === "title"')) { trace.titlePolls++; return false; }
            if (js.includes('menu-choices')) return [0, 0]; // Hidden button remains in the live DOM.
            if (js.includes('loadingEl.classList')) return fail !== 'not-ready';
            if (js.includes('renderer.info.render')) { trace.samples++; return [242 + Number(head && fail === 'draws'), 2874566 + Number(head && fail === 'triangles')]; }
            if (js.includes('version.json')) return { revision: head ? (fail === 'revision' ? 'badcafe' : 'abcdef0') : '1234567' };
            if (js.includes('T.hud.show')) return 1;
            throw Error('Unexpected probe operation');
          },
          async wait(ms) { trace.waitMs += ms; },
          async cdp(method) { if (method === 'Input.dispatchMouseEvent') trace.mouseEvents++; },
          console() { return head && fail === 'console' ? ['[error] fixture error'] : []; },
          close() { fs.writeFileSync(process.env.GATE_FIXTURE_TRACE, JSON.stringify(all)); }
        };
      }
    `);
    const traceFile = join(fixture, 'trace.json');
    const result = spawnSync(process.execPath, [join(fixture, 'play-gate.mjs'), '--url', 'https://gate.invalid/head/',
      '--budget-url', 'https://gate.invalid/live/', '--head', 'abcdef012345'],
    { encoding: 'utf8', timeout: 10000, env: { ...process.env, GATE_FIXTURE_FAIL: failure, GATE_FIXTURE_TRACE: traceFile } });
    return { result, trace: JSON.parse(readFileSync(traceFile, 'utf8')) as { titlePolls: number; mouseEvents: number; waitMs: number; samples: number }[] };
  } finally { rmSync(fixture, { recursive: true, force: true }); }
}

it('probes an already-started shot world without waiting for or clicking its hidden title menu', () => {
  const { result, trace } = run();
  expect(result.error).toBeUndefined(); expect(result.status).toBe(0);
  expect(result.stdout).toContain('play-gate: PASS abcdef0');
  expect(trace.reduce((n, p) => n + p.samples, 0)).toBe(12);
  expect(trace).toHaveLength(3); // Two live probes and the candidate remain required.
  expect(trace.reduce((n, p) => n + p.titlePolls, 0)).toBe(0);
  expect(trace.reduce((n, p) => n + p.mouseEvents, 0)).toBe(0);
  expect(trace.reduce((n, p) => n + p.waitMs, 0)).toBe(81000); // Existing settle and four-sample delays.
});

it('fails without a receipt when shot gameplay never becomes ready', () => {
  const { result } = run('not-ready');
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Budget scene did not become ready');
  expect(result.stdout).not.toContain('play-gate: PASS');
});

it.each(['draws', 'triangles', 'console', 'revision'])('still rejects a %s regression', failure => {
  const { result } = run(failure);
  expect(result.status).not.toBe(0);
  expect(result.stdout).toContain('# Budget gate: FAIL');
  expect(result.stdout).not.toContain('play-gate: PASS');
});
