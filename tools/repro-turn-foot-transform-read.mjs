#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, values) => arg.startsWith('--') ? [[arg.slice(2), values[i + 1]]] : []));
const out = args.out ?? 'turn-foot-transform-proof';
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
  await page.eval('const T = window.tervain; T.render = () => {}; await T.world.arrived; T.step = () => {};');
  const report = await page.eval(`
    const T = window.tervain, steps = T.player.rig.hero?.steps;
    if (!steps?.measure || !steps.feet || !steps.legs) throw new Error('Native hero turn-step controller unavailable');
    let proto = steps.legs.Left.foot;
    while (proto && !Object.hasOwn(proto, 'updateWorldMatrix')) proto = Object.getPrototypeOf(proto);
    if (!proto) throw new Error('Native world-matrix update unavailable');
    const original = proto.updateWorldMatrix, root = T.player.rig.root;
    const saved = { position: root.position.clone(), quaternion: root.quaternion.clone(), scale: root.scale.clone() };
    let calls = 0;
    const rows = [];
    const outputs = which => ['Left', 'Right'].map(side => {
      const foot = steps.feet[side];
      return { position: (which === 'flat' ? foot.flat : foot.home).toArray(), quaternion: (which === 'flat' ? foot.flatTurn : foot.homeTurn).toArray() };
    });
    const control = which => {
      for (const side of ['Left', 'Right']) {
        const bone = steps.legs[side].foot, foot = steps.feet[side];
        bone.updateWorldMatrix(true, false);
        bone.getWorldPosition(which === 'flat' ? foot.flat : foot.home);
        bone.getWorldQuaternion(which === 'flat' ? foot.flatTurn : foot.homeTurn);
      }
    };
    proto.updateWorldMatrix = function(...args) { calls++; return original.apply(this, args); };
    try {
      for (const transformed of [false, true]) {
        root.position.copy(saved.position); root.quaternion.copy(saved.quaternion); root.scale.copy(saved.scale);
        if (transformed) { root.position.addScalar(.37); root.rotateY(.73); root.scale.set(.8, 1.2, 1.1); }
        for (const which of ['flat', 'home']) {
          calls = 0; control(which); const before = { updates: calls, pose: outputs(which) };
          calls = 0; steps.measure(which); const after = { updates: calls, pose: outputs(which) };
          rows.push({ transformed, which, before, after, exactPose: JSON.stringify(before.pose) === JSON.stringify(after.pose) });
        }
      }
    } finally {
      proto.updateWorldMatrix = original;
      root.position.copy(saved.position); root.quaternion.copy(saved.quaternion); root.scale.copy(saved.scale);
      steps.measure('flat'); steps.measure('home');
    }
    return { schema: 1, rows, pass: rows.every(row => row.exactPose && row.before.updates === row.after.updates * 3), scope: 'Actual compiled hero controller versus previous three-walk native getter sequence; deterministic work counts, not frame timings.' };
  `);
  report.build = await page.eval('return fetch(new URL("version.json", document.baseURI)).then(r => r.json());');
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.pass) process.exitCode = 1;
} finally {
  page?.close();
}
