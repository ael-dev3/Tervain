import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NPCS } from '../../src/content/npcs';
import { createInitialState } from '../../src/game/state';
import type { NpcId } from '../../src/game/types';
import { npcGoalPosition, resolveGoal } from '../../src/presentation/actors';
import { poseRig, type Pose, type Rig } from '../../src/presentation/characters';
import { buildHunterSupplies, disposeHunterSupplies } from '../../src/presentation/hunterSupplies';
import { createMeshyNpcRig, type ResidentMotionSource } from '../../src/presentation/meshynpcs';
import { npcStyle } from '../../src/presentation/npcStyle';
import type { ResidentBones } from '../../src/presentation/npc/residentRig';
import { MOTION_CLIPS, residentMotionLibrary } from '../../src/presentation/npc/residentMotion';
import { QUARRY_FACE_CONTACT, workSiteFor } from '../../src/presentation/npc/workSites';
import { buildScenery, type SceneryHandles } from '../../src/presentation/settlement';
import { buildStaticColliders, type Colliders } from '../../src/world/colliders';
import { ANCHORS, HUNTER_TABLE } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';
import { loadResident, loadResidentMotion, loadResidentRigData, residentManifest, residentMesh } from './residentFixtures';

/**
 * Work contacts in the live world (A70): each working resident built as the game builds them, stood at their work post
 * as the actor stands them, posed through their work clip, measured against the real counter, quarry boulder and
 * ground built by the world code.
 */
vi.mock('../../src/presentation/regions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/presentation/regions')>();
  class MaterialSet {
    readonly windowMat = new THREE.MeshBasicMaterial(); readonly lanternMat = new THREE.MeshBasicMaterial();
    readonly daylightMat = new THREE.MeshBasicMaterial();
    private readonly materials = new Map<string, THREE.Material>([['pane', this.windowMat], ['glow', this.lanternMat], ['daylight', this.daylightMat]]);
    get(key: string) { if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial()); return this.materials.get(key)!; }
    dispose() { for (const material of this.materials.values()) material.dispose(); }
  }
  return { ...actual, MaterialSet };
});

let terrain: Terrain, colliders: Colliders, scenery: SceneryHandles, station: THREE.Group;
const scenerySolids: THREE.Object3D[] = [];
beforeAll(() => {
  vi.stubGlobal('document', { createElement: () => {
    const canvas = { width: 0, height: 0, getContext: () => context };
    const context = new Proxy<Record<string, unknown>>({ canvas, measureText: (text: string) => ({ width: text.length * 7 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }) },
    { get: (target, key) => target[String(key)] ?? (() => {}) });
    return canvas;
  } });
  terrain = new Terrain(); colliders = buildStaticColliders(terrain);
  scenery = buildScenery(terrain, colliders, 'low'); station = buildHunterSupplies(terrain, colliders);
  scenery.group.updateMatrixWorld(true); station.updateMatrixWorld(true);
  scenery.group.traverse(object => { if ((object as THREE.Mesh).isMesh) scenerySolids.push(object); });
}, 60000);
afterAll(() => { scenery?.dispose(); if (station) disposeHunterSupplies(station); vi.unstubAllGlobals(); });

const STEP = 1 / 30;
/** Frames in one pass of the work clip: each pass starts where the last began, so passes compare frame by frame. */
let FRAMES = 0;

