#!/usr/bin/env node
/**
 * Close views of the wanderer's hands in the served build, the right on the sword's grip and the left in a fist, from four
 * sides, with only the wanderer drawn (the sword hidden) under the world's own light. Run it against two builds for a
 * before and after:  node tools/hero/hands.mjs <label> [out-dir] [--headed]   (the game at TERVAIN_URL, default :5173)
 */
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from '../cdp.mjs';

const [label = 'hands', out = 'shots/hands'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const base = process.env.TERVAIN_URL ?? 'http://127.0.0.1:5173/';
fs.mkdirSync(out, { recursive: true });
const page = await openPage(`${base}?shot=1&place=rillford&hour=11&quality=high&settle=2`, { w: 960, h: 720, headed: process.argv.includes('--headed') });
try {
  for (let i = 0; i < 600; i++) { const t = await page.eval('return document.title').catch(() => ''); if (t === 'READY') break; await page.wait(1000); }
  await page.eval(`const T = window.tervain; T.openPause = () => {}; if (T.panels?.isOpen) T.panels.closeAll(); T.frame = () => {};
    for (let i = 0; i < 40; i++) { T.player.rig.hero.holdGrip('Right', 'sword'); T.player.rig.hero.holdGrip('Left', 'fist'); T.step(1 / 60); }
    return 1;`);
  const views = [];
  for (const bone of ['RightHand', 'LeftHand']) for (const az of [0, 90, 180, 270]) views.push([`${bone}-${degrees}`, bone, az]);
  for (const [name, bone, degrees] of views) {
    const data = await page.eval(`const T = window.tervain, scene = T.world.scene, root = T.player.rig.root;
      let top = root; while (top.parent && top.parent !== scene) top = top.parent;
      const hidden = [];
      for (const c of scene.children) if (c !== top && !c.isLight && c.visible) { c.visible = false; hidden.push(c); }
      root.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.visible) { o.visible = false; hidden.push(o); } });
      let hand = null; root.traverse(o => { if (!hand && o.isBone && o.name.replace(':','') === 'mixamorig${bone}') hand = o; });
      root.updateMatrixWorld(true);
      const c = { x: 0, y: 0, z: 0 }; let n = 0;
      hand.traverse(o => { if (o.isBone) { const e = o.matrixWorld.elements; c.x += e[12]; c.y += e[13]; c.z += e[14]; n++; } });
      c.x /= n; c.y /= n; c.z /= n;
      const cam = T.cam.camera.clone(); cam.fov = 28; cam.aspect = 960 / 720; cam.near = 0.02; cam.updateProjectionMatrix();
      const a = (T.player.yaw ?? 0) + ${degrees} * Math.PI / 180;
      cam.position.set(c.x + Math.sin(a) * 0.36, c.y + 0.08, c.z + Math.cos(a) * 0.36); cam.lookAt(c.x, c.y, c.z); cam.updateMatrixWorld(true);
      const bg = scene.background; scene.background = null; T.renderer.setClearColor(0x6f7a80, 1);
      T.renderer.setRenderTarget(null); T.renderer.render(scene, cam);
      const url = T.renderer.domElement.toDataURL('image/png');
      scene.background = bg; for (const o of hidden) o.visible = true;
      return url;`);
    if (typeof data !== 'string') { console.log(name, 'no image', data); continue; }
    fs.writeFileSync(path.join(out, `${label}-${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
  }
  console.log(page.console().filter((l) => /error/i.test(l)).slice(0, 4).map((l) => l.slice(0, 200)).join('\n'));
} finally { await page.close(); }
