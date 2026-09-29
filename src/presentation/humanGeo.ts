import * as THREE from 'three';
import { mulberry32 } from '../world/noise';

/**
 * Geometry for people: tapered limbs with muscle and bone in the silhouette, a torso lofted through elliptical sections, and a
 * head sculpted from a sphere (brow, nose, cheekbones, jaw, chin). Everything carries vertex colours (skin, cloth, leather) with
 * dirt darkening the hems and worn patches, so a rig is only a few meshes and no two people look freshly made.
 * Dimensions are metres for a 1.8 m person; a rig is scaled by height and girth.
 */

export type RGB = [number, number, number];

export const hex = (h: number): RGB => {
  const c = new THREE.Color(h);
  return [c.r, c.g, c.b];
};

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

class Acc {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  uv: number[] = [];
  idx: number[] = [];
  get n() {
    return this.pos.length / 3;
  }
  vert(p: [number, number, number], n: [number, number, number], c: RGB, u = 0, v = 0) {
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.col.push(c[0], c[1], c[2]);
    this.uv.push(u, v);
    return this.n - 1;
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    return g;
  }
}

export interface Section {
  y: number;
  rx: number;
  rz: number;
  /** Centre offsets. */
  cx?: number;
  cz?: number;
  color: RGB;
}

/** A surface lofted through elliptical sections from bottom to top, with smooth normals and a noise wobble. */
export function loft(sections: Section[], sides: number, o: { wobble?: number; seed?: number; capBottom?: boolean; capTop?: boolean; open?: boolean; uvScale?: number; arc?: [number, number] } = {}): THREE.BufferGeometry {
  const acc = new Acc();
  const rnd = mulberry32(o.seed ?? 1);
  const wob = o.wobble ?? 0;
  const rings: number[] = [];
  const n = sections.length;
  for (let i = 0; i < n; i++) {
    const s = sections[i]!;
    const prev = sections[Math.max(0, i - 1)]!;
    const next = sections[Math.min(n - 1, i + 1)]!;
    const dy = next.y - prev.y || 1e-4;
    const start = acc.n;
    const ph = rnd() * 6;
    for (let k = 0; k <= sides; k++) {
      const a = o.arc ? o.arc[0] + (k / sides) * (o.arc[1] - o.arc[0]) : (k / sides) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const w = 1 + wob * Math.sin(a * 3 + ph + i) * (0.6 + 0.4 * Math.sin(i * 1.7 + ph));
      const px = (s.cx ?? 0) + ca * s.rx * w;
      const pz = (s.cz ?? 0) + sa * s.rz * w;
      // Normal: ellipse normal tilted by the profile slope.
      const drx = (next.rx - prev.rx) / dy;
      const drz = (next.rz - prev.rz) / dy;
      let nx = ca / s.rx;
      let nz = sa / s.rz;
      let ny = -(drx * ca + drz * sa) * 0.5;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      acc.vert([px, s.y, pz], [nx, ny, nz], s.color, (k / sides) * (o.uvScale ?? 1), s.y);
    }
    rings.push(start);
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const a = rings[i]! + k;
      const b = rings[i + 1]! + k;
      acc.idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const cap = (i: number, up: boolean) => {
    const s = sections[i]!;
    const c = acc.vert([s.cx ?? 0, s.y, s.cz ?? 0], [0, up ? 1 : -1, 0], s.color);
    for (let k = 0; k < sides; k++) {
      const a = rings[i]! + k;
      if (up) acc.idx.push(c, a + 1, a);
      else acc.idx.push(c, a, a + 1);
    }
  };
  if (!o.open) {
    if (o.capBottom ?? true) cap(0, false);
    if (o.capTop ?? true) cap(n - 1, true);
  }
  return acc.geometry();
}

/** A limb segment hanging down from y = 0 to y = -len, radius easing from r0 to r1 with a bulge (muscle) near the given point. */
export function limb(r0: number, r1: number, len: number, o: { bulge?: number; at?: number; flatten?: number; top: RGB; bottom: RGB; seed?: number; sides?: number; dirt?: number }): THREE.BufferGeometry {
  const secs: Section[] = [];
  const steps = 6;
  const bulge = o.bulge ?? 0.12;
  const at = o.at ?? 0.35;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = (r0 + (r1 - r0) * t) * (1 + bulge * Math.exp(-Math.pow((t - at) / 0.22, 2)));
    const c = mix(o.top, o.bottom, t);
    const dirt = 1 - (o.dirt ?? 0.18) * sstep(0.55, 1, t);
    secs.push({ y: -len * t, rx: r, rz: r * (o.flatten ?? 1), color: mul(c, dirt) });
  }
  return loft(secs, o.sides ?? 9, { wobble: 0.018, seed: o.seed });
}

