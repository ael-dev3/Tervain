#!/usr/bin/env node
/**
 * Moves Meshy's automatic rig onto a resident's own prepared model, as a skin file beside it.
 *
 * Meshy's rigging service returns the resident's mesh with a 24-joint humanoid skeleton and new skin weights. Its copy
 * is centred on its footprint and scaled to exactly the height it was asked for (feet on the floor), and it may weld
 * vertices that share or nearly share a place (UV seams) or drop a few loose fragments. So the weights are carried over
 * by position: the copy is moved and scaled back onto the prepared model, and each vertex of the prepared GLB takes the
 * weights of the rigged vertex at the same place, or of the nearest rigged surface where a seam was welded or a
 * fragment dropped. The prepared GLB itself is not changed.
 *
 *   node tools/meshy-rig/extract-rig.mjs <id> <rigged.glb> <rig-task.json> <parts.json>   writes public/models/npcs/rigs/<id>.json
 *
 * parts.json is the model's skin as the game repairs it (eleven joints; garments released from the arms, skirts shared
 * between the legs), exported from the resident lab with `lab.load(role, { authoredMotion: false })` then `lab.parts()`.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decompose, readGlb, skinJoints } from './glb.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NPCS = path.join(ROOT, 'public/models/npcs');
export const RIG_PROFILE = 'meshy-auto-rig-v1';
/** The 24 joints of Meshy's humanoid rig, in the order the skin files store them. */
export const MESHY_JOINTS = [
  'Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'head_end', 'headfront',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
];
/** A prepared vertex this close to a rigged one (once moved back) is the same point, or a welded seam; metres. */
const MATCH = 0.003;

/**
 * Which body part each vertex belongs to comes from the game's repaired eleven-joint skin of the prepared model, whose
 * arm, leg and body membership was fixed in the original pose (A55) and whose garments hang from the body (A63); how it
 * bends within that part comes from Meshy. The automatic rigger
 * weighs by nearness, so where a hand hangs beside a thigh some fingers would follow the leg (and tear as it swings),
 * the inside of a sleeve could catch the ribs, a pouch could follow the hand. Each part keeps to its own joints.
 */
export const PART_JOINTS = {
  hips: ['Hips', 'Spine02', 'Spine01', 'LeftUpLeg', 'RightUpLeg'],
  // The upper arms are not the torso's: the shoulder blend comes through each vertex's own arm share.
  torso: ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'LeftShoulder', 'RightShoulder'],
  head: ['Spine', 'neck', 'Head', 'head_end', 'headfront'],
  armL: ['Spine01', 'Spine', 'LeftShoulder', 'LeftArm', 'LeftForeArm'],
  elbowL: ['LeftArm', 'LeftForeArm', 'LeftHand'],
  armR: ['Spine01', 'Spine', 'RightShoulder', 'RightArm', 'RightForeArm'],
  elbowR: ['RightArm', 'RightForeArm', 'RightHand'],
  legL: ['Hips', 'Spine02', 'LeftUpLeg', 'LeftLeg', 'RightUpLeg'],
  kneeL: ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightLeg'],
  legR: ['Hips', 'Spine02', 'RightUpLeg', 'RightLeg', 'LeftUpLeg'],
  kneeR: ['RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase', 'LeftLeg'],
};
/** How far to look for a vertex of the same part with usable weights, when Meshy gave a vertex none in its part. */
const BORROW = 0.08;
/**
 * Garments that hang beside the arms rather than wrapping them (the caravan master's cape, the baker's apron panels)
 * follow the body: surface given to an arm is released to the shoulders, spine and hips as it lies farther from the
 * arm's bone line than this (metres), gradually over 4 cm either side so a lifted arm stretches the garment instead of
 * folding it. Sleeves, cuffs and pauldrons lie within it and keep to the arm.
 */
