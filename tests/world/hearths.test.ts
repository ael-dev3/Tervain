import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { InteriorLight, interiorFlicker } from '../../src/presentation/interiorLight';
import { hearthFires } from '../../src/presentation/hearthFire';
import { signSway } from '../../src/presentation/innSign';
import { clutterGeometry } from '../../src/presentation/clutter';
import { reserved } from '../../src/world/furniture';
import { FURNITURE_SIZES } from '../../src/world/furnitureSizes';
import { DRESSING, MODEL_SCALE } from '../../src/world/dressing';
import { BREAST_DEPTH, CHIMNEY_STACK, chimneyOf, doorwayClear, FIREPLACE, fromBuildingLocal, HEARTH_SHAPE, hearthOf, INTERIORS, roomHalfSize, roomLocator, sideWindowZ } from '../../src/world/interiors';

const houses = INTERIORS.filter((room) => room.building.kind === 'house');
const hearths = INTERIORS.filter((room) => hearthOf(room));
const overlaps = (a: { x0: number; x1: number; z0: number; z1: number }, b: typeof a) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

describe('hearths against the walls (A135)', () => {
  it('builds every hearth out of a wall: its breast stands on the wall\'s inner face, the stack\'s centre in the wall', () => {
    expect(hearths.length).toBeGreaterThanOrEqual(10);
    for (const room of hearths) {
      const h = hearthOf(room)!, { hw, hd } = roomHalfSize(room), b = room.building, id = b.id;
      const onWall = { back: h.breast.z0 === -hd, left: h.breast.x0 === -hw, right: h.breast.x1 === hw }[h.wall];
      expect(onWall, id).toBe(true);
      const depth = h.wall === 'back' ? h.breast.z1 - h.breast.z0 : h.breast.x1 - h.breast.x0;
      expect(depth, id).toBeCloseTo(BREAST_DEPTH, 6);
      // The stack's centre lies between the inner and outer faces of the wall, so the chimney rises on the wall line.
      const across = h.wall === 'back' ? -h.stack.z : Math.abs(h.stack.x), inner = h.wall === 'back' ? hd : hw, outer = h.wall === 'back' ? b.d / 2 : b.w / 2;
      expect(across, id).toBeGreaterThan(inner);
      expect(across, id).toBeLessThan(outer);
      // The fire faces into the room, away from its wall.
      const out = h.before(1);
      expect(Math.abs(out.x) < hw && Math.abs(out.z) < hd, id).toBe(true);
    }
  });

  it('puts the chimney outside on the same centre as the hearth inside', () => {
    for (const room of hearths) expect(chimneyOf(room.building), room.building.id).toEqual(hearthOf(room)!.stack);
  });

  it('gives each house its own hearth wall or place, clear of the doorway and the windows', () => {
    const where = houses.map((room) => { const h = hearthOf(room)!; return `${h.wall}:${h.stack.x.toFixed(1)}:${h.stack.z.toFixed(1)}`; });
    expect(new Set(where).size).toBe(houses.length);
    for (const room of hearths) {
      const h = hearthOf(room)!, id = room.building.id;
      const hearthAndSlab = h.footprint(FIREPLACE.halfWidth + 0.17, HEARTH_SHAPE.slab - CHIMNEY_STACK);
      expect(overlaps(hearthAndSlab, doorwayClear(room)), id).toBe(false);
      // The breast rises to the ceiling: it may not cover a window.
      if (h.wall === 'back') for (const w of reserved(room).windows) expect(overlaps(h.breast, w), id).toBe(false);
      else {
        // A side window wherever the random sequence puts it (within a fifth of the depth of the middle) is moved clear
        // of the chimney on that side, inside and out (the widest chimney is 0.95 m).
        const side = h.wall === 'right' ? 'east' : 'west';
        for (let raw = -0.2 * room.building.d; raw <= 0.2 * room.building.d; raw += 0.05) {
          const z = sideWindowZ(room, side, raw);
          expect(z - 0.36, id).toBeGreaterThan(h.stack.z + 0.95 / 2);
          expect(z + 0.36, id).toBeLessThan(roomHalfSize(room).hd);
        }
      }
    }
  });

  it('lights each room from its fire, flickering within about 15 %, and burns a fire in each hearth', () => {
    const rooms = roomLocator(() => 0);
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t < 60; t += 0.01) { const f = interiorFlicker(t); lo = Math.min(lo, f); hi = Math.max(hi, f); }
    expect(lo).toBeGreaterThan(0.84);
    expect(hi).toBeLessThan(1.16);
    expect(hi - lo).toBeGreaterThan(0.2);
    const fires = hearthFires(rooms);
    expect(fires.length).toBe(hearths.filter((room) => room.building.kind !== 'bakery').length);
    for (const fire of fires) {
      expect(rooms.at(fire.x, fire.z), fire.room.building.id).toBe(fire.room);
      // The room's light hangs just before its fire and stays put (a shadow map never chases it).
      const light = new InteriorLight(rooms), glow = light.glowOf(fire.room);
      expect(Math.hypot(glow.x - fire.x, glow.z - fire.z), fire.room.building.id).toBeLessThan(0.9);
      const p = fromBuildingLocal(fire.room.building, fire.room.door.x, 0);
      for (let i = 0; i < 20; i++) light.update(1 / 30, new THREE.Vector3(p.x, 1.6, p.z), 0, i / 30);
      expect(light.light.position.equals(glow)).toBe(true);
      expect(light.light.intensity).toBeGreaterThan(0);
    }
  });
});