/** Skin, sculpted head. Returns geometry centred so the neck base is at the origin and the crown is about 0.24 up. */
export function headGeometry(skin: RGB, opts: { seed: number; beard: boolean; age: number; scar?: boolean }): THREE.BufferGeometry {
  const sphere = new THREE.SphereGeometry(1, 26, 20);
  const pos = sphere.attributes.position as THREE.BufferAttribute;
  const nrm = sphere.attributes.normal as THREE.BufferAttribute;
  const rnd = mulberry32(opts.seed);
  const cols = new Float32Array(pos.count * 3);
  const cheekWide = 0.95 + rnd() * 0.15;
  const noseLen = 0.9 + rnd() * 0.35;
  const browK = 0.8 + rnd() * 0.5;
  const jawK = 0.85 + rnd() * 0.3;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const front = Math.max(0, z);
    // Jaw: narrows and squares off below the cheek line; chin juts.
    const below = sstep(-0.1, -0.95, y);
    x *= 1 - 0.2 * below * jawK;
    z *= 1 - 0.06 * below;
    z += 0.07 * sstep(-0.55, -0.92, y) * front * jawK;
    y -= 0.04 * sstep(-0.85, -1, y);
    // Cheekbones.
    x *= 1 + 0.07 * cheekWide * Math.exp(-Math.pow((y + 0.1) / 0.22, 2)) * (front > 0.2 ? 1 : 0);
    // Brow ridge and eye sockets.
    const brow = Math.exp(-Math.pow((y - 0.2) / 0.1, 2)) * front;
    z += 0.075 * browK * brow;
    const socket = Math.exp(-Math.pow((y - 0.13) / 0.09, 2)) * Math.exp(-Math.pow((Math.abs(x) - 0.4) / 0.14, 2)) * front;
    z -= 0.06 * socket;
    // Nose: bridge, tip and nostrils.
    const nose = Math.exp(-Math.pow(x / 0.13, 2)) * Math.exp(-Math.pow((y + 0.05) / 0.3, 2)) * front;
    z += 0.24 * noseLen * nose * (0.5 + 0.5 * sstep(0.2, -0.22, y));
    // Mouth: a slight groove and the fullness of the lips.
    const mouth = Math.exp(-Math.pow(x / 0.28, 2)) * Math.exp(-Math.pow((y + 0.42) / 0.05, 2)) * front;
    z -= 0.035 * mouth;
    const lips = Math.exp(-Math.pow(x / 0.25, 2)) * Math.exp(-Math.pow((y + 0.42) / 0.11, 2)) * front;
    z += 0.03 * lips;
    // Back of the skull is fuller; the crown a little flat.
    if (z < 0) z *= 1.08;
    y *= y > 0.6 ? 0.96 : 1;
    pos.setXYZ(i, x * 0.078, y * 0.108 + 0.12, z * 0.095);
    // Colours: ruddy cheeks and nose, shadowed sockets and mouth, beard shadow along the jaw.
    let c = mix(skin, mul(skin, 0.86), sstep(0.2, -0.6, y) * 0.3);
    c = mix(c, [Math.min(1, skin[0] * 1.15), skin[1] * 0.82, skin[2] * 0.8], (Math.exp(-Math.pow((Math.abs(x) - 0.55) / 0.2, 2)) * Math.exp(-Math.pow((y + 0.05) / 0.2, 2)) * 0.5 + nose * 0.5) * front);
    c = mix(c, mul(skin, 0.42), Math.min(1, socket * 1.4));
    c = mix(c, [skin[0] * 0.72, skin[1] * 0.42, skin[2] * 0.4], mouth * 0.9 + lips * 0.35);
    if (opts.beard) c = mix(c, mul(skin, 0.55), sstep(-0.1, -0.6, y) * sstep(0.15, 0.5, front) * 0.5);
    // Age: faint darker lines under the eyes and at the mouth corners.
    c = mix(c, mul(skin, 0.75), opts.age * Math.exp(-Math.pow((y + 0.02) / 0.06, 2)) * Math.exp(-Math.pow((Math.abs(x) - 0.45) / 0.1, 2)) * front * 0.6);
    const g = 0.96 + (rnd() - 0.5) * 0.06;
    cols[i * 3] = c[0] * g;
    cols[i * 3 + 1] = c[1] * g;
    cols[i * 3 + 2] = c[2] * g;
  }
  sphere.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  sphere.deleteAttribute('uv');
  sphere.computeVertexNormals();
  void nrm;
  return sphere;
}

