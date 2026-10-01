import { LIGHTHOUSE, LIGHTHOUSE_CONSTRUCTION as L } from './layout';

const TAU = Math.PI * 2;
export const LIGHTHOUSE_STAIR_ANGLE = TAU / L.stairSteps;
export const LIGHTHOUSE_STAIR_RISE = (L.stairTop - L.stairBottom) / L.stairSteps;

/** Top of the rendered tread, not an invisible ramp or the height of the rail. */
export function lighthouseTreadTop(index: number): number {
  return L.stairBottom + (index + 1) * LIGHTHOUSE_STAIR_RISE;
}

/** Exact chord footprint of a radial plank wedge. */
function inSector(radius: number, angle: number, inner: number, outer: number, segments: number): boolean {
  const step = TAU / segments;
  const local = ((angle % step) + step) % step - step / 2;
  const chord = Math.cos(step / 2) / Math.cos(local);
  return radius >= inner * chord - 1e-6 && radius <= outer * chord + 1e-6;
}

/** All standing surfaces at a point. The controller chooses a surface accessible from the current feet height. */
export function lighthouseSurfacesAt(x: number, z: number): number[] {
  const dx = x - LIGHTHOUSE.x, dz = z - LIGHTHOUSE.z;
  const surfaces: number[] = [];
  // Both closed doorways have the same two solid stone treads drawn by structures.door.
  // They are safe external supports even though the house and shaft themselves are not enterable.
  for (const entry of [
    { x: 0, z: LIGHTHOUSE.r + 0.015, width: 1.22 },
    { x: L.house.x - 0.65, z: L.house.d / 2 + 0.06, width: 1.3 },
  ]) {
    if (Math.abs(dx - entry.x) <= (entry.width + 0.7) / 2 && Math.abs(dz - entry.z - 0.42) <= 0.35) surfaces.push(L.house.wallBase + 0.08);
    if (Math.abs(dx - entry.x) <= (entry.width + 0.9) / 2 && Math.abs(dz - entry.z - 0.96) <= 0.25) surfaces.push(L.house.wallBase * 0.5);
  }
  const radius = Math.hypot(dx, dz);
  if (radius < L.galleryInner - 0.02 || radius > L.stairOuter + 0.02) return surfaces;
  const angle = ((Math.atan2(dz, dx) - L.stairStart) % TAU + TAU) % TAU;
  if (inSector(radius, angle, L.stairInner, L.stairOuter, L.stairSteps)) {
    surfaces.push(lighthouseTreadTop(Math.min(L.stairSteps - 1, Math.floor(angle / LIGHTHOUSE_STAIR_ANGLE))));
  }
  // Gallery planks use the same chord sectors as the mesh. There is no support inside the lantern room.
  const galleryAngle = Math.atan2(dz, dx);
  const globalAngle = ((galleryAngle % TAU) + TAU) % TAU;
  const galleryOuter = globalAngle >= L.galleryOpeningStart && globalAngle < L.galleryOpeningEnd ? L.stairInner : L.galleryOuter;
  if (inSector(radius, galleryAngle, L.galleryInner, galleryOuter, 32)) surfaces.push(L.stairTop);
  return surfaces;
}
