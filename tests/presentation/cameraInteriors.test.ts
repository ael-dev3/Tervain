import { describe, expect, it } from 'vitest';
import { CameraRig, CEILING_CLEARANCE } from '../../src/presentation/cameraRig';
import { buildStaticColliders } from '../../src/world/colliders';
import { BUILDINGS, ARCHIVE_ROOM } from '../../src/world/layout';
import { buildingEntry } from '../../src/world/buildingEntries';
import { roomOf } from '../../src/world/interiors';

const flat = { groundAt: () => 0 };
const colliders = buildStaticColliders();
// The archive's leaves swing open as he comes; closed they are walls the camera cannot be asked to pass.
colliders.setActive('archive_door', false); colliders.setActive('archive_shutter', false);
const FLOOR = 0.46;

/** Walk the hero through a building's front door along its axis, the camera behind him, one frame at a time. */
function walk(b: (typeof BUILDINGS)[number], inward: boolean, pitch = 0.32) {
  const room = roomOf(b), top = room ? room.wallTop : ARCHIVE_ROOM.wallBase + b.h;
  const doorX = b.kind === 'archive' ? 0 : buildingEntry(b).x;
  const cam = new CameraRig(); cam.pitch = pitch;
  const yaw = b.yaw + (inward ? Math.PI : 0), dir = inward ? -1 : 1;
  cam.yaw = yaw;
  const at = (lz: number) => ({ x: b.x + doorX * Math.cos(b.yaw) + lz * Math.sin(b.yaw), z: b.z - doorX * Math.sin(b.yaw) + lz * Math.cos(b.yaw) });
  const frames: { y: number; inside: boolean; step: number; blend: number; door: boolean }[] = [];
  let last: number[] | null = null;
  const start = inward ? b.d / 2 + 6 : -b.d / 2 + 1.2, end = inward ? -b.d / 2 + 1.2 : b.d / 2 + 6;
  // Settle at the start first: the first frames of a new camera are a teleport, not a walk.
  { const p0 = at(start); for (let i = 0; i < 60; i++) cam.follow(1 / 60, p0.x, FLOOR, p0.z, flat, colliders, false, 0); }
  for (let lz = start; inward ? lz > end : lz < end; lz += dir * 4 / 60) {
    const p = at(lz);
    cam.follow(1 / 60, p.x, FLOOR, p.z, flat, colliders, false, 0);
    const c = cam.camera.position;
    const lx = (c.x - b.x) * Math.cos(b.yaw) - (c.z - b.z) * Math.sin(b.yaw);
    const lzc = (c.x - b.x) * Math.sin(b.yaw) + (c.z - b.z) * Math.cos(b.yaw);
    frames.push({ y: c.y, inside: Math.abs(lx) < b.w / 2 - 0.3 && Math.abs(lzc) < b.d / 2 - 0.3, door: lz < b.d / 2 + 3 && lz > b.d / 2 - 1.5, step: last ? Math.hypot(c.x - last[0]!, c.y - last[1]!, c.z - last[2]!) : 0, blend: cam.interiorBlend });
    last = [c.x, c.y, c.z];
  }
  return { frames, top };
}

describe('the follow camera through a door (B12)', () => {
  for (const b of BUILDINGS) for (const inward of [true, false]) {
    it(`${b.id} ${inward ? 'in' : 'out'}: the lens stays under the ceiling and moves smoothly`, () => {
      const { frames, top } = walk(b, inward);
      for (const f of frames) if (f.inside) expect(f.y).toBeLessThanOrEqual(top - CEILING_CLEARANCE + 1e-6);
      // No cut at the doorway (from 3 m outside to 1.5 m in): a frame's travel is walking pace plus the boom's eased draw-in.
      expect(Math.max(...frames.filter((f) => f.door).map((f) => f.step))).toBeLessThan(0.75);
    });
  }

  it('eases the view down on the way in and back out, never snapping the blend', () => {
    const inn = BUILDINGS.find((b) => b.id === 'inn')!;
    const { frames } = walk(inn, true);
    expect(frames[0]!.blend).toBe(0);
    expect(Math.max(...frames.map((f) => f.blend))).toBeGreaterThan(0.95);
    for (let i = 1; i < frames.length; i++) expect(Math.abs(frames[i]!.blend - frames[i - 1]!.blend)).toBeLessThan(0.2);
    const out = walk(inn, false).frames;
    expect(out[out.length - 1]!.blend).toBeLessThan(0.6);
  });

  it('keeps the open-air view unchanged away from every building', () => {
    const cam = new CameraRig(); cam.pitch = 0.32;
    for (let i = 0; i < 30; i++) cam.follow(1 / 60, 60, 0, 60, flat, colliders, true, 0);
    expect(cam.interiorBlend).toBe(0);
    expect(cam.camera.position.y).toBeCloseTo(1.55 + Math.sin(0.32) * 6.2, 5);
  });
});
