#!/usr/bin/env node
/**
 * Close looks at residents' hands in the running game: the quarry hand at work and the reeve standing, the camera 1.6 m
 * in front of each.  node tools/resident-hands.mjs [out-dir]   (the game at TERVAIN_URL, default :5173)
 */
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';

const out = process.argv[2] ?? 'shots/resident-hands';
const base = process.env.TERVAIN_URL ?? 'http://127.0.0.1:5173/';
fs.mkdirSync(out, { recursive: true });
const page = await openPage(`${base}?shot=1&place=quarry&hour=11&quality=high&settle=2`, { w: 1280, h: 720 });
try {
  for (let i = 0; i < 600; i++) { const t = await page.eval('return document.title').catch(() => ''); if (t === 'READY') break; await page.wait(1000); }
  for (let i = 0; i < 90; i++) { const ok = await page.eval('return window.tervain.npcs.every(n => !n.awaitingModel)').catch(() => false); if (ok) break; await page.wait(1000); }
  for (const [id, name] of [['quarry_hand', 'work'], ['rillford_reeve', 'reeve']]) {
    const r = await page.eval(`const T = window.tervain; T.openPause = () => {}; if (T.panels.isOpen) T.panels.closeAll();
      const n = T.npcs.find(x => x.id === '${id}'); if (!n) return 'missing';
      const hand = n.rig.root.getObjectByName('RightHand') ?? n.rig.root.getObjectByName('mixamorig:RightHand');
      T.player.setPosition(n.x + Math.sin(n.yaw) * 1.6, n.z + Math.cos(n.yaw) * 1.6, n.yaw + Math.PI, T.world.terrain);
      return JSON.stringify({ mode: n.mode, at: [n.x, n.z].map(v => v.toFixed(1)), hand: !!hand, bones: n.rig.root.getObjectByProperty('isSkinnedMesh', true)?.skeleton.bones.length });`);
    console.log(id, r);
    await page.wait(2500);
    await page.shot(path.join(out, `${name}.png`));
  }
  console.log(page.console().filter(l => /error/i.test(l)).slice(0, 4).map(l => l.slice(0, 200)).join('\n'));
} finally { await page.close(); }
