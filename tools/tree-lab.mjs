#!/usr/bin/env node
/**
 * Tree lab (A141): one tree, alone on a cleared flat meadow, photographed the same way every time.
 *
 *   node tools/tree-lab.mjs --url <build url> --asset <id> --out <dir> [--hours 11,19.8,22.5]
 *        [--species oak|fir|pine|birch] [--parts stills,orbit,wind,metrics] [--spot x,z] [--scale 1]
 *        [--quality high] [--size 1280x720] [--wind-fps 60] [--wind-seconds 10] [--clip-hour 11]
 *
 * <id> is a MESHY_TREE_IDS asset (oak-elder, fir-spire, verdant-sentinel, tree-1521 ...), a generic species (oak, fir,
 * pine, birch: the game's own pick for that species) or `solitary-pine`. Species of the known ids is built in; pass
 * --species for any new id (a hero tree added later). The page is loaded with ?treelab=species[:assetId][@x,z], which
 * the forest module reads (src/presentation/treeLab.ts) and leaves exactly one tree on the flattest open ground it can
 * find. Actors and the clock are frozen (the loop's step/render are replaced; time moves only when this script calls
 * world.update); the player is hidden at the camera.
 *
 * Writes <out>/: stills/h<hour>_<view>.jpg (views d001 d003 d010 d030 d100 at 1.7 m eye height looking at the crown's
 * mid-height; base at 3.2 m looking at the roots; canopy from under the crown), sheets/h<hour>.jpg (1-3-10-30-100 m
 * contact sheet), orbit.mp4 (6 s, 360 degrees at 8 m), wind.mp4 (static camera 12 m), metrics.json.
 * Distances are metres from the trunk SURFACE (the measured wood radius is added to the axis distance).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { openPage } from './cdp.mjs';

const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const n = process.argv[i + 1]; args[a.slice(2)] = n === undefined || n.startsWith('--') ? 'true' : (i++, n); } }
if (!args.url || !args.asset || !args.out) { console.error('usage: node tools/tree-lab.mjs --url <build> --asset <id> --out <dir> [--hours 11,19.8,22.5]'); process.exit(2); }

const KNOWN = { 'oak-elder': 'oak', 'verdant-sentinel': 'oak', 'fir-spire': 'fir', 'solitary-pine': 'pine', oak: 'oak', fir: 'fir', pine: 'pine', birch: 'birch' };
const GENERIC = new Set(['oak', 'fir', 'pine', 'birch']);
const species = args.species ?? KNOWN[args.asset] ?? 'oak';
const assetId = GENERIC.has(args.asset) || args.asset === 'solitary-pine' ? null : args.asset;
const hours = (args.hours ?? '11,19.8,22.5').split(',').map(Number);
const parts = new Set((args.parts ?? 'stills,orbit,wind,metrics').split(','));
const [W, H] = (args.size ?? '1280x720').split('x').map(Number);
const out = path.resolve(args.out);
const windFps = Number(args['wind-fps'] ?? 60), windSeconds = Number(args['wind-seconds'] ?? 10), clipHour = Number(args['clip-hour'] ?? 11);
const fmtH = (h) => `h${String(h).replace('.', '_')}`;
for (const d of ['stills', 'sheets']) fs.mkdirSync(path.join(out, d), { recursive: true });

const ffmpeg = (a) => spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { timeout: 600000 });
const url = new URL(args.url);
for (const [k, v] of Object.entries({ shot: '1', quality: args.quality ?? 'high', place: 'rillford', settle: '1', hud: '0', hour: String(hours[0]) })) url.searchParams.set(k, v);
url.searchParams.set('treelab', `${species}${assetId ? ':' + assetId : ''}${args.spot ? '@' + args.spot : ''}${args.scale ? '*' + args.scale : ''}`);

const page = await openPage(url.href, { w: W, h: H, requestTimeoutMs: 1800000 });
const metrics = { asset: args.asset, species, assetId, url: args.url, size: [W, H], quality: args.quality ?? 'high', hours, stills: {} };
try {
  let ready = false;
  for (let i = 0; i < 7200 && !ready; i++) {
    const s = await page.eval('return {play:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');
    if (s?.failed) throw new Error('world build failed');
    if (s?.play) ready = true; else await page.wait(250);
  }
  if (!ready) throw new Error('page not ready after 30 minutes');
  await page.eval('await window.tervain.world.arrived;return 1');
  const spot = await page.eval('return window.__treelab ?? null');
  if (!spot) throw new Error('no tree placed: the build lacks the ?treelab hook or found no clear meadow. Console: ' + page.console().filter((l) => /treelab|error|exception/i.test(l)).join(' | '));
  metrics.spot = spot;
  await page.eval(`const T=window.tervain;T.render=()=>{};T.step=()=>{};T.settings.reducedMotion=false;await T.world.arrived;T.player.group.visible=false;T.hud?.show?.(false);
    const L=window.__lab={T,spot:window.__treelab};
    const TREE=/:\\d:(wood|foliage)$/;
    L.treeMeshes=()=>{const a=[];T.world.scene.traverse(o=>{if(!o.isMesh)return;if(TREE.test(o.name||''))a.push(o);});return a;};
    L.frame=(hour,cam,look,dt)=>{const camera=T.cam.camera;camera.position.set(cam[0],cam[1],cam[2]);camera.lookAt(look[0],look[1],look[2]);camera.updateMatrixWorld();
      T.player.setPosition(cam[0],cam[2],0,T.world.terrain);T.player.group.visible=false;
      for(const m of T.world.modules)m.module.prepare?.(T.renderer,0);
      T.world.update(dt,T.game.state,T.player.group.position,T.settings,hour,camera,false);
      T.grade.render(T.world.scene,camera,dt,T.world.waterRenderInputs(T.settings));};
    L.isolate=(on)=>{const sc=T.world.scene;if(on){const keep=new Set(L.treeMeshes());keep.add(T.world.sky.group);const mark=(o)=>{let k=keep.has(o);for(const c of o.children)k=mark(c)||k;return k;};
      L.hidden=[];const hide=(o)=>{for(const c of o.children){if(keep.has(c))continue;if(mark(c))hide(c);else if(c.visible){c.visible=false;L.hidden.push(c);}}};hide(sc);}
      else if(L.hidden){for(const o of L.hidden)o.visible=true;L.hidden=null;T.world.sky.group.visible=true;for(const m of L.treeMeshes())m.visible=true;}};
    L.vis=(sky,tree)=>{T.world.sky.group.visible=sky;for(const m of L.treeMeshes())m.visible=tree;};
    return 1`);
  // Tree size from the LOD-0 meshes of the one placed instance, and the wood radius just above the ground.
  const dims = await page.eval(`const L=window.__lab,S=L.spot;
    let minY=1e9,maxY=-1e9,minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9,r=0,n=0;
    for(const o of L.treeMeshes()){const nm=o.name||'';if(!/:0:(wood|foliage)$/.test(nm))continue;
      const g=o.geometry,p=g.getAttribute('position');if(!p)continue;n++;const wood=/wood$/.test(nm);const sc=S.scale,e=[sc,0,0,0,0,sc,0,0,0,0,sc,0,S.x,S.y,S.z,1];
      const step=Math.max(1,Math.floor(p.count/20000));
      for(let i=0;i<p.count;i+=step){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);const wx=e[0]*x+e[4]*y+e[8]*z+e[12],wy=e[1]*x+e[5]*y+e[9]*z+e[13],wz=e[2]*x+e[6]*y+e[10]*z+e[14];
        minY=Math.min(minY,wy);maxY=Math.max(maxY,wy);minX=Math.min(minX,wx);maxX=Math.max(maxX,wx);minZ=Math.min(minZ,wz);maxZ=Math.max(maxZ,wz);
        if(wood&&wy-S.groundY>0.4&&wy-S.groundY<1.4)r=Math.max(r,Math.hypot(wx-S.x,wz-S.z));}}
    return {meshes:n,height:maxY-S.groundY,bottom:minY-S.groundY,crownR:Math.max(maxX-minX,maxZ-minZ)/2,trunkR:r};`);
  if (!dims.meshes || !(dims.height > 1)) throw new Error('tree meshes not found: ' + JSON.stringify(dims));
  const trunkR = Math.min(Math.max(dims.trunkR, 0.15), 6);
  metrics.dims = { ...dims, trunkR };
  const g = spot.groundY, H0 = dims.height;
  const az = 0.6, dir = [Math.cos(az), Math.sin(az)];
  const at = (axisD, eye, lookH) => ({ cam: [spot.x + dir[0] * axisD, g + eye, spot.z + dir[1] * axisD], look: [spot.x, g + lookH, spot.z] });
  const mid = Math.max(2, H0 * 0.5);
  const views = {};
  for (const d of [1, 3, 10, 30, 100]) views[`d${String(d).padStart(3, '0')}`] = at(trunkR + d, 1.7, mid);
  views.base = at(3.2, 1.0, 0.4);
  { const o = Math.min(dims.crownR * 0.3, 4); views.canopy = { cam: [spot.x + dir[0] * o, g + 1.3, spot.z + dir[1] * o], look: [spot.x + dir[0] * o * 0.3, g + H0 * 0.8, spot.z + dir[1] * o * 0.3] }; }
  const frame = (hour, v, dt = 0) => page.eval(`window.__lab.frame(${hour},${JSON.stringify(v.cam)},${JSON.stringify(v.look)},${dt});return 1`);
  const grab = async (file) => { fs.writeFileSync(file, await page.image('jpeg', 93)); return file; };
  const setHour = (h) => page.eval(`window.tervain.debugTime?.(${h});return 1`);
  metrics.views = views;

  if (parts.has('stills')) {
    for (const hour of hours) {
      await setHour(hour);
      for (const [name, v] of Object.entries(views)) {
        await frame(hour, v); await frame(hour, v);
        await grab(path.join(out, 'stills', `${fmtH(hour)}_${name}.jpg`));
      }
      const list = ['d001', 'd003', 'd010', 'd030', 'd100'].map((n) => `file '${path.join(out, 'stills', `${fmtH(hour)}_${n}.jpg`).replace(/\\/g, '/')}'`).join('\n');
      const lf = path.join(out, 'sheets', `${fmtH(hour)}.txt`); fs.writeFileSync(lf, list);
      ffmpeg(['-f', 'concat', '-safe', '0', '-i', lf, '-vf', 'scale=640:-2,tile=5x1', '-frames:v', '1', '-update', '1', path.join(out, 'sheets', `${fmtH(hour)}.jpg`)]);
      fs.rmSync(lf, { force: true });
    }
  }

  if (parts.has('metrics')) {
    await setHour(clipHour);
    // Triangles and draws attributable to the tree: the d10 frame with and without the tree meshes.
    const v = views.d010;
    metrics.renderInfo = await page.eval(`const L=window.__lab,T=L.T,I=T.renderer.info;const cam=${JSON.stringify(v.cam)},look=${JSON.stringify(v.look)};
      L.frame(${clipHour},cam,look,0);const run=()=>{I.autoReset=false;I.reset();L.frame(${clipHour},cam,look,0);const r={calls:I.render.calls,triangles:I.render.triangles};I.autoReset=true;return r;};
      const withTree=run();const ms=L.treeMeshes();const vis=ms.map(m=>m.visible);ms.forEach(m=>m.visible=false);const without=run();ms.forEach((m,i)=>m.visible=vis[i]);
      let tris=0;ms.forEach((m,i)=>{if(!vis[i])return;const g=m.geometry;tris+=(g.index?g.index.count:g.getAttribute('position').count)/3*(m.isInstancedMesh?m.count:1);});
      return {withTree,without,treeFrame:{calls:withTree.calls-without.calls,triangles:withTree.triangles-without.triangles},sceneTreeMeshTriangles:Math.round(tris)};`);
    // Alpha edges: the tree alone against black and white at 3 m, alpha = 1 - (white - black)/(bgWhite - bgBlack).
    try {
      const v3 = views.d003, shots = [];
      await page.eval('window.__lab.isolate(true);return 1');
      for (const [sky, tree] of [[true, true], [false, true], [true, false]]) {
        await page.eval(`window.__lab.vis(${sky},${tree});return 1`);
        await frame(clipHour, v3); await frame(clipHour, v3);
        shots.push(await page.image('png'));
      }
      await page.eval('window.__lab.isolate(false);return 1');
      ['alpha_A_tree_sky', 'alpha_B_tree_nosky', 'alpha_C_sky_only'].forEach((n, i) => fs.writeFileSync(path.join(out, n + '.png'), shots[i]));
      metrics.alphaEdges = alphaEdgeMetric(['alpha_A_tree_sky', 'alpha_B_tree_nosky', 'alpha_C_sky_only'].map((n) => path.join(out, n + '.png')), W, H);
    } catch (e) { await page.eval('window.__lab.isolate(false);return 1').catch(() => {}); metrics.alphaEdges = { error: String(e.message ?? e) }; }
    // Repetition: autocorrelation of the canopy still (leaves) and the base still (bark).
    await setHour(clipHour);
    for (const [key, view] of [['leaf', 'canopy'], ['bark', 'base']]) {
      const f = path.join(out, 'stills', `${fmtH(clipHour)}_${view}.jpg`);
      if (!fs.existsSync(f)) { await frame(clipHour, views[view]); await frame(clipHour, views[view]); await grab(f); }
      const size = Math.min(256, H - 16);
      metrics[`${key}Repetition`] = autocorrPeak(decodeRaw(f, W, H, 'gray'), W, Math.floor((W - size) / 2), Math.floor((H - size) / 2), size);
    }
    for (const hour of hours) {
      const f = path.join(out, 'stills', `${fmtH(hour)}_d010.jpg`);
      if (fs.existsSync(f)) { const g2 = decodeRaw(f, W, H, 'gray'); let s = 0; for (const x of g2) s += x; metrics.stills[fmtH(hour)] = { d010MeanLuma: +(s / g2.length).toFixed(1) }; }
    }
  }

  if (parts.has('orbit')) {
    const dir2 = path.join(out, 'orbit_frames'); fs.mkdirSync(dir2, { recursive: true });
    await setHour(clipHour);
    const n = 180;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, d = trunkR + 8;
      await frame(clipHour, { cam: [spot.x + Math.cos(a) * d, g + 1.7, spot.z + Math.sin(a) * d], look: [spot.x, g + mid, spot.z] }, 0);
      await grab(path.join(dir2, `f${String(i).padStart(4, '0')}.jpg`));
    }
    ffmpeg(['-framerate', '30', '-i', path.join(dir2, 'f%04d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p', path.join(out, 'orbit.mp4')]);
    fs.rmSync(dir2, { recursive: true, force: true });
  }

  if (parts.has('wind')) {
    const dir2 = path.join(out, 'wind_frames'); fs.mkdirSync(dir2, { recursive: true });
    await setHour(clipHour);
    const v = at(trunkR + 12, 1.7, mid), n = Math.round(windFps * windSeconds);
    await frame(clipHour, v, 0);
    metrics.windClock = { reducedMotion: await page.eval('return !!window.tervain.settings.reducedMotion'), start: await page.eval('return window.tervain.world.foliage.wind.uniforms.uGrassTime.value') };
    for (let i = 0; i < n; i++) { await frame(clipHour, v, 1 / windFps); await grab(path.join(dir2, `f${String(i).padStart(4, '0')}.jpg`)); }
    ffmpeg(['-framerate', String(windFps), '-i', path.join(dir2, 'f%04d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p', path.join(out, 'wind.mp4')]);
    metrics.windClock.end = await page.eval('return window.tervain.world.foliage.wind.uniforms.uGrassTime.value');
    if (parts.has('metrics')) metrics.wind = windMetric(dir2, windFps);
    fs.rmSync(dir2, { recursive: true, force: true });
  }
  metrics.console = page.console().filter((l) => /error|exception/i.test(l)).slice(0, 10);
  fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(metrics, null, 1));
  console.log(JSON.stringify({ out, spot, dims: metrics.dims, treeFrame: metrics.renderInfo?.treeFrame, alpha: metrics.alphaEdges, wind: metrics.wind, leafRep: metrics.leafRepetition, barkRep: metrics.barkRepetition }));
} finally { page.close(); }

/* ---- metric helpers ---- */
function decodeRaw(file, w, h, pix) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h}`, '-f', 'rawvideo', '-pix_fmt', pix, '-'], { maxBuffer: 1 << 28, timeout: 120000 });
  if (r.status !== 0) throw new Error('ffmpeg decode failed ' + file);
  return new Uint8Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length);
}

/**
 * Alpha without a controllable background: A = tree over sky, B = tree over the empty clear colour, C = sky alone.
 * For a partly covered pixel A - B = (1 - alpha)(sky - clear), so alpha = 1 - (A - B)/(C - B_clear), judged only where
 * the sky differs from the clear colour by at least 40 levels. A "hard step" is a covered pixel (alpha > 0.9) beside an
 * empty one (< 0.1); lower hardShare reads softer.
 */
function alphaEdgeMetric([fa, fb, fc], w, h) {
  const A = decodeRaw(fa, w, h, 'gray'), B = decodeRaw(fb, w, h, 'gray'), C = decodeRaw(fc, w, h, 'gray');
  const clear = B[0], a = new Float32Array(w * h).fill(-1);
  for (let i = 0; i < a.length; i++) { const d = C[i] - clear; if (d >= 40) a[i] = Math.min(1, Math.max(0, 1 - (A[i] - B[i]) / d)); }
  let valid = 0, hard = 0, soft = 0, covered = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, v = a[i];
    if (v < 0 || a[i - 1] < 0 || a[i + 1] < 0 || a[i - w] < 0 || a[i + w] < 0) continue;
    valid++; if (v > 0.5) covered++;
    const lo = a[i - 1] < 0.1 || a[i + 1] < 0.1 || a[i - w] < 0.1 || a[i + w] < 0.1, hi = a[i - 1] > 0.9 || a[i + 1] > 0.9 || a[i - w] > 0.9 || a[i + w] > 0.9;
    if (v > 0.9 && lo) hard++;
    else if (v > 0.1 && v < 0.9 && (lo || hi)) soft++;
  }
  const edge = hard + soft;
  if (valid < 2000) return { error: 'too little sky behind the tree to measure', validPixels: valid };
  return { clearLuma: clear, validPixels: valid, coveredPixels: covered, hardStepPixels: hard, softEdgePixels: soft, hardShare: edge ? +(hard / edge).toFixed(4) : null, hardPerThousandValid: +(hard * 1000 / valid).toFixed(2) };
}

/** Peak normalised autocorrelation of a size x size crop over lags 10..size/2 (near 0 = no visible repeat, near 1 = tiled). */
function autocorrPeak(gray, W, x0, y0, size) {
  const c = new Float32Array(size * size); let mean = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const v = gray[(y0 + y) * W + x0 + x]; c[y * size + x] = v; mean += v; }
  mean /= c.length; let varSum = 0; for (let i = 0; i < c.length; i++) { c[i] -= mean; varSum += c[i] * c[i]; }
  if (varSum < 1) return { peak: null, note: 'flat crop' };
  let peak = -1, plag = [0, 0];
  const max = Math.floor(size / 2);
  for (let dy = 0; dy <= max; dy += 2) for (let dx = -max; dx <= max; dx += 2) {
    if (Math.hypot(dx, dy) < 10 || (dy === 0 && dx < 0)) continue;
    let s = 0, n = 0;
    for (let y = 0; y + dy < size; y += 2) for (let x = Math.max(0, -dx); x + dx < size; x += 2) { s += c[y * size + x] * c[(y + dy) * size + x + dx]; n++; }
    const r = n ? s / n / (varSum / c.length) : 0;
    if (r > peak) { peak = r; plag = [dx, dy]; }
  }
  return { peak: +peak.toFixed(3), lag: plag, crop: size };
}

/** Per-block luma time series inside the crown: mean pairwise correlation and the share of variance in the first component. */
function windMetric(dir, fps) {
  const w = 320, h = 180;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.jpg'), '-vf', `scale=${w}:${h}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 30, timeout: 300000 });
  if (r.status !== 0) return { error: 'decode failed' };
  const all = new Uint8Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length), T = Math.floor(all.length / (w * h)), frames = [];
  for (let t = 0; t < T; t++) frames.push(all.subarray(t * w * h, (t + 1) * w * h));
  const B = 8, bx = Math.floor(w / B), by = Math.floor(h / B), series = [], std = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) { let m = 0, q = 0; for (let t = 0; t < T; t++) m += frames[t][i]; m /= T; for (let t = 0; t < T; t++) q += (frames[t][i] - m) ** 2; std[i] = Math.sqrt(q / T); }
  let amp = 0;
  for (let j = 0; j < by; j++) for (let i = 0; i < bx; i++) {
    let active = 0; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) if (std[(j * B + y) * w + i * B + x] > 0.8) active++;
    if (active < B * B * 0.4) continue;
    const s = new Float32Array(T);
    for (let t = 0; t < T; t++) { let m = 0; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) m += frames[t][(j * B + y) * w + i * B + x]; s[t] = m / (B * B); }
    let mean = 0; for (const v of s) mean += v; mean /= T; let sd = 0; for (let t = 0; t < T; t++) { s[t] -= mean; sd += s[t] * s[t]; }
    sd = Math.sqrt(sd / T); if (sd < 0.1) continue;
    for (let t = 0; t < T; t++) s[t] /= sd;
    series.push({ s, x: i, y: j }); amp += sd;
  }
  if (series.length < 4) return { blocks: series.length, note: 'too little motion to measure' };
  let sum = 0, cnt = 0, near = 0, nearN = 0, far = 0, farN = 0;
  for (let a = 0; a < series.length; a++) for (let b = a + 1; b < series.length; b++) {
    let c = 0; for (let t = 0; t < T; t++) c += series[a].s[t] * series[b].s[t]; c /= T; sum += c; cnt++;
    const d = Math.hypot(series[a].x - series[b].x, series[a].y - series[b].y);
    if (d <= 3) { near += c; nearN++; } else if (d >= 8) { far += c; farN++; }
  }
  const m = series.length; const v = new Float64Array(m).fill(1 / Math.sqrt(m)); let lam = 0;
  for (let it = 0; it < 30; it++) {
    const u = new Float64Array(T); for (let k = 0; k < m; k++) for (let t = 0; t < T; t++) u[t] += series[k].s[t] * v[k];
    const nv = new Float64Array(m); for (let k = 0; k < m; k++) { let d = 0; for (let t = 0; t < T; t++) d += series[k].s[t] * u[t]; nv[k] = d / T; }
    lam = Math.hypot(...nv); if (!lam) break; for (let k = 0; k < m; k++) v[k] = nv[k] / lam;
  }
  return { blocks: m, frames: T, fps, meanPairwiseCorr: +(sum / cnt).toFixed(3), nearBlockCorr: nearN ? +(near / nearN).toFixed(3) : null, farBlockCorr: farN ? +(far / farN).toFixed(3) : null, pc1Share: +(lam / m).toFixed(3), meanBlockLumaStd: +(amp / m).toFixed(2), reading: 'pairwise corr and pc1Share near 1 = whole crown moves in phase; near 0 = independent per-branch motion' };
}