/** Hair: a shell over the top and back of the skull, with a rough edge. `long` adds a hanging sheet behind. */
export function hairGeometry(color: RGB, opts: { seed: number; style: 'short' | 'long' | 'tied' | 'bald' }): THREE.BufferGeometry | null {
  if (opts.style === 'bald') return null;
  const rnd = mulberry32(opts.seed);
  const sphere = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const pos = sphere.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const ring = Math.hypot(x, z);
    // Hairline: higher on the forehead, lower behind.
    const cut = z > 0.2 ? 0.1 : -0.25;
    y = Math.max(cut, y);
    const lump = 1 + 0.06 * Math.sin(x * 9 + z * 7 + opts.seed) + 0.05 * (rnd() - 0.5);
    pos.setXYZ(i, x * 0.086 * lump, y * 0.118 * lump + 0.128, z * 0.104 * lump - 0.004);
    const streak = 0.78 + 0.35 * Math.abs(Math.sin(Math.atan2(x, z) * 14 + y * 3));
    cols[i * 3] = color[0] * streak;
    cols[i * 3 + 1] = color[1] * streak;
    cols[i * 3 + 2] = color[2] * streak;
    void ring;
  }
  sphere.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  sphere.deleteAttribute('uv');
  sphere.computeVertexNormals();
  if (opts.style === 'short') return sphere;
  // Long or tied: add a hanging sheet or a tail.
  const secs: Section[] = [];
  const len = opts.style === 'long' ? 0.3 : 0.16;
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    secs.push({ y: 0.1 - t * len, rx: 0.075 * (1 - t * 0.35), rz: 0.05 * (1 - t * 0.2), cz: -0.085 - t * 0.02, color: mul(color, 0.85 + 0.2 * Math.sin(i * 2)) });
  }
  const tail = loft(secs, 8, { wobble: 0.08, seed: opts.seed, capTop: false });
  tail.deleteAttribute('uv');
  return mergeInto([sphere, tail]);
}

/** A beard: a shell over the jaw and chin. */
export function beardGeometry(color: RGB, seed: number, long: boolean): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const secs: Section[] = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = 0.075 - t * (long ? 0.19 : 0.1);
    const rx = 0.07 * (1 - 0.3 * t) * (1 + 0.04 * (rnd() - 0.5));
    secs.push({ y, rx, rz: 0.06 * (1 - 0.25 * t), cz: 0.03 + t * 0.012, color: mul(color, 0.8 + 0.35 * rnd()) });
  }
  const g = loft(secs, 12, { wobble: 0.1, seed, capBottom: false, capTop: false });
  g.deleteAttribute('uv');
  return g;
}

function mergeInto(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  let base = 0;
  for (const g of gs) {
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const c = g.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.getX(i), c.getY(i), c.getZ(i));
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(base + g.index.getX(i));
    else for (let i = 0; i < p.count; i++) idx.push(base + i);
    base += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  return out;
}

export { mergeInto };

