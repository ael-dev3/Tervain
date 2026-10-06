import * as THREE from 'three';

/** A presentation repair for the reduced Meshy cast only. The hero retains its approved native PBR maps. */
export const NPC_SCULPT_NORMAL_STRENGTH = 0.38;
export const NPC_NORMAL_FORWARD_FLOOR = 0.65;
const CREASE_COSINE = Math.cos(50 * Math.PI / 180);
const EPSILON = 1e-20;

export interface NpcSurfaceReport {
  vertices: number;
  seamVertices: number;
  normalGroups: number;
  degenerateTriangles: number;
  opposedCorners: number;
  rebuiltTangents: boolean;
}

/** Exact positions AND skin bindings identify UV duplicates. Never weld geometry or cross a moving skin boundary. */
function seamKey(geometry: THREE.BufferGeometry, vertex: number): string {
  const position = geometry.getAttribute('position');
  let key = `${position.getX(vertex)},${position.getY(vertex)},${position.getZ(vertex)}`;
  const joints = geometry.getAttribute('skinIndex'), weights = geometry.getAttribute('skinWeight');
  if (joints && weights) {
    const pairs: string[] = [];
    for (let slot = 0; slot < joints.itemSize; slot++) pairs.push(`${joints.getComponent(vertex, slot)}:${weights.getComponent(vertex, slot)}`);
    key += `|${pairs.join(',')}`;
  }
  return key;
}

function unitOrFallback(target: THREE.Vector3, fallback: THREE.Vector3): THREE.Vector3 {
  if (target.lengthSq() > EPSILON) return target.normalize();
  return target.copy(fallback.lengthSq() > EPSILON ? fallback : new THREE.Vector3(0, 1, 0)).normalize();
}

/** Recompute shading on an OWNED clone. Positions, indices, UVs, skinning and bounds stay byte-for-byte unchanged.
 * Corner-angle weighting avoids large collapsed triangles dominating a detailed face. Imported normals only preserve
 * explicit crease/orientation islands; opposed folded surfaces cannot cancel each other or smooth through a garment.
 * This repairs shading, not the silhouette or topology, and makes no claim of retopology or new sculpt detail. */
