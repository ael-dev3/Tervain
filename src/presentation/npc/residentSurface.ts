import * as THREE from 'three';
import { weldExact } from './weld';

/**
 * Surfaces for the residents. The prepared models carry one soft 1536 px colour atlas and a damped normal bake, under a
 * single rough, non-metal response, so skin, wool, leather and steel all shade alike and read as wax or clay. Here the
 * colour itself, together with where a point sits on the body (face, neck, forearms and hands may be bare), decides
 * what each pixel is made of:
 * - skin keeps a finer sheen and lets light bleed a little past its shadow line, warmer there, as skin does;
 * - wool and linen stay matte, show their sculpted folds more strongly and catch a soft sheen at grazing angles;
 * - leather is a little glossier; on the armoured figures, bare steel is metal;
 * - close up, a fine procedural grain (skin texture, cloth weave, leather pebble, file marks on steel) is added in the
 *   figure's own bind space, so it stays put on the moving surface and fades out before it could shimmer.
 * The supplied images and geometry are unchanged; this is shading. Textures are also sampled anisotropically.
 *
 * Clothes come in layers: an apron's lining against the skirt, the skirt under the apron, legs inside the skirt, the
 * back under a cape. The bake never saw those covered surfaces and filled them with one dark slate. A deep bend across
 * the coarse cloth (a seated knee) can carry a covered layer a few centimetres through its cover, where it showed as
 * a dark shard. Covered layers therefore yield a few centimetres of depth to whatever covers them, and their backs,
 * which only show when they have been carried through, are not drawn (nor cast shadows).
 */
export const RESIDENT_SURFACE_KEY = 'tervain-resident-surface-v2';
export const RESIDENT_SHADOW_KEY = 'tervain-resident-hidden-shadow-v1';

export const RESIDENT_LOOK = {
  /** Anisotropic samples for the colour and normal maps. */
  anisotropy: 8,
  /** How far light wraps past skin's terminator (0 none), and the warm tint it takes. */
  skinWrap: 0.42,
  skinScatter: [1.0, 0.42, 0.3] as [number, number, number],
  /** Skin, leather and steel roughness; cloth keeps the model's own. */
  skinRoughness: 0.6,
  leatherRoughness: 0.74,
  metalRoughness: 0.52,
  /** Sculpted-fold strength on cloth and leather relative to the model's damped normal scale. */
  clothFolds: 1.55,
  /** Grazing sheen on cloth. */
  clothSheen: 0.14,
  /** Fine grain strength (0 off). */
  grain: 1,
  /** Unsharp mask on the colour atlas where a texel covers about a pixel or more. */
  sharpen: 0.85,
} as const;

/**
 * Per-vertex chance that a point may be bare skin, from where it is on the body: the head and neck, the forearms and
 * hands, and less the upper arms and the top of the chest (an open collar). The colour test decides the rest.
 */
export function residentSkinPrior(geometry: THREE.BufferGeometry, jointNames: readonly string[]): Float32Array {
  const position = geometry.getAttribute('position'), index = geometry.getAttribute('skinIndex'), weight = geometry.getAttribute('skinWeight');
  const prior = new Float32Array(position.count);
  for (let vertex = 0; vertex < position.count; vertex++) {
    let head = 0, fore = 0, upper = 0, torso = 0;
    for (let slot = 0; slot < 4; slot++) {
      const name = jointNames[index.getComponent(vertex, slot)], w = weight.getComponent(vertex, slot);
      if (name === 'head') head += w;
      else if (name === 'elbowL' || name === 'elbowR') fore += w;
      else if (name === 'armL' || name === 'armR') upper += w;
      else if (name === 'torso') torso += w;
    }
    const y = position.getY(vertex);
    const collar = Math.min(1, Math.max(0, (y - 1.24) / 0.16));
    prior[vertex] = Math.min(1, head + fore + 0.75 * upper + 0.8 * torso * collar);
  }
  return prior;
}

/** A surface with another this close in front of it, along its normal, is covered (metres). */
export const HIDDEN_GAP = 0.06;
/** A covered face's own lining, the back of the same cloth, lies within this depth behind it (metres). */
export const LINING_DEPTH = 0.035;
/** How far a covered layer yields in depth to whatever covers it (metres). */
export const HIDDEN_YIELD = 0.05;

