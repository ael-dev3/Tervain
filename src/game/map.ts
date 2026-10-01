import type { MapMarker } from './types';

/** The surveyed display extent. Notes may mark water or blocked ground, but cannot leave the world chart. */
export const MAP_MARKER_BOUNDS = { minX: -352, maxX: 168, minZ: -144, maxZ: 168 } as const;

export function validMapMarker(raw: unknown): raw is MapMarker {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return false;
  const marker = raw as Record<string, unknown>;
  return typeof marker.x === 'number' && Number.isFinite(marker.x)
    && typeof marker.z === 'number' && Number.isFinite(marker.z)
    && marker.x >= MAP_MARKER_BOUNDS.minX && marker.x <= MAP_MARKER_BOUNDS.maxX
    && marker.z >= MAP_MARKER_BOUNDS.minZ && marker.z <= MAP_MARKER_BOUNDS.maxZ;
}
