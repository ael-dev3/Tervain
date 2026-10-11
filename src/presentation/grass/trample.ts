import { GPU } from '../skyState';
import * as THREE from 'three';

/**
 * Where things have pushed through the grass: a small field on the GPU around the player (or, in the menu, over its
 * meadow) that every grass blade reads at its root. Anyone and anything moving through it (the hero, residents, bandits,
 * animals, a barrel rolling, a spirit skimming low) bends the blades away and, if it is heavy enough, flattens them.
 * Bent blades spring back within a second or so; flattened ones rise again over several seconds, so a walk through long
 * grass leaves a trail that slowly closes behind it.
 *
 * Texels hold the push (xy, a direction scaled 0..1) and how flat the grass lies (z, 0..1). Each step fades both and
 * stamps the movers in, keeping the stronger push, so crossing paths never add up to more than one push.
 */

export interface GrassMover {
  x: number;
  z: number;
  /** Footprint radius (m). */
  radius: number;
  /** How much it flattens what it passes over, 0 (a breeze, a spirit) .. 1 (a bear, a cart). Default 0.7. */
  weight?: number;
  /** Velocity (m/s): grass leans the way a mover goes as well as away from it. */
  vx?: number;
  vz?: number;
}

export const TRAMPLE_MAX_MOVERS = 48;
/** Footprints kept waiting for a GPU step; older ones are dropped beyond this (A71). */
export const TRAMPLE_MAX_PENDING = TRAMPLE_MAX_MOVERS * 8;
/** The field advances at its own fixed rate, so recovery is the same at any frame rate. */
const STEP = 1 / 30;
/** Seconds for a push and for flattening to recover to a third. */
export const TRAMPLE_RECOVERY = { push: 0.75, flat: 5.5 } as const;

const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const STEP_FRAG = /* glsl */ `
uniform sampler2D tPrev;
uniform vec2 uShift;
uniform vec3 uField;
uniform vec2 uKeep;
uniform vec4 uMovers[${TRAMPLE_MAX_MOVERS}];
uniform vec2 uMoverVel[${TRAMPLE_MAX_MOVERS}];
uniform int uMoverCount;
varying vec2 vUv;
void main() {
  vec2 src = vUv + uShift;
  vec4 prev = (src.x < 0.0 || src.y < 0.0 || src.x > 1.0 || src.y > 1.0) ? vec4(0.0) : texture2D(tPrev, src);
  // Recovery fades the field's edge once per fixed step. Extra stamp batches keep the previous field unchanged.
  float edge = smoothstep(0.0, 0.04, min(min(vUv.x, vUv.y), min(1.0 - vUv.x, 1.0 - vUv.y)));
  float oldEdge = uKeep.x < 1.0 ? edge : 1.0;
  vec2 push = prev.xy * uKeep.x * oldEdge;
  float lying = prev.z * uKeep.y * oldEdge;
  vec2 world = uField.xy + vUv * uField.z;
  for (int i = 0; i < ${TRAMPLE_MAX_MOVERS}; i++) {
    if (i >= uMoverCount) break;
    vec4 m = uMovers[i];
    vec2 d = world - m.xy;
    float dist = length(d);
    float k = 1.0 - smoothstep(m.z * 0.25, m.z, dist);
    if (k <= 0.0) continue;
    // Away from the body, and along the way it goes: grass ahead of a walker is pressed forward and down.
    vec2 away = d / max(dist, 1e-3);
    vec2 dir = away + uMoverVel[i] * 0.3;
    float len = length(dir);
    vec2 p = len > 1e-4 ? dir / len * k * edge : vec2(0.0);
    if (dot(p, p) > dot(push, push)) push = p;
    lying = max(lying, k * m.w * edge);
  }
  gl_FragColor = vec4(push, lying, 1.0);
}`;

const SHIFT_FRAG = /* glsl */ `
uniform sampler2D tPrev;
uniform vec2 uShift;
varying vec2 vUv;
void main() {
  vec2 src = vUv + uShift;
  gl_FragColor = (src.x < 0.0 || src.y < 0.0 || src.x > 1.0 || src.y > 1.0) ? vec4(0.0) : texture2D(tPrev, src);
}`;

export interface GrassTrampleUniforms {
  tTrample: THREE.IUniform<THREE.Texture | null>;
  /** xy: field corner (world x, z); z: size (m); w: 1 once the field holds valid data. */
  uTrample: THREE.IUniform<THREE.Vector4>;
}

