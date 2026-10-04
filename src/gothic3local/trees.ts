import * as THREE from 'three';
import type { MaterialOptions } from './shading';
import type { BranchLevel, SpeedTreeDef } from './speedtree';

/**
 * Trees grown from a SpeedTree definition's parameters. SpeedTree's own growth algorithm is not public, so this is
 * this viewer's own: a trunk and branch levels as tapered tubes, sized and angled from the definition's levels, and a
 * crown of leaf cards (a leaf cluster of the tree's composite image, see leafatlas.ts) that turn to face the camera as
 * SpeedTree's do: an ellipsoid for broad-leaved trees, a cone for needle trees. It aims at a believable silhouette,
 * the right bark and foliage and the right size, not SpeedTree's exact geometry.
 *
 * Geometry is in the tree's own space (centimetres, Y up), wound counter-clockwise outside as Three.js expects; the
 * world group's mirror keeps it front-facing.
 */

export interface TreeGeometry {
  bark: THREE.BufferGeometry;
  leaves: THREE.BufferGeometry;
  barkImage: string;
  leafImage: string;
  conifer: boolean;
  /** Centimetres, for the sway. */
  height: number;
}

/** A leaf image's part of its texture: u0, v0 (top), u1, v1 (bottom). */
export type LeafRegion = [number, number, number, number];

/** Needle trees grow differently and take needle clusters. */
export function isConifer(name: string): boolean {
  return /fir|pine|cypress|spruce|yew|cedar/i.test(name) && !/pinoak/i.test(name);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

interface Branch {
  start: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  radius: number;
  level: number;
}

class Builder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly uvs: number[] = [];
  readonly indices: number[] = [];
  /** For leaves: each corner's offset from the card's centre, applied facing the camera (see leafMaterial). */
  readonly corners: number[] = [];
  /** How far a card reaches beyond its centre, for the bounds. */
  reach = 0;

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    if (this.corners.length) g.setAttribute('g3corner', new THREE.Float32BufferAttribute(this.corners, 2));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    // Cards grow out of their centres when drawn.
    g.boundingSphere!.radius += this.reach;
    g.boundingBox!.expandByScalar(this.reach);
    return g;
  }
}

const UP = new THREE.Vector3(0, 1, 0);

function perpendicular(d: THREE.Vector3): THREE.Vector3 {
  const a = Math.abs(d.y) < 0.9 ? UP : new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3().crossVectors(d, a).normalize();
}

/** A tapered tube along a slightly bending path. */
function tube(b: Builder, branch: Branch, sides: number, segments: number, bend: THREE.Vector3, endRadius: number): void {
  const base = b.positions.length / 3;
  const side = perpendicular(branch.dir);
  const up = new THREE.Vector3().crossVectors(side, branch.dir).normalize();
  const circumference = 2 * Math.PI * branch.radius;
  for (let s = 0; s <= segments; s++) {
    const t = s / segments;
    const center = branch.start.clone().addScaledVector(branch.dir, branch.length * t).addScaledVector(bend, t * t * branch.length);
    const r = branch.radius + (endRadius - branch.radius) * t;
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      const n = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a));
      const p = center.clone().addScaledVector(n, r);
      b.positions.push(p.x, p.y, p.z);
      b.normals.push(n.x, n.y, n.z);
      b.uvs.push(k / sides, (t * branch.length) / Math.max(circumference, 1));
    }
  }
  const row = sides + 1;
  for (let s = 0; s < segments; s++) {
    for (let k = 0; k < sides; k++) {
      const a = base + s * row + k;
      const c = a + row;
      b.indices.push(a, a + 1, c, a + 1, c + 1, c);
    }
  }
}

/**
 * A leaf card that turns to face the camera, as SpeedTree's leaves do: its four corners sit at its centre and carry
 * their offsets (turned by `spin`) for the shader. The normal leans out from the crown's centre, so the crown is lit
 * as a volume.
 */
function facingCard(b: Builder, center: THREE.Vector3, size: number, spin: number, region: LeafRegion, crown: THREE.Vector3): void {
  const base = b.positions.length / 3;
  const out = center.clone().sub(crown).normalize().lerp(UP, 0.45).normalize();
  const h = size / 2;
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  // Images are stored top row first: the region's v0 is the top of the leaf image.
  const corners: [number, number, number, number][] = [
    [-h, -h, region[0], region[3]],
    [h, -h, region[2], region[3]],
    [h, h, region[2], region[1]],
    [-h, h, region[0], region[1]],
  ];
  for (const [x, y, u, v] of corners) {
    b.positions.push(center.x, center.y, center.z);
    b.normals.push(out.x, out.y, out.z);
    b.uvs.push(u, v);
    b.corners.push(x * c - y * s, x * s + y * c);
  }
  b.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  b.reach = Math.max(b.reach, h * Math.SQRT2);
}

