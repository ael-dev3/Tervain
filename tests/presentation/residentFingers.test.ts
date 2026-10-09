import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { afterAll, describe, expect, it } from 'vitest';
import { createMeshyNpcRig, NPC_TRIANGLE_LIMIT, RESIDENT_CLOSED_HANDS, type ResidentMotionSource } from '../../src/presentation/meshynpcs';
import { poseRig, type Pose } from '../../src/presentation/characters';
import type { WorkGesture } from '../../src/presentation/npcStyle';
import { residentMotionLibrary } from '../../src/presentation/npc/residentMotion';
import { RESIDENT_JOINTS } from '../../src/presentation/npc/residentRig';
import {
  curledVertices, FINGER_JOINTS, FINGER_SIDES, FIST_CURL, fingertipVertices, GRIP_CONTACT, handleGap, planResidentFingers,
  type FingerSide, type HandCurl, type ResidentFingerPlan,
} from '../../src/presentation/npc/residentFingers';
import { loadResident, loadResidentMotion, loadResidentRigData, residentManifest, residentMesh } from './residentFixtures';

const LOG = process.env.FINGER_LOG;
const log: string[] = [];
afterAll(() => { if (LOG) writeFileSync(LOG, log.join('\n')); });

async function planOf(id: string) {
  const { source, entry } = await loadResident(id);
  const data = await loadResidentRigData(id);
  const mesh = residentMesh(source.scene);
  const position = mesh.geometry.getAttribute('position').array as Float32Array;
  return { entry, data, mesh, position, plan: planResidentFingers(data, position, mesh.geometry.index!.array, RESIDENT_CLOSED_HANDS[id]) };
}

async function residentRig(id: string, work?: WorkGesture, fighter = false) {
  const { source, entry } = await loadResident(id);
  const data = await loadResidentRigData(id);
  const library = residentMotionLibrary(await loadResidentMotion());
  const motion: ResidentMotionSource = { data, library, build: 'man', seed: 7, fighter, work };
  const tools = work === 'writing' || work === 'provisioning' || work === 'stonework' || work === 'measuring' ? work : undefined;
  const rig = createMeshyNpcRig(source, entry, 1, 'none', undefined, { work: tools }, motion);
  return { rig, entry, data, mesh: residentMesh(rig.root) };
}

const fingersOf = (mesh: THREE.SkinnedMesh) => {
  const named = new Map(mesh.skeleton.bones.map(bone => [bone.name, bone]));
  return named;
};

/** Hand triangles (all three corners carried by the hand or its fingers). */
function handTriangles(plan: ResidentFingerPlan, index: ArrayLike<number>, side: FingerSide) {
  const hand = side === 'Left' ? 11 : 15, base = 24 + FINGER_SIDES.indexOf(side) * 6;
  const carried = (v: number) => {
    let w = 0;
    for (let s = 0; s < 4; s++) { const j = plan.joints[v * 4 + s]!; if (j === hand || (j >= base && j < base + 6)) w += plan.weights[v * 4 + s]!; }
    return w > 0.5;
  };
  const out: number[] = [];
  for (let t = 0; t < index.length; t += 3) if (carried(index[t]!) && carried(index[t + 1]!) && carried(index[t + 2]!)) out.push(index[t]!, index[t + 1]!, index[t + 2]!);
  return out;
}

