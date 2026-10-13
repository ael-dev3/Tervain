#!/usr/bin/env node
/**
 * Floating-foliage audit: what the player sees, frame by frame, walking through the forest's densest stand at dusk.
 *
 *   node tools/audit-floaters.mjs [--url <build>] [--out floaters.json] [--hour 19.8] [--quality <q>] [--frames 240]
 *        [--shots <dir>] [--camera follow|free] [--centre x,z] [--heading 0.6] [--length 70]
 *        [--reach 2] [--max-depth 80] [--min-blob 15] [--exposed 0.6]
 *
 * Each frame the game draws itself (its culling, LOD choice and cross-fade, distance dither, leaf depth pre-pass, near
 * fades and wind), then the scene is drawn again with the trees' own materials patched to write, per pixel, the tree
 * instance, LOD and part (wood or leaf) that won the depth test, and its depth; everything else draws black:
 *  - pass A, the whole forest: the leaf pixels the player sees;
 *  - pass B, the wood alone (leaves hidden): each tree's drawn wood, unhidden by its own crown.
 * A visible leaf pixel floats when no drawn wood of its own tree lies within --reach metres of it in 3D. Connected
 * floating pixels of one tree form a blob; a blob counts when it is exposed (mostly bordered by sky or other trees, not
 * its own crown): a leaf chunk hanging beside the tree. Blobs of trees with no wood on screen are listed as orphans.
 * Summary: floatShare (floating share of visible leaf pixels), floatingBlobs/floatingBlobPx, orphans, by LOD pair.
 */
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? 'true' : all[i + 1]]] : acc), []));
const URL_ = new URL(args.url ?? 'http://127.0.0.1:4232/');
if (args.quality) URL_.searchParams.set('quality', args.quality);
const REACH = Number(args.reach ?? 2), MAXZ = Number(args['max-depth'] ?? 80), MINBLOB = Number(args['min-blob'] ?? 15), EXPOSED = Number(args.exposed ?? 0.6);
const W = 960, H = 540, FRAMES = Number(args.frames ?? 240), HOUR = Number(args.hour ?? 19.8);
const SHOTS = args.shots ? path.resolve(args.shots) : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

/** In-page: install the ID patch once. Leaves the game's own drawing untouched until `idPass` runs. */
const INSTALL = `

const T = window.tervain, forest = T.world.modules.find((m) => m.name === 'forest').module;
const parts = [];
forest.group.traverse((o) => { const m = o.isInstancedMesh && /:(\\d):(wood|foliage)(:depth)?$/.exec(o.name); if (m) parts.push({ o, lod: +m[1], leaf: m[2] === 'foliage', depth: !!m[3] }); });
const ID = { on: { value: 0 } };
const patched = new WeakSet();
for (const p of parts) {
  const g = p.o.geometry, n = g.getAttribute('position').count;
  if (!g.getAttribute('aTvPart')) { const a = new Float32Array(n).fill(p.lod * 2 + (p.leaf ? 1 : 0) + 1); g.setAttribute('aTvPart', new g.attributes.position.constructor(a, 1)); }
  const mat = p.o.material;
  if (patched.has(mat)) continue; patched.add(mat);
  const compile = mat.onBeforeCompile, key = mat.customProgramCacheKey;
  mat.onBeforeCompile = function (shader, r) {
    compile.call(this, shader, r);
    shader.uniforms.uTvIdOn = ID.on;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\\nattribute float aTvPart;\\nflat varying vec3 vTvId;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\\n#ifdef USE_INSTANCING\\nvTvId = vec3(aTvPart, instanceMatrix[3].x, instanceMatrix[3].z);\\n#else\\nvTvId = vec3(aTvPart, 0.0, 0.0);\\n#endif');
    const f = shader.fragmentShader.replace('#include <common>', '#include <common>\\nuniform float uTvIdOn;\\nflat varying vec3 vTvId;');
    const end = f.lastIndexOf('}');
    shader.fragmentShader = f.slice(0, end) + \`
      if (uTvIdOn > 1.5) {
        float v = floor(vViewPosition.z * 100.0 + 0.5);
        gl_FragColor = vec4(floor(v / 65536.0) / 255.0, mod(floor(v / 256.0), 256.0) / 255.0, mod(v, 256.0) / 255.0, 1.0);
      } else if (uTvIdOn > 0.5) {
        int qx = int(floor(vTvId.y * 2.0 + 0.5)), qz = int(floor(vTvId.z * 2.0 + 0.5));
        uint h = uint(qx) * 73856093u ^ uint(qz) * 19349663u; h = (h ^ (h >> 16u)) & 65535u;
        gl_FragColor = vec4(vTvId.x / 8.0, float(h >> 8u) / 255.0, float(h & 255u) / 255.0, 1.0);
      }
    \` + f.slice(end);
  };
  mat.customProgramCacheKey = function () { return key.call(this) + '|tv-floater-id'; };
  mat.needsUpdate = true;
}
let Basic = null, RT = null;
T.world.scene.traverse((o) => { const m = o.material; if (!Basic && m && m.type === 'MeshBasicMaterial') Basic = m.constructor; if (!RT && o.isLight && o.shadow?.map) RT = o.shadow.map.constructor; });
if (!Basic || !RT) throw new Error('No MeshBasicMaterial or render target class found in the scene');
const makeBlack = (m) => new Basic({ color: 0, map: m.alphaTest > 0 ? m.map ?? null : null, alphaTest: m.alphaTest ?? 0, side: m.side, fog: false });
window.__floater = { T, forest, parts, ID, black: new Map(), makeBlack, rtA: new RT(${W}, ${H}), rtB: new RT(${W}, ${H}) };
return parts.length;`;

