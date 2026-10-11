import { GPU } from '../skyState';
import * as THREE from 'three';

/**
 * Interactive ripples near the player: a small height field solved with the wave equation on the GPU, centred on the
 * player and moved along in whole texels. Wading legs, a swimmer's strokes, a thrown barrel, an arrow, a fish rising,
 * anything that disturbs water drops an impulse here; the rings spread at about a metre a second, bounce off nothing
 * (the field is open water), fade, and carry a little foam. Every water surface reads the result as extra slope.
 */

export interface RippleDrop {
  x: number;
  z: number;
  /** Radius (m) and push (m of displacement); foam 0..1 left behind. */
  radius: number;
  strength: number;
  foam: number;
}

const MAX_DROPS = 16;
const STEP = 1 / 60;
/** Ripple speed (m/s): a gravity ripple of about 0.6 m wavelength. */
const SPEED = 1.15;

const QUAD_VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

const STEP_FRAG = /* glsl */ `
uniform sampler2D tState;
uniform vec2 uTexel;
uniform float uCourant;
uniform float uDamping;
uniform vec4 uDrops[${MAX_DROPS}];
uniform float uDropFoam[${MAX_DROPS}];
uniform int uDropCount;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tState, vUv);
  float h = c.x, prev = c.y;
  float l = texture2D(tState, vUv - vec2(uTexel.x, 0.0)).x, r = texture2D(tState, vUv + vec2(uTexel.x, 0.0)).x;
  float d = texture2D(tState, vUv - vec2(0.0, uTexel.y)).x, u = texture2D(tState, vUv + vec2(0.0, uTexel.y)).x;
  float next = (2.0 * h - prev + uCourant * (l + r + d + u - 4.0 * h)) * uDamping;
  // Foam fades, and spreads a little.
  vec4 n = (texture2D(tState, vUv - vec2(uTexel.x, 0.0)) + texture2D(tState, vUv + vec2(uTexel.x, 0.0))
    + texture2D(tState, vUv - vec2(0.0, uTexel.y)) + texture2D(tState, vUv + vec2(0.0, uTexel.y))) * 0.25;
  float foam = mix(c.z, n.z, 0.08) * 0.9935;
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uDropCount) break;
    vec4 drop = uDrops[i];
    vec2 delta = (vUv - drop.xy) / max(drop.z, 1e-4);
    float bump = exp(-dot(delta, delta) * 2.5);
    next += drop.w * bump;
    foam = max(foam, uDropFoam[i] * bump);
  }
  // The field's edge absorbs, so nothing reflects back from its square border.
  float edge = smoothstep(0.0, 0.05, min(min(vUv.x, vUv.y), min(1.0 - vUv.x, 1.0 - vUv.y)));
  gl_FragColor = vec4(next * edge, h * edge, foam * edge, 0.0);
}`;

const SHIFT_FRAG = /* glsl */ `
uniform sampler2D tState;
uniform vec2 uShift;
varying vec2 vUv;
void main() {
  vec2 uv = vUv + uShift;
  if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) gl_FragColor = vec4(0.0);
  else gl_FragColor = texture2D(tState, uv);
}`;

const DISPLAY_FRAG = /* glsl */ `
uniform sampler2D tState;
uniform vec2 uTexel;
uniform float uSlopeScale;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tState, vUv);
  float sx = texture2D(tState, vUv + vec2(uTexel.x, 0.0)).x - texture2D(tState, vUv - vec2(uTexel.x, 0.0)).x;
  float sz = texture2D(tState, vUv + vec2(0.0, uTexel.y)).x - texture2D(tState, vUv - vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4(c.x, min(c.z, 1.0), sx * uSlopeScale, sz * uSlopeScale);
}`;

export class RippleField {
  /** World x, z of the field's corner and its size (m), as the water shaders want them. */
  readonly uniform = new THREE.Vector3(0, 0, 1);
  private state: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private readonly display: THREE.WebGLRenderTarget;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: THREE.Mesh;
  private readonly stepMaterial: THREE.ShaderMaterial;
  private readonly shiftMaterial: THREE.ShaderMaterial;
  private readonly displayMaterial: THREE.ShaderMaterial;
  private readonly texelMetres: number;
  private accumulated = 0;
  private originX = Number.NaN;
  private originZ = Number.NaN;
  private pending: RippleDrop[] = [];
  private cleared = false;
  private disposed = false;
  ready = false;