describe('the residents\' own fingers (A72)', () => {
  it('reweights only the hands: every vertex sums to one, the rest keep the rig\'s weights, no triangle is added', async () => {
    for (const asset of residentManifest.assets) {
      const { data, mesh, plan } = await planOf(asset.id);
      expect(mesh.geometry.index!.count / 3, asset.id).toBe(asset.triangles);
      expect(asset.triangles, asset.id).toBeLessThanOrEqual(NPC_TRIANGLE_LIMIT);
      let moved = 0;
      for (let v = 0; v < data.vertices; v++) {
        let sum = 0, finger = false;
        for (let s = 0; s < 4; s++) {
          const w = plan.weights[v * 4 + s]!;
          expect(w).toBeGreaterThanOrEqual(0);
          sum += w;
          if (w > 0 && plan.joints[v * 4 + s]! >= RESIDENT_JOINTS.length) finger = true;
          expect(plan.joints[v * 4 + s]!).toBeLessThan(RESIDENT_JOINTS.length + FINGER_JOINTS.length);
        }
        expect(Math.abs(sum - 1), `${asset.id} vertex ${v}`).toBeLessThan(1e-5);
        if (finger) { moved++; continue; }
        // A vertex no finger carries keeps exactly the rig's own influences.
        const own = new Map<number, number>(), now = new Map<number, number>();
        for (let s = 0; s < 4; s++) {
          if (data.weights[v * 4 + s]! > 0) own.set(data.joints[v * 4 + s]!, (own.get(data.joints[v * 4 + s]!) ?? 0) + data.weights[v * 4 + s]! / 255);
          if (plan.weights[v * 4 + s]! > 0) now.set(plan.joints[v * 4 + s]!, (now.get(plan.joints[v * 4 + s]!) ?? 0) + plan.weights[v * 4 + s]!);
        }
        for (const [j, w] of own) expect(Math.abs((now.get(j) ?? 0) - w), `${asset.id} vertex ${v}`).toBeLessThan(1e-5);
      }
      const active = FINGER_SIDES.filter(side => plan.hands[side].active);
      log.push(`${asset.id}: ${asset.triangles} triangles; hands with fingers ${active.join('+') || 'none'}; ${moved} vertices on finger joints; `
        + FINGER_SIDES.map(side => `${side} tips ${plan.hands[side].tips} fingers ${plan.hands[side].fingers.vertices} thumb ${plan.hands[side].thumb.vertices}`).join('; '));
      for (const side of RESIDENT_CLOSED_HANDS[asset.id] ?? []) expect(plan.hands[side].active, `${asset.id} ${side}`).toBe(false);
    }
    // Most of the residents' hands are open hands with fingers apart: they all get their chains.
    const hands = (await Promise.all(residentManifest.assets.map(a => planOf(a.id)))).flatMap(({ plan }) => FINGER_SIDES.map(side => plan.hands[side].active));
    expect(hands.filter(Boolean).length).toBeGreaterThanOrEqual(30);
  }, 300_000);

  it('adds two chains of three joints under each hand and keeps every actor within its triangle budget', async () => {
    for (const id of ['fisher', 'caravan-master', 'quarry-hand']) {
      const { rig, entry, mesh } = await residentRig(id, id === 'quarry-hand' ? 'stonework' : undefined);
      expect(mesh.skeleton.bones.map(bone => bone.name)).toEqual([...RESIDENT_JOINTS, ...FINGER_JOINTS]);
      const bones = fingersOf(mesh);
      for (const name of FINGER_JOINTS) {
        const k = Number(name.at(-1));
        expect(bones.get(name)!.parent!.name, name).toBe(k === 1 ? name.replace(/(Thumb|Fingers)\d$/, '') : name.replace(/\d$/, String(k - 1)));
      }
      expect(mesh.geometry.index!.count / 3).toBe(entry.triangles);
      expect(rig.root.userData.meshyNpc.triangles).toBeLessThanOrEqual(NPC_TRIANGLE_LIMIT);
    }
  }, 120_000);

  it('binds as modelled and curls into a fist through the real skin without tearing', async () => {
    const report: string[] = [];
    for (const asset of residentManifest.assets) {
      const { rig, mesh, data } = await residentRig(asset.id);
      const fingers = (rig.root.userData.meshyNpc.fingers ? true : false);
      expect(fingers, asset.id).toBe(true);
      const plan = rig.npc?.fingers?.plan;
      expect(plan, asset.id).toBeDefined();
      const control = rig.npc!.fingers!;
      const position = mesh.geometry.getAttribute('position');
      const skinnedAt = (curl: HandCurl) => {
        for (const side of FINGER_SIDES) control.set(side, curl);
        mesh.skeleton.pose();
        for (const side of FINGER_SIDES) control.set(side, curl);
        rig.root.updateMatrixWorld(true);
        mesh.skeleton.update();
        const out = new Float32Array(position.count * 3), v = new THREE.Vector3();
        for (let i = 0; i < position.count; i++) { v.fromBufferAttribute(position, i); mesh.applyBoneTransform(i, v); v.toArray(out, i * 3); }
        return out;
      };
      const open = skinnedAt({ fingers: 0, thumb: 0 }), first = skinnedAt({ fingers: 0.3, thumb: 0.3 }), fist = skinnedAt(FIST_CURL);
      // Open, the skin stands exactly as modelled.
      let bindError = 0;
      for (let i = 0; i < open.length; i++) bindError = Math.max(bindError, Math.abs(open[i]! - (position.array as Float32Array)[i]!));
      expect(bindError, asset.id).toBeLessThan(1e-4);
      for (const side of FINGER_SIDES) {
        const hand = plan!.hands[side];
        const tris = handTriangles(plan!, mesh.geometry.index!.array, side);
        const verts = new Set(tris);
        let moved = 0, still = 0, stretch = 1, squash = 1, worst = 0;
        const ratios: number[] = [];
        // Nothing beyond the hand moves.
        for (let i = 0; i < position.count; i++) {
          const d = Math.hypot(fist[i * 3]! - open[i * 3]!, fist[i * 3 + 1]! - open[i * 3 + 1]!, fist[i * 3 + 2]! - open[i * 3 + 2]!);
          let onFinger = false;
          for (let s = 0; s < 4; s++) if (plan!.weights[i * 4 + s]! > 0 && plan!.joints[i * 4 + s]! >= RESIDENT_JOINTS.length) onFinger = true;
          if (!onFinger) { still = Math.max(still, d); continue; }
          if (verts.has(i)) { moved = Math.max(moved, d); }
        }
        // The skin stays whole: no edge of the hand tears apart or folds to nothing.
        for (let t = 0; t < tris.length; t += 3) for (let e = 0; e < 3; e++) {
          const a = tris[t + e]!, b = tris[t + (e + 1) % 3]!;
          const before = Math.hypot(open[a * 3]! - open[b * 3]!, open[a * 3 + 1]! - open[b * 3 + 1]!, open[a * 3 + 2]! - open[b * 3 + 2]!);
          const after = Math.hypot(fist[a * 3]! - fist[b * 3]!, fist[a * 3 + 1]! - fist[b * 3 + 1]!, fist[a * 3 + 2]! - fist[b * 3 + 2]!);
          if (before < 1e-3) continue;
          stretch = Math.max(stretch, after / before); squash = Math.min(squash, after / before); ratios.push(after / before);
          worst = Math.max(worst, after - before);
        }
        expect(still, `${asset.id} ${side} beyond the fingers`).toBeLessThan(1e-6);
        if (!hand.active) { expect(moved, `${asset.id} ${side}`).toBe(0); continue; }
        // The fingers close: their tips set off towards the palm and come back towards the wrist, no further than a hand's length.
        const tips = fingertipVertices(plan!, side);
        const mean = (at: Float32Array) => tips.reduce((sum, i) => sum.add(new THREE.Vector3(at[i * 3]!, at[i * 3 + 1]!, at[i * 3 + 2]!)), new THREE.Vector3()).multiplyScalar(1 / tips.length);
        const wrist = new THREE.Vector3(...data.bones[side === 'Left' ? 11 : 15]!.position);
        const towardsPalm = mean(first).sub(mean(open)).dot(new THREE.Vector3(...hand.palm));
        const nearer = 1 - mean(fist).distanceTo(wrist) / mean(open).distanceTo(wrist);
        ratios.sort((a, b) => a - b);
        const p99 = ratios[Math.floor(ratios.length * 0.99)]!, p1 = ratios[Math.floor(ratios.length * 0.01)]!;
        report.push(`${asset.id} ${side}: tips ${(towardsPalm * 100).toFixed(1)} cm towards the palm at a third of a fist, ${(nearer * 100).toFixed(0)}% nearer the wrist in a fist, most moved ${(moved * 100).toFixed(1)} cm, hand edges ${squash.toFixed(2)}..${stretch.toFixed(2)} (98% within ${p1.toFixed(2)}..${p99.toFixed(2)}, longest gain ${(worst * 1000).toFixed(1)} mm)`);
        log.push(report.at(-1)!);
        expect(towardsPalm, `${asset.id} ${side} tips towards the palm`).toBeGreaterThan(0.005);
        expect(nearer, `${asset.id} ${side} tips nearer the wrist`).toBeGreaterThan(0.2);
        expect(moved, `${asset.id} ${side} moved`).toBeLessThan(hand.reach);
        expect(stretch, `${asset.id} ${side} stretch`).toBeLessThan(STRETCH);
        expect(p99, `${asset.id} ${side} stretch of most edges`).toBeLessThan(STRETCH_MOST);
        expect(squash, `${asset.id} ${side} squash`).toBeGreaterThan(SQUASH);
        expect(p1, `${asset.id} ${side} squash of most edges`).toBeGreaterThan(SQUASH_MOST);
      }
      // The real skin and the plan's own reckoning agree (the grips are measured with the plan).
      const sideA: FingerSide = plan!.hands.Right.active ? 'Right' : 'Left';
      const plain = curledVertices(plan!, position.array as ArrayLike<number>, sideA, FIST_CURL, fingertipVertices(plan!, sideA));
      for (const [i, p] of plain) expect(p.distanceTo(new THREE.Vector3(fist[i * 3]!, fist[i * 3 + 1]!, fist[i * 3 + 2]!)), asset.id).toBeLessThan(1e-4);
    }
  }, 600_000);

  it('closes a working hand on its tool\'s handle', async () => {
    const report: string[] = [];
    for (const [id, work] of [['quarry-hand', 'stonework'], ['rillford-reeve', 'measuring'], ['ash-recorder', 'provisioning'], ['fisher', 'stonework']] as const) {
      const { rig, mesh } = await residentRig(id, work);
      const control = rig.npc!.fingers!;
      const grips = rig.root.userData.meshyNpc.fingers.grips as Partial<Record<FingerSide, HandCurl>>;
      const props = rig.npc!.work!.props;
      // Work for a while: the hands ease onto their grips.
      const pose: Pose = { mode: 'work', speed: 0, time: 0, t: 0, amp: 1, workGesture: work };
      for (let i = 0; i < 60; i++) poseRig(rig, pose, 1 / 30);
      for (const side of FINGER_SIDES) {
        const grip = grips[side];
        if (!grip) continue;
        expect(control.curl(side).fingers, `${id} ${side}`).toBeCloseTo(grip.fingers, 2);
        // In the work clip's pose, where the fingertips and the handle are now.
        const socket = props.find(p => p.parent?.name === `${side}Hand`)!;
        const tool = socket.children[0]!;
        rig.root.updateMatrixWorld(true);
        mesh.skeleton.update();
        const origin = tool.getWorldPosition(new THREE.Vector3());
        const direction = tool.localToWorld(new THREE.Vector3(0, 1, 0)).sub(origin).normalize();
        const kind = socket.name.split(' ').at(-1)!;
        const radius = { quill: 0.0025, hammer: 0.013, chisel: 0.01, rod: 0.015, arrow: 0.0045 }[kind]!;
        const gapNow = () => {
          rig.root.updateMatrixWorld(true);
          mesh.skeleton.update();
          return handleGap(fingertipVertices(control.plan, side).map(i => mesh.localToWorld(mesh.getVertexPosition(i, new THREE.Vector3()))), { origin, direction, radius });
        };
        const gap = gapNow(), held = { ...control.curl(side) };
        control.set(side, { fingers: 0, thumb: 0 });
        const openGap = gapNow();
        control.set(side, held);
        expect(openGap, `${id} ${side} open`).toBeGreaterThan(gap);
        report.push(`${id} ${side} ${kind}: grip curl ${grip.fingers.toFixed(2)}, fingertips ${(gap * 1000).toFixed(1)} mm from the handle (open ${(openGap * 1000).toFixed(1)} mm)`);
        log.push(report.at(-1)!);
        expect(gap, `${id} ${side} ${kind} touches`).toBeLessThan(GRIP_CONTACT + 0.002);
        expect(gap, `${id} ${side} ${kind} not through`).toBeGreaterThan(-0.008);
      }
    }
  }, 300_000);
});

/**
 * A fist bends each knuckle about 1.4 radians: the skin over its back stretches and the creases inside fold with linear
 * blending, but no edge of the hand grows past five times its length or folds to nothing, and nearly all stay between
 * a third and 2.7 times.
 */
const STRETCH = 5, STRETCH_MOST = 2.7, SQUASH = 0.03, SQUASH_MOST = 0.3;