/** A bone's span in the mesh's bind space: spine, arms to the palms, legs to the ankles. */
export type ResidentAxis = readonly [THREE.Vector3, THREE.Vector3];

/**
 * Per vertex, 1 where the point is covered at rest: another surface lies within {@link HIDDEN_GAP} in front of it
 * along its normal (a lining, a layer under an apron or coat, a leg inside a skirt), or it is the back of cloth whose
 * outer face (turned away from the nearest bone) is covered, so a covered layer never yields to its own lining. Arms,
 * hands and the head (with its hair) neither count as covered nor cover; they move against the body and the clothes
 * rather than inside them.
 */
export function residentHiddenLayers(geometry: THREE.BufferGeometry, jointNames: readonly string[],
  axes: readonly ResidentAxis[] = [[new THREE.Vector3(), new THREE.Vector3(0, 2, 0)]], gap = HIDDEN_GAP): Float32Array {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal'), index = geometry.index;
  const joints = geometry.getAttribute('skinIndex'), weights = geometry.getAttribute('skinWeight');
  const hidden = new Float32Array(position.count);
  if (!normal || !index) return hidden;
  const { node, first } = weldExact(position);
  const points = first.length, triangles = index.count / 3;
  const xyz = new Float32Array(position.count * 3);
  for (let vertex = 0; vertex < position.count; vertex++) {
    xyz[vertex * 3] = position.getX(vertex); xyz[vertex * 3 + 1] = position.getY(vertex); xyz[vertex * 3 + 2] = position.getZ(vertex);
  }
  const corners = new Uint32Array(index.count);
  for (let k = 0; k < index.count; k++) corners[k] = index.getX(k);
  // Each surface point's normal (the sum over its split vertices) and whether it moves with the arms or head.
  const pointNormal = new Float32Array(points * 3), free = new Uint8Array(points);
  const limb = jointNames.map(name => name === 'armL' || name === 'elbowL' || name === 'armR' || name === 'elbowR' || name === 'head');
  for (let vertex = 0; vertex < position.count; vertex++) {
    const at = node[vertex]!;
    pointNormal[at * 3] = pointNormal[at * 3]! + normal.getX(vertex);
    pointNormal[at * 3 + 1] = pointNormal[at * 3 + 1]! + normal.getY(vertex);
    pointNormal[at * 3 + 2] = pointNormal[at * 3 + 2]! + normal.getZ(vertex);
  }
  if (joints && weights) {
    for (let vertex = 0; vertex < position.count; vertex++) {
      const share = (limb[joints.getX(vertex)] ? weights.getX(vertex) : 0) + (limb[joints.getY(vertex)] ? weights.getY(vertex) : 0)
        + (limb[joints.getZ(vertex)] ? weights.getZ(vertex) : 0) + (limb[joints.getW(vertex)] ? weights.getW(vertex) : 0);
      if (share > 0.5) free[node[vertex]!] = 1;
    }
  }
  // Triangles in a uniform grid; each ray visits only the cells it passes through.
  const cell = 0.03, cells = new Map<number, number[]>();
  const key = (x: number, y: number, z: number) => (x + 512) + (y + 512) * 1024 + (z + 512) * 1048576;
  for (let t = 0; t < triangles; t++) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      const v = corners[t * 3 + k]! * 3, x = xyz[v]!, y = xyz[v + 1]!, z = xyz[v + 2]!;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z);
    }
    for (let ix = Math.floor(x0 / cell); ix <= Math.floor(x1 / cell); ix++) for (let iy = Math.floor(y0 / cell); iy <= Math.floor(y1 / cell); iy++) {
      for (let iz = Math.floor(z0 / cell); iz <= Math.floor(z1 / cell); iz++) {
        const k = key(ix, iy, iz);
        let list = cells.get(k);
        if (!list) { list = []; cells.set(k, list); }
        list.push(t);
      }
    }
  }
  const seen = new Int32Array(triangles).fill(-1), covered = new Uint8Array(points);
  let stamp = 0;
  /**
   * The nearest triangle of the body or its clothes that the ray from surface point `point` along unit (dx, dy, dz)
   * crosses within `reach`, or -1; `leaving`: only a face turned along the ray (the back of the same cloth, seen from
   * inside it); `any`: the first one found.
   */
  const cast = (point: number, dx: number, dy: number, dz: number, reach: number, leaving: boolean, any: boolean) => {
    stamp++;
    const v0 = first[point]! * 3, px = xyz[v0]!, py = xyz[v0 + 1]!, pz = xyz[v0 + 2]!;
    let hit = -1, nearest = reach;
    // Walk the grid cells along the ray (Amanatides and Woo).
    let ix = Math.floor(px / cell), iy = Math.floor(py / cell), iz = Math.floor(pz / cell);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const deltaX = dx !== 0 ? cell / Math.abs(dx) : Infinity, deltaY = dy !== 0 ? cell / Math.abs(dy) : Infinity, deltaZ = dz !== 0 ? cell / Math.abs(dz) : Infinity;
    let nextX = dx !== 0 ? ((ix + (dx > 0 ? 1 : 0)) * cell - px) / dx : Infinity;
    let nextY = dy !== 0 ? ((iy + (dy > 0 ? 1 : 0)) * cell - py) / dy : Infinity;
    let nextZ = dz !== 0 ? ((iz + (dz > 0 ? 1 : 0)) * cell - pz) / dz : Infinity;
    for (let travelled = 0; travelled <= nearest;) {
      for (const t of cells.get(key(ix, iy, iz)) ?? []) {
        if (seen[t] === stamp) continue;
        seen[t] = stamp;
        const a = corners[t * 3]!, b = corners[t * 3 + 1]!, c = corners[t * 3 + 2]!;
        if (node[a] === point || node[b] === point || node[c] === point) continue;
        if (free[node[a]!] && free[node[b]!] && free[node[c]!]) continue;
        // Moller-Trumbore: where does the ray cross this triangle?
        const ax = xyz[a * 3]!, ay = xyz[a * 3 + 1]!, az = xyz[a * 3 + 2]!;
        const e1x = xyz[b * 3]! - ax, e1y = xyz[b * 3 + 1]! - ay, e1z = xyz[b * 3 + 2]! - az;
        const e2x = xyz[c * 3]! - ax, e2y = xyz[c * 3 + 1]! - ay, e2z = xyz[c * 3 + 2]! - az;
        if (leaving) {
          const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
          if (nx * dx + ny * dy + nz * dz <= 0.2 * Math.hypot(nx, ny, nz)) continue;
        }
        const hx = dy * e2z - dz * e2y, hy = dz * e2x - dx * e2z, hz = dx * e2y - dy * e2x;
        const det = e1x * hx + e1y * hy + e1z * hz;
        if (Math.abs(det) < 1e-12) continue;
        const ox = px - ax, oy = py - ay, oz = pz - az;
        const u = (ox * hx + oy * hy + oz * hz) / det;
        if (u < 0 || u > 1) continue;
        const qx = oy * e1z - oz * e1y, qy = oz * e1x - ox * e1z, qz = ox * e1y - oy * e1x;
        const v = (dx * qx + dy * qy + dz * qz) / det;
        if (v < 0 || u + v > 1) continue;
        const along = (e2x * qx + e2y * qy + e2z * qz) / det;
        if (along > 1e-5 && along <= nearest) {
          nearest = along; hit = t;
          if (any) return hit;
        }
      }
      if (nextX < nextY && nextX < nextZ) { travelled = nextX; nextX += deltaX; ix += sx; }
      else if (nextY < nextZ) { travelled = nextY; nextY += deltaY; iy += sy; }
      else { travelled = nextZ; nextZ += deltaZ; iz += sz; }
    }
    return hit;
  };
  const direction = (point: number) => {
    const x = pointNormal[point * 3]!, y = pointNormal[point * 3 + 1]!, z = pointNormal[point * 3 + 2]!, length = Math.hypot(x, y, z);
    return length < 1e-9 ? null : [x / length, y / length, z / length] as const;
  };
  for (let point = 0; point < points; point++) {
    const d = free[point] ? null : direction(point);
    if (d && cast(point, d[0], d[1], d[2], gap, false, true) >= 0) covered[point] = 1;
  }
  // The back of a covered outer face's own cloth is covered too. (A lining is covered by the layer it lies against,
  // but the back of its cloth is the painted face: the side turned away from the nearest bone tells them apart.)
  const faces = covered.slice(), segment = new THREE.Line3(), at = new THREE.Vector3(), closest = new THREE.Vector3();
  for (let point = 0; point < points; point++) {
    const d = faces[point] ? direction(point) : null;
    if (!d) continue;
    at.fromArray(xyz, first[point]! * 3);
    let best = Infinity, ox = 0, oy = 0, oz = 0;
    for (const [from, to] of axes) {
      segment.set(from, to).closestPointToPoint(at, true, closest);
      const distance = closest.distanceToSquared(at);
      if (distance < best) { best = distance; ox = at.x - closest.x; oy = at.y - closest.y; oz = at.z - closest.z; }
    }
    if (d[0] * ox + d[1] * oy + d[2] * oz <= 0) continue;
    const behind = cast(point, -d[0], -d[1], -d[2], LINING_DEPTH, true, false);
    if (behind >= 0) for (let k = 0; k < 3; k++) { const back = node[corners[behind * 3 + k]!]!; if (!free[back]) covered[back] = 1; }
  }
  for (let vertex = 0; vertex < position.count; vertex++) hidden[vertex] = covered[node[vertex]!]!;
  return hidden;
}

