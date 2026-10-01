import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { NPC_LIST } from '../../src/content/npcs';
import { createBanditRig, createNpcRig, createPlayerRig, IDLE_VARIANTS, idleVariant, personBuildOptions, poseRig, setArmed, type Rig } from '../../src/presentation/characters';
import { makeFaceShape, unwarpV, warpV } from '../../src/presentation/human/headShape';
import { clothPixels, facePixels, type FacePaint } from '../../src/presentation/human/humanTex';
import { BONES } from '../../src/presentation/human/skin';
import { BLADE, FISTS } from '../../src/presentation/player';
// These tests check people's geometry, projection and paint logic, not texture resolution: paint small sheets inline.
personBuildOptions.sheetSize = 256;


const skinned = (rig: Rig) => {
  const out: THREE.SkinnedMesh[] = [];
  rig.root.traverse((o) => {
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) out.push(o as THREE.SkinnedMesh);
  });
  return out;
};

describe('people are skinned, dressed and armed as the story needs', () => {
  it('builds every named person as one painted, skinned mesh on one eleven-bone skeleton with finite, normalised skin weights', () => {
    for (const def of NPC_LIST) {
      const rig = createNpcRig(def);
      const meshes = skinned(rig);
      // Body, costume and head in one mesh with one sheet (only the player adds a sash).
      expect(meshes.length, def.id).toBe(1);
      expect(rig.person?.mesh, def.id).toBe(meshes[0]);
      expect(rig.person!.source, def.id).toBe('painted');
      expect(rig.person!.mesh.visible, def.id).toBe(true);
      expect(rig.person!.id).toBe(def.id);
      const skeleton = meshes[0]!.skeleton;
      expect(skeleton.bones.map((b) => b.name)).toEqual([...BONES]);
      for (const m of meshes) {
        expect(m.skeleton).toBe(skeleton);
        const pos = m.geometry.attributes.position as THREE.BufferAttribute;
        const wt = m.geometry.attributes.skinWeight as THREE.BufferAttribute;
        const ix = m.geometry.attributes.skinIndex as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          expect(Number.isFinite(pos.getX(i) + pos.getY(i) + pos.getZ(i)), `${def.id} position`).toBe(true);
          const sum = wt.getX(i) + wt.getY(i) + wt.getZ(i) + wt.getW(i);
          expect(Math.abs(sum - 1), `${def.id} weights`).toBeLessThan(1e-4);
          expect(Math.max(ix.getX(i), ix.getY(i), ix.getZ(i), ix.getW(i))).toBeLessThan(BONES.length);
        }
      }
    }
  });

  it('stands on the ground and is the height its look asks for, with a head about an eighth of it', () => {
    personBuildOptions.keepSheetData = true;
    let rig: Rig;
    try {
      rig = createPlayerRig();
    } finally {
      personBuildOptions.keepSheetData = false;
    }
    const job = rig.person!.sheetData.job!;
    const parts = rig.person!.parts;
    let lo = Infinity;
    let hi = -Infinity;
    let faceLo = Infinity;
    for (let i = 0; i < job.pos.length / 3; i++) {
      const y = job.pos[i * 3 + 1]!;
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
      if (parts[job.part[i]!]!.surface === 'face') faceLo = Math.min(faceLo, y);
    }
    expect(lo).toBeGreaterThan(-0.005);
    expect(lo).toBeLessThan(0.03);
    // A man of height 1 is about 1.8 m to the top of his hair.
    expect(hi).toBeGreaterThan(1.76);
    expect(hi).toBeLessThan(1.86);
    const head = hi - faceLo;
    expect(head / hi).toBeGreaterThan(1 / 9);
    expect(head / hi).toBeLessThan(1 / 7);
  });

  it('the wanderer starts with nothing in hand and nothing at the hip; a found blade can be sheathed and drawn', () => {
    const rig = createPlayerRig();
    expect(rig.grip).toBe('none');
    expect(rig.shield).toBeNull();
    expect(rig.weapon?.visible).toBe(false);
    expect(rig.scabbard?.visible).toBe(false);
    setArmed(rig, 'sheathed');
    expect(rig.scabbard!.visible).toBe(true);
    expect(rig.sheathed!.visible).toBe(true);
    expect(rig.weapon!.visible).toBe(false);
    expect(rig.grip).toBe('none');
    setArmed(rig, 'drawn');
    expect(rig.weapon!.visible).toBe(true);
    expect(rig.sheathed!.visible).toBe(false);
    expect(rig.grip).toBe('blade');
  });

  it('toll-jumpers come armed; the warden wears his blade sheathed', () => {
    expect(createBanditRig(0).grip).toBe('blade');
    expect(createBanditRig(1).grip).toBe('blade');
    const warden = createNpcRig(NPC_LIST.find((d) => d.id === 'shrine_warden')!);
    expect(warden.grip).toBe('none');
    expect(warden.sheathed?.visible).toBe(true);
  });

  it('poses move the bones without breaking the skeleton', () => {
    const rig = createPlayerRig();
    for (const mode of ['walk', 'attack_light', 'attack_heavy', 'block', 'sit', 'dead'] as const) {
      for (let i = 0; i < 30; i++) poseRig(rig, { mode, speed: 1, time: i / 30, t: 0.5, amp: 1 }, 1 / 30);
      rig.root.updateMatrixWorld(true);
      for (const b of [rig.hips, rig.armR, rig.elbowR!, rig.kneeL!]) {
        const e = b.matrixWorld.elements;
        expect(e.every((v) => Number.isFinite(v)), mode).toBe(true);
      }
    }
  });

  it('gives residents a steady idle routine: one variant per turn, all of them in time, never a broken pose', () => {
    expect(idleVariant(2207, 3)).toBe(idleVariant(2207, 3));
    // Within one turn the variant holds; across turns every variant comes up, rest the most often.
    expect(idleVariant(2207, 7.1)).toBe(idleVariant(2207, 13.9));
    const counts = new Map<string, number>();
    for (let turn = 0; turn < 400; turn++) {
      const v = idleVariant(4409, turn * 7 + 1);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([...IDLE_VARIANTS].sort());
    expect(Math.max(...counts.values())).toBe(counts.get('rest'));
    // Two residents are not in step.
    let same = 0;
    for (let turn = 0; turn < 50; turn++) if (idleVariant(1103, turn * 7) === idleVariant(6619, turn * 7)) same++;
    expect(same).toBeLessThan(30);
    const rig = createNpcRig(NPC_LIST[0]!);
    for (const v of IDLE_VARIANTS) {
      for (let i = 0; i < 40; i++) poseRig(rig, { mode: 'idle', speed: 0, time: i / 30, t: 0, amp: 1, idle: { seed: 1, clock: i / 30, force: v } }, 1 / 30);
      rig.root.updateMatrixWorld(true);
      for (const b of [rig.armL, rig.armR, rig.elbowL!, rig.head, rig.kneeL!]) expect(b.matrixWorld.elements.every((x) => Number.isFinite(x)), v).toBe(true);
    }
  });

  it('fists are quicker, shorter and weaker than a blade, and only a blade parries', () => {
    expect(FISTS.light).toBeLessThan(BLADE.light);
    expect(FISTS.heavy).toBeLessThan(BLADE.heavy);
    expect(FISTS.range.light).toBeLessThan(BLADE.range.light);
    expect(FISTS.dur.light).toBeLessThan(BLADE.dur.light);
    expect(FISTS.guard.fresh).toBeGreaterThan(BLADE.guard.fresh);
    expect(FISTS.guard.perfect).not.toBe('parry');
    expect(BLADE.guard.perfect).toBe('parry');
  });
});