export const GARMENT_RELEASE = { 'caravan-master': 0.065, 'village-baker': 0.1 };
PART_JOINTS.garment = ['Hips', 'Spine02', 'Spine01', 'Spine', 'LeftShoulder', 'RightShoulder'];
/** Farthest the nearest rigged surface may be for a vertex whose own was dropped (a loose fragment), metres. */
const SURFACE = 0.03;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function extractRig(id, riggedFile, taskFile, partsFile) {
  const file = path.join(NPCS, `${id}.glb`);
  const prepared = readGlb(file), rigged = readGlb(riggedFile);
  const task = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
  const primitiveOf = (glb) => {
    const mesh = glb.json.nodes.find((node) => node.skin !== undefined && node.mesh !== undefined);
    const primitives = glb.json.meshes[mesh.mesh].primitives;
    if (primitives.length !== 1) throw new Error(`${id}: expected one skinned primitive, found ${primitives.length}`);
    return primitives[0];
  };
  const mine = primitiveOf(prepared), theirs = primitiveOf(rigged);
  const position = prepared.accessor(mine.attributes.POSITION).array, source = rigged.accessor(theirs.attributes.POSITION).array;
  // The rigged copy is centred on its footprint at exactly the requested height: move it (and later its joints) back.
  const bounds = (glb, primitive) => glb.json.accessors[primitive.attributes.POSITION];
  const a = bounds(prepared, mine), b = bounds(rigged, theirs);
  const scale = (a.max[1] - a.min[1]) / (b.max[1] - b.min[1]);
  if (Math.abs(scale - 1) > 0.01) throw new Error(`${id}: the rigged copy's height differs by more than 1%`);
  const centre = (box) => [(box.min[0] + box.max[0]) / 2, box.min[1], (box.min[2] + box.max[2]) / 2];
  const from = centre(b), to = centre(a);
  const back = (x, y, z) => [(x - from[0]) * scale + to[0], (y - from[1]) * scale + to[1], (z - from[2]) * scale + to[2]];
  for (let i = 0; i < source.length; i += 3) [source[i], source[i + 1], source[i + 2]] = back(source[i], source[i + 1], source[i + 2]);
  const joints = rigged.accessor(theirs.attributes.JOINTS_0).array, weights = rigged.accessor(theirs.attributes.WEIGHTS_0).array;
  const rigJoints = skinJoints(rigged);
  const order = rigJoints.map((joint) => MESHY_JOINTS.indexOf(joint.name));
  if (order.some((index) => index < 0) || rigJoints.length !== MESHY_JOINTS.length) {
    throw new Error(`${id}: unexpected rig joints ${rigJoints.map((joint) => joint.name).join(',')}`);
  }
  // A hash grid over the rigged vertices for nearest lookups.
  const cell = 0.004, grid = new Map(), key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  for (let i = 0; i < source.length / 3; i++) {
    const k = key(source[i * 3], source[i * 3 + 1], source[i * 3 + 2]);
    let list = grid.get(k);
    if (!list) grid.set(k, (list = []));
    list.push(i);
  }
  const count = position.length / 3;
  const outJoints = new Uint8Array(count * 4), outWeights = new Uint8Array(count * 4);
  let exact = 0, nearby = 0, surface = 0, worst = 0, borrowed = 0, fallback = 0, reassigned = 0, shared = 0;
  const nearestOf = new Int32Array(count);
  for (let v = 0; v < count; v++) {
    const x = position[v * 3], y = position[v * 3 + 1], z = position[v * 3 + 2];
    let best = -1, bestDistance = Infinity;
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    // Search outward ring by ring until the nearest found is certainly the nearest.
    for (let ring = 1; ring * cell <= SURFACE + cell && bestDistance > (ring - 1) * cell; ring++) {
      for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++) for (let dz = -ring; dz <= ring; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== ring && ring > 1) continue;
        for (const i of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
          const d = Math.hypot(source[i * 3] - x, source[i * 3 + 1] - y, source[i * 3 + 2] - z);
          if (d < bestDistance) { bestDistance = d; best = i; }
        }
      }
    }
    if (best < 0 || bestDistance > SURFACE) throw new Error(`${id}: vertex ${v} has no rigged surface within ${SURFACE} m (nearest ${bestDistance})`);
    if (bestDistance < 1e-6) exact++; else if (bestDistance <= MATCH) nearby++; else surface++;
    worst = Math.max(worst, bestDistance);
    nearestOf[v] = best;
  }
  // The repaired skin's part weights, by part name.
  const partsRecord = JSON.parse(fs.readFileSync(partsFile, 'utf8'));
  if (partsRecord.vertices !== count) throw new Error(`${id}: the part map covers ${partsRecord.vertices} vertices, the model has ${count}`);
  const partNames = partsRecord.names;
  const oldJ = Buffer.from(partsRecord.joints, 'base64'), oldW = Float32Array.from(Buffer.from(partsRecord.weights, 'base64'), (b) => b / 255);
  /**
   * Meshy's weights at a vertex within one part's joints, normalized: how the vertex bends within that part. Null when
   * Meshy gave that part nothing here (the part then borrows from its neighbours, below).
   */
  const within = (v, part) => {
    const allowed = PART_JOINTS[part];
    const out = new Map();
    let total = 0;
    for (let s = 0; s < 4; s++) {
      const joint = MESHY_JOINTS[order[joints[nearestOf[v] * 4 + s]]], weight = weights[nearestOf[v] * 4 + s];
      if (weight < 1e-5 || !allowed.includes(joint)) continue;
      out.set(joint, (out.get(joint) ?? 0) + weight);
      total += weight;
    }
    if (total < 0.02) return null;
    for (const [joint, weight] of out) out.set(joint, weight / total);
    return out;
  };
  const bindOf = new Map(rigJoints.map((joint) => [joint.name, back(joint.bind[12], joint.bind[13], joint.bind[14])]));
  const segment = (p, a, b) => {
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const t = Math.max(0, Math.min(1, (ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2]) / ((ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2) || 1)));
    return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
  };
  const armReach = (v, side) => {
    const p = [position[v * 3], position[v * 3 + 1], position[v * 3 + 2]];
    const arm = bindOf.get(`${side}Arm`), fore = bindOf.get(`${side}ForeArm`), hand = bindOf.get(`${side}Hand`);
    // The hand reaches 20 cm and more past the wrist joint to the fingertips.
    const along = hand.map((x, i) => x - fore[i]), length = Math.hypot(...along);
    const tip = hand.map((x, i) => x + (along[i] / length) * 0.22);
    return Math.min(segment(p, arm, fore), segment(p, fore, hand), segment(p, hand, tip));
  };
  const release = GARMENT_RELEASE[id];
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let released = 0;
  const shareList = new Array(count);
  for (let v = 0; v < count; v++) {
    const shares = new Map();
    for (let s = 0; s < 4; s++) if (oldW[v * 4 + s] > 1e-5) shares.set(partNames[oldJ[v * 4 + s]], (shares.get(partNames[oldJ[v * 4 + s]]) ?? 0) + oldW[v * 4 + s]);
    if (release) {
      let moved = 0;
      for (const [part, side] of [['armL', 'Left'], ['elbowL', 'Left'], ['armR', 'Right'], ['elbowR', 'Right']]) {
        const share = shares.get(part);
        if (!share) continue;
        const r = smooth(release - 0.04, release + 0.04, armReach(v, side));
        if (r <= 0) continue;
        shares.set(part, share * (1 - r));
        moved += share * r;
      }
      if (moved > 0) { shares.set('garment', (shares.get('garment') ?? 0) + moved); if (moved > 0.5) released++; }
    }
    shareList[v] = shares;
  }
  const sharesOf = (v) => shareList[v];
  const dominant = new Array(count);
  for (let v = 0; v < count; v++) {
    let best = '', bestWeight = -1;
    for (const [part, share] of sharesOf(v)) if (share > bestWeight) { bestWeight = share; best = part; }
    dominant[v] = best;
  }
  // A grid over the prepared vertices, to borrow a part's bending from the nearest vertex that has it.
  const near = new Map(), nkey = (x, y, z) => `${Math.floor(x / 0.02)},${Math.floor(y / 0.02)},${Math.floor(z / 0.02)}`;
  for (let v = 0; v < count; v++) {
    const k = nkey(position[v * 3], position[v * 3 + 1], position[v * 3 + 2]);
    let list = near.get(k);
    if (!list) near.set(k, (list = []));
    list.push(v);
  }
  const borrow = (v, part) => {
    const x = position[v * 3], y = position[v * 3 + 1], z = position[v * 3 + 2];
    const cx = Math.floor(x / 0.02), cy = Math.floor(y / 0.02), cz = Math.floor(z / 0.02), reach = Math.ceil(BORROW / 0.02);
    let best = null, bestDistance = Infinity;
    for (let dx = -reach; dx <= reach; dx++) for (let dy = -reach; dy <= reach; dy++) for (let dz = -reach; dz <= reach; dz++) {
      for (const u of near.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
        if (u === v) continue;
        const d = Math.hypot(position[u * 3] - x, position[u * 3 + 1] - y, position[u * 3 + 2] - z);
        if (d >= bestDistance || d > BORROW) continue;
        const w = within(u, part);
        if (w) { bestDistance = d; best = w; }
      }
    }
    return best;
  };
  // The bind position of each joint, for the last resort: the nearest bones of the part.
  const bindAt = new Map(rigJoints.map((joint) => [joint.name, back(joint.bind[12], joint.bind[13], joint.bind[14])]));
  const CHILD = { Hips: 'Spine02', Spine02: 'Spine01', Spine01: 'Spine', Spine: 'neck', neck: 'Head', Head: 'head_end',
    LeftShoulder: 'LeftArm', LeftArm: 'LeftForeArm', LeftForeArm: 'LeftHand', RightShoulder: 'RightArm', RightArm: 'RightForeArm', RightForeArm: 'RightHand',
    LeftUpLeg: 'LeftLeg', LeftLeg: 'LeftFoot', LeftFoot: 'LeftToeBase', RightUpLeg: 'RightLeg', RightLeg: 'RightFoot', RightFoot: 'RightToeBase' };
  /** The last resort: the part's two nearest bones, blended by inverse distance so neighbouring vertices agree. */
  const nearestBone = (v, part) => {
    const p = [position[v * 3], position[v * 3 + 1], position[v * 3 + 2]];
    const ranked = PART_JOINTS[part].map((joint) => {
      const a = bindAt.get(joint), b = CHILD[joint] ? bindAt.get(CHILD[joint]) : a;
      return { joint, d: Math.max(0.01, segment(p, a, b)) };
    }).sort((x, y) => x.d - y.d).slice(0, 2);
    const total = ranked.reduce((sum, r) => sum + 1 / r.d, 0);
    return new Map(ranked.map((r) => [r.joint, 1 / r.d / total]));
  };
  for (let v = 0; v < count; v++) {
    // Each part contributes exactly its share, bent as Meshy bends that part here: a cape's edge that the repaired skin
    // gives a fifth to the forearm follows the hand by a fifth, however much Meshy gave the hand.
    let combined = new Map();
    for (const [part, share] of sharesOf(v)) {
      let w = within(v, part);
      if (!w) { w = borrow(v, part); if (w) borrowed++; }
      if (!w) { w = nearestBone(v, part); fallback++; }
      for (const [joint, weight] of w) combined.set(joint, (combined.get(joint) ?? 0) + weight * share);
    }
    combined = new Map(combined);
    // Cloth the repaired skin shares between the legs (skirts, aprons, coat tails) keeps that sharing: the automatic
    // rigger gives each panel to the nearer leg, which swings it out with every stride.
    const shares = sharesOf(v);
    const legLeft = (shares.get('legL') ?? 0) + (shares.get('kneeL') ?? 0), legRight = (shares.get('legR') ?? 0) + (shares.get('kneeR') ?? 0);
    if (legLeft + legRight > 0.2 && Math.min(legLeft, legRight) / (legLeft + legRight) > 0.1) {
      const toLeft = legLeft / (legLeft + legRight);
      for (const [l, r] of [['LeftUpLeg', 'RightUpLeg'], ['LeftLeg', 'RightLeg'], ['LeftFoot', 'RightFoot'], ['LeftToeBase', 'RightToeBase']]) {
        const both = (combined.get(l) ?? 0) + (combined.get(r) ?? 0);
        if (both < 1e-6) continue;
        combined.set(l, both * toLeft); combined.set(r, both * (1 - toLeft));
      }
      shared++;
    }
    // Drop what Meshy gave outside the vertex's parts, keep the four strongest, quantize to bytes summing to 255.
    let dropped = 0;
    for (let s = 0; s < 4; s++) {
      const joint = MESHY_JOINTS[order[joints[nearestOf[v] * 4 + s]]];
      if (weights[nearestOf[v] * 4 + s] > 0.05 && !combined.has(joint)) dropped++;
    }
    if (dropped) reassigned++;
    const slots = [...combined].map(([joint, weight]) => ({ joint: MESHY_JOINTS.indexOf(joint), weight }))
      .sort((a, b) => b.weight - a.weight).slice(0, 4);
    const total = slots.reduce((sum, slot) => sum + slot.weight, 0);
    let left = 255;
    slots.forEach((slot, s) => {
      const quantized = s === slots.length - 1 ? left : Math.min(left, Math.round((slot.weight / total) * 255));
      left -= quantized;
      outJoints[v * 4 + s] = slot.joint;
      outWeights[v * 4 + s] = quantized;
    });
  }
  // Bind transforms in the model's metres (the rig's armature scale removed), in the stored joint order.
  const bones = MESHY_JOINTS.map((name) => {
    const joint = rigJoints.find((candidate) => candidate.name === name);
    const { position: at, quaternion } = decompose(joint.bind);
    const parent = joint.parent < 0 ? -1 : MESHY_JOINTS.indexOf(rigJoints[joint.parent].name);
    return { name, parent, position: back(...at).map((v) => Math.round(v * 1e6) / 1e6), quaternion: quaternion.map((v) => Math.round(v * 1e7) / 1e7) };
  });
  const record = {
    schema: 1, profile: RIG_PROFILE,
    model: { file: `${id}.glb`, sha256: sha256(prepared.bytes), vertices: count },
    meshy: { rigTask: task.id, created: new Date(task.created_at).toISOString().slice(0, 10), riggedSha256: sha256(rigged.bytes), riggedVertices: source.length / 3 },
    transfer: { scale: Math.round(scale * 1e7) / 1e7, offset: from.map((v, i) => Math.round((to[i] - v) * 1e7) / 1e7), exact, welded: nearby, surface, maxDistance: Math.round(worst * 1e7) / 1e7 },
    parts: { profile: 'repaired-skin-parts-v1', sha256: sha256(fs.readFileSync(partsFile)), reassigned, borrowed, fallback, legsShared: shared,
      garmentRelease: release ?? null, garmentReleased: released },
    bones,
    skin: { joints: Buffer.from(outJoints).toString('base64'), weights: Buffer.from(outWeights).toString('base64') },
  };
  fs.mkdirSync(path.join(NPCS, 'rigs'), { recursive: true });
  fs.writeFileSync(path.join(NPCS, 'rigs', `${id}.json`), `${JSON.stringify(record)}\n`);
  return record;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [id, rigged, task, parts] = process.argv.slice(2);
  const record = extractRig(id, rigged, task, parts);
  const t = record.transfer;
  console.log(`${id}: ${record.model.vertices} vertices (${t.exact} exact, ${t.welded} welded, ${t.surface} from the nearest surface; worst ${t.maxDistance} m); parts: ${record.parts.reassigned} kept to their part, ${record.parts.borrowed} borrowed, ${record.parts.fallback} fallback, ${record.parts.legsShared} shared between the legs, ${record.parts.garmentReleased} released to the body`);
}