const VERTEX_PARS = /* glsl */`
attribute float aTvSkin;
attribute float aTvHidden;
uniform float uTvYield;
varying float vTvSkin;
varying float vTvHidden;
varying vec3 vTvBind;
`;

const VERTEX_MAIN = /* glsl */`
vTvSkin = aTvSkin;
vTvHidden = aTvHidden;
vTvBind = position;
`;

const VERTEX_YIELD = /* glsl */`
if ( aTvHidden > 0.5 ) {
	// A covered layer yields this much depth to whatever covers it; where it is drawn on screen does not change.
	float tvZ = mvPosition.z - uTvYield;
	if ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ) gl_Position.z = ( projectionMatrix[ 2 ][ 2 ] * tvZ + projectionMatrix[ 3 ][ 2 ] ) / - tvZ * gl_Position.w;
	else gl_Position.z -= projectionMatrix[ 2 ][ 2 ] * uTvYield;
}
`;

const FRAGMENT_PARS = /* glsl */`
varying float vTvSkin;
varying float vTvHidden;
varying vec3 vTvBind;
uniform vec4 uTvLook; // skin wrap, cloth sheen, grain, metal allowed
uniform vec3 uTvScatter;
uniform vec4 uTvRough; // skin, leather, metal roughness, cloth fold boost
uniform float uTvSharpen;
float tvCavity = 1.0;
float tvSkinShade = 0.0;
float tvClothShade = 0.0;

float tvHash( vec3 p ) {
	p = fract( p * 0.3183099 + 0.1 );
	p *= 17.0;
	return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}
float tvNoise( vec3 x ) {
	vec3 i = floor( x ), f = fract( x );
	f = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( mix( tvHash( i ), tvHash( i + vec3( 1, 0, 0 ) ), f.x ), mix( tvHash( i + vec3( 0, 1, 0 ) ), tvHash( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
		mix( mix( tvHash( i + vec3( 0, 0, 1 ) ), tvHash( i + vec3( 1, 0, 1 ) ), f.x ), mix( tvHash( i + vec3( 0, 1, 1 ) ), tvHash( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
// A height field's slope on screen bends the normal (surface-gradient bump), without tangents.
vec3 tvBump( vec3 surfacePosition, vec3 surfaceNormal, float height ) {
	vec3 sigmaX = dFdx( surfacePosition ), sigmaY = dFdy( surfacePosition );
	vec3 r1 = cross( sigmaY, surfaceNormal ), r2 = cross( surfaceNormal, sigmaX );
	float det = dot( sigmaX, r1 );
	vec3 gradient = sign( det ) * ( dFdx( height ) * r1 + dFdy( height ) * r2 );
	return normalize( abs( det ) * surfaceNormal - gradient );
}
`;