describe('painted faces and cloth', () => {
  const shape = makeFaceShape(4127, 'man', 0.3);
  const paint: FacePaint = { skin: [0.42, 0.27, 0.19], hair: [0.05, 0.03, 0.02], stubble: 0.5, age: 0.3, scalp: 'full', beard: 'short', fine: false, weather: 0.5, seed: 4127 };
  const n = 128;
  const px = facePixels(shape, paint, n);
  const lum = (uvY: number, u = 0.5) => {
    const j = Math.min(n - 1, Math.floor(uvY * n));
    const i = Math.min(n - 1, Math.floor(u * n));
    const o = (j * n + i) * 4;
    return px[o]! + px[o + 1]! + px[o + 2]!;
  };

  it('paints the same face every time', () => {
    expect(facePixels(shape, paint, n)).toEqual(px);
  });

  it('lands the painted features on the sculpted ones: hair on the scalp, a beard on the chin, a dark line at the mouth', () => {
    const forehead = lum(unwarpV(shape.browY + 0.2));
    expect(lum(unwarpV(0.92))).toBeLessThan(forehead * 0.5);
    expect(lum(unwarpV(-0.85))).toBeLessThan(forehead * 0.75);
    // On a clean-shaven face the line between the lips is darker than the skin above them.
    const bare = facePixels(shape, { ...paint, beard: 'none', stubble: 0 }, n);
    const at = (uvY: number) => {
      const o = (Math.floor(uvY * n) * n + n / 2) * 4;
      return bare[o]! + bare[o + 1]! + bare[o + 2]!;
    };
    expect(at(unwarpV(shape.mouthY))).toBeLessThan(at(unwarpV(shape.mouthY + 0.1)));
  });

  it('keeps the head parameterisation invertible', () => {
    for (let v = 0; v <= 1; v += 0.05) expect(unwarpV(warpV(v))).toBeCloseTo(v, 5);
  });

  it('makes detail maps that keep a garment near its colour', () => {
    for (const kind of ['linen', 'wool', 'leather', 'padded', 'felt'] as const) {
      const d = clothPixels(kind, 32, 7);
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += d[i]!;
      const mean = sum / (d.length / 4) / 255;
      expect(mean, kind).toBeGreaterThan(0.7);
      expect(mean, kind).toBeLessThan(0.95);
    }
  });
});
