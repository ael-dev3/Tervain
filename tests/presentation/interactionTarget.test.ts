import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { App } from '../../src/app';
import { Game } from '../../src/game/game';
import { cameraColliderEntry } from '../../src/presentation/cameraObstruction';
import { forestLandmarkGeometry } from '../../src/presentation/forestLandmarks';
import { chooseInteractable } from '../../src/presentation/interactionTarget';
import { buildInteractables, type Interactable } from '../../src/presentation/interactions';
import { buildScenery, type SceneryHandles } from '../../src/presentation/settlement';
import { buildStaticColliders, Colliders } from '../../src/world/colliders';
import { INSPECT_LOCATIONS } from '../../src/world/layout';
import { Terrain } from '../../src/world/terrain';

// Replace only raster materials: the actual scenery generators, geometry and colliders still run.
vi.mock('../../src/presentation/regions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/presentation/regions')>();
  class MaterialSet {
    readonly windowMat = new THREE.MeshBasicMaterial();
    readonly lanternMat = new THREE.MeshBasicMaterial();
    private readonly materials = new Map<string, THREE.Material>([['pane', this.windowMat], ['glow', this.lanternMat]]);
    get(key: string) {
      if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial());
      return this.materials.get(key)!;
    }
    dispose() { for (const material of this.materials.values()) material.dispose(); }
  }
  return { ...actual, MaterialSet };
});
const player={x:0,y:0,z:0,yaw:0};const flat={groundAt:()=>0};
function item(id:string,x:number,z:number,y=1):Interactable {return {id,pos:()=>({x,y,z}),r:3,enabled:()=>true,prompt:()=>id,act:()=>{}};}

describe('reachable visible interactions',()=>{
  it('does not offer a pickup or resident through a thin wall',()=>{
    const c=new Colliders();c.box('wall',0,1,2,0.01);
    expect(chooseInteractable([item('pickup',0,2)],player,0,flat,c)).toBeNull();
  });
  it('allows the actual operated surface while still blocking intervening obstacles',()=>{
    const c=new Colliders();c.box('archive_door',0,2,1,0.1);
    const door=item('archive_door',0,2);
    expect(chooseInteractable([door],player,0,flat,c)).toBe(door);
    c.box('fence',0,1,1,0.1);
    expect(chooseInteractable([door],player,0,flat,c)).toBeNull();
  });
  it('respects vertical reach from the lighthouse gallery',()=>{
    expect(chooseInteractable([item('npc',0,1)],{...player,y:15},0,flat,new Colliders())).toBeNull();
  });
  it('does not offer a pickup through movable cargo and offers it again after the cargo clears',()=>{
    const target=item('pickup',0,2), c=new Colliders();
    const blocked=vi.fn(()=>true);
    expect(chooseInteractable([target],player,0,flat,c,blocked)).toBeNull();
    expect(blocked).toHaveBeenCalledWith({x:0,y:1.4,z:0},{x:0,y:1,z:2});
    expect(chooseInteractable([target],player,0,flat,c,()=>false)).toBe(target);
  });
  it('sees over a low obstacle and permits camera-facing interaction when backing away',()=>{
    const c=new Colliders();c.box('low',0,1,2,0.1,0,true,{minY:0,maxY:0.6});
    const target=item('sign',0,2);
    expect(chooseInteractable([target],{...player,yaw:Math.PI},0,flat,c)).toBe(target);
  });
});