const SHARPEN = /* glsl */`
#ifdef USE_MAP
{
	// The atlas is soft. Where a texel covers about a pixel or more, restore edge contrast with a small unsharp mask;
	// further away, mip filtering already does the right thing and the mask fades out.
	vec2 tvSize = vec2( textureSize( map, 0 ) );
	float tvTexels = length( fwidth( vMapUv ) * tvSize );
	float tvSharpen = uTvSharpen * ( 1.0 - smoothstep( 0.8, 1.8, tvTexels ) );
	if ( tvSharpen > 0.001 ) {
		vec2 tvStep = 0.85 / tvSize;
		vec3 tvAround = ( texture2D( map, vMapUv + vec2( tvStep.x, 0.0 ) ).rgb + texture2D( map, vMapUv - vec2( tvStep.x, 0.0 ) ).rgb
			+ texture2D( map, vMapUv + vec2( 0.0, tvStep.y ) ).rgb + texture2D( map, vMapUv - vec2( 0.0, tvStep.y ) ).rgb ) * 0.25;
		diffuseColor.rgb = max( diffuseColor.rgb + tvSharpen * ( sampledDiffuseColor.rgb - tvAround ) * diffuse, vec3( 0.0 ) );
	}
}
#endif
`;

const CLASSIFY = /* glsl */`
// What this pixel is made of, from its colour (linear light) and where it sits on the body.
float tvMax = max( max( diffuseColor.r, diffuseColor.g ), diffuseColor.b );
float tvMin = min( min( diffuseColor.r, diffuseColor.g ), diffuseColor.b );
float tvSat = ( tvMax - tvMin ) / max( tvMax, 1e-4 );
float tvLum = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
float tvWarm = step( diffuseColor.b, diffuseColor.g ) * step( diffuseColor.g, diffuseColor.r );
float tvRed = ( diffuseColor.g - diffuseColor.b ) / max( diffuseColor.r - diffuseColor.b, 1e-4 );
float tvSkin = vTvSkin * tvWarm * ( 1.0 - smoothstep( 0.34, 0.44, tvRed ) ) * smoothstep( 0.24, 0.38, tvSat ) * smoothstep( 0.012, 0.035, tvLum );
float tvLeather = ( 1.0 - tvSkin ) * tvWarm * smoothstep( 0.45, 0.7, tvSat ) * ( 1.0 - smoothstep( 0.05, 0.12, tvLum ) );
float tvMetal = uTvLook.w * ( 1.0 - tvSkin ) * ( 1.0 - smoothstep( 0.1, 0.22, tvSat ) ) * smoothstep( 0.03, 0.09, tvLum );
float tvCloth = ( 1.0 - tvSkin ) * ( 1.0 - tvLeather ) * ( 1.0 - tvMetal );
tvSkinShade = tvSkin;
tvClothShade = tvCloth;
// Fine grain fades out where a pixel covers more than a fraction of its wavelength.
float tvTexel = length( fwidth( vTvBind ) );
float tvNear = uTvLook.z * ( 1.0 - smoothstep( 0.0012, 0.004, tvTexel ) );
float tvGrainSkin = 0.5, tvGrainCloth = 0.5, tvGrainLeather = 0.5, tvMottle = 0.5;
if ( tvNear > 0.001 ) {
	tvGrainSkin = tvNoise( vTvBind * 160.0 ) * 0.7 + tvNoise( vTvBind * 520.0 ) * 0.3;
	tvGrainCloth = tvNoise( vTvBind * vec3( 380.0, 60.0, 380.0 ) ) * 0.55 + tvNoise( vTvBind * vec3( 60.0, 380.0, 60.0 ) ) * 0.45;
	tvGrainLeather = tvNoise( vTvBind * 240.0 );
	tvMottle = tvNoise( vTvBind * 45.0 );
}
// Colour grain: a skin's faint mottling, the weave's light and shade.
diffuseColor.rgb *= 1.0 + tvNear * ( tvSkin * ( tvMottle - 0.5 ) * 0.08 + tvCloth * ( tvGrainCloth - 0.5 ) * 0.12 + tvLeather * ( tvGrainLeather - 0.5 ) * 0.1 );
`;

