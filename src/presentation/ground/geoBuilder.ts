import * as THREE from 'three';

export type Vec3 = readonly [number, number, number];

/** A vertex for the ground-cover geometry: position, colour, wind weight (0 rigid .. 1 free) and a small phase. */
export interface GV {
  p: Vec3;
  c: Vec3;
  /** Wind flex, 0 at the root to ~1 at the tip. Also drives the root-dark gradient for grass. */
  w: number;
}

const tc = new THREE.Color();
export function lin(hex: number): Vec3 {
  tc.setHex(hex);
  return [tc.r, tc.g, tc.b];
}

export function mixc(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function scalec(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

/**
 * Accumulates small hand-shaped meshes (blades, petals, fronds, leaves) into one non-indexed geometry with the
 * attributes the ground-cover shaders read: position, normal, aColor, aBlade(across, flex, phase, stiffness).
 */
export class GeoBuilder {
  private pos: number[] = [];
  private nor: number[] = [];
  private col: number[] = [];
  private blade: number[] = [];
  /** How strongly normals are pulled toward straight up (hemisphere lighting reads calmer than per-face). */
  upBias = 0.55;
  phase = 0;
  stiff = 1;
  /** When true, triangle normals are flipped to face up/outwards so both faces light the same. */
  twoSided = true;

  get triangles() {
    return this.pos.length / 9;
  }

  tri(a: GV, b: GV, c: GV, radial?: Vec3) {
    const ux = b.p[0] - a.p[0];
    const uy = b.p[1] - a.p[1];
    const uz = b.p[2] - a.p[2];
    const vx = c.p[0] - a.p[0];
    const vy = c.p[1] - a.p[1];
    const vz = c.p[2] - a.p[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    if (this.twoSided) {
      // Face the normal to the upper hemisphere (or outward when the caller knows the direction).
      const rx = radial ? radial[0] : 0;
      const ry = radial ? radial[1] : 1;
      const rz = radial ? radial[2] : 0;
      if (nx * rx + ny * ry + nz * rz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
    }
    const k = this.upBias;
    nx = nx * (1 - k);
    ny = ny * (1 - k) + k;
    nz = nz * (1 - k);
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    for (const v of [a, b, c]) {
      this.pos.push(v.p[0], v.p[1], v.p[2]);
      this.nor.push(nx, ny, nz);
      this.col.push(v.c[0], v.c[1], v.c[2]);
      this.blade.push(0, v.w, this.phase, this.stiff);
    }
  }

  /** Both winding orders are irrelevant (double sided material); a quad is two triangles. */
  quad(a: GV, b: GV, c: GV, d: GV, radial?: Vec3) {
    this.tri(a, b, c, radial);
    this.tri(a, c, d, radial);
  }

  /** Extra per-vertex attribute layout for grass blades: across ∈ {-1,0,1}. Written by callers that need it. */
  setAcross(startTri: number, values: number[]) {
    // 9 floats per triangle position, 4 per vertex blade data.
    let vi = startTri * 3;
    for (const v of values) this.blade[vi++ * 4] = v;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aBlade', new THREE.Float32BufferAttribute(this.blade, 4));
    g.computeBoundingSphere();
    return g;
  }
}
