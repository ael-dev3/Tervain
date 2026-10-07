import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { applyRigAngles } from '../../src/presentation/characters';
import { createMeshyNpcRig, NPC_ARM_GARMENTS } from '../../src/presentation/meshynpcs';
import { NPC_SKIN_REPAIR_PROFILE, npcSkinInspection } from '../../src/presentation/npc/skinRepair';
import { loadResident, residentMesh } from './residentFixtures';

const OFF = { dualQuaternion: false, skinRepair: false, jointFit: false, poseFit: false, surface: false } as const;
const REPAIR = { dualQuaternion: false, skinRepair: true, jointFit: true, poseFit: false, surface: false } as const;

function share(mesh: THREE.SkinnedMesh, vertex: number, names: readonly string[]) {
  const index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
  const bones = mesh.skeleton.bones.map(bone => bone.name);
  let total = 0;
  for (let slot = 0; slot < 4; slot++) if (names.includes(bones[index.getComponent(vertex, slot)]!)) total += weight.getComponent(vertex, slot);
  return total;
}

/** Worst edge stretch (posed / bind, either way) over the triangles a test selects, by linear skinning on the CPU. */
function stretch(rig: ReturnType<typeof createMeshyNpcRig>, pose: Record<string, number>, keep: (centre: THREE.Vector3) => boolean) {
  const mesh = residentMesh(rig.root);
  applyRigAngles(rig, { ...Object.fromEntries(Object.keys(rig.cur).map(key => [key, 0])), ...pose });
  rig.root.updateMatrixWorld(true);
  const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.index!;
  const bind = (i: number) => new THREE.Vector3().fromBufferAttribute(position, i);
  const posed = (i: number) => mesh.applyBoneTransform(i, bind(i));
  const values: number[] = [];
  for (let t = 0; t < index.count; t += 3) {
    const ids = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
    const centre = bind(ids[0]!).add(bind(ids[1]!)).add(bind(ids[2]!)).multiplyScalar(1 / 3);
    if (!keep(centre)) continue;
    let worst = 1;
    for (let k = 0; k < 3; k++) {
      const a = ids[k]!, b = ids[(k + 1) % 3]!;
      const before = bind(a).distanceTo(bind(b)), after = posed(a).distanceTo(posed(b));
      if (before > 1e-5) worst = Math.max(worst, after / before, before / Math.max(after, 1e-6));
    }
    values.push(worst);
  }
  values.sort((p, q) => p - q);
  return values[Math.floor(values.length * 0.95)]!;
}

