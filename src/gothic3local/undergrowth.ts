import * as THREE from 'three';
import type { MaterialOptions } from './shading';
import type { TextureCache } from './textures';
import type { Vegetation, VegetationMesh } from './vegetation';

/**
 * The world's ground vegetation (grass, herbs, ferns, pebbles, twigs) drawn near the camera, as the game does: each
 * cell's instances sit in a grid of 10 m nodes, and only nodes within the view range (50 m in the installed world,
 * fading out from 25 m) are drawn. One InstancedMesh per kind of plant is refilled from those nodes as the camera
 * moves. Plants sway with their wind strength; those with "up" shading are lit as if they faced the sky, like the ground
 * they grow from, and every instance carries the tint the world gives it. They fade the way the images are made to:
 * by a rising alpha test over the noise in their alpha.
 */

interface Kind {
  key: string;
  source: VegetationMesh;
  mesh: THREE.InstancedMesh | null;
  tint: THREE.InstancedBufferAttribute | null;
  material: Promise<THREE.Material>;
  geometry: THREE.BufferGeometry;
  /** Instances registered across loaded cells, which bounds how many can be visible. */
  total: number;
  count: number;
}

interface Patch {
  /** Grid node bounds, Gothic 3 centimetres. */
  box: Float32Array;
  kinds: Kind[];
  /** 16 floats per instance: its matrix in Gothic 3 space. */
  matrices: Float32Array;
  /** 3 floats per instance. */
  tints: Float32Array;
}

/** The vegetation atlases' material masks at 100/255 (G3_Nature_Plant_Herbs_Composit_01_A.xshmat, "MaskReference"). */
const MASK_REFERENCE = 100 / 255;

const q = new THREE.Quaternion();
const p = new THREE.Vector3();
const s = new THREE.Vector3();
const m = new THREE.Matrix4();

/** The mesh in Three.js terms; triangles are turned around for the world's mirror, as for every game mesh. */
function kindGeometry(v: VegetationMesh): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(v.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(v.normals, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(v.uvs, 2));
  const index = new Uint32Array(v.indices.length);
  for (let i = 0; i + 2 < index.length; i += 3) {
    index[i] = v.indices[i]!;
    index[i + 1] = v.indices[i + 2]!;
    index[i + 2] = v.indices[i + 1]!;
  }
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}

export class Undergrowth {
  readonly group = new THREE.Group();
  private readonly kinds = new Map<string, Kind>();
  private readonly patches: Patch[] = [];
  private readonly textures: TextureCache;
  private readonly options: MaterialOptions;
  /** Metres: drawn up to `range`, fading out from the uniform's first value. */
  private range = 50;
  private readonly fadeUniform = { value: new THREE.Vector2(25, 50) };
  private readonly last = new THREE.Vector3(Infinity, 0, 0);
  private dirty = true;
  /** Instances registered, and drawn at the last update. */
  instances = 0;
  visible = 0;

  constructor(textures: TextureCache, options: MaterialOptions) {
    this.textures = textures;
    this.options = options;
    this.group.name = 'undergrowth';
  }

  /** Register one cell's vegetation. */
  add(v: Vegetation): void {
    this.range = v.viewRange / 100;
    this.fadeUniform.value.set(Math.min(v.fadeStart, v.viewRange) / 100, this.range);
    const byIndex = new Map<number, Kind>();
    for (const vm of v.meshes) byIndex.set(vm.index, this.kind(vm));
    for (const node of v.nodes) {
      const kinds: Kind[] = [];
      const matrices = new Float32Array(node.count * 16);
      const tints = new Float32Array(node.count * 3);
      for (let k = 0; k < node.count; k++) {
        const i = node.first + k;
        const kind = byIndex.get(v.mesh[i]!);
        if (!kind) continue;
        const n = kinds.length;
        kinds.push(kind);
        kind.total++;
        p.fromArray(v.position, i * 3);
        q.fromArray(v.rotation, i * 4).normalize();
        // The first factor scales across, the second up.
        s.set(v.scale[i * 2]!, v.scale[i * 2 + 1]!, v.scale[i * 2]!);
        m.compose(p, q, s).toArray(matrices, n * 16);
        const c = v.tint[i]!;
        tints[n * 3] = ((c >>> 16) & 255) / 255;
        tints[n * 3 + 1] = ((c >>> 8) & 255) / 255;
        tints[n * 3 + 2] = (c & 255) / 255;
      }
      if (kinds.length) this.patches.push({ box: node.box, kinds, matrices: matrices.subarray(0, kinds.length * 16), tints: tints.subarray(0, kinds.length * 3) });
      this.instances += kinds.length;
    }
    this.dirty = true;
  }

  private kind(vm: VegetationMesh): Kind {
    // Every cell carries its own copy of the meshes it uses; the same plant shares one kind.
    const key = `${vm.name.toLowerCase()}|${vm.positions.length}|${vm.indices.length}|${vm.texture.toLowerCase()}`;
    let kind = this.kinds.get(key);
    if (!kind) {
      kind = { key, source: vm, mesh: null, tint: null, material: this.material(vm), geometry: kindGeometry(vm), total: 0, count: 0 };
      this.kinds.set(key, kind);
    }
    return kind;
  }

