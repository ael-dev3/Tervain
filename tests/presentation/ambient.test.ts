import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { createGltfLoader } from '../../src/presentation/assets/gltfLoader';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../../src/platform/settings';
import { buildAmbient } from '../../src/presentation/ambient';
import { poseRig, type Rig } from '../../src/presentation/characters';
import type { BuildContext, FrameContext } from '../../src/presentation/context';
import { createMeshyNpcRig, type MeshyNpcManifest } from '../../src/presentation/meshynpcs';
import { Colliders } from '../../src/world/colliders';
import { ANCHORS, BENCH_SEAT_HEIGHT } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';

// Capture the actual controller-to-poser boundary while retaining the real bone
// poser. Source geometry/weights/textures are covered by meshynpcs.test.ts.
vi.mock('../../src/presentation/characters', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/presentation/characters')>();
  return { ...actual, poseRig: vi.fn(actual.poseRig) };
});

function rig(scale: number): Rig {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const hips = new THREE.Bone(), torso = new THREE.Bone(), head = new THREE.Bone();
  const armL = new THREE.Bone(), armR = new THREE.Bone(), elbowL = new THREE.Bone(), elbowR = new THREE.Bone();
  const legL = new THREE.Bone(), legR = new THREE.Bone(), kneeL = new THREE.Bone(), kneeR = new THREE.Bone();
  body.add(hips); hips.add(torso, legL, legR); torso.add(head, armL, armR);
  armL.add(elbowL); armR.add(elbowR); legL.add(kneeL); legR.add(kneeR);
  const cur = Object.fromEntries(['legL', 'legR', 'armLx', 'armLy', 'armLz', 'armRx', 'armRy', 'armRz',
    'torsoX', 'torsoZ', 'headX', 'headY', 'lower', 'bodyX', 'bodyY', 'kneeL', 'kneeR', 'elbowL', 'elbowR'].map(key => [key, 0]));
  return { root, body, hips, torso, head, armL, armR, elbowL, elbowR, legL, legR, kneeL, kneeR,
    weapon: null, shield: null, scabbard: null, sheathed: null, sash: null, grip: 'none', height: 1.8 * scale,
    hipY: .95 * scale, cur, materials: [], hitFlash: 0, kind: 'humanoid' };
}

/** Lowest posed point of the seat (bind 0.62–1.0 m about the centre line, behind the hip joint), in world metres. */
function seatContact(resident: Rig) {
  const mesh = resident.body.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh;
  const position = mesh.geometry.getAttribute('position'), point = new THREE.Vector3();
  let lowest = Infinity;
  for (let vertex = 0; vertex < position.count; vertex += 3) {
    const y = position.getY(vertex);
    if (y < .62 || y > 1 || Math.abs(position.getX(vertex)) > .25) continue;
    mesh.localToWorld(mesh.getVertexPosition(vertex, point));
    if (resident.root.worldToLocal(point.clone()).z > 0) continue;
    lowest = Math.min(lowest, point.y);
  }
  return lowest;
}

function setup(terrain = { groundAt: () => 2.75, heightAt: () => -5 } as unknown as Terrain) {
  const rigs = new Map<string, Rig>(), colliders = new Colliders();
  const ambient = buildAmbient({ terrain, colliders, settings: defaultSettings(),
    npcAssets: { has: () => true, create: (role: string, scale: number) => { const resident = rig(scale); rigs.set(role, resident); return resident; } },
  } as unknown as BuildContext);
  const frame = { time: 0, nightness: 0, reducedMotion: false, wildlifeActive: true } as FrameContext;
  const tick = (dt = 1 / 60) => { frame.time += dt; ambient.update(dt, frame); };
  const poses = (role: string) => vi.mocked(poseRig).mock.calls.filter(([resident]) => resident === rigs.get(role));
  return { ambient, rigs, colliders, frame, tick, poses };
}

beforeEach(() => vi.clearAllMocks());

