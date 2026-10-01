import * as THREE from 'three';
import type { FacePaint } from './facePaint';
import type { FaceShape } from './headShape';
import { DETAIL_LAYERS, SURFACE_MATERIAL, type PaintSpec } from './paint';
import { VIEW_COUNT } from './sheet';
import type { SheetJob, SheetResult } from './sheetJob';
import { Mesher, smoothNormals, type BoneName, type V3 } from './skin';

/**
 * Where a person's geometry is collected while it is built: one mesher for the body and costume, one for the head, and the
 * table of painted parts both refer to. `use` and `useHead` choose the part that the next primitives belong to.
 */
export class Wardrobe {
  readonly body = new Mesher();
  readonly head = new Mesher();
  readonly parts: PaintSpec[] = [];
  private readonly keys = new Map<string, number>();

  private partIndex(spec: PaintSpec): number {
    const key = JSON.stringify(spec);
    let i = this.keys.get(key);
    if (i === undefined) {
      i = this.parts.length;
      this.parts.push(spec);
      this.keys.set(key, i);
    }
    return i;
  }

  /** The body mesher, drawing the given part. */
  use(spec: PaintSpec): Mesher {
    this.body.part = this.partIndex(spec);
    return this.body;
  }

  /** The head mesher, drawing the given part. */
  useHead(spec: PaintSpec): Mesher {
    this.head.part = this.partIndex(spec);
    return this.head;
  }
}

export interface PersonMesh {
  /** The skinned geometry; its sheet coordinates and weights are filled in by `apply`. */
  geometry: THREE.BufferGeometry;
  /** The job that projects (and paints) the person's sheet. */
  job: SheetJob;
  /** Copy a finished job's sheet coordinates and weights into the geometry. */
  apply(result: SheetResult): void;
  vertices: number;
  triangles: number;
}

export interface PersonMeshOptions {
  /** Sheet width and height in pixels. */
  size: number;
  joints: Record<BoneName, V3>;
  face: { shape: FaceShape; paint: FacePaint; n: number };
  /** Return the projection buffers and image-order pixels with the result (tools). */
  keep?: boolean;
}

/**
 * Merge a person's body and head into one skinned geometry and prepare the job for its sheet. Every vertex carries its
 * surface (roughness, metalness, detail layer) at once, and its coordinates and weight in each of the sheet's views once
 * the job has run.
 */
export function buildPersonMesh(wd: Wardrobe, o: PersonMeshOptions): PersonMesh {
  const b = wd.body.data();
  const h = wd.head.data();
  const nb = b.pos.length / 3;
  const n = nb + h.pos.length / 3;
  const cat = <T extends Float32Array | Uint16Array>(make: (n: number) => T, a: T, c: T): T => {
    const out = make(a.length + c.length);
    out.set(a, 0);
    out.set(c, a.length);
    return out;
  };
  const pos = cat((k) => new Float32Array(k), b.pos, h.pos);
  const col = cat((k) => new Float32Array(k), b.col, h.col);
  const uv = cat((k) => new Float32Array(k), b.uv, h.uv);
  const skinIndex = cat((k) => new Uint16Array(k), b.skinIndex, h.skinIndex);
  const skinWeight = cat((k) => new Float32Array(k), b.skinWeight, h.skinWeight);
  const pa = cat((k) => new Float32Array(k), b.pa, h.pa);
  const part = cat((k) => new Uint16Array(k), b.part, h.part);
  const index = new Uint32Array(b.index.length + h.index.length);
  index.set(b.index, 0);
  for (let i = 0; i < h.index.length; i++) index[b.index.length + i] = h.index[i]! + nb;
  const welds = new Uint32Array(b.welds.length + h.welds.length);
  welds.set(b.welds, 0);
  for (let i = 0; i < h.welds.length; i++) welds[b.welds.length + i] = h.welds[i]! + nb;
  const set = new Uint8Array(n);
  set.fill(1, nb);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(smoothNormals(pos, index, welds), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  const uv0 = new THREE.BufferAttribute(new Float32Array(n * 4), 4);
  const uv1 = new THREE.BufferAttribute(new Float32Array(n * 4), 4);
  const uv2 = new THREE.BufferAttribute(new Float32Array(n * 2), 2);
  const w0 = new THREE.BufferAttribute(new Float32Array(n * 4), 4);
  const w1 = new THREE.BufferAttribute(new Float32Array(n), 1);
  g.setAttribute('sheetUv0', uv0);
  g.setAttribute('sheetUv1', uv1);
  g.setAttribute('sheetUv2', uv2);
  g.setAttribute('sheetW', w0);
  g.setAttribute('sheetW2', w1);
  const surf = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [rough, metal, layer] = SURFACE_MATERIAL[wd.parts[part[i]!]!.surface];
    surf[i * 3] = rough;
    surf[i * 3 + 1] = metal;
    surf[i * 3 + 2] = DETAIL_LAYERS.indexOf(layer);
  }
  g.setAttribute('surf', new THREE.BufferAttribute(surf, 3));
  g.setIndex(n > 65535 ? new THREE.BufferAttribute(index, 1) : new THREE.BufferAttribute(new Uint16Array(index), 1));

  const job: SheetJob = { size: o.size, pos, col, pa, part, index, welds, skinIndex, skinWeight, set, joints: o.joints, parts: wd.parts, face: o.face, keep: o.keep };
  const apply = (r: SheetResult) => {
    const U0 = uv0.array as Float32Array;
    const U1 = uv1.array as Float32Array;
    const U2 = uv2.array as Float32Array;
    const W0 = w0.array as Float32Array;
    const W1 = w1.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const q = i * VIEW_COUNT * 2;
      U0[i * 4] = r.uv[q]!;
      U0[i * 4 + 1] = r.uv[q + 1]!;
      U0[i * 4 + 2] = r.uv[q + 2]!;
      U0[i * 4 + 3] = r.uv[q + 3]!;
      U1[i * 4] = r.uv[q + 4]!;
      U1[i * 4 + 1] = r.uv[q + 5]!;
      U1[i * 4 + 2] = r.uv[q + 6]!;
      U1[i * 4 + 3] = r.uv[q + 7]!;
      U2[i * 2] = r.uv[q + 8]!;
      U2[i * 2 + 1] = r.uv[q + 9]!;
      const wq = i * VIEW_COUNT;
      W0[i * 4] = r.weight[wq]!;
      W0[i * 4 + 1] = r.weight[wq + 1]!;
      W0[i * 4 + 2] = r.weight[wq + 2]!;
      W0[i * 4 + 3] = r.weight[wq + 3]!;
      W1[i] = r.weight[wq + 4]!;
    }
    for (const a of [uv0, uv1, uv2, w0, w1]) a.needsUpdate = true;
  };
  return { geometry: g, job, apply, vertices: n, triangles: index.length / 3 };
}

/** A sheet's pixels (texture order: rows bottom to top) as a texture: sRGB, mipmapped. */
export function sheetTexture(pixels: Uint8Array, size: number, name: string): THREE.DataTexture {
  const t = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.name = name;
  t.needsUpdate = true;
  return t;
}

/** The plain sheet a person wears until theirs is painted (never seen: people stay hidden until then). */
export function placeholderSheet(): THREE.DataTexture {
  const t = new THREE.DataTexture(new Uint8Array([92, 88, 82, 255]), 1, 1, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.name = 'sheet:placeholder';
  t.needsUpdate = true;
  return t;
}
