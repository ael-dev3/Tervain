import type * as THREE from 'three';

/**
 * Exact-position welding for the residents' meshes: UV seams split one surface point into several vertices, and the
 * repairs and measurements work on surface points. Only identical positions are joined; surfaces that merely touch are
 * never welded. Hash buckets on the float bits keep this linear for the 65k-vertex models.
 */
export interface Weld {
  /** Surface point of each vertex. */
  node: Int32Array;
  /** First vertex of each surface point. */
  first: Int32Array;
}

const bits = new Float32Array(1), word = new Int32Array(bits.buffer);
const floatBits = (value: number) => { bits[0] = value; return word[0]!; };

export function weldExact(position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): Weld {
  const count = position.count;
  const node = new Int32Array(count);
  const buckets = new Map<number, number[]>();
  const firsts: number[] = [];
  for (let vertex = 0; vertex < count; vertex++) {
    const x = position.getX(vertex), y = position.getY(vertex), z = position.getZ(vertex);
    const hash = (Math.imul(floatBits(x), 73856093) ^ Math.imul(floatBits(y), 19349663) ^ Math.imul(floatBits(z), 83492791)) | 0;
    let bucket = buckets.get(hash);
    let id = -1;
    if (bucket) {
      for (const candidate of bucket) {
        const v = firsts[candidate]!;
        if (position.getX(v) === x && position.getY(v) === y && position.getZ(v) === z) { id = candidate; break; }
      }
    } else { bucket = []; buckets.set(hash, bucket); }
    if (id < 0) { id = firsts.length; firsts.push(vertex); bucket.push(id); }
    node[vertex] = id;
  }
  return { node, first: Int32Array.from(firsts) };
}
