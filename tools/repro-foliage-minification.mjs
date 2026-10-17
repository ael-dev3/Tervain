import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';
import sharp from 'sharp';
import { openPage } from './cdp.mjs';

const out = process.argv[2] ?? 'foliage-minification-proof';
const ref = process.argv[3] ?? '24629cf';
fs.mkdirSync(out, { recursive: true });
fs.rmSync(path.join(out, 'report.json'), { force: true });
const baseline = execFileSync('git', ['show', `${ref}:src/presentation/foliage/foliageMaterial.ts`], { encoding: 'utf8' });
const server = await createServer({ configFile: false, logLevel: 'error',
  plugins: [{ name: 'stipple-baseline', load(id) {
    if (id.endsWith('/foliageMaterial.ts?stipple-baseline')) return baseline;
  } }], server: { host: '127.0.0.1', port: 0, hmr: false, ws: false }, optimizeDeps: { include: ['three'] } });
const images = {}, costs = [];
let page;
try {
  await server.listen();
  for (const mode of ['before', 'after']) {
    images[mode] = {};
    page = await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/foliage-minification-fixture.html?mode=${mode}`);
    let ready = false;
    for (let i = 0; i < 300; i++) {
      const state = await page.eval('return {ready:window.fixtureReady,error:window.fixtureError};');
      if (state.error) throw Error(state.error);
      if (state.ready) { ready = true; break; }
      await page.wait(100);
    }
    assert.ok(ready, 'Fixture did not start');
    for (const kind of ['minified', 'magnified', 'single-sample', 'unmapped']) {
      images[mode][kind] = [];
      for (let frame = 0; frame < 9; frame++) {
        const result = await page.eval(`return minificationFixture.run('${kind}',${frame});`);
        costs.push({ mode, kind, frame, draws: result.draws, triangles: result.triangles, samples: result.samples });
        const pixels = Buffer.from(result.pixels);
        images[mode][kind].push(pixels);
        await sharp(pixels, { raw: { width: 96, height: 96, channels: 4 } }).png()
          .toFile(path.join(out, `${mode}-${kind}-${frame}.png`));
      }
    }
    page.close(); page = null;
  }
  const difference = (a, b) => {
    let changed = 0, squared = 0;
    for (let i = 0; i < a.length; i += 4) {
      let d = 0;
      for (let c = 0; c < 3; c++) { const e = a[i + c] - b[i + c]; d = Math.max(d, Math.abs(e)); squared += e * e; }
      changed += d > 0;
    }
    return { changed, squared };
  };
  const controls = images.before.magnified.map((a, i) => difference(a, images.after.magnified[i]));
  const fallbacks = Object.fromEntries(['single-sample', 'unmapped'].map(k => [k, images.before[k].map((a, i) => difference(a, images.after[k][i]))]));
  const minified = images.before.minified.map((a, i) => difference(a, images.after.minified[i]));
  const assertions = {
    magnificationUnchanged: controls.every(r => r.changed === 0),
    fallbacksUnchanged: Object.values(fallbacks).every(rows => rows.every(r => r.changed === 0)),
    minificationExercised: minified.some(r => r.changed > 0),
    sameWork: costs.every(r => r.draws === 2 && r.triangles === 4 && r.samples === (r.kind === 'single-sample' ? 0 : 4)),
  };
  const report = { baseline: ref, controls, fallbacks, minified, costs, assertions, pass: Object.values(assertions).every(Boolean),
    scope: 'Actual production foliage shader and depth prepass, four-sample software WebGL. Nine subpixel translations; magnified alpha/cubic edge controls must match byte-for-byte. This fixture checks the scope of the change; native forest motion establishes its temporal effect.' };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.pass) process.exitCode = 1;
} catch (error) { console.error(page?.console()); throw error; }
finally { page?.close(); await server.close(); }
