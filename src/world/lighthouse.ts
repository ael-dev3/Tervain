import { LIGHTHOUSE, LIGHTHOUSE_CONSTRUCTION as L } from './layout';

const TAU = Math.PI * 2;
export const LIGHTHOUSE_STAIR_ANGLE = TAU / L.stairSteps;
export const LIGHTHOUSE_STAIR_RISE = (L.stairTop - L.stairBottom) / L.stairSteps;
export const LIGHTHOUSE_DOOR_HALF_ANGLE = Math.asin(L.room.doorHalfWidth / L.room.radius);
export const LIGHTHOUSE_DOOR_OUTER_WIDTH = 2 * (LIGHTHOUSE.r + 0.08) * Math.sin(LIGHTHOUSE_DOOR_HALF_ANGLE);

/** Closed stone wedges surround the keeper's tower room; the south-facing opening remains genuinely hollow. */
export function lighthouseWallSectors(): { a0: number; a1: number }[] {
  const start = Math.PI / 2 + LIGHTHOUSE_DOOR_HALF_ANGLE;
  const span = TAU - LIGHTHOUSE_DOOR_HALF_ANGLE * 2;
  return Array.from({ length: L.room.wallSegments }, (_, i) => ({
    a0: start + span * i / L.room.wallSegments,
    a1: start + span * (i + 1) / L.room.wallSegments,
  }));
}

/** Floor and threshold footprint of the actual open rooms. No floor is offered through a wall or into the sea. */
export function lighthouseFloorAt(x: number, z: number): number | null {
  const dx = x - LIGHTHOUSE.x, dz = z - LIGHTHOUSE.z;
  if (Math.hypot(dx, dz) <= L.room.radius + 1e-6 ||
    Math.abs(dx) <= L.room.doorHalfWidth + 1e-6 && dz >= 0 && dz <= LIGHTHOUSE.r + 0.08) return L.room.floorTop;
  const h = L.house, hx = dx - h.x, hz = dz - h.z;
  if (Math.abs(hx) <= h.w / 2 - h.wallThickness && Math.abs(hz) <= h.d / 2 - h.wallThickness ||
    Math.abs(hx - h.doorX) <= h.doorHalfWidth && hz >= h.d / 2 - h.wallThickness && hz <= h.d / 2 + 0.1) return h.floorTop;
  return null;
}

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
  // The two open entrances have solid stone treads meeting their real interior floors.
  for (const entry of [
    { x: 0, z: LIGHTHOUSE.r + 0.015, width: LIGHTHOUSE_DOOR_OUTER_WIDTH },
    { x: L.house.x + L.house.doorX, z: L.house.d / 2 + 0.06, width: L.house.doorHalfWidth * 2 },
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