  constructor(readonly size: number, readonly extent: number) {
    const make = () => new THREE.WebGLRenderTarget(size, size, {
      type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, colorSpace: THREE.NoColorSpace,
    });
    this.state = [make(), make()];
    this.display = make();
    this.texelMetres = extent / size;
    const courant = Math.min(0.45, (SPEED * STEP / this.texelMetres) ** 2);
    const texel = new THREE.Vector2(1 / size, 1 / size);
    this.stepMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tState: { value: null }, uTexel: { value: texel }, uCourant: { value: courant }, uDamping: { value: 0.9955 },
        uDrops: { value: Array.from({ length: MAX_DROPS }, () => new THREE.Vector4()) },
        uDropFoam: { value: new Array<number>(MAX_DROPS).fill(0) }, uDropCount: { value: 0 },
      },
      vertexShader: QUAD_VERT, fragmentShader: STEP_FRAG, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    });
    this.shiftMaterial = new THREE.ShaderMaterial({
      uniforms: { tState: { value: null }, uShift: { value: new THREE.Vector2() } },
      vertexShader: QUAD_VERT, fragmentShader: SHIFT_FRAG, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    });
    this.displayMaterial = new THREE.ShaderMaterial({
      uniforms: { tState: { value: null }, uTexel: { value: texel }, uSlopeScale: { value: 1 / (2 * this.texelMetres) } },
      vertexShader: QUAD_VERT, fragmentShader: DISPLAY_FRAG, depthTest: false, depthWrite: false, blending: THREE.NoBlending,
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.quad = new THREE.Mesh(geo, this.stepMaterial);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  get texture(): THREE.Texture {
    return this.display.texture;
  }

  /** Queue a disturbance; it lands on the next simulation step. */
  drop(d: RippleDrop) {
    if (![d.x, d.z, d.radius, d.strength, d.foam].every(Number.isFinite) || d.radius <= 0) return;
    if (this.pending.length >= MAX_DROPS * 3) this.pending.shift();
    this.pending.push(d);
  }

  private pass(renderer: THREE.WebGLRenderer, material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget) {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  /**
   * Prepare the passes ahead of their first use (A80), each drawn once into the target it draws into. The shift runs
   * only once the focus has moved some metres, so its first draw stalled a frame of play by 0.1-0.2 s.
   */
  warm(renderer: THREE.WebGLRenderer) {
    if (!GPU.halfTargets || this.disposed) return;
    const oldTarget = renderer.getRenderTarget();
    try {
      // Drawn once, not only compiled (the driver's first-draw work); the field is cleared before its first real step.
      for (const [material, target] of [[this.stepMaterial, this.state[1]], [this.shiftMaterial, this.state[1]], [this.displayMaterial, this.display]] as const) {
        this.quad.material = material; renderer.setRenderTarget(target); renderer.render(this.scene, this.camera);
      }
      this.cleared = false;
    } finally {
      renderer.setRenderTarget(oldTarget);
    }
  }

  /** Follow the player, advance the solve at its own fixed rate, and refresh the readable field. */
  update(renderer: THREE.WebGLRenderer, focusX: number, focusZ: number, dt: number) {
    if (!GPU.halfTargets) return;
    if (this.disposed) return;
    const oldTarget = renderer.getRenderTarget(), oldAutoClear = renderer.autoClear;
    try {
      renderer.autoClear = true;
      if (!this.cleared) {
        for (const t of [...this.state, this.display]) { renderer.setRenderTarget(t); renderer.clear(true, false, false); }
        this.cleared = true;
      }
      // Re-centre in whole texels once the player has walked a sixth of the field away.
      const snap = (v: number) => Math.round(v / this.texelMetres) * this.texelMetres;
      const wantX = snap(focusX - this.extent / 2), wantZ = snap(focusZ - this.extent / 2);
      if (!Number.isFinite(this.originX)) { this.originX = wantX; this.originZ = wantZ; }
      else if (Math.abs(wantX - this.originX) > this.extent / 6 || Math.abs(wantZ - this.originZ) > this.extent / 6) {
        this.shiftMaterial.uniforms.tState!.value = this.state[0].texture;
        this.shiftMaterial.uniforms.uShift!.value.set((wantX - this.originX) / this.extent, (wantZ - this.originZ) / this.extent);
        this.pass(renderer, this.shiftMaterial, this.state[1]);
        this.state = [this.state[1], this.state[0]];
        this.originX = wantX; this.originZ = wantZ;
      }
      this.uniform.set(this.originX, this.originZ, this.extent);
      this.accumulated = Math.min(STEP * 3, this.accumulated + (Number.isFinite(dt) && dt > 0 ? dt : 0));
      while (this.accumulated >= STEP) {
        this.accumulated -= STEP;
        const u = this.stepMaterial.uniforms;
        const drops = this.pending.splice(0, MAX_DROPS);
        drops.forEach((d, i) => {
          (u.uDrops!.value as THREE.Vector4[])[i]!.set((d.x - this.originX) / this.extent, (d.z - this.originZ) / this.extent,
            Math.max(d.radius, this.texelMetres) / this.extent, d.strength);
          (u.uDropFoam!.value as number[])[i] = d.foam;
        });
        u.uDropCount!.value = drops.length;
        u.tState!.value = this.state[0].texture;
        this.pass(renderer, this.stepMaterial, this.state[1]);
        this.state = [this.state[1], this.state[0]];
      }
      this.displayMaterial.uniforms.tState!.value = this.state[0].texture;
      this.pass(renderer, this.displayMaterial, this.display);
      this.ready = true;
    } finally {
      renderer.autoClear = oldAutoClear;
      renderer.setRenderTarget(oldTarget);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.ready = false;
    for (const t of [...this.state, this.display]) t.dispose();
    for (const m of [this.stepMaterial, this.shiftMaterial, this.displayMaterial]) m.dispose();
    this.quad.geometry.dispose();
  }
}
