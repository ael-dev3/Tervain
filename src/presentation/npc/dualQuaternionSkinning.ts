import * as THREE from 'three';

/**
 * Dual-quaternion skinning for the residents' eleven-joint skins.
 *
 * Linear blending averages bone matrices. Where two joints share a vertex and turn far apart (a raised arm, a seated
 * hip, a bent knee, a crossed forearm) the averaged matrix shrinks, so elbows pinch, shoulders cave in and twisted
 * sleeves collapse into a wrapper. Blending each joint's rigid motion as a unit dual quaternion keeps the surface at its
 * length and volume instead. The rig, its weights and every other system that reads the joints stay as they are; only
 * the vertex stage changes.
 *
 * The rigid motions, relative to the mesh as bound, are packed after the joint matrices in the skeleton's own bone
 * texture. Three binds that texture for every skinned draw and uploads it once a frame when the skeleton updates, so the
 * colour pass, the sun's shadow pass and any lantern shadow all read the same frame.
 */
export const NPC_DQ_SKINNING_KEY = 'tervain-npc-dq-skinning-v1';

const DQ_FIELDS = 8;

export interface DualQuaternionSkin {
  /** Texel where the first joint's rotation is stored; its translation follows. */
  readonly base: number;
  /** Rigid motion of each joint relative to the bound mesh: real xyzw, dual xyzw. */
  readonly motions: Float32Array;
  /** Refreshes the motions from the current joint matrices (normally done by the skeleton's own update). */
  refresh(): void;
  /** Releases the extra shadow materials; the skeleton's texture goes with the skeleton. */
  dispose(): void;
}

const _relative = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _scale = new THREE.Vector3();

/** Rigid transform → unit dual quaternion (real xyzw, dual xyzw) written at `offset`. */
export function writeDualQuaternion(matrix: THREE.Matrix4, out: Float32Array, offset: number): void {
  matrix.decompose(_position, _rotation, _scale);
  // Keep one hemisphere so equal motions always compare as equal; the shader also aligns each blend to its heaviest joint.
  if (_rotation.w < 0) _rotation.set(-_rotation.x, -_rotation.y, -_rotation.z, -_rotation.w);
  const { x: qx, y: qy, z: qz, w: qw } = _rotation;
  const { x: tx, y: ty, z: tz } = _position;
  out[offset] = qx; out[offset + 1] = qy; out[offset + 2] = qz; out[offset + 3] = qw;
  out[offset + 4] = 0.5 * (tx * qw + ty * qz - tz * qy);
  out[offset + 5] = 0.5 * (-tx * qz + ty * qw + tz * qx);
  out[offset + 6] = 0.5 * (tx * qy - ty * qx + tz * qw);
  out[offset + 7] = -0.5 * (tx * qx + ty * qy + tz * qz);
}

/**
 * CPU twin of the shader blend, for audits and tests: the skinned position of `point` (bound mesh space) under joints
 * `index` with `weight`, using motions laid out as {@link DualQuaternionSkin.motions}.
 */
export function blendDualQuaternions(motions: ArrayLike<number>, index: ArrayLike<number>, weight: ArrayLike<number>,
  point: THREE.Vector3, normal?: THREE.Vector3): THREE.Vector3 {
  let heaviest = 0;
  for (let slot = 1; slot < 4; slot++) if (weight[slot]! > weight[heaviest]!) heaviest = slot;
  const ref = index[heaviest]! * DQ_FIELDS;
  let rx = 0, ry = 0, rz = 0, rw = 0, dx = 0, dy = 0, dz = 0, dw = 0;
  for (let slot = 0; slot < 4; slot++) {
    const w = weight[slot]!;
    if (!(w > 0)) continue;
    const o = index[slot]! * DQ_FIELDS;
    const dot = motions[o]! * motions[ref]! + motions[o + 1]! * motions[ref + 1]! + motions[o + 2]! * motions[ref + 2]! + motions[o + 3]! * motions[ref + 3]!;
    const s = dot < 0 ? -w : w;
    rx += s * motions[o]!; ry += s * motions[o + 1]!; rz += s * motions[o + 2]!; rw += s * motions[o + 3]!;
    dx += s * motions[o + 4]!; dy += s * motions[o + 5]!; dz += s * motions[o + 6]!; dw += s * motions[o + 7]!;
  }
  const length = Math.hypot(rx, ry, rz, rw) || 1;
  rx /= length; ry /= length; rz /= length; rw /= length;
  dx /= length; dy /= length; dz /= length; dw /= length;
  const rotate = (v: THREE.Vector3) => {
    // v + 2 r × (r × v + w v)
    const cx = ry * v.z - rz * v.y + rw * v.x, cy = rz * v.x - rx * v.z + rw * v.y, cz = rx * v.y - ry * v.x + rw * v.z;
    return v.set(v.x + 2 * (ry * cz - rz * cy), v.y + 2 * (rz * cx - rx * cz), v.z + 2 * (rx * cy - ry * cx));
  };
  rotate(point);
  point.x += 2 * (rw * dx - dw * rx + (ry * dz - rz * dy));
  point.y += 2 * (rw * dy - dw * ry + (rz * dx - rx * dz));
  point.z += 2 * (rw * dz - dw * rz + (rx * dy - ry * dx));
  if (normal) rotate(normal);
  return point;
}