describe('things at their real size (A135)', () => {
  it('draws clay jars, pots and jugs at believable heights', () => {
    const height = (g: THREE.BufferGeometry) => { g.computeBoundingBox(); return g.boundingBox!.max.y - g.boundingBox!.min.y; };
    expect(height(clutterGeometry('jar'))).toBeGreaterThan(0.25);
    expect(height(clutterGeometry('jar'))).toBeLessThan(0.4);
    // The modelled pots and jugs, as drawn, stay under 30 cm (they were 42 and 30).
    expect(FURNITURE_SIZES.pots[1] * MODEL_SCALE.pots!).toBeLessThan(0.3);
    expect(FURNITURE_SIZES.jug[1] * MODEL_SCALE.jug!).toBeLessThan(0.22);
    for (const d of DRESSING.filter((x) => x.piece === 'small')) {
      const tall = height(clutterGeometry(d.kind!)) * (d.scale ?? 1);
      expect(tall, `${d.room.building.id} ${d.kind}`).toBeLessThan(0.42);
    }
  });

  it('crowds every house with small things on shelves, the mantel and the floor', () => {
    for (const room of houses) {
      const mine = DRESSING.filter((d) => d.room === room);
      expect(mine.filter((d) => d.piece === 'small').length, room.building.id).toBeGreaterThanOrEqual(10);
      expect(mine.some((d) => d.piece === 'cauldron'), room.building.id).toBe(true);
    }
  });
});

describe('a fuller room and a swinging sign (A136)', () => {
  it('hangs pans, tools and onions in every house, and stacks wood by most fires', () => {
    for (const room of houses) {
      const mine = DRESSING.filter((d) => d.room === room);
      expect(mine.filter((d) => d.piece === 'hung').length, room.building.id).toBeGreaterThanOrEqual(4);
      for (const d of mine.filter((x) => x.piece === 'hung')) {
        // Each hangs from below the ceiling and clears the floor (the longest, an axe, is 0.65 m).
        expect(d.y, `${room.building.id} ${d.hung}`).toBeLessThan(room.wallTop - room.floorTop);
        expect(d.y - 0.65, `${room.building.id} ${d.hung}`).toBeGreaterThan(0.25);
      }
    }
    expect(houses.filter((room) => DRESSING.some((d) => d.room === room && d.piece === 'firewood')).length).toBeGreaterThanOrEqual(4);
  });

  it('sways the inn sign gently, never more than about 7 degrees', () => {
    let hi = 0, moved = 0;
    for (let t = 0; t < 600; t += 0.05) { const a = signSway(t); hi = Math.max(hi, Math.abs(a)); if (Math.abs(a) > 0.02) moved++; }
    expect(hi).toBeLessThan(0.125);
    expect(moved).toBeGreaterThan(1000);
  });
});
