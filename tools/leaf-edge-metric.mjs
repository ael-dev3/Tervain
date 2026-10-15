#!/usr/bin/env node
/**
 * Leaf-edge and repetition metrics on live stills (B12).
 *   node tools/leaf-edge-metric.mjs --url http://127.0.0.1:4391/ --out DIR --flag 0|1 [--hours 11,19.8] [--trees oak,fir,pine] [--dists 1,3,10]
 * For each tree, distance (metres from the outermost leaf) and hour it saves two stills with the camera on the crown's edge:
 * a normal one (for looking at, and for the repetition metric on a canopy crop) and one on a flat magenta background with
 * everything but the trees hidden (for the hard-edge metric: share of silhouette edge that is a one-pixel step, and isolated
 * high-contrast pixels per megapixel). Writes DIR/metrics.json and prints a table. `--flag` sets ?leafatlas=.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { openPage } from './cdp.mjs';
import { hardEdges, readRgba, repetition } from './leaf-metrics.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, v) => (a.startsWith('--') ? [[a.slice(2), v[i + 1]]] : [])));
const out = args.out ?? 'leaf-metric', flag = args.flag ?? '1', base = args.url ?? 'http://127.0.0.1:4391/';
const hours = (args.hours ?? '11,19.8').split(',').map(Number), dists = (args.dists ?? '1,3,10').split(',').map(Number);
const trees = { oak: [-70.2, 78.4], pine: [-86, 0.8], fir: [-33.2, -13.1] };
const wanted = (args.trees ?? 'oak,fir,pine').split(',');
const sharp = createRequire(new URL('../package.json', import.meta.url))('sharp');
fs.mkdirSync(out, { recursive: true });

/** In the page: the instance of a foliage mesh nearest (x, z), its outermost point toward `az`, and its height range. */
const FIND = `
const T = window.tervain, scene = T.world.scene;
const find = (x, z, az) => {
  let best = null;
  scene.traverse((o) => {
    if (!o.isInstancedMesh || !/foliage/.test(o.name) || /depth/.test(o.name) || /:[12]:/.test(o.name)) return;
    const m = o.instanceMatrix.array;
    for (let i = 0; i < o.count; i++) {
      const dx = m[i * 16 + 12] - x, dz = m[i * 16 + 14] - z, d = Math.hypot(dx, dz);
      if (!best || d < best.d) best = { d, mesh: o, i };
    }
  });
  if (!best) return null;
  const o = best.mesh, m = o.instanceMatrix.array, k = best.i * 16, p = o.geometry.getAttribute('position');
  const ox = m[k + 12], oy = m[k + 13], oz = m[k + 14], dir = [Math.cos(az), Math.sin(az)];
  let top = -1e9, bottom = 1e9;
  const pts = [];
  for (let v = 0; v < p.count; v += 3) {
    const X = p.getX(v), Y = p.getY(v), Z = p.getZ(v);
    const wx = m[k] * X + m[k + 4] * Y + m[k + 8] * Z + ox, wy = m[k + 1] * X + m[k + 5] * Y + m[k + 9] * Z + oy, wz = m[k + 2] * X + m[k + 6] * Y + m[k + 10] * Z + oz;
    pts.push(wx, wy, wz); top = Math.max(top, wy); bottom = Math.min(bottom, wy);
  }
  const mid0 = bottom + (top - bottom) * 0.45, mid1 = bottom + (top - bottom) * 0.62;
  let reach = -1e9, hit = null;
  for (let v = 0; v < pts.length; v += 3) {
    if (pts[v + 1] < mid0 || pts[v + 1] > mid1) continue;
    const r = (pts[v] - ox) * dir[0] + (pts[v + 2] - oz) * dir[1];
    if (r > reach) { reach = r; hit = [pts[v], pts[v + 1], pts[v + 2]]; }
  }
  return { name: o.name, origin: [ox, oy, oz], hit, reach, height: top - bottom };
};`;

const url = (hour) => {
  const u = new URL(base);
  for (const [k, v] of Object.entries({ shot: '1', quality: args.quality ?? 'high', place: 'rillford', settle: '1', hud: '0', hour: String(hour), leafatlas: flag })) u.searchParams.set(k, v);
  return u.href;
};