function pick(v: { min: number; max: number }, r: () => number): number {
  return v.min + (v.max - v.min) * r();
}

/**
 * Grow a tree. `leafRegion` is the part of the leaf image the cards show (a cluster of a composite image, see
 * leafatlas.ts); without it the whole image is used.
 */
export function growTree(name: string, def: SpeedTreeDef, leafRegion: LeafRegion | null = null): TreeGeometry {
  const r = rng(hash(name));
  const conifer = isConifer(name);
  const size = def.size > 50 ? def.size : 600;
  const levels: BranchLevel[] = def.levels.length ? def.levels : [{ length: { min: 0.7, max: 0.7, variance: 0 }, radius: { min: 0.03, max: 0.03, variance: 0 }, angle: { min: -90, max: -90, variance: 0 }, frequency: 6 }];
  // The last level of a definition places leaves; the ones before it are wood.
  const woodLevels = Math.max(1, Math.min(3, levels.length - 1));
  const bark = new Builder();
  const leaves = new Builder();
  const region: LeafRegion = leafRegion ?? [0, 0, 1, 1];

  const trunkLength = Math.max(0.2, levels[0]!.length.max || 0.7) * size;
  const trunkRadius = Math.max(4, ((levels[0]!.radius.max || 0.03) * size) / 2);
  const trunk: Branch = { start: new THREE.Vector3(0, -10, 0), dir: UP.clone(), length: trunkLength + 10, radius: trunkRadius, level: 0 };
  const lean = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).multiplyScalar(0.06);
  tube(bark, trunk, conifer ? 7 : 9, 6, lean, trunkRadius * 0.25);

  const tips: Branch[] = [];
  let parents: Branch[] = [trunk];
  for (let level = 1; level <= woodLevels; level++) {
    const spec = levels[level] ?? levels[levels.length - 1]!;
    const parentSpec = levels[level - 1]!;
    const children: Branch[] = [];
    const countCap = level === 1 ? (conifer ? 28 : 9) : conifer ? 3 : 5;
    for (const parent of parents) {
      const count = Math.max(level === 1 ? 3 : 2, Math.min(countCap, Math.round(parentSpec.frequency || 6)));
      const from = level === 1 ? (conifer ? 0.18 : 0.45) : 0.25;
      for (let i = 0; i < count; i++) {
        const t = from + (1 - from) * ((i + r() * 0.6) / count);
        const start = parent.start.clone().addScaledVector(parent.dir, parent.length * t);
        // Angle from the parent's axis, around it by the golden angle.
        const angle = THREE.MathUtils.degToRad(Math.min(110, Math.max(8, pick(spec.angle, r) || 45)));
        const around = i * 2.39996 + r() * 0.5;
        const side = perpendicular(parent.dir);
        const q = new THREE.Quaternion().setFromAxisAngle(parent.dir, around);
        const out = side.applyQuaternion(q);
        const dir = parent.dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(out, Math.sin(angle)).normalize();
        if (conifer && level === 1) dir.y = Math.min(dir.y, -0.05 + 0.3 * (1 - t));
        dir.normalize();
        // Lengths relative to the parent; conifer branches shorten towards the top.
        let length = Math.max(0.05, pick(spec.length, r) || 0.3) * (level === 1 ? size * (conifer ? 0.9 : 1) : parent.length);
        if (conifer && level === 1) length *= 0.35 + 0.65 * (1 - t);
        if (level === 1 && !conifer) length = Math.min(length, size * 0.55);
        const radius = Math.max(1.2, Math.min(parent.radius * 0.6, ((spec.radius.max || 0.01) * size) / 2));
        const child: Branch = { start, dir, length, radius, level };
        children.push(child);
        const droop = new THREE.Vector3(0, conifer ? -0.12 : -0.08, 0);
        tube(bark, child, level === 1 ? 6 : 4, level === 1 ? 4 : 2, droop, radius * 0.3);
      }
    }
    tips.push(...children.filter(() => level === woodLevels));
    parents = children;
  }

  // Foliage: leaf clusters filling the crown's shape, most of them near its surface, a few at the branch ends.
  const height = trunkLength;
  if (conifer) {
    // A cone from low on the trunk to the top, narrowing upwards.
    const y0 = height * 0.14;
    const y1 = height * 1.02;
    const radius = Math.max(120, size * 0.2);
    const count = Math.round(50 + (size / 100) * 3.5);
    for (let i = 0; i < count; i++) {
      const t = Math.pow(r(), 0.85);
      const y = y0 + t * (y1 - y0);
      const reach = radius * Math.pow(1 - t, 0.9) + 20;
      const a = r() * Math.PI * 2;
      const d = reach * (0.35 + 0.65 * Math.sqrt(r()));
      const at = new THREE.Vector3(Math.cos(a) * d, y - d * 0.15, Math.sin(a) * d);
      facingCard(leaves, at, Math.max(70, reach * 0.95 + 30) * (0.85 + 0.3 * r()), (r() - 0.5) * 1.2, region, new THREE.Vector3(0, y, 0));
    }
  } else {
    // An ellipsoid around the upper branches, flatter underneath.
    const centre = new THREE.Vector3(0, height * 0.78, 0);
    const across = size * (0.27 + 0.08 * r());
    const up = size * (0.22 + 0.06 * r());
    const card = size * 0.3;
    const count = Math.round(45 + (size / 100) * 6);
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(r() * 2 - 1, r() * 1.6 - 0.6, r() * 2 - 1);
      if (dir.lengthSq() < 1e-4) continue;
      dir.normalize();
      const d = 0.55 + 0.45 * Math.sqrt(r());
      const at = new THREE.Vector3(dir.x * across * d, dir.y * up * d, dir.z * across * d).add(centre);
      facingCard(leaves, at, card * (0.75 + 0.5 * r()), (r() - 0.5) * 1.0, region, centre);
    }
    for (const tip of tips) {
      if (r() < 0.5) continue;
      const at = tip.start.clone().addScaledVector(tip.dir, tip.length);
      facingCard(leaves, at, card * (0.6 + 0.4 * r()), (r() - 0.5) * 1.0, region, centre);
    }
  }
  return {
    bark: bark.geometry(),
    leaves: leaves.geometry(),
    barkImage: def.bark,
    leafImage: def.composite || def.leaf,
    conifer,
    height: Math.max(height, size * 0.5),
  };
}