describe('authored observation approaches and finite scenery', () => {
  const terrain = new Terrain();
  let colliders: Colliders;
  let scenery: SceneryHandles;
  let observations: Interactable[];
  let sceneryShapes: Colliders['all'];

  beforeAll(() => {
    // Text drawing is outside this physical/visibility check; preserve its canvas dimensions for native planes.
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas = { width: 0, height: 0, getContext: () => context };
        const context = new Proxy<Record<string, unknown>>({
          canvas,
          measureText: (text: string) => ({ width: text.length * 7 }),
          createLinearGradient: () => ({ addColorStop() {} }),
          createRadialGradient: () => ({ addColorStop() {} }),
        }, { get: (target, key) => target[String(key)] ?? (() => {}) });
        return canvas;
      },
    });
    colliders = buildStaticColliders(terrain);
    const originalCount = colliders.all.length;
    scenery = buildScenery(terrain, colliders, 'low');
    const landmarks = forestLandmarkGeometry(terrain, colliders);
    // These batches have already supplied their collider envelopes; no render buffers are needed here.
    expect(landmarks.length).toBeGreaterThan(0);
    sceneryShapes = colliders.all.slice(originalCount);
    observations = buildInteractables({ game: new Game(), npcs: [] } as unknown as App);
  });

  afterAll(() => {
    scenery?.group.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    scenery?.dispose();
    vi.unstubAllGlobals();
  });

  it.each(['templar_waymarker', 'saltward_kit', 'wetland_fish', 'noticeboard'])('offers %s from its authored ground-level approach and still rejects an intervening wall', (id) => {
    const location = INSPECT_LOCATIONS.find((point) => point.id === id)!;
    const target = observations.find((observation) => observation.id === `inspect:${id}`)!;
    const approach = { x: location.x, z: location.z + (id === 'noticeboard' ? -1.5 : 1.5) };
    const actor = { ...approach, y: terrain.groundAt(approach.x, approach.z), yaw: id === 'noticeboard' ? 0 : Math.PI };
    expect(terrain.walkable(actor.x, actor.z), id).toBe(true);
    expect(colliders.blocked(actor.x, actor.z, 0.35), id).toBe(false);
    expect(chooseInteractable([target], actor, actor.yaw, terrain, colliders), id).toBe(target);

    const blocked = new Colliders();
    for (const shape of colliders.all) blocked.add({ ...shape });
    blocked.box('intervening-wall', actor.x, (actor.z + location.z) / 2, 0.7, 0.02, 0, true, { minY: actor.y, maxY: actor.y + 3 });
    expect(chooseInteractable([target], actor, actor.yaw, terrain, blocked), id).toBeNull();
  });

  it('keeps scene-added props finite so cameras can clear their actual tops', () => {
    expect(sceneryShapes.length).toBeGreaterThan(40);
    for (const shape of sceneryShapes) {
      expect(Number.isFinite(shape.minY), shape.id).toBe(true);
      expect(Number.isFinite(shape.maxY), shape.id).toBe(true);
      expect(shape.maxY!, shape.id).toBeGreaterThan(shape.minY!);
      const reach = (shape.kind === 'circle' ? shape.r : Math.hypot(shape.hw, shape.hd)) + 1;
      const y = shape.maxY! + 0.4;
      expect(cameraColliderEntry({ x: shape.x - reach, y, z: shape.z }, { x: shape.x + reach, y, z: shape.z }, shape, terrain.heightAt(shape.x, shape.z), 5), shape.id).toBeNull();
    }
  });

  it('separates the low kit table from its narrow upright staff and leaves unrelated low walls visible', () => {
    const table = colliders.all.find((shape) => shape.id === 'kit_table')!;
    const staff = colliders.all.find((shape) => shape.id === 'kit_staff')!;
    const ground = terrain.heightAt(15, 20.5);
    expect(table.maxY! - ground).toBeCloseTo(0.84, 5);
    expect(staff.minY! - ground).toBeCloseTo(0.75, 5);
    expect(staff.maxY! - ground).toBeCloseTo(2.05, 5);
    expect(staff.kind).toBe('circle');
    if (staff.kind === 'circle') expect(staff.r).toBeLessThan(0.05);
    expect(observations.find((target) => target.id === 'inspect:saltward_kit')!.ignoreColliders).toEqual(['kit_table']);
    expect(observations.find((target) => target.id === 'inspect:wetland_fish')!.ignoreColliders).toBeUndefined();
    expect(observations.find((target) => target.id === 'inspect:noticeboard')!.ignoreColliders).toBeUndefined();
  });
});