const rows = [];
if (args.from) {
  for (const f of fs.readdirSync(args.from).filter((n) => /_flat.png$/.test(n)).sort()) {
    const [name, dm, hh] = f.replace('_flat.png', '').split('_');
    const flat = await readRgba(path.join(args.from, f), sharp), plain = await readRgba(path.join(args.from, f.replace('_flat', '')), sharp);
    const edge = hardEdges(flat), rep = repetition(plain, [Math.floor(plain.width / 2) - 192, Math.floor(plain.height / 2) - 192, 384]);
    rows.push({ file: f, hardShare: +edge.hardShare.toFixed(4), isolatedPerMpx: +edge.isolatedPerMpx.toFixed(1), repetition: +rep.peak.toFixed(4), repLag: rep.at });
    console.log(JSON.stringify(rows.at(-1)));
  }
  process.exit(0);
}
for (const hour of hours) {
  const page = await openPage(url(hour), { w: 1280, h: 720, requestTimeoutMs: 900000 });
  try {
    for (let i = 0; i < 2400; i++) {
      const s = await page.eval('return {play:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');
      if (s.failed) throw new Error('world failed to build');
      if (s.play) break;
      await page.wait(250);
    }
    await page.eval('const T=window.tervain;T.render=()=>{};T.step=()=>{};await T.world.arrived;T.player.group.visible=false;return 1');
    for (const name of wanted) for (const d of dists) {
      const [x, z] = trees[name], az = 0.6;
      const view = async (flat) => page.eval(`${FIND}
        const f = find(${x}, ${z}, ${az});
        if (!f) return { error: 'no tree' };
        const cam = T.cam.camera, e = f.hit, dir = [Math.cos(${az}), Math.sin(${az})];
        cam.position.set(e[0] + dir[0] * ${d}, e[1], e[2] + dir[1] * ${d});
        cam.lookAt(e[0] - dir[0] * 2, e[1] + 0.3, e[2] - dir[1] * 2);
        cam.updateMatrixWorld();
        T.player.setPosition(e[0] + 40, e[2] + 40, 0, T.world.terrain);
        const THR = ${flat ? 'true' : 'false'};
        if (!window.__leafSaved) window.__leafSaved = { bg: scene.background, fog: scene.fog, vis: scene.children.map((c) => c.visible), sky: scene.children[0].children[0]?.visible };
        scene.children.forEach((c, i) => { c.visible = THR ? (i === 0 || c.name === 'flora') : window.__leafSaved.vis[i]; });
        if (scene.children[0].children[0]) scene.children[0].children[0].visible = THR ? false : window.__leafSaved.sky;
        scene.fog = THR ? null : window.__leafSaved.fog;
        scene.background = THR ? new (window.__leafSaved.fog.color.constructor)(1, 0, 1) : window.__leafSaved.bg;
        for (const m of T.world.modules) m.module.prepare?.(T.renderer, 0);
        T.world.update(0, T.game.state, T.player.group.position, T.settings, ${hour}, cam, false);
        T.grade.render(scene, cam, 0, T.world.waterRenderInputs(T.settings));
        return { name: f.name, reach: f.reach, height: f.height };`);
      const stem = `${name}_${d}m_h${hour}`;
      const normal = await view(false);
      if (normal.error) { console.log(stem, normal.error); continue; }
      await page.shot(path.join(out, `${stem}.png`));
      await view(true).catch(() => null);
      await page.shot(path.join(out, `${stem}_flat.png`));
      await page.eval('const s=window.tervain.world.scene,v=window.__leafSaved;s.children.forEach((c,i)=>c.visible=v.vis[i]);return 1');
      const flat = await readRgba(path.join(out, `${stem}_flat.png`), sharp), plain = await readRgba(path.join(out, `${stem}.png`), sharp);
      const edge = hardEdges(flat);
      const crop = [Math.floor(plain.width / 2) - 192, Math.floor(plain.height / 2) - 192, 384];
      const rep = repetition(plain, crop);
      rows.push({ flag, tree: name, dist: d, hour, hardShare: +edge.hardShare.toFixed(4), isolatedPerMpx: +edge.isolatedPerMpx.toFixed(1), area: edge.area, repetition: +rep.peak.toFixed(4), repLag: rep.at });
      console.log(JSON.stringify(rows.at(-1)));
      fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(rows, null, 1));
    }
  } finally { page.close(); }
}
fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(rows, null, 1));
