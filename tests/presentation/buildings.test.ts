import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ARCHIVE_ROOM, BUILDINGS, bySpec } from '../../src/world/layout';
import type { Terrain } from '../../src/world/terrain';
import { buildArchiveShell, buildStandard } from '../../src/presentation/buildings';
import { Ctx } from '../../src/presentation/buildKit';
import { Region } from '../../src/presentation/regions';
import { ROOFS } from '../../src/presentation/roofs';

const flatGround = { heightAt: () => 0 } as unknown as Terrain;
const surface = new THREE.MeshBasicMaterial({ side: THREE.FrontSide });
const makeGroup = (r: Region) => {
  const g = r.toGroup({ get: () => surface });
  g.updateMatrixWorld(true);
  return g;
};
const cast = (g: THREE.Group, origin: number[], direction: number[]) => new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction).normalize()).intersectObject(g);
const dispose = (g: THREE.Group) => g.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });

describe('complete building shells', () => {
  for (const spec of BUILDINGS.filter((b) => b.kind !== 'archive' && b.kind !== 'shrine')) {
    it(`${spec.id} joins walls to the roof and keeps a backed foundation`, () => {
      const b = { ...spec, x: 0, z: 0, yaw: 0 };
      const r = new Region(b.id, new Ctx());
      buildStandard(r, flatGround, b, { lanterns: [] });
      const g = makeGroup(r);
      const top = b.h + 0.4;
      if (b.roof === 'gable') {
        const style = b.kind === 'fisher' || b.id.endsWith('_a') || b.id.endsWith('_c') || b.id.endsWith('_e') ? 'thatch' : b.kind === 'keeper' ? 'slate' : b.kind === 'bakery' || b.kind === 'inn' || b.kind === 'reeve' ? 'tile' : 'shingle';
        const pitch = style === 'thatch' ? 0.82 : ROOFS[style].pitch;
        const ridge = top - 0.06 + (b.d / 2 + 0.6) * Math.tan(pitch);
        for (const side of [-1, 1]) {
          const hit = cast(g, [side * (b.w / 2 + 2), ridge - 0.2, 0], [-side, 0, 0]).find((h) => Math.abs(Math.abs(h.point.x) - b.w / 2 - 0.12) < 0.015);
          expect(hit, `${b.id} gable ${side}`).toBeDefined();
        }
      } else if (b.roof === 'lean') {
        for (const side of [-1, 1]) {
          const hit = cast(g, [side * (b.w / 2 + 2), top + 0.5, -b.d / 2 + 0.6], [-side, 0, 0])[0];
          expect(hit, `${b.id} lean side ${side}`).toBeDefined();
          expect(Math.abs(hit!.point.x) - b.w / 2).toBeLessThan(0.15);
        }
        const back = cast(g, [0, top + 0.5, -b.d / 2 - 2], [0, 0, 1])[0];
        expect(back, `${b.id} raised rear wall`).toBeDefined();
        expect(Math.abs(back!.point.z + b.d / 2)).toBeLessThan(0.15);
      }
      const base = cast(g, [b.w * 0.15, 0.15, -b.d / 2 - 2], [0, 0, 1])[0];
      expect(base, `${b.id} foundation backing`).toBeDefined();
      expect(base!.distance).toBeLessThan(2.3);
      dispose(g);
    });
  }

  it('the archive has clear supported openings, side gables, floor and an inward-facing roof underside', () => {
    const b = { ...bySpec('archive'), x: 0, z: 0, yaw: 0 };
    const r = new Region('archive', new Ctx());
    buildArchiveShell(r, flatGround, b);
    const g = makeGroup(r);
    expect(cast(g, [0, 1.5, 0], [0, 0, 1])).toHaveLength(0);
    expect(cast(g, [0, 1.5, 0], [0, 0, -1])).toHaveLength(0);
    const floor = cast(g, [0, 1.5, 0], [0, -1, 0])[0];
    expect(floor!.point.y).toBeCloseTo(ARCHIVE_ROOM.floorTop, 5);
    const underside = cast(g, [0, 2, 0], [0, 1, 0])[0];
    expect(underside).toBeDefined();
    expect(underside!.face!.normal.y).toBeLessThan(0);
    const ridge = ARCHIVE_ROOM.wallBase + b.h - 0.06 + (b.d / 2 + 0.6) * Math.tan(ARCHIVE_ROOM.roofPitch);
    for (const side of [-1, 1]) {
      const hit = cast(g, [side * (b.w / 2 + 2), ridge - 0.2, 0], [-side, 0, 0])[0];
      expect(hit).toBeDefined();
      expect(Math.abs(hit!.point.x) - b.w / 2).toBeCloseTo(ARCHIVE_ROOM.wallThickness, 5);
    }
    dispose(g);
  });
});