const DQ_PARS = /* glsl */`
#ifdef USE_SKINNING
	vec4 tvDqTexel( const in int j ) {
		int size = textureSize( boneTexture, 0 ).x;
		return texelFetch( boneTexture, ivec2( j % size, j / size ), 0 );
	}
	vec3 tvDqRotate( const in vec4 r, const in vec3 v ) {
		return v + 2.0 * cross( r.xyz, cross( r.xyz, v ) + r.w * v );
	}
#endif
`;

const DQ_BASE = /* glsl */`
#ifdef USE_SKINNING
	// Dual-quaternion skin (${NPC_DQ_SKINNING_KEY}): each joint's rigid motion, aligned to the heaviest, blended and renormalised.
	int tvDqJoint0 = TV_DQ_BASE + int( skinIndex.x ) * 2;
	int tvDqJoint1 = TV_DQ_BASE + int( skinIndex.y ) * 2;
	int tvDqJoint2 = TV_DQ_BASE + int( skinIndex.z ) * 2;
	int tvDqJoint3 = TV_DQ_BASE + int( skinIndex.w ) * 2;
	vec4 tvDqR0 = tvDqTexel( tvDqJoint0 ), tvDqD0 = tvDqTexel( tvDqJoint0 + 1 );
	vec4 tvDqR1 = tvDqTexel( tvDqJoint1 ), tvDqD1 = tvDqTexel( tvDqJoint1 + 1 );
	vec4 tvDqR2 = tvDqTexel( tvDqJoint2 ), tvDqD2 = tvDqTexel( tvDqJoint2 + 1 );
	vec4 tvDqR3 = tvDqTexel( tvDqJoint3 ), tvDqD3 = tvDqTexel( tvDqJoint3 + 1 );
	vec4 tvDqRef = tvDqR0;
	float tvDqHeaviest = skinWeight.x;
	if ( skinWeight.y > tvDqHeaviest ) { tvDqRef = tvDqR1; tvDqHeaviest = skinWeight.y; }
	if ( skinWeight.z > tvDqHeaviest ) { tvDqRef = tvDqR2; tvDqHeaviest = skinWeight.z; }
	if ( skinWeight.w > tvDqHeaviest ) { tvDqRef = tvDqR3; }
	vec4 tvDqSign = vec4(
		dot( tvDqRef, tvDqR0 ) < 0.0 ? - skinWeight.x : skinWeight.x,
		dot( tvDqRef, tvDqR1 ) < 0.0 ? - skinWeight.y : skinWeight.y,
		dot( tvDqRef, tvDqR2 ) < 0.0 ? - skinWeight.z : skinWeight.z,
		dot( tvDqRef, tvDqR3 ) < 0.0 ? - skinWeight.w : skinWeight.w );
	vec4 tvDqReal = tvDqSign.x * tvDqR0 + tvDqSign.y * tvDqR1 + tvDqSign.z * tvDqR2 + tvDqSign.w * tvDqR3;
	vec4 tvDqDual = tvDqSign.x * tvDqD0 + tvDqSign.y * tvDqD1 + tvDqSign.z * tvDqD2 + tvDqSign.w * tvDqD3;
	float tvDqLength = max( length( tvDqReal ), 1e-6 );
	tvDqReal /= tvDqLength;
	tvDqDual /= tvDqLength;
#endif
`;

const DQ_NORMAL = /* glsl */`
#ifdef USE_SKINNING
	objectNormal = tvDqRotate( tvDqReal, objectNormal );
	#ifdef USE_TANGENT
		objectTangent = tvDqRotate( tvDqReal, objectTangent );
	#endif
#endif
`;

