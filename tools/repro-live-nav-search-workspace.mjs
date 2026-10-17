import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, transformWithOxc } from 'vite';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((v, i, a) => v.startsWith('--') ? [[v.slice(2), a[i + 1]]] : []));
const out = args.out ?? 'nav-search-workspace-proof';
fs.mkdirSync(out, { recursive: true });
fs.rmSync(path.join(out, 'report.json'), { force: true });
const sources = {
  before: execFileSync('git', ['show', '421d34b:src/world/nav.ts'], { encoding: 'utf8' }),
  after: fs.readFileSync('src/world/nav.ts', 'utf8'),
};
const modules = {};
for (const [mode, source] of Object.entries(sources)) {
  let instrumented = source;
  for (const Type of ['Float32Array', 'Int32Array', 'Uint8Array']) {
    if (!source.includes(`new ${Type}(total)`)) throw Error('Missing workspace allocation site: ' + Type);
    instrumented = instrumented.replaceAll(`new ${Type}(total)`, `allocate(${Type}, total)`);
  }
  instrumented += `\nexport const proof = { constructions: 0, bytes: 0 };\nfunction allocate(Type: any, length: number) { const a = new Type(length); proof.constructions++; proof.bytes += a.byteLength; return a; }\n`;
  modules[mode] = (await transformWithOxc(instrumented, 'nav.ts')).code.replace(/from (['"])([.][^'"]+)\1/g, (_, q, p) => `from '${path.posix.resolve('/src/world', p)}'`);
}
modules.common = "export { Colliders } from '/src/world/colliders';";
const cache = fs.mkdtempSync(path.join(tmpdir(), 'tervain-nav-proof-'));
const server = await createServer({ configFile: false, logLevel: 'error', cacheDir: cache,
  optimizeDeps: { include: ['three'], noDiscovery: true },
  server: { host: '127.0.0.1', port: 0, cors: true, hmr: false, ws: false },
  plugins: [{ name: 'nav-proof', resolveId(id) { if (id.startsWith('/@nav-proof-')) return '\0' + id; },
    load(id) { if (id.startsWith('\0/@nav-proof-')) return modules[id.slice('\0/@nav-proof-'.length)]; } }],
});
let page;
try {
  await server.listen();
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  for (const mode of ['common', 'before', 'after']) {
    const r = await fetch(origin + '/@nav-proof-' + mode);
    if (!r.ok) throw Error('Diagnostic module HTTP ' + r.status);
  }
  page = await liveProofPage(args.url ?? 'https://ael-dev3.github.io/Tervain/', { quality: 'low', hour: 11 });
  const report = await page.eval(`
const T = window.tervain;
const origin = ${JSON.stringify(origin)};
const M = await import(origin + '/@nav-proof-common');
const models = {};
for (const mode of ['before', 'after']) models[mode] = await import(origin + '/@nav-proof-' + mode);
const colliders = new M.Colliders();
for (const c of T.world.colliders.all) colliders.add({ ...c });
const grids = Object.fromEntries(Object.entries(models).map(([k, m]) => [k, new m.NavGrid(T.world.terrain, colliders)]));
T.world.nav.ensureFresh();
const hash = async v => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', typeof v === 'string' ? new TextEncoder().encode(v) : v))).map(b => b.toString(16).padStart(2, '0')).join('');
const nativeGridHash = await hash(T.world.nav.blocked.buffer);
const controls = {};
for (const mode of ['before', 'after']) controls[mode] = await hash(grids[mode].blocked.buffer) === nativeGridHash;
const points = [{x:-2,z:34.6},{x:-12.3,z:44.8},{x:-4,z:46},{x:-268,z:27},
  {x:-5.2,z:-4},{x:20,z:25},{x:-30,z:30},{x:-220,z:10}];
const queries = points.flatMap((from, i) => points.map((to, j) => ({from, to, maxExpand: i === j ? 0 : 90000})));
const total = T.world.nav.w * T.world.nav.h;
const nativeAllocation = { constructions: 0, bytes: 0 };
const constructors = Object.fromEntries(['Float32Array', 'Int32Array', 'Uint8Array'].map(k => [k, globalThis[k]]));
let nativeRoutes;
try {
  for (const [k, Type] of Object.entries(constructors)) globalThis[k] = new Proxy(Type, { construct(target, args) {
    const a = Reflect.construct(target, args);
    if (args.length === 1 && args[0] === total) { nativeAllocation.constructions++; nativeAllocation.bytes += a.byteLength; }
    return a;
  }});
  nativeRoutes = queries.map(q => T.world.nav.findPath(q.from, q.to, q.maxExpand));
} finally { for (const [k, Type] of Object.entries(constructors)) globalThis[k] = Type; }
const rows = {}, images = {};
for (const mode of ['before', 'after']) {
  const m = models[mode], grid = grids[mode];
  m.proof.constructions = 0; m.proof.bytes = 0;
  const routes = queries.map(q => grid.findPath(q.from, q.to, q.maxExpand));
  const firstPass = {...m.proof};
  const repeated = queries.map(q => grid.findPath(q.from, q.to, q.maxExpand));
  rows[mode] = { queries: queries.length, gridCells: total, firstPass,
    repeatedPass: { constructions: m.proof.constructions - firstPass.constructions, bytes: m.proof.bytes - firstPass.bytes },
    nativeRoutesMatch: JSON.stringify(routes) === JSON.stringify(nativeRoutes),
    repeatedRoutesMatch: JSON.stringify(repeated) === JSON.stringify(nativeRoutes),
    routesSha256: await hash(JSON.stringify(routes)), reachable: routes.filter(Boolean).length,
    unreachable: routes.filter(r => r === null).length };
  T.lastFrameDt = 0; T.renderWorld(); T.renderWorld();
  T.renderer.info.reset(); T.renderWorld();
  rows[mode].drawCalls = T.renderer.info.render.calls;
  rows[mode].triangles = T.renderer.info.render.triangles;
  rows[mode].textureCount = T.renderer.info.memory.textures;
  images[mode] = T.renderer.domElement.toDataURL('image/png');
}
return {build: await fetch(new URL('version.json', document.baseURI)).then(r => r.json()), controls,
  nativeAllocation, nativeRoutesSha256: await hash(JSON.stringify(nativeRoutes)), queries, rows, images};
`);
  for (const [mode, image] of Object.entries(report.images)) fs.writeFileSync(path.join(out, mode + '.png'), Buffer.from(image.split(',')[1], 'base64'));
  delete report.images;
  const pixels = await Promise.all(['before', 'after'].map(mode => sharp(path.join(out, mode + '.png')).raw().toBuffer()));
  report.identicalPixels = pixels[0].equals(pixels[1]);
  report.sourceSha256 = createHash('sha256').update(sources.after).digest('hex');
  report.scope = 'Actual baseline/candidate NavGrid source on copied published colliders and terrain. Native full grid and each native route are controls. Exact typed-array backing-store bytes at the three search-workspace allocation sites; not heap totals, GC timings, natural route frequency or hardware frame-time evidence. Software-WebGL post-render images compare the unchanged scene.';
  const a = report.rows.before, b = report.rows.after;
  report.pass = Object.values(report.controls).every(Boolean) && a.nativeRoutesMatch && b.nativeRoutesMatch && a.repeatedRoutesMatch && b.repeatedRoutesMatch &&
    a.firstPass.bytes === report.nativeAllocation.bytes && a.firstPass.constructions === report.nativeAllocation.constructions &&
    a.firstPass.constructions > b.firstPass.constructions && b.firstPass.constructions === 3 && b.repeatedPass.constructions === 0 &&
    a.reachable > 0 && a.unreachable > 0 && report.identicalPixels;
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.pass) process.exitCode = 1;
} finally { page?.close(); await server.close(); fs.rmSync(cache, { recursive: true, force: true }); }