/** A sway that grows with height, the same for wood and leaves so they stay together. */
function patchSway(shader: THREE.WebGLProgramParametersWithUniforms, options: MaterialOptions, height: number): void {
  shader.uniforms.g3Time = options.time;
  shader.uniforms.g3TreeHeight = { value: height };
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
      uniform float g3Time;
      uniform float g3TreeHeight;`,
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      {
        vec3 g3Base = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float g3Phase = dot(g3Base.xz, vec2(0.0037, 0.0051));
        float g3h = clamp(position.y / g3TreeHeight, 0.0, 1.0);
        float g3Sway = g3h * g3h * (0.012 * g3TreeHeight);
        transformed.x += g3Sway * sin(g3Time * 0.9 + g3Phase);
        transformed.z += g3Sway * 0.7 * cos(g3Time * 0.7 + g3Phase * 1.3);
      }`,
    );
}

/** Leaf cards' corners spread out facing the camera (or the sun, when drawing shadows). */
function patchFacing(shader: THREE.WebGLProgramParametersWithUniforms): void {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec2 g3corner;')
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        // One unit of the tree's own space, as seen: instance scale and the world's centimetres included.
        float g3Unit = length((modelViewMatrix * instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
        mvPosition.xy += g3corner * g3Unit;
        gl_Position = projectionMatrix * mvPosition;
      }`,
    );
}

function patchOverbright(shader: THREE.WebGLProgramParametersWithUniforms, options: MaterialOptions): void {
  shader.uniforms.g3Overbright = options.overbright;
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform float g3Overbright;')
    .replace('#include <opaque_fragment>', 'outgoingLight *= g3Overbright;\n#include <opaque_fragment>');
}

/** Bark: lit like the game's materials, swaying with its leaves. */
export function barkMaterial(map: THREE.Texture | null, options: MaterialOptions, height: number, name: string): THREE.Material {
  const material = new THREE.MeshLambertMaterial({ map, color: map ? 0xffffff : 0x6b6450 });
  material.name = `${name} bark`;
  material.onBeforeCompile = (shader) => {
    patchSway(shader, options, height);
    patchOverbright(shader, options);
  };
  material.customProgramCacheKey = () => 'g3bark';
  return material;
}

/** Leaf materials: a lit one, and the one their shadows are drawn with. */
export function leafMaterials(map: THREE.Texture | null, options: MaterialOptions, height: number, name: string): { material: THREE.Material; depth: THREE.Material } {
  const material = new THREE.MeshLambertMaterial({ map, side: THREE.DoubleSide, alphaTest: 0.2 });
  material.name = `${name} leaves`;
  material.onBeforeCompile = (shader) => {
    patchSway(shader, options, height);
    patchFacing(shader);
    // Leaves let some light through: a crown is never as dark as solid wood on its shaded side.
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight += diffuseColor.rgb * 0.22;\n#include <opaque_fragment>');
    patchOverbright(shader, options);
  };
  material.customProgramCacheKey = () => 'g3leaves';
  const depth = new THREE.MeshDepthMaterial({ map, alphaTest: 0.2, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  depth.onBeforeCompile = (shader) => {
    patchSway(shader, options, height);
    patchFacing(shader);
  };
  depth.customProgramCacheKey = () => 'g3leavesdepth';
  return { material, depth };
}