const DQ_POSITION = /* glsl */`
#ifdef USE_SKINNING
	transformed = tvDqRotate( tvDqReal, transformed )
		+ 2.0 * ( tvDqReal.w * tvDqDual.xyz - tvDqDual.w * tvDqReal.xyz + cross( tvDqReal.xyz, tvDqDual.xyz ) );
#endif
`;

const patched = new WeakSet<THREE.Material>();
const skins = new WeakMap<THREE.SkinnedMesh, DualQuaternionSkin>();

/** The dual-quaternion state of a resident mesh, for audits and review tools. */
export function dualQuaternionSkinOf(mesh: THREE.SkinnedMesh): DualQuaternionSkin | null {
  return skins.get(mesh) ?? null;
}

/** Replace the three skinning chunks of a material's vertex stage, composing any earlier hook and cache key. */
export function patchDualQuaternionMaterial(material: THREE.Material, base: number): void {
  if (patched.has(material)) return;
  patched.add(material);
  const compile = material.onBeforeCompile, key = material.customProgramCacheKey;
  const inherited = key === THREE.Material.prototype.customProgramCacheKey ? compile.toString() : null;
  material.onBeforeCompile = function(shader, renderer) {
    compile.call(this, shader, renderer);
    let vertex = shader.vertexShader;
    for (const chunk of ['skinning_pars_vertex', 'skinbase_vertex', 'skinning_vertex']) {
      if (!vertex.includes(`#include <${chunk}>`)) throw new Error(`Resident dual-quaternion skinning cannot find <${chunk}>.`);
    }
    vertex = vertex.replace('#include <skinning_pars_vertex>', `#include <skinning_pars_vertex>\n#define TV_DQ_BASE ${base}\n${DQ_PARS}`)
      .replace('#include <skinbase_vertex>', DQ_BASE)
      .replace('#include <skinning_vertex>', DQ_POSITION);
    // Depth and distance passes only include the normal chunk for displacement maps; colour passes always do.
    if (vertex.includes('#include <skinnormal_vertex>')) vertex = vertex.replace('#include <skinnormal_vertex>', DQ_NORMAL);
    shader.vertexShader = vertex;
  };
  material.customProgramCacheKey = function() { return `${inherited ?? key.call(this)}|${NPC_DQ_SKINNING_KEY}-${base}`; };
  material.needsUpdate = true;
}

/**
 * Install dual-quaternion skinning on one actor's private skinned mesh and materials. The skeleton must belong to this
 * mesh alone (each resident owns a cloned skeleton). Shadows use matching depth/distance materials so the cast shape
 * follows the drawn one; `shadowSource` lends its side setting.
 */
export function installDualQuaternionSkinning(mesh: THREE.SkinnedMesh): DualQuaternionSkin {
  const skeleton = mesh.skeleton;
  const bones = skeleton.bones.length;
  const base = bones * 4;
  const texels = base + bones * 2;
  const size = Math.max(4, Math.ceil(Math.sqrt(texels) / 4) * 4);
  const data = new Float32Array(size * size * 4);
  if (skeleton.boneMatrices) data.set(skeleton.boneMatrices.subarray(0, bones * 16));
  skeleton.boneTexture?.dispose();
  skeleton.boneMatrices = data;
  skeleton.boneTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  skeleton.boneTexture.needsUpdate = true;
  const motions = data.subarray(base * 4, base * 4 + bones * DQ_FIELDS);
  const boneMatrix = new THREE.Matrix4();
  const refresh = () => {
    for (let i = 0; i < bones; i++) {
      boneMatrix.fromArray(data, i * 16);
      _relative.multiplyMatrices(mesh.bindMatrixInverse, boneMatrix).multiply(mesh.bindMatrix);
      writeDualQuaternion(_relative, motions, i * DQ_FIELDS);
    }
  };
  const update = skeleton.update;
  skeleton.update = function() {
    update.call(this);
    refresh();
  };
  // A texture rebuilt by the renderer would drop the motions: keep this layout for the skeleton's whole life.
  skeleton.computeBoneTexture = function() { return this; };
  refresh();

  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const material of materials) patchDualQuaternionMaterial(material, base);
  const side = materials[0]?.side ?? THREE.FrontSide;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side });
  const distance = new THREE.MeshDistanceMaterial({ side });
  patchDualQuaternionMaterial(depth, base); patchDualQuaternionMaterial(distance, base);
  mesh.customDepthMaterial = depth;
  mesh.customDistanceMaterial = distance;
  mesh.userData.npcDualQuaternion = { base, bones, texture: size };
  const skin: DualQuaternionSkin = { base, motions, refresh, dispose() { depth.dispose(); distance.dispose(); } };
  skins.set(mesh, skin);
  return skin;
}