/** The resident as the game builds them (app.ts, MeshyNpcCatalog) and the actor stands them at their work post. */
async function atPost(id: NpcId) {
  const def = NPCS[id], style = npcStyle(id);
  const model = residentManifest.roles[`named:${id}`]!;
  const { source, entry } = await loadResident(model);
  const motion: ResidentMotionSource = { data: await loadResidentRigData(model), library: residentMotionLibrary(await loadResidentMotion()),
    build: style.build === 'woman' ? 'woman' : style.build === 'man' ? 'man' : 'neutral', seed: style.faceSeed, fighter: false, work: style.work };
  const height = def.look.height * (style.build === 'woman' ? 0.94 : 1);
  const work = style.work === 'writing' || style.work === 'provisioning' || style.work === 'stonework' || style.work === 'measuring' ? style.work : undefined;
  const rig = createMeshyNpcRig(source, entry, height, 'none', undefined, { work }, motion);
  const entryHour = def.schedule.find(s => s.activity === 'work')!.from + 1;
  const goal = resolveGoal(def, createInitialState(), entryHour);
  expect(goal.activity).toBe('work');
  const place = npcGoalPosition(def, goal, { terrain, colliders }, height * 1.8);
  const stance = { x: place.x, y: terrain.groundAt(place.x, place.z), z: place.z, yaw: place.yaw };
  rig.root.position.set(stance.x, stance.y, stance.z);
  rig.root.rotation.y = stance.yaw;
  rig.root.updateMatrixWorld(true);
  const site = workSiteFor(goal.anchor, stance, terrain);
  expect(site, goal.anchor).toBeDefined();
  /** Play the work clip from its start, `contact` choosing whether the real surface is handed to the pose. */
  const play = (contact: boolean, amp: number, each: (frame: number) => void) => {
    for (let frame = 0; frame < FRAMES; frame++) {
      const pose: Pose = { mode: 'work', speed: 0, time: frame * STEP, t: 0, amp, workGesture: style.work, workSite: contact ? site : undefined };
      poseRig(rig, pose, STEP);
      rig.root.updateMatrixWorld(true);
      each(frame);
    }
  };
  const resident = rig.resident as unknown as { bones: ResidentBones; clips: Map<string, { clip: THREE.AnimationClip }> };
  const bones = resident.bones;
  FRAMES = Math.round(resident.clips.get(MOTION_CLIPS.work[style.work])!.clip.duration / STEP);
  expect(Math.abs(FRAMES * STEP - resident.clips.get(MOTION_CLIPS.work[style.work])!.clip.duration)).toBeLessThan(1e-3);
  return { rig, stance, play, bones, mesh: residentMesh(rig.root) };
}

/** The vertices that follow a joint, posed (world). */
function follower(mesh: THREE.SkinnedMesh, bone: THREE.Object3D) {
  const joint = mesh.skeleton.bones.indexOf(bone as THREE.Bone);
  const index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
  const vertices: number[] = [];
  for (let v = 0; v < index.count; v++) {
    let w = 0;
    for (let s = 0; s < 4; s++) if (index.getComponent(v, s) === joint) w += weight.getComponent(v, s);
    if (w >= 0.6) vertices.push(v);
  }
  return () => {
    mesh.skeleton.update();
    return vertices.map(v => mesh.localToWorld(mesh.getVertexPosition(v, new THREE.Vector3())));
  };
}

const toolEnd = (rig: Rig, kind: string, x: number, y: number, z: number) =>
  rig.npc!.work!.props.find(p => p.name.endsWith(kind))!.children[0]!.localToWorld(new THREE.Vector3(x, y, z));
const local = (rig: Rig, v: THREE.Vector3) => rig.root.worldToLocal(v.clone());
const fmt = (v: number) => `${(v * 100).toFixed(1)} cm`;

