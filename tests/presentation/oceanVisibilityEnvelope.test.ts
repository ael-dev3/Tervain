import * as THREE from 'three';
import { expect, it } from 'vitest';
import { oceanVisibilityBounds } from '../../src/presentation/water/ocean';
import { BATHY, BATHY_NX, BATHY_NZ, type Bathymetry } from '../../src/world/water/bathymetry';
import { SEA_MAX_RISE } from '../../src/world/water/waves';

it('retains every neighbouring bilinear cell and wave guard without covering the dry tile tail', () => {
  const w = BATHY_NX + 1, height = new Float32Array(w * (BATHY_NZ + 1)).fill(-1);
  // A wet vertex in a coastal tile; its four incident bilinear cells can contain water even with dry other corners.
  const i = 164, j = 100;
  height[j * w + i] = .5;
  height[j * w + i + 10] = Number.NaN; // Invalid samples retain the existing dry/unsolved treatment.
  const boxes = oceanVisibilityBounds({height} as Bathymetry, SEA_MAX_RISE);
  const wet = new THREE.Box3(new THREE.Vector3(BATHY.minX+(i-1)*BATHY.cell-2,-1.2,BATHY.minZ+(j-1)*BATHY.cell-2),
    new THREE.Vector3(BATHY.minX+(i+1)*BATHY.cell+2,SEA_MAX_RISE,BATHY.minZ+(j+1)*BATHY.cell+2));
  expect(boxes.some(b => b.containsBox(wet))).toBe(true);
  const dryTail = new THREE.Vector3(BATHY.minX+175*BATHY.cell,0,BATHY.minZ+111*BATHY.cell);
  expect(boxes.some(b => b.containsPoint(dryTail))).toBe(false);
});

it('covers wet cells on tile seams and the last grid boundary', () => {
  const w = BATHY_NX + 1, height = new Float32Array(w * (BATHY_NZ + 1)).fill(-1);
  const points = [[160,96],[BATHY_NX,BATHY_NZ]];
  for(const [i,j] of points) height[j!*w+i!]=0;
  const boxes = oceanVisibilityBounds({height} as Bathymetry,SEA_MAX_RISE);
  for(const [i,j] of points) for(const dx of [-1,0,1])for(const dz of [-1,0,1]){
    const x=Math.max(0,Math.min(BATHY_NX,i!+dx)),z=Math.max(0,Math.min(BATHY_NZ,j!+dz));
    expect(boxes.some(b=>b.containsPoint(new THREE.Vector3(BATHY.minX+x*BATHY.cell,0,BATHY.minZ+z*BATHY.cell)))).toBe(true);
  }
});
