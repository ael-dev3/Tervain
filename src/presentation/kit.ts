import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The palette: dark, earthy and desaturated. Grass is olive and dry, wood is nearly black with age, plaster is dirty lime,
 * roofs are brown. Nothing here is bright; light and haze bring the colour up. Values were set against the average colours
 * of the reference ground, timber and roof textures (see docs/art/gothic3-reference.md).
 */
export const PAL = {
  grassA: 0x4e5230,
  grassB: 0x5c5a36,
  grassGold: 0x8b7c48,
  moss: 0x3c4828,
  forest: 0x2c3822,
  dirt: 0x6a5a42,
  mud: 0x3f3429,
  mudDry: 0x5a4a38,
  rockA: 0x6a675f,
  rockB: 0x52504a,
  rockHigh: 0x7e7b72,
  limestone: 0xa39a84,
  plaster: 0x958a72,
  plasterWarm: 0x8c7d60,
  timber: 0x4d3b29,
  timberDark: 0x30251a,
  tile: 0x72462f,
  tileDark: 0x593626,
  slate: 0x474d51,
  thatch: 0x88723f,
  iron: 0x35342f,
  waterDeep: 0x2a4245,
  waterShallow: 0x4b675f,
  cloth: 0x8a8266,
  leafA: 0x485828,
  leafB: 0x596a30,
  leafC: 0x3b4924,
  leafOak: 0x4d5a2b,
  leafOrchard: 0x66713a,
  bark: 0x493c2e,
  barkPale: 0x6e6455,
  fruit: 0x8a3a2c,
  fruitY: 0xa08434,
  reed: 0x786f42,
  templarBlue: 0x435063,
  templarGold: 0xa39560,
  leagueGreen: 0x3c5140,
  marcherRed: 0x6c2d25,
  ash: 0x3b3b3f,
} as const;

const tmp = new THREE.Color();

/** Deterministic per-triangle brightness jitter so flat faces read as stylized planes. */
function jitter(seed: number): number {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967296 - 0.5) * 0.14;
}

/** Strip a geometry to position/normal/color and paint it a single colour (with subtle face variation). */
export function paint(geo: THREE.BufferGeometry, color: number, variation = 1): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  g.computeVertexNormals();
  const n = g.attributes.position!.count;
  const colors = new Float32Array(n * 3);
  tmp.set(color);
  const seedBase = Math.floor((geo.attributes.position!.getX(0) + 50) * 131 + n * 17);
  for (let i = 0; i < n; i += 3) {
    const j = jitter(seedBase + i) * variation;
    for (let k = 0; k < 3; k++) {
      const idx = (i + k) * 3;
      colors[idx] = Math.max(0, Math.min(1, tmp.r + j));
      colors[idx + 1] = Math.max(0, Math.min(1, tmp.g + j));
      colors[idx + 2] = Math.max(0, Math.min(1, tmp.b + j));
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

export function paintGradient(geo: THREE.BufferGeometry, bottom: number, top: number, y0: number, y1: number): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  g.computeVertexNormals();
  const n = g.attributes.position!.count;
  const colors = new Float32Array(n * 3);
  const a = new THREE.Color(bottom);
  const b = new THREE.Color(top);
  for (let i = 0; i < n; i++) {
    const t = Math.max(0, Math.min(1, (g.attributes.position!.getY(i) - y0) / (y1 - y0)));
    tmp.copy(a).lerp(b, t);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const S = new THREE.Vector3();
const P = new THREE.Vector3();

export function transform(geo: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  E.set(rx, ry, rz, 'YXZ');
  Q.setFromEuler(E);
  M.compose(P.set(x, y, z), Q, S.set(sx, sy, sz));
  geo.applyMatrix4(M);
  return geo;
}

/** Collects painted, transformed primitives into one static mesh. */
export class Kit {
  private parts: THREE.BufferGeometry[] = [];
  private glowParts: THREE.BufferGeometry[] = [];
  private prims = {
    box: new THREE.BoxGeometry(1, 1, 1),
  };

  add(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1, variation = 1) {
    const g = paint(geo, color, variation);
    transform(g, x, y, z, ry, rx, rz, sx, sy, sz);
    this.parts.push(g);
  }

  addGeo(g: THREE.BufferGeometry) {
    this.parts.push(g);
  }

  /** Box with its base at y. */
  box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, ry = 0, rx = 0, rz = 0, variation = 1) {
    this.add(this.prims.box, color, x, y + h / 2, z, ry, rx, rz, w, h, d, variation);
  }

  /** Box centred on y (for rotated slabs). */
  slab(w: number, h: number, d: number, x: number, y: number, z: number, color: number, ry = 0, rx = 0, rz = 0) {
    this.add(this.prims.box, color, x, y, z, ry, rx, rz, w, h, d);
  }

  cyl(rTop: number, rBot: number, h: number, seg: number, x: number, y: number, z: number, color: number, ry = 0, rx = 0, rz = 0) {
    this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg), color, x, y + h / 2, z, ry, rx, rz);
  }

  cone(r: number, h: number, seg: number, x: number, y: number, z: number, color: number, ry = 0) {
    this.add(new THREE.ConeGeometry(r, h, seg), color, x, y + h / 2, z, ry);
  }

  ico(r: number, x: number, y: number, z: number, color: number, detail = 1, sx = 1, sy = 1, sz = 1, ry = 0) {
    this.add(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, ry, 0, 0, sx, sy, sz);
  }

  /** Triangular gable prism whose ridge runs along local x. Width spans z. */
  gable(len: number, span: number, rise: number, x: number, y: number, z: number, color: number, ry = 0) {
    const g = new THREE.BufferGeometry();
    const hl = len / 2;
    const hs = span / 2;
    const v = [
      -hl, 0, -hs, hl, 0, -hs, hl, 0, hs, -hl, 0, hs, // base
      -hl, rise, 0, hl, rise, 0, // ridge
    ];
    const idx = [
      // slopes
      0, 4, 5, 0, 5, 1,
      3, 2, 5, 3, 5, 4,
      // gable ends
      0, 3, 4,
      1, 5, 2,
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    this.add(g, color, x, y, z, ry);
  }

  pyramid(w: number, d: number, rise: number, x: number, y: number, z: number, color: number, ry = 0) {
    const g = new THREE.ConeGeometry(0.5, 1, 4, 1);
    g.rotateY(Math.PI / 4);
    this.add(g, color, x, y + rise / 2, z, ry, 0, 0, w * 1.414, rise, d * 1.414);
  }

  glow(w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    const ng = g.toNonIndexed();
    transform(ng, x, y + h / 2, z, ry);
    this.glowParts.push(ng);
  }

  build(material: THREE.Material, glowMaterial: THREE.Material) {
    const solid = this.parts.length ? new THREE.Mesh(mergeGeometries(this.parts.map((p) => (p.index ? p.toNonIndexed() : p)), false)!, material) : null;
    if (solid) {
      solid.castShadow = true;
      solid.receiveShadow = true;
    }
    const glow = this.glowParts.length ? new THREE.Mesh(mergeGeometries(this.glowParts, false)!, glowMaterial) : null;
    return { solid, glow };
  }
}

export function makeStdMaterial(opts: { flat?: boolean; roughness?: number; sway?: THREE.IUniform<number>[] } = {}) {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: opts.flat ?? true,
    roughness: opts.roughness ?? 0.92,
    metalness: 0,
  });
}
