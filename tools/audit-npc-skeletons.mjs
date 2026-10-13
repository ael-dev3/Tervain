/**
 * Skeleton sanity audit of every resident on their own Meshy rig, through the production catalog and motion controller.
 * Run: node tools/audit-npc-skeletons.mjs [--only role,role] [--json out.json] [--verbose]
 *
 * For every role in the NPC manifest, every clip retargeted onto that resident is played alone and sampled across its
 * length, then the controller itself is driven through idle routines, accents, turning on the spot, talk, walk, sitting
 * and work. Each sampled pose fails on:
 *  - the head joint below the neck or the shoulders, or the head tipped more than 35° from the neck's own up;
 *  - any joint's world scale outside 0.8-1.25 of the body's;
 *  - a hand joint inside the torso capsule (hips to neck, radius from the model's own shoulder span);
 *  - the skull's skin (bind vertices above the jaw in the head's column) moving more than 1.5 cm away from where the
 *    head joint alone would carry it: a face weighted to the shoulders shears off the skull though the joints are sound.
 * Clips alone are shown as the controller shows them (hands kept out of the torso); fight.dead lies on the ground, so
 * "head below the neck" is not asked of it. Exits non-zero on any failure.
 * Textures are replaced with one-pixel stubs; no browser, server or network is needed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let only = null, jsonOut = null, verbose = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--only') only = args[++i].split(',');
  else if (args[i] === '--json') jsonOut = path.resolve(args[++i]);
  else if (args[i] === '--verbose') verbose = true;
  else throw new Error(`Unknown argument ${args[i]}`);
}
const LIMITS = { headPitch: 35, scaleMin: 0.8, scaleMax: 1.25, skullShear: 0.015 };

const require = createRequire(path.join(repo, 'package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')));
const THREE = await import(pathToFileURL(path.join(path.dirname(require.resolve('three')), 'three.module.js')));
const { GLTFLoader } = await import(pathToFileURL(require.resolve('three/examples/jsm/loaders/GLTFLoader.js')));
const { MeshoptDecoder } = await import(pathToFileURL(require.resolve('three/examples/jsm/libs/meshopt_decoder.module.js')));
globalThis.atob ??= text => Buffer.from(text, 'base64').toString('binary');

async function decode(file) {
  const buffer = await fs.readFile(file);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const stub = name => () => ({ name, loadTexture() {
    const texture = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
    texture.needsUpdate = true;
    return Promise.resolve(texture);
  } });
  // Same names as the image extensions, so the stub replaces them; the last covers plain images.
  for (const name of ['EXT_texture_webp', 'EXT_texture_avif', 'KHR_texture_basisu', 'AUDIT_TEXTURE_STUBS']) loader.register(stub(name));
  return loader.parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
}

const server = await createServer({ root: repo, configFile: false, appType: 'custom', logLevel: 'error',
  server: { middlewareMode: true, watch: null, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const report = [];
try {
  const [{ validateMeshyNpcManifest, MeshyNpcCatalog }, { poseRig }, { NPCS }, { npcStyle }, { AMBIENT_PEOPLE },
    { parseResidentRig }, { residentMotionLibrary, MOTION_CLIPS }] = await Promise.all([
    '/src/presentation/meshynpcs.ts', '/src/presentation/characters.ts', '/src/content/npcs.ts', '/src/presentation/npcStyle.ts',
    '/src/presentation/ambient.ts', '/src/presentation/npc/residentRig.ts', '/src/presentation/npc/residentMotion.ts',
  ].map(name => server.ssrLoadModule(name)));
  const dir = path.join(repo, 'public/models/npcs');
  const manifest = validateMeshyNpcManifest(JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8')));
  const library = residentMotionLibrary(await decode(path.join(dir, manifest.motion.file)));
  const roles = Object.keys(manifest.roles).filter(role => !only || only.includes(role) || only.includes(manifest.roles[role]));
  if (!roles.length) throw new Error('No roles selected.');
  const templates = new Map(), rigs = new Map();
  for (const id of new Set(roles.map(role => manifest.roles[role]))) {
    const entry = manifest.assets.find(asset => asset.id === id);
    templates.set(id, await decode(path.join(dir, entry.file)));
    if (entry.rig) rigs.set(id, parseResidentRig(JSON.parse(await fs.readFile(path.join(dir, entry.rig.file), 'utf8'))));
  }
  const catalog = new MeshyNpcCatalog(manifest, templates, rigs, library);
  const v = () => new THREE.Vector3();
  const [a, b, c, d, e, f] = [v(), v(), v(), v(), v(), v()];
  const sc = v(), q = new THREE.Quaternion();

  for (const role of roles) {
    let heightScale = 1;
    if (role.startsWith('named:')) { const id = role.slice(6); heightScale = NPCS[id].look.height * (npcStyle(id).build === 'woman' ? 0.94 : 1); }
    else if (role.startsWith('ambient:')) {
      const spec = AMBIENT_PEOPLE.find(person => person.style.id === role.slice(8));
      if (spec) heightScale = spec.look.height * (spec.style.build === 'woman' ? 0.94 : 1);
    } else if (role.startsWith('enemy:')) heightScale = 1.04 + (role === 'enemy:ford_bandit_b' ? 0.05 : 0);
    const rig = catalog.create(role, heightScale, role.startsWith('enemy:') ? 'blade' : 'none');
    const motion = rig.resident;
    const result = { role, id: manifest.roles[role], failures: {}, worst: { headPitch: 0, headDrop: -Infinity, scale: [Infinity, -Infinity], handDepth: -Infinity }, samples: 0 };
    report.push(result);
    if (!motion) { result.note = 'procedural poser (no rig)'; console.log(`${role}: procedural poser, skipped`); continue; }
    // Measure against the rig's bind pose (its rest for retargeting), not whatever building it left.
    const data = rigs.get(result.id), world = data.bones.map(spec => new THREE.Matrix4().compose(new THREE.Vector3(...spec.position),
      new THREE.Quaternion(...spec.quaternion).normalize(), new THREE.Vector3(1, 1, 1)));
    const toBind = own => data.bones.forEach((spec, i) => {
      const local = spec.parent < 0 ? world[i].clone() : world[spec.parent].clone().invert().multiply(world[i]);
      local.decompose(own.resident.bones[spec.name].position, own.resident.bones[spec.name].quaternion, sc);
    });
    const meshOf = own => { let found = null; own.root.traverse(o => { if (o.isSkinnedMesh && !found) found = o; }); return found; };
    const place = own => { own.root.position.set(3, 1, -2); own.root.rotation.y = 0.6; own.root.updateMatrixWorld(true); };
    toBind(rig); place(rig);
    const bones = motion.bones, mesh = meshOf(rig), bodyScale = rig.body.getWorldScale(v()).y;
    // The torso capsule (hips to neck): its radius is the shoulder sockets' half span, less the arm's own thickness.
    const torsoRadius = bones.LeftArm.getWorldPosition(a).distanceTo(bones.RightArm.getWorldPosition(b)) / 2 * 0.55 / bodyScale;
    // The face's rest elevation in the neck's and the chest's frames, with the model's up in each.
    const restPitch = {};
    for (const [key, frame] of [['neck', bones.neck], ['chest', bones.Spine]]) {
      const inv = frame.getWorldQuaternion(q).clone().invert();
      const rootUp = v().set(0, 1, 0).applyQuaternion(rig.root.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(inv);
      const fwd = v().subVectors(bones.headfront.getWorldPosition(v()), bones.Head.getWorldPosition(v())).applyQuaternion(inv).normalize();
      restPitch[key] = { up: rootUp, elevation: THREE.MathUtils.radToDeg(Math.asin(fwd.dot(rootUp))) };
    }
    // The skull: bind vertices above the head joint's chin line, within the head's own column (Head to headfront).
    const spec = name => data.bones.find(bone => bone.name === name).position;
    const H = new THREE.Vector3(...spec('Head')), F = new THREE.Vector3(...spec('headfront'));
    const column = new THREE.Vector2((H.x + F.x) / 2, (H.z + F.z) / 2);
    const skull = [];
    {
      const position = mesh.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        if (position.getY(i) > H.y + 0.08 && Math.hypot(position.getX(i) - column.x, position.getZ(i) - column.y) < 0.12) skull.push(i);
      }
    }
    result.skullVertices = skull.length;
    const headIndex = mesh.skeleton.bones.findIndex(bone => bone.name === 'Head');
    const segmentDistance = (p, s0, s1) => {
      const ab = c.subVectors(s1, s0), t = Math.min(1, Math.max(0, d.subVectors(p, s0).dot(ab) / Math.max(1e-9, ab.lengthSq())));
      return e.copy(s0).addScaledVector(ab, t).distanceTo(p);
    };
    const fail = (key, label) => { (result.failures[key] ??= []).push(label); };
    const rigid = new THREE.Matrix4(), skinned = v(), held = v();
    /** Lying dead, "below the neck" does not apply: the body lies along the ground. */
    const check = (own, label, lying = false) => {
      const bones = own.resident.bones, mesh = meshOf(own);
      own.root.updateMatrixWorld(true);
      result.samples++;
      const up = f.set(0, 1, 0).applyQuaternion(own.root.getWorldQuaternion(q));
      const neck = bones.neck.getWorldPosition(v()), head = bones.Head.getWorldPosition(v());
      const shoulders = bones.LeftShoulder.getWorldPosition(v()).add(bones.RightShoulder.getWorldPosition(v())).multiplyScalar(0.5);
      const pitchIn = (frame, rest) => {
        const fwd = v().subVectors(bones.headfront.getWorldPosition(v()), head).applyQuaternion(frame.getWorldQuaternion(q).invert()).normalize();
        return THREE.MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, fwd.dot(rest.up))))) - rest.elevation;
      };
      const pitch = Math.max(Math.abs(pitchIn(bones.neck, restPitch.neck)), Math.abs(pitchIn(bones.Spine, restPitch.chest)));
      const drop = Math.max(neck.clone().sub(head).dot(up), shoulders.clone().sub(head).dot(up));
      result.worst.headPitch = Math.max(result.worst.headPitch, pitch);
      if (pitch > LIMITS.headPitch) fail('headPitch', `${label} ${pitch.toFixed(0)}°`);
      if (!lying) {
        result.worst.headDrop = Math.max(result.worst.headDrop, drop);
        if (drop > 0) fail('headBelow', `${label} ${(drop * 100).toFixed(1)} cm`);
      }
      for (const [name, bone] of Object.entries(bones)) {
        bone.matrixWorld.decompose(a, q, sc);
        for (const s of [sc.x, sc.y, sc.z]) {
          const rel = s / bodyScale;
          result.worst.scale[0] = Math.min(result.worst.scale[0], rel); result.worst.scale[1] = Math.max(result.worst.scale[1], rel);
          if (rel < LIMITS.scaleMin || rel > LIMITS.scaleMax) { fail('scale', `${label} ${name} ${rel.toFixed(2)}`); break; }
        }
      }
      const hips = bones.Hips.getWorldPosition(v()), radius = torsoRadius * bodyScale;
      for (const hand of ['LeftHand', 'RightHand']) {
        const depth = radius - segmentDistance(bones[hand].getWorldPosition(v()), hips, neck);
        result.worst.handDepth = Math.max(result.worst.handDepth, depth / bodyScale);
        if (depth > 0) fail('handInTorso', `${label} ${hand} ${(depth / bodyScale * 100).toFixed(1)} cm`);
      }
      // The skull's skin moves as one piece with the head joint; a face weighted to the shoulders shears away from it.
      const skeleton = mesh.skeleton, position = mesh.geometry.getAttribute('position');
      rigid.multiplyMatrices(skeleton.bones[headIndex].matrixWorld, skeleton.boneInverses[headIndex]);
      let shear = 0;
      for (const vertex of skull) {
        mesh.getVertexPosition(vertex, skinned);
        held.fromBufferAttribute(position, vertex).applyMatrix4(mesh.bindMatrix).applyMatrix4(rigid).applyMatrix4(mesh.bindMatrixInverse);
        shear = Math.max(shear, skinned.distanceTo(held));
      }
      result.worst.skullShear = Math.max(result.worst.skullShear ?? 0, shear);
      if (shear > LIMITS.skullShear) fail('skullShear', `${label} ${(shear * 100).toFixed(1)} cm`);
    };
    // Each clip alone, through its own action, at 24 points across its length.
    const mixer = motion.mixer;
    for (const [name, clip] of motion.clips) {
      for (const playing of motion.playing.values()) { playing.action.setEffectiveWeight(0); playing.action.enabled = false; }
      mixer.stopAllAction();
      const action = mixer.clipAction(clip.clip);
      action.reset(); action.enabled = true; action.setEffectiveWeight(1); action.play(); action.paused = true;
      for (let i = 0; i < 24; i++) {
        action.time = clip.clip.duration * i / 24;
        // As the controller shows a clip: the arms' clip pose given back, the clip, then hands kept out of the torso.
        for (const [joint, rest] of motion.reached) bones[joint].quaternion.copy(rest);
        motion.reached.length = 0;
        mixer.update(0);
        rig.body.position.set(0, 0, 0);
        if (name !== MOTION_CLIPS.fight.dead) motion.keepHandsOut();
        check(rig, `clip ${name} @${(i / 24).toFixed(2)}`, name === MOTION_CLIPS.fight.dead);
      }
      action.stop(); action.enabled = false;
    }
    // The controller as the game drives it (poseRig), from a fresh actor for each scenario, every sixth frame.
    const run = (label, frames, poseAt) => {
      const own = catalog.create(role, heightScale, role.startsWith('enemy:') ? 'blade' : 'none');
      place(own);
      for (let frame = 0; frame < frames; frame++) {
        const p = poseAt(frame);
        if (p.turnBy) own.root.rotation.y += p.turnBy;
        own.root.updateMatrixWorld(true);
        poseRig(own, { speed: 0, t: 0, amp: 1, ...p }, 1 / 30);
        if (frame % 6 === 5) check(own, `${label} f${frame}`);
      }
    };
    const seed = 1103;
    for (const force of ['arms crossed', 'scratch head', 'hands on hips', 'clasped', undefined])
      run(`idle ${force ?? 'routine'}`, 300, frame => ({ mode: 'idle', time: frame / 30, idle: { seed, clock: frame / 30, ...(force ? { force } : {}) } }));
    run('idle long routine', 1800, frame => ({ mode: 'idle', time: frame / 30, idle: { seed: 77, clock: frame / 30 } }));
    run('turn left', 120, frame => ({ mode: 'idle', time: frame / 30, turn: 0.05, turnBy: 0.05, idle: { seed, clock: frame / 30 } }));
    run('turn right', 120, frame => ({ mode: 'idle', time: frame / 30, turn: -0.05, turnBy: -0.05, idle: { seed, clock: frame / 30 } }));
    run('turn to face', 90, frame => ({ mode: 'talk', time: frame / 30, turn: frame < 30 ? 0.08 : 0, turnBy: frame < 30 ? 0.08 : 0, idle: { seed, clock: frame / 30 } }));
    run('talk', 400, frame => ({ mode: 'talk', time: frame / 30, idle: { seed, clock: frame / 30 } }));
    run('walk', 120, frame => ({ mode: 'walk', speed: 0.78, time: frame / 30, travel: 0.04 }));
    run('sit', 240, frame => ({ mode: frame < 10 ? 'idle' : 'sit', time: frame / 30 }));
    const work = [...motion.clips.keys()].find(name => name.startsWith('work.'));
    const gesture = work && Object.entries(MOTION_CLIPS.work).find(([, clip]) => clip === work)?.[0];
    if (gesture) run(`work ${gesture}`, 240, frame => ({ mode: 'work', workGesture: gesture, time: frame / 30 }));
    const keys = Object.keys(result.failures);
    if (keys.length) failed++;
    const w = result.worst;
    console.log(`${keys.length ? 'FAIL' : 'ok  '} ${role} (${result.id}): ${result.samples} poses; worst head ${w.headPitch.toFixed(0)}°, skull shear ${((w.skullShear ?? 0) * 100).toFixed(1)} cm (${result.skullVertices} v), drop ${(w.headDrop * 100).toFixed(1)} cm, scale ${w.scale[0].toFixed(2)}-${w.scale[1].toFixed(2)}, hand depth ${(w.handDepth * 100).toFixed(1)} cm`);
    for (const key of keys) {
      const list = result.failures[key];
      console.log(`     ${key}: ${list.length} — ${(verbose ? list : list.slice(0, 4)).join('; ')}${!verbose && list.length > 4 ? ' …' : ''}`);
    }
  }
} finally { await server.close(); }
if (jsonOut) await fs.writeFile(jsonOut, JSON.stringify(report, null, 2));
console.log(failed ? `${failed} resident(s) failed.` : 'All residents passed.');
process.exit(failed ? 1 : 0);