export function repairNpcSurfaceGeometry(geometry: THREE.BufferGeometry): NpcSurfaceReport {
  const position = geometry.getAttribute('position');
  const original = geometry.getAttribute('normal');
  if (!position || !original || original.count !== position.count) throw new Error('NPC surface repair requires complete position and normal attributes.');
  const count = position.count, index = geometry.index;
  const sums = Array.from({ length: count }, () => new THREE.Vector3());
  const reference = Array.from({ length: count }, (_, vertex) => unitOrFallback(new THREE.Vector3().fromBufferAttribute(original, vertex), new THREE.Vector3(0, 1, 0)));
  const point = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const first = new THREE.Vector3(), second = new THREE.Vector3(), face = new THREE.Vector3();
  let degenerateTriangles = 0, opposedCorners = 0;
  const ids = [0, 0, 0];
  for (let offset = 0; offset < (index?.count ?? count); offset += 3) {
    for (let corner = 0; corner < 3; corner++) {
      ids[corner] = index ? index.getX(offset + corner) : offset + corner;
      point[corner]!.fromBufferAttribute(position, ids[corner]!);
    }
    face.crossVectors(first.subVectors(point[1]!, point[0]!), second.subVectors(point[2]!, point[0]!));
    if (face.lengthSq() <= EPSILON) { degenerateTriangles++; continue; }
    face.normalize();
    for (let corner = 0; corner < 3; corner++) {
      const vertex = ids[corner]!;
      // A reversed/sliver fold must not pull the front-facing garment/face normal into the opposite hemisphere.
      if (face.dot(reference[vertex]!) <= 0) { opposedCorners++; continue; }
      first.subVectors(point[(corner + 1) % 3]!, point[corner]!).normalize();
      second.subVectors(point[(corner + 2) % 3]!, point[corner]!).normalize();
      const angle = Math.acos(THREE.MathUtils.clamp(first.dot(second), -1, 1));
      sums[vertex]!.addScaledVector(face, angle);
    }
  }

  const buckets = new Map<string, number[]>();
  for (let vertex = 0; vertex < count; vertex++) {
    const key = seamKey(geometry, vertex), bucket = buckets.get(key);
    if (bucket) bucket.push(vertex); else buckets.set(key, [vertex]);
  }
  const normals = new Float32Array(count * 3);
  let seamVertices = 0, normalGroups = 0;
  for (const bucket of buckets.values()) {
    if (bucket.length > 1) seamVertices += bucket.length;
    const groups: number[][] = [];
    for (const vertex of bucket) {
      const geometric = unitOrFallback(sums[vertex]!.clone(), reference[vertex]!);
      const group = groups.find(members => members.every(member => {
        const other = unitOrFallback(sums[member]!.clone(), reference[member]!);
        return reference[vertex]!.dot(reference[member]!) >= CREASE_COSINE && geometric.dot(other) >= CREASE_COSINE;
      }));
      if (group) group.push(vertex); else groups.push([vertex]);
    }
    for (const group of groups) {
      normalGroups++;
      const smooth = new THREE.Vector3();
      for (const vertex of group) smooth.add(sums[vertex]!);
      unitOrFallback(smooth, reference[group[0]!]!);
      for (const vertex of group) smooth.toArray(normals, vertex * 3);
    }
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  const rebuiltTangents = geometry.hasAttribute('tangent') && geometry.hasAttribute('uv');
  if (rebuiltTangents) rebuildTangents(geometry);
  const report = { vertices: count, seamVertices, normalGroups, degenerateTriangles, opposedCorners, rebuiltTangents };
  geometry.userData.npcSurface = report;
  return report;
}

/** Rebuild tangent XYZ against repaired normals, retaining the input Blender bake's W convention. glTF UV V is
 * inverted on export; deriving W afresh from those UVs would invert the authored normal-map green direction. */
function rebuildTangents(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
  const old = geometry.getAttribute('tangent'), count = position.count, index = geometry.index;
  const along = Array.from({ length: count }, () => new THREE.Vector3());
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), edge1 = new THREE.Vector3(), edge2 = new THREE.Vector3();
  const tangent = new THREE.Vector3(), n = new THREE.Vector3();
  for (let offset = 0; offset < (index?.count ?? count); offset += 3) {
    const a = index ? index.getX(offset) : offset, b = index ? index.getX(offset + 1) : offset + 1, c = index ? index.getX(offset + 2) : offset + 2;
    p0.fromBufferAttribute(position, a); p1.fromBufferAttribute(position, b); p2.fromBufferAttribute(position, c);
    edge1.subVectors(p1, p0); edge2.subVectors(p2, p0);
    const du1 = uv.getX(b) - uv.getX(a), dv1 = uv.getY(b) - uv.getY(a), du2 = uv.getX(c) - uv.getX(a), dv2 = uv.getY(c) - uv.getY(a);
    const determinant = du1 * dv2 - du2 * dv1;
    if (Math.abs(determinant) < 1e-12) continue;
    tangent.copy(edge1).multiplyScalar(dv2).addScaledVector(edge2, -dv1).multiplyScalar(1 / determinant);
    for (const vertex of [a, b, c]) along[vertex]!.add(tangent);
  }
  const tangents = new Float32Array(count * 4), axis = new THREE.Vector3();
  for (let vertex = 0; vertex < count; vertex++) {
    n.fromBufferAttribute(normal, vertex);
    tangent.copy(along[vertex]!).addScaledVector(n, -n.dot(along[vertex]!));
    if (tangent.lengthSq() <= EPSILON) {
      axis.set(Math.abs(n.y) < 0.9 ? 0 : 1, Math.abs(n.y) < 0.9 ? 1 : 0, 0);
      tangent.crossVectors(axis, n);
    }
    tangent.normalize().toArray(tangents, vertex * 4);
    tangents[vertex * 4 + 3] = old.getW(vertex) < 0 ? -1 : 1;
  }
  geometry.setAttribute('tangent', new THREE.BufferAttribute(tangents, 4));
}

const repairedMaterials = new WeakSet<THREE.MeshStandardMaterial>();

/** Keep immutable image payloads/albedo intact. A source bake with negative Z cannot invert the lighting, including
 * at zero normalScale. Compose hooks/cache identities so an environmental or inspection patch remains effective. */
export function repairNpcSurfaceMaterial(material: THREE.MeshStandardMaterial): void {
  if (repairedMaterials.has(material) || !material.normalMap || material.normalMapType !== THREE.TangentSpaceNormalMap) return;
  repairedMaterials.add(material);
  material.normalScale.multiplyScalar(NPC_SCULPT_NORMAL_STRENGTH);
  const compile = material.onBeforeCompile, key = material.customProgramCacheKey;
  // THREE's default key reads this.onBeforeCompile. Capture its original hook identity before wrapping,
  // while custom keys remain live so material-dependent shader variants still invalidate correctly.
  const inheritedKey = key === THREE.Material.prototype.customProgramCacheKey ? compile.toString() : null;
  material.onBeforeCompile = function(shader, renderer) {
    compile.call(this, shader, renderer);
    const include = '#include <normal_fragment_maps>';
    if (shader.fragmentShader.includes(include)) shader.fragmentShader = shader.fragmentShader.replace(include, THREE.ShaderChunk.normal_fragment_maps);
    const scale = 'mapN.xy *= normalScale;';
    if (!shader.fragmentShader.includes(scale)) throw new Error('NPC forward-normal repair cannot find the standard tangent normal shader.');
    shader.fragmentShader = shader.fragmentShader.replace(scale,
      `// NPC bake safety: enforce a forward tangent hemisphere before the source strength.\n\tmapN.z = max( mapN.z, ${NPC_NORMAL_FORWARD_FLOOR.toFixed(6)} );\n\t${scale}`);
  };
  material.customProgramCacheKey = function() { return `${inheritedKey ?? key.call(this)}|tervain-npc-forward-normal-v1`; };
  material.needsUpdate = true;
}