const HASH_JS = `const hashOf = (x, z) => { const qx = Math.floor(x * 2 + 0.5), qz = Math.floor(z * 2 + 0.5); let h = (Math.imul(qx, 73856093) ^ Math.imul(qz, 19349663)) >>> 0; return ((h ^ (h >>> 16)) & 65535) >>> 0; };`;

const page = await openPage(URL_.href, { w: W, h: H, headed: args.headed !== '0', requestTimeoutMs: 240000 });
try {
  await page.cdp('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  for (let i = 0; i < 1200 && !(await page.eval('return window.tervain?.mode === "title"').catch(() => false)); i++) await page.wait(250);
  await page.wait(2000);
  const build = await page.eval(`return document.querySelector('.menu-build span')?.textContent ?? ''`);
  const rect = await page.eval(`const b = [...document.querySelectorAll('.menu-choices button')].find((x) => /new/i.test(x.textContent)); const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]`);
  for (const type of ['mousePressed', 'mouseReleased']) await page.cdp('Input.dispatchMouseEvent', { type, x: rect[0], y: rect[1], button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  for (let i = 0; i < 2400 && !(await page.eval('const T = window.tervain; return T.mode === "play" && !!T.world && T.loadingEl.classList.contains("off")').catch(() => false)); i++) await page.wait(250);
  await page.wait(8000);
  const quality = await page.eval('return window.tervain.settings?.quality ?? null');
  await page.eval(`const T = window.tervain; T.hud.show(false); T.debugTime?.(${HOUR}); return 1`);
  console.error(`build ${build} quality ${quality}; tree parts`, await page.eval(INSTALL));

  // The route: through the densest stand of the forest, long enough to cross every LOD band of the trees beside it.
  const route = await page.eval(`const F = window.__floater; const targets = F.forest.canopyAuditTargets(0);
    const pts = targets.map((t) => [t.matrix.elements[12], t.matrix.elements[14]]), cell = 12, grid = new Map();
    for (const [x, z] of pts) { const k = Math.floor(x / cell) + ',' + Math.floor(z / cell); grid.set(k, (grid.get(k) ?? 0) + 1); }
    let best = null, bestN = -1;
    for (const k of grid.keys()) { const [i, j] = k.split(',').map(Number); let n = 0; for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) n += grid.get((i + a) + ',' + (j + b)) ?? 0; if (n > bestN) { bestN = n; best = [(i + .5) * cell, (j + .5) * cell]; } }
    return { centre: best, trees: bestN, total: pts.length };`);
  console.error('route', JSON.stringify(route));
  const [cx, cz] = args.centre ? args.centre.split(',').map(Number) : route.centre;
  const heading = Number(args.heading ?? 0.6), len = Number(args.length ?? 70);
  const dir = [Math.sin(heading), Math.cos(heading)];
  await page.eval(`const T = window.tervain; T.player.setPosition(${cx + 60}, ${cz + 60}, 0, T.world.terrain); return 1`);

  const results = [];
  const keyCodes = { KeyW: 87, ShiftLeft: 16 };
  const key = (type, code, extra = {}) => page.cdp('Input.dispatchKeyEvent', { type, code, key: code === 'ShiftLeft' ? 'Shift' : code.slice(3).toLowerCase(), windowsVirtualKeyCode: keyCodes[code], ...extra });
  const follow = args.camera !== 'free';
  const legs = follow ? 4 : 1, perLeg = Math.ceil(FRAMES / legs);
  for (let f = 0; f < FRAMES; f++) {
    const leg = Math.floor(f / perLeg), u = (f % perLeg) / Math.max(1, perLeg - 1);
    if (follow) {
      // The real follow camera behind the hero walking through the stand: each leg starts at the stand's edge and
      // crosses its middle on a different heading, so the camera passes under crowns at every distance band.
      if (f % perLeg === 0) {
        await key('keyUp', 'KeyW');
        const hd = heading + leg * Math.PI / 2, sx = cx - Math.sin(hd) * len / 2, sz = cz - Math.cos(hd) * len / 2;
        await page.eval(`const T = window.tervain; T.cam.manual = null; T.player.setPosition(${sx}, ${sz}, ${hd}, T.world.terrain); T.cam.yaw = ${hd}; T.player.stamina = 100; return 1`);
        await page.wait(1500);
        await key('rawKeyDown', 'KeyW');
      } else await key('rawKeyDown', 'KeyW', { autoRepeat: true });
      await page.wait(f === 0 ? 2500 : 120);
    } else {
      const s = -len / 2 + len * u, px = cx + dir[0] * s, pz = cz + dir[1] * s;
      // Head-height camera, glancing side to side as a player turns while walking.
      const yaw = heading + 0.7 * Math.sin(u * Math.PI * 6);
      await page.eval(`const T = window.tervain, V = T.world.scene.position.constructor, y = T.world.terrain.heightAt(${px}, ${pz});
        T.cam.manual = { p: new V(${px}, y + 2.2, ${pz}), look: new V(${px + Math.sin(yaw) * 10}, y + 3.4, ${pz + Math.cos(yaw) * 10}) }; return 1`);
      await page.wait(f === 0 ? 2500 : 70);
    }
    const r = await page.eval(ANALYSE(SHOTS && (f % 10 === 0)));
    if (SHOTS && r.shot) fs.writeFileSync(path.join(SHOTS, `f${String(f).padStart(4, '0')}.png`), Buffer.from(r.shot, 'base64'));
    if (SHOTS && r.view) fs.writeFileSync(path.join(SHOTS, `v${String(f).padStart(4, '0')}.png`), Buffer.from(r.view, 'base64'));
    delete r.shot; delete r.view;
    results.push({ frame: f, ...r });
    if (f % 20 === 0) console.error(f, JSON.stringify({ floating: r.floating.length, orphans: r.orphans.length, leafPx: r.leafPx, floatPx: r.floatPx }));
  }
  if (follow) await key('keyUp', 'KeyW');
  const all = results.flatMap((r) => r.floating.map((b) => ({ frame: r.frame, ...b })));
  const orphans = results.flatMap((r) => r.orphans.map((b) => ({ frame: r.frame, ...b })));
  const byLods = {};
  for (const b of [...all, ...orphans]) { const k = `leaf${b.leafLods}/wood${b.woodLods || '-'}`; byLods[k] = (byLods[k] ?? 0) + 1; }
  const summary = { build, quality, hour: HOUR, frames: FRAMES, framesWithFloaters: results.filter((r) => r.floating.length || r.orphans.length).length,
    floatingBlobs: all.length, floatingBlobPx: all.reduce((s, b) => s + b.px, 0), orphanBlobs: orphans.length, orphanPx: orphans.reduce((s, b) => s + b.px, 0),
    floatShare: results.reduce((s, r) => s + r.floatPx, 0) / Math.max(1, results.reduce((s, r) => s + r.leafPx, 0)), byLods };
  fs.writeFileSync(args.out ?? 'floaters.json', JSON.stringify({ summary, route, results }, null, 1));
  console.log(JSON.stringify(summary));
} finally { page.close(); }

function ANALYSE(wantShot) { return `
const F = window.__floater, T = F.T, R = T.renderer, scene = T.world.scene, cam = T.cam.camera;
${HASH_JS}
const w = ${W}, h = ${H};
// Black for everything that is not a tree, keeping cut-outs so grass and cards occlude as they do in colour.
const swapped = [], hidden = [];
const trees = new Set(F.parts.map((p) => p.o));
scene.traverse((o) => {
  if (trees.has(o) || !(o.isMesh || o.isPoints || o.isLine || o.isSprite) || !o.visible) return;
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  if (!m || m.transparent || m.colorWrite === false || m.blending !== 1) { o.visible = false; hidden.push(o); return; }
  let b = F.black.get(m);
  if (!b) { b = F.makeBlack(m); F.black.set(m, b); }
  swapped.push([o, o.material]); o.material = b;
});
const bg = scene.background, fog = scene.fog; scene.background = null; scene.fog = null;
const autoShadow = R.shadowMap.autoUpdate, clear = R.getClearColor(F.parts[0].o.material.color.clone()), clearA = R.getClearAlpha();
R.shadowMap.autoUpdate = false; R.setClearColor(0x000000, 0);
const prevTarget = R.getRenderTarget(), prevXr = R.xr.enabled; R.xr.enabled = false;
const read = (rt) => { const buf = new Uint8Array(w * h * 4); R.readRenderTargetPixels(rt, 0, 0, w, h, buf); return buf; };
const autoClear = R.autoClear; R.autoClear = true;
const pass = (mode) => { F.ID.on.value = mode; R.setRenderTarget(F.rtA); R.render(scene, cam); return read(F.rtA); };
const A = pass(1), AZ = pass(2);
const leafVis = F.parts.filter((p) => p.leaf).map((p) => [p.o, p.o.visible]);
for (const [o] of leafVis) o.visible = false;
const B = pass(1), BZ = pass(2);
for (const [o, v] of leafVis) o.visible = v;
F.ID.on.value = 0;
R.setRenderTarget(prevTarget); R.autoClear = autoClear; R.xr.enabled = prevXr;
R.shadowMap.autoUpdate = autoShadow; R.setClearColor(clear, clearA);
scene.background = bg; scene.fog = fog;
for (const [o, m] of swapped) o.material = m; for (const o of hidden) o.visible = true;

// Decode (WebGL rows run bottom-up; j below is the screen pixel). kind: 1 + 2 * lod + leaf.
const N = w * h, kindA = new Uint8Array(N), keyA = new Uint16Array(N), zA = new Float32Array(N), kindB = new Uint8Array(N), keyB = new Uint16Array(N), zB = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const y = h - 1 - Math.floor(i / w), x = i % w, j = y * w + x, o = i * 4;
  if (A[o + 3] > 0 && A[o] > 15) { kindA[j] = Math.round(A[o] * 8 / 255); keyA[j] = (A[o + 1] << 8) | A[o + 2]; zA[j] = (AZ[o] * 65536 + AZ[o + 1] * 256 + AZ[o + 2]) / 100; }
  if (B[o + 3] > 0 && B[o] > 15) { kindB[j] = Math.round(B[o] * 8 / 255); keyB[j] = (B[o + 1] << 8) | B[o + 2]; zB[j] = (BZ[o] * 65536 + BZ[o + 1] * 256 + BZ[o + 2]) / 100; }
}
const isLeaf = (k) => k > 0 && ((k - 1) & 1) === 1, lodOf = (k) => (k - 1) >> 1;
const tanY = Math.tan(cam.fov * Math.PI / 360), tanX = tanY * cam.aspect;
const at = (j, z) => { const x = j % w, y = (j / w) | 0; return [((x + 0.5) / w * 2 - 1) * tanX * z, (1 - (y + 0.5) / h * 2) * tanY * z, -z]; };
// Each tree's drawn wood (pass B: its own crown hidden), thinned to one point per 20 cm voxel, in a REACH-sized grid.
const REACH = ${REACH}, MAXZ = ${MAXZ};
const grid = new Map(), voxel = new Set(), woodLods = new Map();
for (let j = 0; j < N; j++) {
  const k = kindB[j]; if (!k || isLeaf(k)) continue;
  const p = at(j, zB[j]), id = keyB[j];
  const vk = id + ':' + Math.floor(p[0] * 5) + ':' + Math.floor(p[1] * 5) + ':' + Math.floor(p[2] * 5);
  if (voxel.has(vk)) continue; voxel.add(vk);
  const gk = id + ':' + Math.floor(p[0] / REACH) + ':' + Math.floor(p[1] / REACH) + ':' + Math.floor(p[2] / REACH);
  let l = grid.get(gk); if (!l) grid.set(gk, l = []); l.push(p);
  let s = woodLods.get(id); if (!s) woodLods.set(id, s = new Set()); s.add(lodOf(k));
}
// Each visible leaf pixel (every second row and column) against its own tree's wood.
const S = 2, sw = Math.ceil(w / S), sh = Math.ceil(h / S), far = new Uint8Array(sw * sh);
let leafPx = 0, floatPx = 0;
for (let sy = 0; sy < sh; sy++) for (let sx = 0; sx < sw; sx++) {
  const j = sy * S * w + sx * S, k = kindA[j];
  if (!isLeaf(k) || zA[j] > MAXZ) continue;
  leafPx++;
  const p = at(j, zA[j]), id = keyA[j], gx = Math.floor(p[0] / REACH), gy = Math.floor(p[1] / REACH), gz = Math.floor(p[2] / REACH);
  let near = false;
  for (let a = -1; a <= 1 && !near; a++) for (let b = -1; b <= 1 && !near; b++) for (let c = -1; c <= 1 && !near; c++) {
    const l = grid.get(id + ':' + (gx + a) + ':' + (gy + b) + ':' + (gz + c)); if (!l) continue;
    for (const q of l) if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2 < REACH * REACH) { near = true; break; }
  }
  if (!near) { far[sy * sw + sx] = 1; floatPx++; }
}
// Floating blobs: connected far leaf samples of one tree.
const feet = F.feet ?? (F.feet = (() => { const m = new Map(); for (const t of F.forest.canopyAuditTargets(0)) { const e = t.matrix.elements; m.set(hashOf(e[12], e[14]), [e[12], e[13], e[14], t.species]); } return m; })());
const floating = [], orphans = [], seen = new Uint8Array(sw * sh), stack = [];
for (let s0 = 0; s0 < sw * sh; s0++) {
  if (!far[s0] || seen[s0]) continue;
  const id = keyA[((s0 / sw) | 0) * S * w + (s0 % sw) * S], cells = [], lods = new Set(); let zs = 0;
  stack.push(s0); seen[s0] = 1;
  while (stack.length) { const s = stack.pop(), sx = s % sw, sy = (s / sw) | 0, j = sy * S * w + sx * S; cells.push(s); lods.add(lodOf(kindA[j])); zs += zA[j];
    for (const n of [sx > 0 ? s - 1 : -1, sx < sw - 1 ? s + 1 : -1, s - sw, s + sw]) if (n >= 0 && n < sw * sh && far[n] && !seen[n] && keyA[((n / sw) | 0) * S * w + (n % sw) * S] === id) { seen[n] = 1; stack.push(n); } }
  if (cells.length < ${MINBLOB}) continue;
  // Exposure: of the blob's outline (frame edges aside), the share that borders anything but its own tree in pass A.
  // A hanging chunk against the sky or other trees is exposed; the inside of a crown seen from below is not.
  let own = 0, other = 0;
  for (const s of cells) { const sx = s % sw, sy = (s / sw) | 0;
    for (const [nx, ny] of [[sx - 1, sy], [sx + 1, sy], [sx, sy - 1], [sx, sy + 1]]) {
      if (nx < 0 || ny < 0 || nx >= sw || ny >= sh) continue;
      const n = ny * sw + nx; if (far[n] && keyA[ny * S * w + nx * S] === id) continue;
      if (kindA[ny * S * w + nx * S] && keyA[ny * S * w + nx * S] === id) own++; else other++;
    } }
  const exposure = other / Math.max(1, own + other);
  if (exposure < ${EXPOSED}) continue;
  let x0 = sw, y0 = sh, x1 = 0, y1 = 0; for (const s of cells) { const x = s % sw, y = (s / sw) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const foot = feet.get(id), wl = woodLods.get(id);
  const blob = { key: id, px: cells.length * S * S, box: [x0 * S, y0 * S, x1 * S + S - 1, y1 * S + S - 1], z: Math.round(zs / cells.length), exposure: Math.round(exposure * 100) / 100, species: foot?.[3], at: foot && [Math.round(foot[0] * 10) / 10, Math.round(foot[2] * 10) / 10], leafLods: [...lods].join(''), woodLods: wl ? [...wl].join('') : '' };
  (wl ? floating : orphans).push(blob);
}
let shot = null, view = null;
if (${wantShot ? 'true' : 'false'}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), img = g.createImageData(w, h);
  for (let j = 0; j < N; j++) { const leaf = isLeaf(kindA[j]), wood = kindB[j] && !isLeaf(kindB[j]);
    img.data[j * 4] = wood ? 150 : 0; img.data[j * 4 + 1] = leaf ? 110 : 0; img.data[j * 4 + 2] = wood ? 60 : 0; img.data[j * 4 + 3] = 255; }
  for (const b of [...floating, ...orphans]) { const [x0, y0, x1, y1] = b.box; for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) { const j = (y * w + x) * 4; img.data[j] = 255; img.data[j + 1] = 0; img.data[j + 2] = 255; } for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) { const j = (y * w + x) * 4; img.data[j] = 255; img.data[j + 1] = 0; img.data[j + 2] = 255; } }
  g.putImageData(img, 0, 0); shot = c.toDataURL('image/png').split(',')[1];
  T.render(); view = R.domElement.toDataURL('image/png').split(',')[1];
}
return { leafPx, floatPx, floating, orphans, shot, view };`; }
