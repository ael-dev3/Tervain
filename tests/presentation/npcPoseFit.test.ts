import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyRigAngles, idleVariant, poseRig, type IdleVariant, type Rig } from '../../src/presentation/characters';
import { createMeshyNpcRig } from '../../src/presentation/meshynpcs';
import { reachArm } from '../../src/presentation/npc/armReach';
import { GESTURE_TOLERANCE, HANG_LIMIT, measureBody, REST_ANGLES, sideExcess, SWING_LIMIT } from '../../src/presentation/npc/poseFit';
import { seatLegs } from '../../src/presentation/npc/seat';
import { createWorkProp, type WorkPropKind } from '../../src/presentation/npc/workProps';
import { BENCH_SEAT_HEIGHT } from '../../src/world/layout';
import { loadResident, residentMesh } from './residentFixtures';

const CAST = ['estate-steward', 'spring-steward', 'ash-recorder', 'quarry-hand', 'maintenance-worker'];

async function resident(id: string, options = {}) {
  const { source, entry } = await loadResident(id);
  return createMeshyNpcRig(source, entry, 1, 'none', undefined, { dualQuaternion: false, surface: false, ...options });
}

function pose(rig: Rig, changes: Record<string, number>) {
  applyRigAngles(rig, { ...REST_ANGLES, ...changes });
  rig.root.updateMatrixWorld(true);
}

describe('arm reach', () => {
  it('puts the palm on a reachable target with the elbow towards its pole', async () => {
    const rig = await resident('estate-steward');
    const mesh = residentMesh(rig.root), model = rig.hips.parent!;
    pose(rig, {});
    // The bind palm, from the same measurement the fit uses.
    const palm = new THREE.Vector3();
    const elbowBind = new THREE.Vector3();
    for (let node: THREE.Object3D | null = rig.elbowR!; node && node !== model; node = node.parent) elbowBind.add(node.position);
    let lowest = Infinity;
    const index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight'), position = mesh.geometry.getAttribute('position');
    const elbowJoint = mesh.skeleton.bones.indexOf(rig.elbowR as THREE.Bone);
    const hand: THREE.Vector3[] = [];
    for (let vertex = 0; vertex < position.count; vertex++) {
      let w = 0;
      for (let slot = 0; slot < 4; slot++) if (index.getComponent(vertex, slot) === elbowJoint) w += weight.getComponent(vertex, slot);
      if (w < 0.6) continue;
      const p = new THREE.Vector3().fromBufferAttribute(position, vertex);
      hand.push(p); lowest = Math.min(lowest, p.y);
    }
    for (const p of hand) if (p.y <= lowest + 0.085) palm.add(p);
    palm.multiplyScalar(1 / hand.filter(p => p.y <= lowest + 0.085).length); palm.y = lowest + 0.065;
    for (const target of [new THREE.Vector3(-0.2, 1.05, 0.35), new THREE.Vector3(-0.1, 1.3, 0.3), new THREE.Vector3(-0.35, 1.0, 0.1)]) {
      const solved = reachArm(rig, 1, target, new THREE.Vector3(-1, -0.4, -0.4), palm);
      expect(solved.miss).toBeLessThan(1e-3);
      pose(rig, { armRx: solved.x, armRy: solved.y, armRz: solved.z, elbowR: solved.elbow });
      const landed = palm.clone().sub(elbowBind).applyMatrix4(rig.elbowR!.matrixWorld).applyMatrix4(model.matrixWorld.clone().invert());
      expect(landed.distanceTo(target)).toBeLessThan(0.01);
      // The elbow bends forward from the hanging rest, never backwards through the joint.
      expect(solved.elbow).toBeLessThanOrEqual(0.05);
    }
  });
});