/** A boot: shaft, ankle and a rounded toe, in leather with a pale worn toe cap. */
export function bootGeometry(leather: RGB, seed: number): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const shaft = loft(
    [
      { y: 0.02, rx: 0.062, rz: 0.058, color: mul(leather, 0.85) },
      { y: -0.1, rx: 0.058, rz: 0.055, color: leather },
      { y: -0.18, rx: 0.052, rz: 0.05, color: leather },
    ],
    9,
    { wobble: 0.03, seed, capTop: false, capBottom: false },
  );
  shaft.deleteAttribute('uv');
  // Foot: lofted along z (toe) and rotated: sections of a wedge.
  const foot = new THREE.SphereGeometry(1, 12, 8);
  const p = foot.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    let y = p.getY(i);
    const z = p.getZ(i);
    y = Math.max(-0.75, y);
    p.setXYZ(i, x * 0.06, y * 0.045 - 0.145, z * 0.135 + 0.05);
    const sole = y < -0.55 ? 0.55 : 1;
    const toe = z > 0.5 ? 1.15 : 1;
    cols[i * 3] = leather[0] * sole * toe * (0.9 + rnd() * 0.1);
    cols[i * 3 + 1] = leather[1] * sole * toe * (0.9 + rnd() * 0.1);
    cols[i * 3 + 2] = leather[2] * sole * toe * (0.9 + rnd() * 0.1);
  }
  foot.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  foot.deleteAttribute('uv');
  foot.computeVertexNormals();
  return mergeInto([shaft, foot]);
}

/** A hand: palm, four fingers as one mitten with a thumb, hanging from y = 0. */
export function handGeometry(skin: RGB, seed: number): THREE.BufferGeometry {
  const palm = loft(
    [
      { y: 0, rx: 0.036, rz: 0.02, color: mul(skin, 0.95) },
      { y: -0.04, rx: 0.042, rz: 0.022, color: skin },
      { y: -0.085, rx: 0.036, rz: 0.019, color: skin },
      { y: -0.105, rx: 0.02, rz: 0.014, color: mul(skin, 0.95) },
    ],
    8,
    { wobble: 0.04, seed, capBottom: true },
  );
  palm.deleteAttribute('uv');
  const thumb = loft(
    [
      { y: -0.005, rx: 0.014, rz: 0.014, cx: 0.036, cz: 0.012, color: skin },
      { y: -0.05, rx: 0.012, rz: 0.012, cx: 0.043, cz: 0.022, color: skin },
    ],
    6,
    { capBottom: true },
  );
  thumb.deleteAttribute('uv');
  return mergeInto([palm, thumb]);
}

/** Cloth draped over a loft with an uneven hem: for skirts, robes, capes. */
export function drape(sections: Section[], sides: number, seed: number, hem: number): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const g = loft(sections, sides, { wobble: 0.07, seed, capBottom: false, capTop: false, open: true });
  const p = g.attributes.position as THREE.BufferAttribute;
  const bottom = sections[0]!.y;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (Math.abs(y - bottom) < 1e-4) p.setY(i, y + (Math.sin(i * 1.9) * 0.5 + 0.5) * hem + rnd() * hem * 0.3);
  }
  return g;
}

/** Add dirt and wear to a geometry's vertex colours: darkening toward the bottom (hems) and in low-frequency blotches. */
export function weather(g: THREE.BufferGeometry, seed: number, dirt = 0.25, bottomY = 0, topY = 1) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const c = g.attributes.color as THREE.BufferAttribute;
  const rnd = mulberry32(seed);
  const ph = rnd() * 10;
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, (p.getY(i) - bottomY) / Math.max(1e-3, topY - bottomY)));
    const blot = 0.5 + 0.5 * Math.sin(p.getX(i) * 23 + ph) * Math.sin(p.getZ(i) * 19 + p.getY(i) * 11 - ph);
    const k = 1 - dirt * (1 - t) * (0.6 + 0.4 * blot) - 0.08 * blot;
    c.setXYZ(i, c.getX(i) * k, c.getY(i) * k * 0.99, c.getZ(i) * k * 0.97);
  }
  c.needsUpdate = true;
}