export class GrassTrample {
  readonly uniforms: GrassTrampleUniforms;
  private targets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: THREE.Mesh;
  private readonly stepMaterial: THREE.ShaderMaterial;
  private readonly shiftMaterial: THREE.ShaderMaterial;
  private readonly texel: number;
  private movers: GrassMover[] = [];
  private readonly pendingStamps: GrassMover[] = [];
  private originX = Number.NaN;
  private originZ = Number.NaN;
  private accumulated = 0;
  private cleared = false;
  private disposed = false;

  /**
   * A field of `size`² texels over `extent` metres. With `centre` it stays put (the menu's meadow); otherwise it follows
   * the focus given to update(), moving in whole texels so nothing it holds ever shifts against the ground.
   */
  constructor(readonly size: number, readonly extent: number, private readonly centre?: { x: number; z: number }, uniforms?: GrassTrampleUniforms) {
    // Shared uniform objects let other plants (the forest floor) read the same field.
    this.uniforms = uniforms ?? { tTrample: { value: null }, uTrample: { value: new THREE.Vector4(0, 0, 1, 0) } };
    const make = () => new THREE.WebGLRenderTarget(size, size, {
      type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, colorSpace: THREE.NoColorSpace, generateMipmaps: false,
    });
    this.targets = [make(), make()];
    this.texel = extent / size;
    this.stepMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tPrev: { value: null }, uShift: { value: new THREE.Vector2() }, uField: { value: new THREE.Vector3(0, 0, extent) },
        uKeep: { value: new THREE.Vector2(1, 1) },
        uMovers: { value: Array.from({ length: TRAMPLE_MAX_MOVERS }, () => new THREE.Vector4()) },
        uMoverVel: { value: Array.from({ length: TRAMPLE_MAX_MOVERS }, () => new THREE.Vector2()) },
        uMoverCount: { value: 0 },
      },
      vertexShader: QUAD_VERT, fragmentShader: STEP_FRAG, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    });
    this.shiftMaterial = new THREE.ShaderMaterial({
      uniforms: { tPrev: { value: null }, uShift: { value: new THREE.Vector2() } },
      vertexShader: QUAD_VERT, fragmentShader: SHIFT_FRAG, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(geo, this.stepMaterial);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
    if (centre) { this.originX = centre.x - extent / 2; this.originZ = centre.z - extent / 2; }
  }

  /**
   * Prepare the passes ahead of their first use (A81), each drawn once into the target it draws into. The shift runs
   * only once the focus has moved some metres, so its first draw stalled a frame of play by 0.1-0.2 s.
   */
  warm(renderer: THREE.WebGLRenderer) {
    if (!GPU.halfTargets || this.disposed) return;
    const oldTarget = renderer.getRenderTarget();
    try {
      // Drawn once, not only compiled: the driver's own first-draw work is the larger part. The field is cleared
      // before its first real step, so what these draws leave is never read.
      renderer.setRenderTarget(this.targets[1]);
      for (const material of [this.stepMaterial, this.shiftMaterial]) { this.quad.material = material; renderer.render(this.scene, this.camera); }
      this.cleared = false;
    } finally {
      this.quad.material = this.stepMaterial;
      renderer.setRenderTarget(oldTarget);
    }
  }

  /** Who is moving through the grass this frame (the nearest are kept when there are more than the field can take). */
  setMovers(movers: readonly GrassMover[], nearX?: number, nearZ?: number) {
    const valid = movers.filter((m) => [m.x, m.z, m.radius].every(Number.isFinite) && m.radius > 0);
    if (valid.length > TRAMPLE_MAX_MOVERS && Number.isFinite(nearX) && Number.isFinite(nearZ)) {
      valid.sort((a, b) => Math.hypot(a.x - nearX!, a.z - nearZ!) - Math.hypot(b.x - nearX!, b.z - nearZ!));
    }
    this.movers = valid.slice(0, TRAMPLE_MAX_MOVERS);
  }

  /** One-off brush footprints. Keep every sample until a GPU step consumes it, even when render frames run faster. */
  queueStamps(stamps: readonly GrassMover[]) {
    // Without half-float targets update() never runs a step, so nothing would ever drain the queue (A71).
    if (this.disposed || !GPU.halfTargets) return;
    for (const stamp of stamps) {
      if ([stamp.x, stamp.z, stamp.radius].every(Number.isFinite) && stamp.radius > 0) this.pendingStamps.push({ ...stamp });
    }
    // A stalled field (hidden tab, no steps) keeps only the newest footprints, like the ripple queue (A71).
    const over = this.pendingStamps.length - TRAMPLE_MAX_PENDING;
    if (over > 0) this.pendingStamps.splice(0, over);
  }

  /** Movers inside the field now (for tests and the debug panel). */
  get activeMovers(): number {
    if (!Number.isFinite(this.originX)) return 0;
    return this.movers.filter((m) => m.x + m.radius > this.originX && m.x - m.radius < this.originX + this.extent
      && m.z + m.radius > this.originZ && m.z - m.radius < this.originZ + this.extent).length;
  }

  private pass(renderer: THREE.WebGLRenderer, material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget) {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  private stampPass(renderer: THREE.WebGLRenderer, stamps: readonly GrassMover[], keepPush: number, keepFlat: number) {
    const u = this.stepMaterial.uniforms;
    const movers = u.uMovers!.value as THREE.Vector4[], vel = u.uMoverVel!.value as THREE.Vector2[];
    stamps.forEach((m, i) => {
      movers[i]!.set(m.x, m.z, m.radius, Math.min(1, Math.max(0, m.weight ?? 0.7)));
      vel[i]!.set(Number.isFinite(m.vx) ? m.vx! : 0, Number.isFinite(m.vz) ? m.vz! : 0);
    });
    u.uMoverCount!.value = stamps.length;
    (u.uKeep!.value as THREE.Vector2).set(keepPush, keepFlat);
    u.tPrev!.value = this.targets[0].texture;
    (u.uShift!.value as THREE.Vector2).set(0, 0);
    this.pass(renderer, this.stepMaterial, this.targets[1]);
    this.targets = [this.targets[1], this.targets[0]];
  }

  /** Follow the focus (unless fixed), then advance the field at its own rate. */
  update(renderer: THREE.WebGLRenderer, focusX: number, focusZ: number, dt: number) {
    if (!GPU.halfTargets) return;
    if (this.disposed) return;
    const oldTarget = renderer.getRenderTarget(), oldAutoClear = renderer.autoClear;
    try {
      renderer.autoClear = true;
      if (!this.cleared) {
        for (const t of this.targets) { renderer.setRenderTarget(t); renderer.clear(true, false, false); }
        this.cleared = true;
      }
      const shift = new THREE.Vector2();
      if (!this.centre && Number.isFinite(focusX) && Number.isFinite(focusZ)) {
        const snap = (v: number) => Math.round(v / this.texel) * this.texel;
        const wantX = snap(focusX - this.extent / 2), wantZ = snap(focusZ - this.extent / 2);
        if (!Number.isFinite(this.originX)) { this.originX = wantX; this.originZ = wantZ; }
        else if (Math.abs(wantX - this.originX) > this.extent / 8 || Math.abs(wantZ - this.originZ) > this.extent / 8) {
          shift.set((wantX - this.originX) / this.extent, (wantZ - this.originZ) / this.extent);
          this.originX = wantX; this.originZ = wantZ;
        }
      }
      if (!Number.isFinite(this.originX)) return;
      if (shift.lengthSq() > 0) {
        this.shiftMaterial.uniforms.tPrev!.value = this.targets[0].texture;
        (this.shiftMaterial.uniforms.uShift!.value as THREE.Vector2).copy(shift);
        this.pass(renderer, this.shiftMaterial, this.targets[1]);
        this.targets = [this.targets[1], this.targets[0]];
      }
      this.accumulated = Math.min(STEP * 4, this.accumulated + (Number.isFinite(dt) && dt > 0 ? dt : 0));
      const u = this.stepMaterial.uniforms;
      (u.uField!.value as THREE.Vector3).set(this.originX, this.originZ, this.extent);
      while (this.accumulated >= STEP) {
        this.accumulated -= STEP;
        const n = Math.min(TRAMPLE_MAX_MOVERS - this.movers.length, this.pendingStamps.length);
        this.stampPass(renderer, [...this.movers, ...this.pendingStamps.slice(0, n)],
          Math.exp(-STEP / TRAMPLE_RECOVERY.push), Math.exp(-STEP / TRAMPLE_RECOVERY.flat));
        this.pendingStamps.splice(0, n);
        // More than one frame of a quick stroke can exceed a shader batch. Stamp the rest without extra recovery.
        while (this.pendingStamps.length > 0) {
          const count = Math.min(TRAMPLE_MAX_MOVERS, this.pendingStamps.length);
          this.stampPass(renderer, this.pendingStamps.slice(0, count), 1, 1);
          this.pendingStamps.splice(0, count);
        }
      }
      this.uniforms.tTrample.value = this.targets[0].texture;
      this.uniforms.uTrample.value.set(this.originX, this.originZ, this.extent, 1);
    } finally {
      renderer.autoClear = oldAutoClear;
      renderer.setRenderTarget(oldTarget);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.pendingStamps.length = 0;
    this.uniforms.tTrample.value = null;
    this.uniforms.uTrample.value.w = 0;
    for (const t of this.targets) t.dispose();
    this.stepMaterial.dispose();
    this.shiftMaterial.dispose();
    this.quad.geometry.dispose();
  }
}