describe('poses fitted to each resident\'s body', () => {
  it('hangs the arms clear of hips and skirts, and places every touching gesture on the figure\'s own surfaces', async () => {
    for (const id of CAST) {
      const rig = await resident(id);
      const fit = rig.npc!.fit!;
      // Estate-steward's right forearm cannot ride clear over the left; that figure does not cross its arms.
      expect(fit.unplaced, id).toEqual(id === 'estate-steward' ? ['crossedR (reach 0.060 0.027)'] : []);
      for (const side of [0, 1]) {
        expect(fit.hang[side]!).toBeLessThanOrEqual(HANG_LIMIT + 1e-9);
        expect(fit.swing[side]![0]).toBeLessThanOrEqual(SWING_LIMIT + 1e-9);
      }
      expect(fit.rest.after, id).toBeLessThanOrEqual(fit.rest.before + 1e-9);
      const body = measureBody(rig, residentMesh(rig.root));
      for (const gesture of id === 'estate-steward' ? [fit.hips, fit.clasped, fit.behind] : [fit.hips, fit.clasped, fit.behind, fit.crossed]) {
        pose(rig, {
          armLx: gesture[0].x, armLy: gesture[0].y, armLz: gesture[0].z, elbowL: gesture[0].elbow,
          armRx: gesture[1].x, armRy: gesture[1].y, armRz: gesture[1].z, elbowR: gesture[1].elbow,
        });
        expect(sideExcess(body, 0, true), id).toBeLessThan(GESTURE_TOLERANCE);
        expect(sideExcess(body, 1, true), id).toBeLessThan(GESTURE_TOLERANCE);
      }
    }
  });

  it('turns the poser\'s gestures into the fitted angles, and keeps garment figures\' arms on the body', async () => {
    const rig = await resident('estate-steward');
    for (let frame = 0; frame < 120; frame++) poseRig(rig, { mode: 'idle', speed: 0, time: frame / 30, t: 0, amp: 1, idle: { seed: 1, clock: 3, force: 'hands on hips' } }, 1 / 30);
    expect(rig.cur.armLz!).toBeCloseTo(rig.npc!.fit!.hips[0].z, 2);
    expect(rig.cur.elbowR!).toBeCloseTo(rig.npc!.fit!.hips[1].elbow, 2);
    const baker = await resident('village-baker');
    expect(baker.npc!.fit!.garmentArms).toBe(true);
    // Unforced, a routine that would cross or clasp the arms looks about or shifts instead.
    for (let clock = 0; clock < 7 * 40; clock += 7) {
      for (let frame = 0; frame < 3; frame++) poseRig(baker, { mode: 'idle', speed: 0, time: clock, t: 0, amp: 1, idle: { seed: 77, clock: clock + 3 } }, 1 / 30);
      expect(Math.abs(baker.cur.armLy!)).toBeLessThan(0.05);
      expect(Math.abs(baker.cur.armRy!)).toBeLessThan(0.05);
    }
  });

  it('never chooses a gesture the fit could not place on this body, but still shows it when forced', async () => {
    const rig = await resident('estate-steward');
    let seed = 1;
    while (idleVariant(seed, 3) !== 'arms crossed') seed++;
    const settle = (force?: IdleVariant) => {
      for (let frame = 0; frame < 90; frame++) {
        poseRig(rig, { mode: 'idle', speed: 0, time: 3 + frame / 30, t: 0, amp: 1, idle: { seed, clock: 3 + frame / 30, ...(force ? { force } : {}) } }, 1 / 30);
      }
    };
    settle();
    expect(Math.abs(rig.cur.elbowR!)).toBeLessThan(0.5);
    settle('arms crossed');
    expect(rig.cur.elbowR!).toBeLessThan(-1);
  });
});

describe('fitted tool work', () => {
  it('scales the hammer stroke about the chisel contact under reduced motion instead of moving the hands elsewhere', async () => {
    const rig = await resident('quarry-hand'), reduced = await resident('quarry-hand'), still = await resident('quarry-hand');
    expect(rig.npc!.fit!.work.stonework).toBeDefined();
    let full = 0, calm = 0, held = 0;
    for (let frame = 0; frame < 3 * 60; frame++) {
      const time = frame / 60;
      for (const [figure, amp] of [[rig, 1], [reduced, 0.35], [still, 0]] as const) {
        poseRig(figure, { mode: 'work', speed: 0, time, t: 0, amp, workGesture: 'stonework' }, 1 / 60);
      }
      if (frame < 60) continue;
      const strike = rig.npc!.fit!.work.stonework!.b[1];
      const away = (figure: Rig) => Math.max(...(['armRx', 'armRy', 'armRz', 'elbowR'] as const).map(key => Math.abs(figure.cur[key]! - still.cur[key]!)));
      full = Math.max(full, away(rig));
      calm = Math.max(calm, away(reduced));
      held = Math.max(held, Math.abs(still.cur.armRx! - strike.x), Math.abs(still.cur.elbowR! - strike.elbow));
    }
    expect(full).toBeGreaterThan(0.3);
    expect(calm).toBeLessThan(full * 0.4);
    // With no motion the hands stay on the chisel, the posture both other figures return to.
    expect(held).toBeLessThan(1e-3);
  });
});