  private async material(vm: VegetationMesh): Promise<THREE.Material> {
    const map = await this.textures.get(vm.texture);
    const material = new THREE.MeshLambertMaterial({ map: map ?? this.textures.neutral(), side: vm.doubleSided ? THREE.DoubleSide : THREE.FrontSide });
    material.name = vm.name;
    const up = vm.shading === 1;
    // The plant's height in its own space (centimetres), for the sway.
    const height = Math.max(1, vm.box[4]! - Math.min(0, vm.box[1]!));
    material.onBeforeCompile = (shader) => {
      shader.uniforms.g3Time = this.options.time;
      shader.uniforms.g3Overbright = this.options.overbright;
      shader.uniforms.g3Fade = this.fadeUniform;
      shader.uniforms.g3Wind = { value: vm.wind };
      shader.uniforms.g3Height = { value: height };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          attribute vec3 g3tint;
          uniform float g3Time;
          uniform vec2 g3Fade;
          uniform float g3Wind;
          uniform float g3Height;
          varying vec3 vG3Tint;
          varying float vG3Fade;`,
        )
        .replace('#include <beginnormal_vertex>', up ? 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);' : '#include <beginnormal_vertex>')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vec3 g3Origin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          vG3Fade = 1.0 - smoothstep(g3Fade.x, g3Fade.y, distance(g3Origin, cameraPosition));
          vG3Tint = g3tint;
          if (g3Wind > 0.0) {
            float g3h = clamp(position.y / g3Height, 0.0, 1.0);
            float g3Phase = dot(g3Origin.xz, vec2(0.37, 0.71));
            float g3Gust = 0.6 + 0.4 * sin(g3Time * 0.35 + g3Phase * 0.1);
            transformed.x += g3Wind * g3h * g3h * g3Gust * 14.0 * sin(g3Time * 1.9 + g3Phase);
            transformed.z += g3Wind * g3h * g3h * g3Gust * 9.0 * cos(g3Time * 1.4 + g3Phase * 1.3);
          }`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float g3Overbright;
          varying vec3 vG3Tint;
          varying float vG3Fade;`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          // The plant images keep a noise pattern in their alpha inside each shape. Near the camera the test keeps
          // everything above the material's reference; further out the reference rises, so plants dissolve.
          if (diffuseColor.a < mix(${MASK_REFERENCE.toFixed(4)}, 1.01, 1.0 - vG3Fade)) discard;
          diffuseColor.a = 1.0;
          diffuseColor.rgb *= vG3Tint;`,
        )
        .replace('#include <normal_fragment_begin>', up ? '#include <normal_fragment_begin>\nnormal = normalize(vNormal);' : '#include <normal_fragment_begin>')
        .replace('#include <opaque_fragment>', 'outgoingLight *= g3Overbright;\n#include <opaque_fragment>');
    };
    material.customProgramCacheKey = () => `g3undergrowth:${up ? 'up' : 'mesh'}`;
    return material;
  }

  /** Make room for every registered instance: call after adding cells, before the next update. */
  async prepare(): Promise<void> {
    await Promise.all([...this.kinds.values()].filter((k) => !k.mesh || k.mesh.instanceMatrix.count < k.total).map((k) => this.build(k)));
    this.dirty = true;
  }

  /** Refill the instances near the camera (Three.js metres). Cheap when the camera has not moved far. */
  update(camera: THREE.Vector3): void {
    if (!this.dirty && camera.distanceToSquared(this.last) < 1) return;
    this.dirty = false;
    this.last.copy(camera);
    for (const kind of this.kinds.values()) kind.count = 0;
    // The camera in Gothic 3 centimetres.
    const cx = camera.x * 100;
    const cy = camera.y * 100;
    const cz = -camera.z * 100;
    const reach = this.range * 100;
    let visible = 0;
    for (const patch of this.patches) {
      const b = patch.box;
      const dx = Math.max(b[0]! - cx, 0, cx - b[3]!);
      const dy = Math.max(b[1]! - cy, 0, cy - b[4]!);
      const dz = Math.max(b[2]! - cz, 0, cz - b[5]!);
      if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
      for (let i = 0; i < patch.kinds.length; i++) {
        const kind = patch.kinds[i]!;
        const mesh = kind.mesh;
        if (!mesh || kind.count >= mesh.instanceMatrix.count) continue;
        (mesh.instanceMatrix.array as Float32Array).set(patch.matrices.subarray(i * 16, i * 16 + 16), kind.count * 16);
        (kind.tint!.array as Float32Array).set(patch.tints.subarray(i * 3, i * 3 + 3), kind.count * 3);
        kind.count++;
        visible++;
      }
    }
    for (const kind of this.kinds.values()) {
      const mesh = kind.mesh;
      if (!mesh) continue;
      mesh.count = kind.count;
      mesh.visible = kind.count > 0;
      mesh.instanceMatrix.clearUpdateRanges();
      mesh.instanceMatrix.addUpdateRange(0, kind.count * 16);
      mesh.instanceMatrix.needsUpdate = true;
      kind.tint!.clearUpdateRanges();
      kind.tint!.addUpdateRange(0, kind.count * 3);
      kind.tint!.needsUpdate = true;
    }
    this.visible = visible;
  }

  private async build(kind: Kind): Promise<void> {
    const material = await kind.material;
    if (kind.mesh) {
      this.group.remove(kind.mesh);
      kind.mesh.dispose();
    }
    const capacity = Math.max(16, kind.total);
    const mesh = new THREE.InstancedMesh(kind.geometry, material, capacity);
    mesh.name = kind.source.name;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    kind.tint = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    kind.tint.setUsage(THREE.DynamicDrawUsage);
    kind.geometry.setAttribute('g3tint', kind.tint);
    // Everything drawn is near the camera; the refill keeps the set small.
    mesh.frustumCulled = false;
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.count = 0;
    kind.mesh = mesh;
    this.group.add(mesh);
  }
}
