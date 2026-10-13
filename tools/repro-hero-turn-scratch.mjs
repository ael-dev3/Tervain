#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, values) => arg.startsWith('--') ? [[arg.slice(2), values[i + 1]]] : []));
const out = args.out ?? 'hero-turn-scratch-proof';
fs.mkdirSync(out, { recursive: true });
const url = new URL(args.url ?? 'http://127.0.0.1:4173/');
for (const [key, value] of Object.entries({ shot: '1', place: 'rillford', quality: 'high', settle: '1', hud: '0' })) url.searchParams.set(key, value);
let page;
try {
  page = await openPage(url.href, { w: 640, h: 360, requestTimeoutMs: 240000 });
  let ready = false;
  for (let i = 0; i < 800; i++) {
    if (await page.eval('return window.tervain?.mode === "play";')) { ready = true; break; }
    await page.wait(250);
  }
  if (!ready) throw new Error('Game not ready');
  const report = await page.eval(`
    const T = window.tervain; T.render = () => {}; T.step = () => {};
    const hero = T.player.rig.hero;
    if (!hero?.turnUp || !hero.turnFrame) throw new Error('Compiled scratch-reuse controller unavailable');
    const savedUp = hero.turnUp, savedFrame = hero.turnFrame, bones = [];
    hero.scene.traverse(object => { if (object.isBone) bones.push(object); });
    if (!bones.length) throw new Error('Native hero skeleton unavailable');
    const run = fresh => {
      hero.reset(); hero.turnLead.held.clear();
      const ups = new Set(), frames = new Set(), poses = [];
      for (let i = 0; i < 120; i++) {
        // Capture-only control restores the previous per-pose fresh-scratch behavior.
        hero.turnUp = fresh ? new savedUp.constructor() : savedUp;
        hero.turnFrame = fresh ? new savedFrame.constructor() : savedFrame;
        hero.pose({ mode: 'idle', turn: i < 60 ? .02 : -.02, speed: 0, grounded: true }, 1 / 60, false);
        ups.add(hero.turnUp); frames.add(hero.turnFrame);
        poses.push(bones.map(bone => [...bone.position.toArray(), ...bone.quaternion.toArray(), ...bone.scale.toArray()]));
      }
      return { uniqueVectors: ups.size, uniqueQuaternions: frames.size, poses };
    };
    let control, actual;
    try { control = run(true); actual = run(false); }
    finally { hero.turnUp = savedUp; hero.turnFrame = savedFrame; }
    const before = JSON.stringify(control.poses), after = JSON.stringify(actual.poses);
    const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), byte => byte.toString(16).padStart(2, '0')).join('');
    return { schema: 1, frames: 120, bones: bones.length, control: { uniqueVectors: control.uniqueVectors, uniqueQuaternions: control.uniqueQuaternions, poseHash: await hash(before) }, actual: { uniqueVectors: actual.uniqueVectors, uniqueQuaternions: actual.uniqueQuaternions, poseHash: await hash(after) }, exactAllBonePoses: before === after, pass: before === after && control.uniqueVectors === 120 && control.uniqueQuaternions === 120 && actual.uniqueVectors === 1 && actual.uniqueQuaternions === 1, scope: 'Actual compiled native hero; fresh-scratch control versus reused scratch, all bone local transforms compared over 120 turning poses. Object identities, not heap bytes or frame timings.' };
  `);
  report.build = await page.eval('return fetch(new URL("version.json", document.baseURI)).then(r => r.json());');
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.pass) process.exitCode = 1;
} finally {
  page?.close();
}
