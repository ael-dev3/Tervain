#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';
const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, values) => arg.startsWith('--') ? [[arg.slice(2), values[i + 1]]] : []));
const out = args.out ?? 'turn-lead-record-proof';
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
    const hero = T.player.rig.hero, lead = hero?.turnLead;
    if (!lead?.apply || !lead.poses) throw new Error('Native reusable turn-lead controller unavailable');
    const chain = [[hero.bones['mixamorig:Spine2'], .2], [hero.bones['mixamorig:Neck'], .35], [hero.bones['mixamorig:Head'], .45]];
    if (chain.some(([bone]) => !bone)) throw new Error('Native turn chain unavailable');
    const bones = []; hero.scene.traverse(object => { if (object.isBone) bones.push(object); });
    const base = bones.map(bone => bone.quaternion.clone()), up = hero.scene.position.clone().set(0, 1, 0).applyQuaternion(hero.scene.getWorldQuaternion(bones[0].quaternion.clone()));
    const proto = Object.getPrototypeOf(chain[0][0].quaternion), original = proto.clone, saved = { poses: lead.poses, lead: lead.lead };
    let clones = 0;
    const run = fresh => {
      lead.held.clear(); lead.poses = new WeakMap(); clones = 0;
      const snapshots = [];
      for (let frame = 0; frame < 60; frame++) {
        if (frame === 0 || frame < 50 && frame % 2 === 0) bones.forEach((bone, i) => bone.quaternion.copy(base[i]));
        if (fresh) lead.poses = new WeakMap();
        lead.lead = frame < 50 ? .2 + .1 * Math.sin(frame * .13) : 0;
        lead.apply(chain, up);
        snapshots.push({ bones: bones.map(bone => [...bone.position.toArray(), ...bone.quaternion.toArray(), ...bone.scale.toArray()]), held: chain.map(([bone]) => { const pose = lead.held.get(bone); return pose ? [...pose.before.toArray(), ...pose.after.toArray()] : null; }) });
      }
      return { clones, heldAfterFade: lead.held.size, snapshots };
    };
    let control, actual;
    proto.clone = function(...args) { clones++; return original.apply(this, args); };
    try { control = run(true); actual = run(false); }
    finally { proto.clone = original; lead.poses = saved.poses; lead.lead = saved.lead; lead.held.clear(); bones.forEach((bone, i) => bone.quaternion.copy(base[i])); hero.scene.updateMatrixWorld(true); }
    const before = JSON.stringify(control.snapshots), after = JSON.stringify(actual.snapshots);
    const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), byte => byte.toString(16).padStart(2, '0')).join('');
    return { schema: 1, frames: 60, activeFrames: 50, bones: bones.length, chainBones: chain.length, control: { quaternionClones: control.clones, heldAfterFade: control.heldAfterFade, poseHash: await hash(before) }, actual: { quaternionClones: actual.clones, heldAfterFade: actual.heldAfterFade, poseHash: await hash(after) }, exactPosesAndHeldRecords: before === after, pass: before === after && control.clones === 300 && actual.clones === 6 && control.heldAfterFade === 0 && actual.heldAfterFade === 0, scope: 'Actual compiled turn-lead method on the native hero skeleton; fresh-record control versus reuse, including pose restoration and fade to zero. Counts of quaternion clones in this operation, not total allocations, GC or frame timings.' };
  `);
  report.build = await page.eval('return fetch(new URL("version.json", document.baseURI)).then(r => r.json());');
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.pass) process.exitCode = 1;
} finally { page?.close(); }