describe('resident work contacts at their real posts (A70)', () => {
  it('the supplier rests both palms on the real counter top', async () => {
    const { rig, play, bones, mesh } = await atPost('trail_hunter');
    const hands = [follower(mesh, bones.LeftHand), follower(mesh, bones.RightHand)];
    const forearms = [follower(mesh, bones.LeftForeArm), follower(mesh, bones.RightForeArm)];
    const top = station.position.y, toTable = station.matrixWorld.clone().invert();
    // Where the clip itself holds each hand down (within its lift-off), from the clip played without the counter.
    const clipWrist: number[][] = [[], []];
    const sample = () => hands.map(h => {
      const points = h(), low = Math.min(...points.map(p => p.y));
      const centre = points.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / points.length).applyMatrix4(toTable);
      return { gap: low - top, over: Math.abs(centre.x) <= HUNTER_TABLE.width / 2 && Math.abs(centre.z) <= HUNTER_TABLE.depth / 2 };
    });
    const before: { gap: number; over: boolean }[][] = [];
    play(false, 1, () => {
      before.push(sample());
      [bones.LeftHand, bones.RightHand].forEach((b, side) => clipWrist[side]!.push(local(rig, b.getWorldPosition(new THREE.Vector3())).y));
    });
    const onCounter = clipWrist.map(ys => { const rest = Math.min(...ys); return ys.map(y => y - rest < 0.2); });
    /** The deepest any forearm reaches below the top while over the counter's footprint. */
    const forearmSink = () => Math.min(0, ...forearms.flatMap(f => f().map(p => {
      const t = p.clone().applyMatrix4(toTable);
      return Math.abs(t.x) <= HUNTER_TABLE.width / 2 && Math.abs(t.z) <= HUNTER_TABLE.depth / 2 && t.y > -HUNTER_TABLE.topThickness - 0.2 ? t.y : 0;
    })));
    for (const amp of [1, 0.4]) {
      const after: { gap: number; over: boolean }[][] = [];
      let sink = 0;
      play(true, amp, () => { after.push(sample()); sink = Math.min(sink, forearmSink()); });
      expect(sink, 'forearm into the counter').toBeGreaterThan(-0.01);
      for (const side of [0, 1]) {
        const frames = after.map((f, i) => ({ ...f[side]!, i })).filter(f => f.i >= 15 && onCounter[side]![f.i]);
        expect(frames.length, `side ${side}`).toBeGreaterThan(FRAMES * 0.4);
        const gaps = frames.map(f => f.gap), was = before.filter((_, i) => i >= 15 && onCounter[side]![i]).map(f => f[side]!.gap);
        console.log(`counter amp ${amp} hand ${side}: before ${fmt(Math.min(...was))}..${fmt(Math.max(...was))} (over top ${was.length ? before.filter((_, i) => onCounter[side]![i]).every(f => f[side]!.over) : false}), after ${fmt(Math.min(...gaps))}..${fmt(Math.max(...gaps))}`);
        expect(frames.every(f => f.over), `side ${side} over the counter`).toBe(true);
        expect(Math.min(...gaps), `side ${side} into the counter`).toBeGreaterThan(-0.01);
        expect(Math.max(...gaps), `side ${side} off the counter`).toBeLessThan(0.02);
        // Nothing of either hand ever sinks into the top, lifted or not.
        expect(Math.min(...after.filter(f => f[side]!.over).map(f => f[side]!.gap))).toBeGreaterThan(-0.01);
      }
    }
  }, 120000);

  it('the quarry hand holds the chisel\'s edge to the real boulder face and strikes its end where the clip\'s blow lands', async () => {
    const { rig, play, stance, bones, mesh } = await atPost('quarry_hand');
    // The face the post stands before is the boulder's, as built: a ray from the post at chest height meets it at the
    // plane recorded for the work site.
    const forward = new THREE.Vector3(Math.sin(stance.yaw), 0, Math.cos(stance.yaw));
    const ray = new THREE.Raycaster();
    ray.set(new THREE.Vector3(stance.x, stance.y + QUARRY_FACE_CONTACT.height, stance.z), forward); ray.far = 2;
    const hit = ray.intersectObjects(scenerySolids, false)[0]!;
    expect(hit, 'boulder face before the post').toBeDefined();
    const normal = new THREE.Vector3(...QUARRY_FACE_CONTACT.normal);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(QUARRY_FACE_CONTACT.x, stance.y + QUARRY_FACE_CONTACT.height, QUARRY_FACE_CONTACT.z));
    expect(Math.abs(plane.distanceToPoint(hit.point))).toBeLessThan(0.01);
    expect(hit.face!.normal.clone().transformDirection(hit.object.matrixWorld).dot(normal)).toBeGreaterThan(0.99);

    const hand = [follower(mesh, bones.LeftHand), follower(mesh, bones.RightHand)];
    const measure = () => {
      const tip = toolEnd(rig, 'chisel', 0, 0.17, 0), butt = toolEnd(rig, 'chisel', 0, -0.06, 0);
      // The edge's distance to the real rock along the chisel (negative inside it).
      ray.set(butt, tip.clone().sub(butt).normalize()); ray.far = 2;
      const rock = ray.intersectObjects(scenerySolids, false)[0];
      const edge = rock ? rock.distance - tip.distanceTo(butt) : Infinity;
      const strike = Math.min(...[0.065, -0.065].map(x => toolEnd(rig, 'hammer', x, 0.27, 0).distanceTo(butt)));
      const sunk = Math.min(...hand.flatMap(h => h().map(p => plane.distanceToPoint(p))));
      return { edge, strike, sunk, reach: local(rig, tip).z };
    };
    const before: ReturnType<typeof measure>[] = [];
    play(false, 1, () => before.push(measure()));
    const held = Math.max(...before.map(b => b.reach));
    const holding = before.map(b => held - b.reach < 0.1);
    const clipBlow = before.reduce((best, b, i) => holding[i] && b.strike < before[best]!.strike ? i : best, before.findIndex((_, i) => holding[i]));
    const swings: number[] = [];
    for (const amp of [1, 0.4]) {
      const after: ReturnType<typeof measure>[] = [];
      play(true, amp, () => after.push(measure()));
      const edges = after.filter((_, i) => i >= 15 && holding[i]).map(a => a.edge);
      const was = before.filter((_, i) => i >= 15 && holding[i]).map(b => b.edge);
      expect(edges.length).toBeGreaterThan(FRAMES * 0.3);
      const blow = after.reduce((best, a, i) => a.strike < after[best]!.strike ? i : best, 0);
      console.log(`quarry amp ${amp}: chisel edge to face before ${was.every(Number.isFinite) ? `${fmt(Math.min(...was))}..${fmt(Math.max(...was))}` : 'no rock along the chisel'}, after ${fmt(Math.min(...edges))}..${fmt(Math.max(...edges))};`
        + ` hammer to chisel end before ${fmt(before[clipBlow]!.strike)} at frame ${clipBlow}, after ${fmt(after[blow]!.strike)} at frame ${blow}; hands into rock ${fmt(Math.min(...after.map(a => a.sunk)))}`);
      expect(Math.min(...edges), 'chisel into the rock').toBeGreaterThan(-0.01);
      expect(Math.max(...edges), 'chisel off the rock').toBeLessThan(0.02);
      // The blow lands where the clip's own blow does, the hammer's face on the chisel's end.
      expect(after[blow]!.strike).toBeLessThan(0.025);
      expect(Math.abs(blow - clipBlow)).toBeLessThanOrEqual(1);
      expect(Math.min(...after.map(a => a.sunk)), 'hands into the rock').toBeGreaterThan(-0.01);
      swings.push(Math.max(...after.filter((_, i) => holding[i]).map(a => a.strike)));
    }
    // Reduced motion: the same blow, a shorter swing about it.
    expect(swings[1]!).toBeLessThan(swings[0]! * 0.6);
  }, 120000);

  it('the steward stands the measuring rod on the real ground', async () => {
    const { rig, play } = await atPost('spring_steward');
    const measure = () => {
      const foot = toolEnd(rig, 'rod', 0, -0.95, 0), grip = toolEnd(rig, 'rod', 0, 0, 0);
      return { gap: foot.y - terrain.groundAt(foot.x, foot.z), upright: (grip.y - foot.y) / grip.distanceTo(foot) };
    };
    const before: ReturnType<typeof measure>[] = [];
    play(false, 1, () => before.push(measure()));
    const standing = before.map(b => b.upright > 0.7);
    for (const amp of [1, 0.4]) {
      const after: ReturnType<typeof measure>[] = [];
      play(true, amp, () => after.push(measure()));
      const gaps = after.filter((_, i) => i >= 15 && standing[i]).map(a => a.gap), was = before.filter((_, i) => i >= 15 && standing[i]).map(b => b.gap);
      expect(gaps.length).toBeGreaterThan(FRAMES * 0.5);
      console.log(`rod amp ${amp}: foot to ground before ${fmt(Math.min(...was))}..${fmt(Math.max(...was))}, after ${fmt(Math.min(...gaps))}..${fmt(Math.max(...gaps))}`);
      expect(Math.min(...gaps)).toBeGreaterThan(-0.01);
      expect(Math.max(...gaps)).toBeLessThan(0.02);
    }
  }, 120000);

  it('gives a work site only where a resident works against something', () => {
    const at = { x: 0, y: 0, z: 0, yaw: 0 };
    expect(workSiteFor('village_square', at, terrain)).toBeUndefined();
    const post = ANCHORS.hunter_station!, y = terrain.groundAt(post.x, post.z);
    const counter = workSiteFor('hunter_station', { ...post, y }, terrain);
    // The supplier stands at the counter's end, facing along it: its top before him at about chest height.
    expect(counter).toMatchObject({ kind: 'counter' });
    if (counter?.kind === 'counter') {
      expect(counter.top).toBeCloseTo(station.position.y - y, 6);
      expect(counter.z0).toBeGreaterThan(0.3); expect(counter.z0).toBeLessThan(0.5);
      expect(counter.x0).toBeLessThan(-0.5); expect(counter.x1).toBeGreaterThan(0.5);
    }
  });
});
