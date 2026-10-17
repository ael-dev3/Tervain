#!/usr/bin/env node
/**
 * In-game stills of the hero pine: node tools/tree-gen-pine/capture-ingame.mjs <baseUrl> <outDir> <hero:0|1> <hour> [x,z]
 * Needs the production build served (vite preview --host 127.0.0.1). One browser, closed on exit.
 */
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from '../cdp.mjs';

const [base, out, hero = '1', hourArg = '11', at = '-86,0.8'] = process.argv.slice(2);
const hour = Number(hourArg), [x, z] = at.split(',').map(Number);
fs.mkdirSync(out, { recursive: true });
const url = new URL(base);
for (const [k, v] of Object.entries({ shot: '1', quality: 'high', place: 'rillford', settle: '1', hud: '0', hour: String(hour), ...(hero === '1' ? { heropine: '1' } : {}) })) url.searchParams.set(k, v);
const views = [['base', 3.2, 1.0, 0.4], ['3m', 3, 1.7, 3], ['10m', 10, 1.7, 8], ['30m', 30, 2.5, 9], ['lookup3', 3, 1.6, 12], ['lookup6', 6, 1.6, 12], ['lookup10', 10, 1.6, 12], ['forest15', 15, 1.7, 6], ['forest40', 40, 1.8, 7]];
const page = await openPage(url.href, { w: 1280, h: 720, requestTimeoutMs: 600000 });
try {
  for (let i = 0; i < 1200; i++) {
    const s = await page.eval('return {play:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');
    if (s.failed) throw new Error('world build failed');
    if (s.play) break;
    await page.wait(250);
  }
  await page.eval('const T=window.tervain;T.render=()=>{};T.step=()=>{};await T.world.arrived;');
  await page.eval('window.tervain.player.group.visible=false;return 1');
  for (const az of [0.6]) for (const [name, d, ch, lh] of views) {
    await page.eval(`const T=window.tervain,p=[${x},${z}],h=T.world.terrain.heightAt(p[0],p[1]);const cx=p[0]+Math.cos(${az})*${d},cz=p[1]+Math.sin(${az})*${d};const ch=T.world.terrain.heightAt(cx,cz);T.player.setPosition(cx+3,cz+3,0,T.world.terrain);const camera=T.cam.camera;camera.position.set(cx,ch+${ch},cz);camera.lookAt(p[0],h+${lh},p[1]);camera.updateMatrixWorld();for(const m of T.world.modules)m.module.prepare?.(T.renderer,0);T.world.update(0,T.game.state,T.player.group.position,T.settings,${hour},camera,false);T.grade.render(T.world.scene,camera,0,T.world.waterRenderInputs(T.settings));return 1`);
    await page.shot(path.join(out, `${hero === '1' ? 'hero' : 'base'}_${name}_h${hour}.png`));
  }
  console.log(page.console().slice(-8).join('\n'));
} finally { page.close(); }