const ROUGHNESS = /* glsl */`
roughnessFactor = mix( roughnessFactor, uTvRough.x * ( 0.9 + 0.2 * tvGrainSkin ), tvSkin );
roughnessFactor = mix( roughnessFactor, uTvRough.y * ( 0.85 + 0.3 * tvGrainLeather ), tvLeather );
roughnessFactor = mix( roughnessFactor, uTvRough.z, tvMetal );
`;

const METALNESS = /* glsl */`
metalnessFactor = mix( metalnessFactor * ( 1.0 - tvSkin ), 0.85, tvMetal );
`;

const NORMAL_BOOST = /* glsl */`
	// Cloth and leather show their sculpted folds more strongly than faces and hands; deep creases hold less light.
	mapN.xy *= mix( 1.0, uTvRough.w, max( tvCloth, tvLeather * 0.8 ) );
	tvCavity = 1.0 - 0.32 * smoothstep( 0.04, 0.3, length( mapN.xy ) ) * max( tvCloth, tvLeather );
`;

const GRAIN_NORMAL = /* glsl */`
if ( tvNear > 0.001 ) {
	float tvHeight = tvNear * ( tvSkin * tvGrainSkin * 0.00018 + tvCloth * tvGrainCloth * 0.00035 + tvLeather * tvGrainLeather * 0.00028
		+ tvMetal * tvNoise( vTvBind * vec3( 900.0, 30.0, 900.0 ) ) * 0.00012 );
	normal = tvBump( - vViewPosition, normal, tvHeight );
}
`;