describe('resident skin repair', () => {
  it('keeps four normalised influences, leaves the template alone and records its work', async () => {
    const { source, entry } = await loadResident('caravan-master');
    const template = residentMesh(source.scene).geometry.getAttribute('skinWeight').array.slice();
    const rig = createMeshyNpcRig(source, entry, 1, 'none', undefined, REPAIR);
    const mesh = residentMesh(rig.root);
    const weight = mesh.geometry.getAttribute('skinWeight');
    for (let vertex = 0; vertex < weight.count; vertex++) {
      expect(Math.abs(weight.getX(vertex) + weight.getY(vertex) + weight.getZ(vertex) + weight.getW(vertex) - 1)).toBeLessThan(1e-5);
    }
    expect(residentMesh(source.scene).geometry.getAttribute('skinWeight').array).toEqual(template);
    const report = mesh.geometry.userData.npcSkinRepair;
    expect(report.profile).toBe(NPC_SKIN_REPAIR_PROFILE);
    expect(report.shoulderBlended).toBeGreaterThan(300);
    // The cape the source gave to the arms is handed back to the body.
    expect(report.sleeveReleased).toBeGreaterThan(1500);
    expect('caravan-master' in NPC_ARM_GARMENTS).toBe(true);
    expect(npcSkinInspection(mesh.geometry)!.release.length).toBe(weight.count);
  });

  it('blends the shoulder seam: no hard cut between torso and arm survives near the joint', async () => {
    const { source, entry } = await loadResident('estate-steward');
    const count = (options: typeof OFF | typeof REPAIR) => {
      const mesh = residentMesh(createMeshyNpcRig(source, entry, 1, 'none', undefined, options).root);
      const position = mesh.geometry.getAttribute('position');
      let mixed = 0;
      for (let vertex = 0; vertex < position.count; vertex++) {
        const p = new THREE.Vector3().fromBufferAttribute(position, vertex);
        if (Math.hypot(Math.abs(p.x) - 0.215, p.y - 1.404, p.z) > 0.1) continue;
        const arm = share(mesh, vertex, ['armL', 'elbowL', 'armR', 'elbowR']);
        if (arm > 0.05 && arm < 0.95) mixed++;
      }
      return mixed;
    };
    expect(count(OFF)).toBe(0);
    expect(count(REPAIR)).toBeGreaterThan(200);
  });

  it('makes the thigh\'s share fade out by 0.96 m as the zone field intends, not stop at 0.90 m', async () => {
    const { source, entry } = await loadResident('quarry-foreman');
    for (const [options, expected] of [[OFF, false], [REPAIR, true]] as const) {
      const mesh = residentMesh(createMeshyNpcRig(source, entry, 1, 'none', undefined, options).root);
      const position = mesh.geometry.getAttribute('position');
      let carried = 0, seen = 0;
      for (let vertex = 0; vertex < position.count; vertex++) {
        const y = position.getY(vertex);
        if (y < 0.905 || y > 0.94 || share(mesh, vertex, ['armL', 'elbowL', 'armR', 'elbowR']) > 0.5) continue;
        seen++;
        if (share(mesh, vertex, ['legL', 'legR']) > 0.01) carried++;
      }
      expect(seen).toBeGreaterThan(50);
      expect(carried > seen * 0.9).toBe(expected);
    }
  });

  it('lets a long skirt share both legs, so a stride no longer tears it down the middle', async () => {
    const { source, entry } = await loadResident('spring-steward');
    const stride = { legL: 0.43, legR: -0.43, kneeL: 0.3, kneeR: 0.1 };
    const middle = (c: THREE.Vector3) => Math.abs(c.x) < 0.07 && c.y > 0.25 && c.y < 0.7;
    const before = stretch(createMeshyNpcRig(source, entry, 1, 'none', undefined, OFF), stride, middle);
    const after = stretch(createMeshyNpcRig(source, entry, 1, 'none', undefined, REPAIR), stride, middle);
    expect(after).toBeLessThan(before * 0.75);
  });

  it('keeps separate trouser legs on their own legs and leaves Mara\'s measured skirt fit to itself', async () => {
    const { source, entry } = await loadResident('fisher');
    const mesh = residentMesh(createMeshyNpcRig(source, entry, 1, 'none', undefined, REPAIR).root);
    const position = mesh.geometry.getAttribute('position');
    let own = 0, legs = 0;
    for (let vertex = 0; vertex < position.count; vertex++) {
      const x = position.getX(vertex), y = position.getY(vertex);
      if (Math.abs(x) < 0.09 || y < 0.3 || y > 0.55) continue;
      const total = share(mesh, vertex, ['legL', 'kneeL', 'legR', 'kneeR']);
      if (total < 0.9) continue;
      legs++;
      if (share(mesh, vertex, x > 0 ? ['legL', 'kneeL'] : ['legR', 'kneeR']) / total > 0.9) own++;
    }
    expect(legs).toBeGreaterThan(200);
    expect(own / legs).toBeGreaterThan(0.9);
    const mara = await loadResident('rillford-reeve');
    const reeve = residentMesh(createMeshyNpcRig(mara.source, mara.entry, 1, 'none', undefined, REPAIR).root);
    expect(reeve.geometry.userData.npcSkinRepair.legShared).toBe(0);
    expect(reeve.geometry.userData.npcGarment.profile).toBe('mara-long-skirt-v1');
  });
});