describe('sitting on a real seat', () => {
  it('rests the seat contact on the seat and finds the ground with the soles, high seat or low', () => {
    const seat = { drop: 0.1, thigh: 0.45, shin: 0.49 };
    const high = seatLegs(seat, 0.55, 1, 0.94), low = seatLegs(seat, 0.36, 1, 0.94);
    expect(high.thigh).toBeGreaterThan(-1.55); expect(high.knee).toBeCloseTo(-high.thigh, 6);
    expect(0.94 + high.lower * (0.94 / 0.95) - seat.drop).toBeCloseTo(0.55, 6);
    // On a high bench the knee drops until the vertical shin meets the ground.
    expect(0.65 - seat.thigh * Math.cos(-high.thigh) - seat.shin).toBeCloseTo(0, 3);
    expect(low.thigh).toBe(-1.55); expect(low.knee).toBeLessThan(1.55);
    const small = seatLegs(seat, 0.55, 0.9, 0.94);
    expect(0.94 + small.lower * (0.94 / 0.95)).toBeCloseTo(0.55 / 0.9 + seat.drop, 6);
  });

  it('seats a delivered resident on a 0.55 m bench: lowest seat surface on the plank, palms on the thighs', async () => {
    const rig = await resident('ash-recorder');
    for (let frame = 0; frame < 150; frame++) poseRig(rig, { mode: 'sit', speed: 0, time: frame / 30, t: 0, amp: 1, seated: true, seatHeight: BENCH_SEAT_HEIGHT }, 1 / 30);
    rig.root.updateMatrixWorld(true);
    const mesh = residentMesh(rig.root), position = mesh.geometry.getAttribute('position');
    let seatLow = Infinity;
    const point = new THREE.Vector3();
    for (let vertex = 0; vertex < position.count; vertex += 3) {
      const bindY = position.getY(vertex);
      if (bindY < 0.62 || bindY > 1.0 || Math.abs(position.getX(vertex)) > 0.25) continue;
      mesh.getVertexPosition(vertex, point); mesh.localToWorld(point);
      if (point.z > 0.12) continue;
      seatLow = Math.min(seatLow, point.y);
    }
    expect(Math.abs(seatLow - BENCH_SEAT_HEIGHT)).toBeLessThan(0.04);
    expect(rig.cur.armLy).not.toBe(0);
  });
});

describe('tools for tasks', () => {
  it('builds each tool small, from the kit\'s own materials', () => {
    for (const kind of ['ledger', 'quill', 'hammer', 'chisel', 'rod', 'arrow'] satisfies WorkPropKind[]) {
      const prop = createWorkProp(kind, 1.1);
      expect(prop.triangles, kind).toBeGreaterThan(10);
      expect(prop.triangles, kind).toBeLessThan(600);
      expect(prop.materials.length).toBeGreaterThan(0);
      prop.group.traverse(object => { if ((object as THREE.Mesh).isMesh) expect(prop.materials).toContain((object as THREE.Mesh).material); });
    }
  });

  it('gives the recorder a ledger and quill shown only while writing on a seat, within the actor budget', async () => {
    const { source, entry } = await loadResident('ash-recorder');
    const rig = createMeshyNpcRig(source, entry, 1, 'none', undefined, { work: 'writing' });
    const work = rig.npc!.work!;
    expect(work.gesture).toBe('writing');
    expect(work.props.length).toBe(2);
    expect(work.props.every(prop => !prop.visible)).toBe(true);
    expect(rig.root.userData.meshyNpc.triangles).toBeLessThanOrEqual(50_000);
    poseRig(rig, { mode: 'sit', speed: 0, time: 1, t: 0, amp: 1, seated: true, seatHeight: 0.55, workGesture: 'writing' }, 1 / 30);
    expect(work.props.every(prop => prop.visible)).toBe(true);
    poseRig(rig, { mode: 'walk', speed: 0.78, time: 0.2, t: 0, amp: 1, workGesture: 'writing' }, 1 / 30);
    expect(work.props.some(prop => prop.visible)).toBe(false);
  });
});
