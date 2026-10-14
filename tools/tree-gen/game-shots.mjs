#!/usr/bin/env node
/**
 * In-game stills of the hero oak: node tools/tree-gen/game-shots.mjs <previewUrl> <outDir> [hour,hour] [--x -70.2 --z 78.4] [--flag herooak=1]
 *
 * Opens the built game (vite preview) with ?herooak=1 at the Rillford place, freezes it, and puts the camera at
 * 3 / 10 / 30 m from the oak at the given spot, plus a base close-up and a look-up shot, for each hour.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from '../cdp.mjs';

const args = process.argv.slice(2), flagVal = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const base = args[0], outDir = args[1], hours = (args[2] && !args[2].startsWith('--') ? args[2] : '11,19.8').split(',').map(Number);
const [x, z] = [Number(flagVal('--x', -70.2)), Number(flagVal('--z', 78.4))], flag = flagVal('--flag', 'herooak=1'), tag = flagVal('--tag', 'game');
fs.mkdirSync(outDir, { recursive: true });
const views = [ // [name, distance, camera height above ground, look height]
  ['03m', 3, 1.7, 5], ['10m', 10, 1.7, 7], ['30m', 30, 2.5, 8], ['base', 3.2, 1.0, 0.5], ['lookup', 3.4, 1.6, 11], ['f15', 15, 3.0, 7], ['f40', 40, 4.0, 8],
];
const az = Number(flagVal('--az', 0.6));
for (const hour of hours) {
  const url = new URL(base);
  for (const [k, v] of Object.entries({ shot: '1', quality: 'high', place: 'rillford', settle: '1', hud: '0', hour: String(hour) })) url.searchParams.set(k, v);
  if (flag) { const [k, v] = flag.split('='); url.searchParams.set(k, v); }
  const page = await openPage(url.href, { w: 1280, h: 720, requestTimeoutMs: 900000 });
  try {
    for (let i = 0; i < 2400; i++) {
      const s = await page.eval('return {play:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');
      if (s.failed) throw new Error('world build failed');
      if (s.play) break; await page.wait(250);
    }
    await page.eval('const T=window.tervain;T.render=()=>{};T.step=()=>{};await T.world.arrived;');
    await page.eval('window.tervain.player.group.visible=false;return 1');
    for (const [name, dist, ch, lh] of views) {
      await page.eval(`const T=window.tervain,p=[${x},${z}],h=T.world.terrain.heightAt(p[0],p[1]);const cx=p[0]+Math.cos(${az})*${dist},cz=p[1]+Math.sin(${az})*${dist};const ch=T.world.terrain.heightAt(cx,cz);T.player.setPosition(cx+3,cz+3,0,T.world.terrain);const camera=T.cam.camera;camera.position.set(cx,ch+${ch},cz);camera.lookAt(p[0],h+${lh},p[1]);camera.updateMatrixWorld();for(const m of T.world.modules)m.module.prepare?.(T.renderer,0);T.world.update(0,T.game.state,T.player.group.position,T.settings,${hour},camera,false);T.grade.render(T.world.scene,camera,0,T.world.waterRenderInputs(T.settings));return 1`);
      const file = path.join(outDir, `${tag}-${name}-h${hour}.png`); await page.shot(file); console.log(file);
    }
  } finally { await page.close?.(); }
}