const DIRECT = /* glsl */`
void RE_Direct_Resident( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	float ndl = dot( geometryNormal, directLight.direction );
	// Skin: light carried a little past the shadow line, warmer the deeper it goes.
	float wrap = saturate( ( ndl + uTvLook.x ) / ( 1.0 + uTvLook.x ) ) - saturate( ndl );
	reflectedLight.directDiffuse += tvSkinShade * wrap * directLight.color * BRDF_Lambert( material.diffuseColor ) * uTvScatter;
	// Cloth: fibres catch light at grazing angles (a soft, broad sheen, strongest on the lit side).
	float grazing = pow( 1.0 - saturate( dot( geometryNormal, geometryViewDir ) ), 3.0 );
	reflectedLight.directDiffuse += tvClothShade * uTvLook.y * grazing * saturate( ndl + 0.3 ) * directLight.color * material.diffuseColor;
}
#undef RE_Direct
#define RE_Direct RE_Direct_Resident
`;

const HIDDEN_BACK = /* glsl */`
	// A covered layer's back only shows where a bend has carried it through its cover: draw the cover instead.
	if ( ! gl_FrontFacing && vTvHidden > 0.5 ) discard;
`;

const installed = new WeakSet<THREE.Material>();

export interface ResidentSurface { uniforms: Record<string, THREE.IUniform> }

/**
 * Install the resident surface on one actor's private material; `geometry` gains the per-vertex skin prior and the
 * covered layers ({@link residentHiddenLayers}; none when not given). Earlier hooks and cache keys (the normal-bake
 * repair, dual-quaternion skinning) are composed.
 */
