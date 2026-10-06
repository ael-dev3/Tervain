import * as THREE from 'three';
import { shoreDistance } from '../world/coast';
import { SEA_LEVEL, WORLD } from '../world/layout';
import type { Terrain } from '../world/terrain';
import { DISTANT_COAST, distantCoastHeight } from '../world/distantCoast';

export type SeaQuality = 'low' | 'medium' | 'high';

/**
 * Signed terrain depth across the visible coast, with a welded ocean horizon to
 * the north, south and west. The inland eastern edge has no skirt. Shared grid
 * indices carry the same depth into the horizon, so neither waves nor clipping
 * can open a seam along that join.
 *
 * aDepth: positive below the sea surface, negative on dry ground.
 * aShore: positive offshore, negative inland; useful for shore-shaped foam.
 */
export function buildSeaGeometry(terrain: Pick<Terrain, 'heightAt'>, quality: SeaQuality = 'medium'): THREE.BufferGeometry {
  const cell = quality === 'high' ? 2 : quality === 'low' ? 4 : 3;
  const x0 = DISTANT_COAST.minX, x1 = -180;
  const z0 = WORLD.minZ - 12, z1 = WORLD.maxZ + 12;
  // Only the offshore addition is coarse. The existing physical coast retains its quality grid,
  // and every row across the distant land uses the same 2m diagonals as that resident mesh.
  const xs: number[] = [];
  for (let x = x0; x < WORLD.minX; x += DISTANT_COAST.cellX) xs.push(x);
  const nearNx = Math.ceil((x1 - WORLD.minX) / cell);
  for (let i = 0; i <= nearNx; i++) xs.push(i === nearNx ? x1 : WORLD.minX + (x1 - WORLD.minX) * i / nearNx);
  const nx = xs.length - 1, nz = Math.ceil((z1 - z0) / Math.min(cell, DISTANT_COAST.cellZ));
  const row = nx + 1, reach = 5200;
  const position: number[] = [], depth: number[] = [], shore: number[] = [], index: number[] = [];

  const vertex = (x: number, z: number, far = false) => {
    // Sample the exact coordinates stored in the Float32 position attribute.
    x = Math.fround(x); z = Math.fround(z);
    const actualDepth = SEA_LEVEL - terrain.heightAt(x, z);
    const coastDepth = -shoreDistance(x, z);
    if (!Number.isFinite(actualDepth) || !Number.isFinite(coastDepth)) throw new RangeError('Sea geometry requires finite terrain and shoreline samples.');
    const id = position.length / 3;
    position.push(x, SEA_LEVEL, z);
    // Outside authored terrain, only offshore vertices become deep ocean.
    // The far eastern tips remain dry instead of inventing water inland.
    const offshoreLand = !far && x < WORLD.minX;
    const bedDepth = offshoreLand ? SEA_LEVEL - distantCoastHeight(x, z) : actualDepth;
    depth.push(far && coastDepth > 0 ? 16 : bedDepth);
    shore.push(offshoreLand ? bedDepth : far ? Math.min(500, coastDepth) : coastDepth);
    return id;
  };
  const quad = (nw: number, sw: number, se: number, ne: number) => {
    index.push(nw, sw, ne, ne, sw, se);
  };

  for (let j = 0; j <= nz; j++) {
    const z = j === nz ? z1 : z0 + (z1 - z0) * j / nz;
    for (let i = 0; i <= nx; i++) {
      vertex(xs[i]!, z);
    }
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * row + i;
    quad(a, a + row, a + row + 1, a + 1);
  }

  // Each outer row follows every inner edge vertex. Reuse the two western
  // outer corners between skirts as well: no overlapping corner faces or T joins.
  const north: number[] = [], south: number[] = [], west: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = i === nx ? x1 : x0 - reach + (x1 - x0 + reach) * i / nx;
    north.push(vertex(x, z0 - reach, true));
    south.push(vertex(x, z1 + reach, true));
  }
  west.push(north[0]!);
  for (let j = 1; j < nz; j++) west.push(vertex(x0 - reach, z0 - reach + (z1 - z0 + reach * 2) * j / nz, true));
  west.push(south[0]!);

  for (let i = 0; i < nx; i++) {
    quad(north[i]!, i, i + 1, north[i + 1]!);
    const a = nz * row + i;
    quad(a, south[i]!, south[i + 1]!, a + 1);
  }
  for (let j = 0; j < nz; j++) quad(west[j]!, west[j + 1]!, (j + 1) * row, j * row);

  const geometry = new THREE.BufferGeometry();
  geometry.name = 'Coastal_Sea_With_Stitched_Horizon';
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geometry.setAttribute('aDepth', new THREE.Float32BufferAttribute(depth, 1));
  geometry.setAttribute('aShore', new THREE.Float32BufferAttribute(shore, 1));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