describe('ambient hamlet residents', () => {
  it('starts in its authored activity on real support with finite contacts and a seated hearth resident centered on the bench', () => {
    const s = setup(new Terrain());
    expect(s.ambient.counts.people).toBe(3);
    expect(s.poses('ambient:fisher')[0]![1].mode).toBe('work');
    expect(s.poses('ambient:keeper')[0]![1].mode).toBe('idle');
    const seated = s.rigs.get('ambient:fireside')!, fire = ANCHORS.strand_fire!;
    expect(seated.root.position.x).toBeCloseTo(fire.x + 1.6);
    expect(seated.root.position.z).toBeCloseTo(fire.z + 1);
    expect(seated.root.rotation.y).toBeCloseTo(.4 + Math.PI);
    expect(seated.cur.legL).toBeLessThan(-1.54);
    expect(seated.cur.kneeR).toBeGreaterThan(1.49);
    for (const resident of s.rigs.values()) {
      const { x, z } = resident.root.position;
      expect(resident.root.position.y).toBeCloseTo(new Terrain().groundAt(x, z));
      const contact = s.colliders.all.find(c => c.x === x && c.z === z)!;
      expect(Number.isFinite(contact.minY)).toBe(true); expect(Number.isFinite(contact.maxY)).toBe(true);
      expect(contact.maxY! - contact.minY!).toBeGreaterThan(1);
      expect(contact.maxY! - contact.minY!).toBeLessThan(2.2);
      expect(s.colliders.blocked(x, z, .2, { minY: contact.minY! + .1, maxY: contact.maxY! - .1 })).toBe(true);
      expect(s.colliders.blocked(x, z, .2, { minY: contact.maxY! + .1, maxY: contact.maxY! + .5 })).toBe(false);
    }
  });

  it('keeps its activity and pose clocks frozen during pause, then resumes without inheriting a scene-time jump', () => {
    const s = setup(), fisher = s.rigs.get('ambient:fisher')!;
    s.tick(.1);
    const before = { ...fisher.cur }, phase = s.poses('ambient:fisher').at(-1)![1].time, count = vi.mocked(poseRig).mock.calls.length;
    s.frame.wildlifeActive = false; s.frame.time = 12345;
    for (let i = 0; i < 20; i++) s.tick(.25);
    expect(fisher.cur).toEqual(before); expect(vi.mocked(poseRig).mock.calls).toHaveLength(count);
    expect(s.colliders.all.every(c => c.active)).toBe(true);
    s.frame.wildlifeActive = true; s.tick(1 / 60);
    const pose = s.poses('ambient:fisher').at(-1)![1];
    expect(pose.time - phase).toBeCloseTo(1 / 60, 10); expect(pose.mode).toBe('work');
    expect(pose.idle!.clock).toBe(pose.time);
  });

  it('holds its seated lower body through conversation and back, instead of standing for every gesture', () => {
    const s = setup(), seated = s.rigs.get('ambient:fireside')!, hips = seated.hips.position.y;
    const modes = new Set<string>();
    for (let frame = 0; frame < 12 * 60; frame++) {
      s.tick();
      const pose = s.poses('ambient:fireside').at(-1)![1];
      modes.add(pose.mode); expect(pose.seated).toBe(true);
      expect(Math.abs(seated.hips.position.y - hips)).toBeLessThan(.0001);
      expect(seated.legL.rotation.x).toBeLessThan(-1.54);
      expect(seated.kneeR!.rotation.x).toBeGreaterThan(1.49);
    }
    expect([...modes].sort()).toEqual(['sit', 'talk']);
  });

  it('keeps the actual delivered fireside skeleton supported at bench height throughout seated speech', async () => {
    const manifest = JSON.parse(readFileSync(new URL('../../public/models/npcs/manifest.json', import.meta.url), 'utf8')) as MeshyNpcManifest;
    const entry = manifest.assets.find(asset => asset.id === 'fireside')!;
    const bytes = readFileSync(new URL(`../../public/models/npcs/${entry.file}`, import.meta.url));
    const loader = createGltfLoader();
    // Browser texture decoding alone is replaced. The delivered geometry,
    // inverse binds, skin weights and joint hierarchy remain byte-exact.
    loader.register(() => ({ name: 'TERVAIN_AMBIENT_CPU_TEXTURES', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
    // WebP colour maps load through EXT_texture_webp, which would decode in a browser: give those empty textures too.
    loader.register(() => ({ name: 'EXT_texture_webp', loadTexture: () => Promise.resolve(new THREE.Texture()) }));
    const source = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '');
    const fireside = createMeshyNpcRig(source, entry, .94), colliders = new Colliders();
    const terrain = new Terrain();
    const ambient = buildAmbient({ terrain, colliders, settings: defaultSettings(),
      npcAssets: { has: () => true, create: (role: string, scale: number) => role === 'ambient:fireside' ? fireside : rig(scale) },
    } as unknown as BuildContext);
    fireside.root.updateMatrixWorld(true);
    const hipY = fireside.hips.getWorldPosition(new THREE.Vector3()).y;
    const ground = fireside.root.position.y;
    // The seat rests on the hearth bench's plank, not sunk into it or hovering above it. (In front of the hip, the long
    // skirt's back panel drapes a few centimetres into the plank's front edge; there is no cloth collision.)
    expect(Math.abs(seatContact(fireside) - ground - BENCH_SEAT_HEIGHT)).toBeLessThan(.04);
    let talkFrames = 0;
    for (let frame = 0; frame < 12 * 30; frame++) {
      ambient.update(1 / 30, { time: frame / 30, nightness: 0, reducedMotion: false, wildlifeActive: true } as FrameContext);
      const pose = vi.mocked(poseRig).mock.calls.filter(([resident]) => resident === fireside).at(-1)![1];
      if (pose.mode !== 'talk') continue;
      talkFrames++;
      fireside.root.updateMatrixWorld(true);
      expect(Math.abs(fireside.hips.getWorldPosition(new THREE.Vector3()).y - hipY)).toBeLessThan(.001);
      expect(fireside.root.position.y).toBe(ground);
    }
    expect(talkFrames).toBeGreaterThan(90);
    expect(fireside.root.userData.meshyNpc.modelTriangles).toBe(entry.triangles);
  });

  it('retains the same activity cadence and nearly identical relaxed poses at 30, 60 and 120 Hz', () => {
    const results = [30, 60, 120].map(hz => {
      const s = setup();
      for (let frame = 0; frame < 8 * hz; frame++) s.tick(1 / hz);
      return [...s.rigs.keys()].map(role => ({ pose: s.poses(role).at(-1)![1], bones: { ...s.rigs.get(role)!.cur } }));
    });
    for (let actor = 0; actor < 3; actor++) {
      for (const result of results) {
        expect(result[actor]!.pose.mode).toBe(results[0]![actor]!.pose.mode);
        expect(result[actor]!.pose.time).toBeCloseTo(results[0]![actor]!.pose.time, 9);
        for (const [key, value] of Object.entries(result[actor]!.bones)) {
          expect(Number.isFinite(value)).toBe(true);
          expect(Math.abs(value - results[1]![actor]!.bones[key]!)).toBeLessThan(.025);
        }
      }
    }
  });

  it('bounds a suspended-tab catchup and ignores invalid frame deltas, preserving continuous gesture phase', () => {
    const s = setup(), before = s.poses('ambient:fisher').at(-1)![1].time;
    vi.mocked(poseRig).mockClear(); s.tick(30);
    expect(s.poses('ambient:fisher').at(-1)![1].time - before).toBeCloseTo(.25, 10);
    expect(vi.mocked(poseRig).mock.calls.every(([, , dt]) => dt > 0 && dt <= 1 / 30)).toBe(true);
    const count = vi.mocked(poseRig).mock.calls.length;
    for (const dt of [NaN, Infinity, -1, 0]) s.ambient.update(dt, s.frame);
    expect(vi.mocked(poseRig).mock.calls).toHaveLength(count);
    expect([...s.rigs.values()].every(resident => Object.values(resident.cur).every(Number.isFinite))).toBe(true);
  });

  it('keeps sleeping residents and their contacts inactive together, leaving the keeper present', () => {
    const s = setup(); s.frame.nightness = .9; s.tick();
    expect(s.rigs.get('ambient:fisher')!.root.visible).toBe(false);
    expect(s.rigs.get('ambient:fireside')!.root.visible).toBe(false);
    expect(s.rigs.get('ambient:keeper')!.root.visible).toBe(true);
    expect(s.colliders.all.map(c => c.active)).toEqual([false, false, true]);
    s.frame.nightness = .3; s.tick();
    expect([...s.rigs.values()].every(resident => resident.root.visible)).toBe(true);
    expect(s.colliders.all.every(c => c.active)).toBe(true);
  });
});