export function installResidentSurface(material: THREE.MeshStandardMaterial, geometry: THREE.BufferGeometry, prior: Float32Array,
  options: { metal?: boolean; hidden?: Float32Array } = {}): ResidentSurface {
  if (!geometry.getAttribute('aTvSkin')) geometry.setAttribute('aTvSkin', new THREE.BufferAttribute(prior, 1));
  if (!geometry.getAttribute('aTvHidden')) geometry.setAttribute('aTvHidden', new THREE.BufferAttribute(options.hidden ?? new Float32Array(prior.length), 1));
  for (const texture of [material.map, material.normalMap]) {
    if (texture && texture.anisotropy !== RESIDENT_LOOK.anisotropy) { texture.anisotropy = RESIDENT_LOOK.anisotropy; texture.needsUpdate = true; }
  }
  const uniforms = {
    uTvLook: { value: new THREE.Vector4(RESIDENT_LOOK.skinWrap, RESIDENT_LOOK.clothSheen, RESIDENT_LOOK.grain, options.metal ? 1 : 0) },
    uTvScatter: { value: new THREE.Vector3(...RESIDENT_LOOK.skinScatter) },
    uTvRough: { value: new THREE.Vector4(RESIDENT_LOOK.skinRoughness, RESIDENT_LOOK.leatherRoughness, RESIDENT_LOOK.metalRoughness, RESIDENT_LOOK.clothFolds) },
    uTvSharpen: { value: RESIDENT_LOOK.sharpen },
    uTvYield: { value: HIDDEN_YIELD },
  };
  if (installed.has(material)) return { uniforms };
  installed.add(material);
  const compile = material.onBeforeCompile, key = material.customProgramCacheKey;
  const inherited = key === THREE.Material.prototype.customProgramCacheKey ? compile.toString() : null;
  material.onBeforeCompile = function(shader, renderer) {
    compile.call(this, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    const need = (source: string, chunk: string) => {
      if (!source.includes(chunk)) throw new Error(`Resident surface cannot find ${chunk}.`);
    };
    for (const chunk of ['#include <common>', '#include <begin_vertex>', '#include <project_vertex>']) need(shader.vertexShader, chunk);
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERTEX_PARS}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_MAIN}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERTEX_YIELD}`);
    let fragment = shader.fragmentShader;
    for (const chunk of ['#include <common>', '#include <clipping_planes_fragment>', '#include <lights_physical_pars_fragment>', '#include <map_fragment>',
      '#include <roughnessmap_fragment>', '#include <metalnessmap_fragment>', '#include <lights_fragment_end>']) need(fragment, chunk);
    fragment = fragment.replace('#include <common>', `#include <common>\n${FRAGMENT_PARS}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${HIDDEN_BACK}`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${DIRECT}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\n${SHARPEN}\n${CLASSIFY}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n\treflectedLight.directDiffuse *= tvCavity;\n\treflectedLight.indirectDiffuse *= tvCavity;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${ROUGHNESS}`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${METALNESS}`)
      .replace('mapN.xy *= normalScale;', `mapN.xy *= normalScale;\n${NORMAL_BOOST}`);
    // The grain bends the final shading normal, after the normal map.
    const maps = fragment.indexOf('#include <clearcoat_normal_fragment_begin>');
    if (maps < 0) throw new Error('Resident surface cannot find the end of the normal chunks.');
    fragment = `${fragment.slice(0, maps)}${GRAIN_NORMAL}\n${fragment.slice(maps)}`;
    shader.fragmentShader = fragment;
  };
  material.customProgramCacheKey = function() { return `${inherited ?? key.call(this)}|${RESIDENT_SURFACE_KEY}`; };
  material.needsUpdate = true;
  return { uniforms };
}

/**
 * Covered layers' backs are dropped from the skin's shadow passes too (its depth and distance materials), so a layer a
 * bend has carried through its cover does not shade it. Earlier hooks and keys are composed.
 */
export function patchResidentShadow(material: THREE.MeshDepthMaterial | THREE.MeshDistanceMaterial): void {
  if (installed.has(material)) return;
  installed.add(material);
  const compile = material.onBeforeCompile, key = material.customProgramCacheKey;
  const inherited = key === THREE.Material.prototype.customProgramCacheKey ? compile.toString() : null;
  material.onBeforeCompile = function(shader, renderer) {
    compile.call(this, shader, renderer);
    for (const [source, chunk] of [[shader.vertexShader, '#include <common>'], [shader.vertexShader, '#include <begin_vertex>'],
      [shader.fragmentShader, '#include <common>'], [shader.fragmentShader, '#include <clipping_planes_fragment>']] as const) {
      if (!source.includes(chunk)) throw new Error(`Resident hidden-layer shadow cannot find ${chunk}.`);
    }
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float aTvHidden;\nvarying float vTvHidden;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTvHidden = aTvHidden;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vTvHidden;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${HIDDEN_BACK}`);
  };
  material.customProgramCacheKey = function() { return `${inherited ?? key.call(this)}|${RESIDENT_SHADOW_KEY}`; };
  material.needsUpdate = true;
}
