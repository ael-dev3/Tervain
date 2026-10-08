import * as THREE from 'three';
import { WaterRenderPass, type WaterRenderInputs, type WaterUnder } from './waterRenderPass';
import { detachWaterOptics } from './waterOptics';

/**
 * The final image. The scene is drawn into a half-float target (multisampled where the quality allows), then one
 * full-screen pass tone maps it and gives it the look this game is after: earthy (greens lean olive and the sky is
 * muted, while reds and golds keep their colour), hard contrast with cool shadows and warm lights, a vignette and film
 * grain to take the digital polish off. A modest bloom (bright pass and a two-tap blur at quarter resolution, added
 * before tone mapping) lets the sun on the sea, lit windows, torches and the lighthouse lamp glow the way the reference
 * does; it is skipped on the low preset. No depth of field.
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
void main() {
  // Four taps of the full-resolution scene into a quarter-resolution target, keeping only what is brighter than the threshold.
  vec3 c = texture2D(tScene, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tScene, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture2D(tScene, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tScene, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  // One bad pixel (a NaN from some material) must not smear across the frame through the blur.
  if (any(isnan(c)) || any(isinf(c))) c = vec3(0.0);
  float l = max(c.r, max(c.g, c.b));
  float k = max(0.0, l - uThreshold) / max(l, 1e-4);
  gl_FragColor = vec4(min(c * k, vec3(6.0)), 1.0);
}`;

const BLUR_FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uTexel;
uniform vec2 uDir;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tScene, vUv).rgb * 0.227027;
  c += (texture2D(tScene, vUv + uDir * uTexel * 1.3846).rgb + texture2D(tScene, vUv - uDir * uTexel * 1.3846).rgb) * 0.3162162;
  c += (texture2D(tScene, vUv + uDir * uTexel * 3.2308).rgb + texture2D(tScene, vUv - uDir * uTexel * 3.2308).rgb) * 0.0702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform float uBloom;
uniform float uTime;
uniform float uSaturation;
uniform float uContrast;
uniform float uVignette;
uniform float uGrain;
uniform float uEarth;
uniform float uNight;
uniform float uChromatic;
uniform vec2 uTexel;
uniform sampler2D tDepth;
uniform float uWaterTime;
uniform float uUnder;
uniform float uUnderDepthReady;
uniform vec3 uUnderColor;
uniform vec3 uUnderAbsorb;
uniform float uUnderSurface;
uniform float uUnderNear;
uniform float uUnderFar;
uniform mat4 uUnderInverseProjection;
uniform mat4 uUnderCameraWorld;
uniform sampler2D tUnderCaustics;
uniform float uUnderLight;
varying vec2 vUv;

vec3 sRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  // Keep lens separation available to the developer benchmark, but off for the shipped natural image.
  vec2 d = vUv - 0.5;
  float r2 = dot(d, d);
  vec2 off = d * r2 * uChromatic;
  c.r = mix(c.r, texture2D(tScene, vUv + off).r, 0.6);
  c.b = mix(c.b, texture2D(tScene, vUv - off).b, 0.6);
  c += texture2D(tBloom, vUv).rgb * uBloom;
  if (uUnder > 0.5) {
    // Under the surface everything is seen through water: a slow refractive wobble, then absorption and in-scatter over
    // the real path to each pixel. The surface overhead ends that path; the sky beyond comes through Snell's window.
    vec2 wob = vec2(sin(vUv.y * 31.0 + uWaterTime * 1.9), cos(vUv.x * 27.0 + uWaterTime * 1.6)) * 0.0022;
    c = texture2D(tScene, vUv + wob).rgb + texture2D(tBloom, vUv + wob).rgb * uBloom;
    vec4 far = uUnderInverseProjection * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
    vec3 ray = normalize(far.xyz / far.w);
    vec3 dir = mat3(uUnderCameraWorld) * ray;
    float path = 80.0;
    if (uUnderDepthReady > 0.5) {
      float d = texture2D(tDepth, vUv + wob).r;
      if (d < 1.0) path = uUnderNear * uUnderFar / max(uUnderFar - d * (uUnderFar - uUnderNear), 1e-4) / max(-ray.z, 1e-3);
    }
    if (dir.y > 1e-4) path = min(path, uUnderSurface / dir.y);
    else if (uUnderLight > 0.0 && path < 79.0) {
      // Sunlight focused by the waves overhead plays over the bed: the caustic web, sharp near the surface.
      vec3 bed = uUnderCameraWorld[3].xyz + dir * path;
      float below = uUnderCameraWorld[3].y + uUnderSurface - bed.y;
      float a = texture2D(tUnderCaustics, bed.xz * 0.31 + vec2(uWaterTime * 0.021, uWaterTime * 0.013)).r;
      float b = texture2D(tUnderCaustics, bed.xz * 0.27 + vec2(-uWaterTime * 0.017, uWaterTime * 0.019) + 0.37).r;
      float web = min(a, b) * 1.6 + (a + b) * 0.12;
      c *= 1.0 + web * uUnderLight * smoothstep(0.05, 0.4, below) * exp(-below * 0.3);
    }
    vec3 keep = exp(-uUnderAbsorb * path);
    c = c * keep + uUnderColor * (vec3(1.0) - keep);
  }

  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  c = gl_FragColor.rgb;
  // Work in display space from here.
  c = clamp(sRGB(c), 0.0, 1.0);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Cool shadows, warm lights.
  vec3 shadowTint = vec3(0.94, 0.99, 1.06);
  // Warm sunlight remains selective. Moonlit highlights retain their cooler identity through the night cycle.
  vec3 lightTint = mix(vec3(1.06, 1.0, 0.9), vec3(0.97, 1.0, 1.04), clamp(uNight, 0.0, 1.0));
  c *= mix(shadowTint, lightTint, smoothstep(0.12, 0.7, l));
  // Earthier greens and sky (A67): grass and leaves lean to olive and lose some chroma, the sky's blue is muted.
  // Reds, golds and browns keep theirs, so the warm/cool contrast survives (this is not a blanket desaturation).
  l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float chroma = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  float leafy = smoothstep(0.0, 0.06, c.g - max(c.r, c.b)) * smoothstep(0.015, 0.08, chroma) * uEarth;
  float skyish = smoothstep(0.0, 0.08, c.b - max(c.r, c.g)) * smoothstep(0.015, 0.08, chroma) * uEarth;
  vec3 olive = vec3(l) + (c - vec3(l)) * 0.68;
  olive.r += (olive.g - olive.r) * 0.32;
  c = mix(c, olive * 0.96, leafy);
  c = mix(c, vec3(l) + (c - vec3(l)) * 0.78, skyish);
  // Saturation, then the contrast curve.
  l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  // Daylight can carry the stronger S-curve. Fade its black subtraction at night so
  // moonlit cloth, nearby roots and the road retain their painted dark values.
  float sceneContrast = mix(uContrast, 1.0, clamp(uNight, 0.0, 1.0));
  // The curve turns below mid grey, so the extra contrast goes into the lights and the shadows keep their detail.
  c = clamp((c - 0.4) * sceneContrast + 0.4 + 0.008, 0.0, 1.0);
  // Vignette.
  float v = smoothstep(0.95, 0.28, length(d * vec2(1.0, 0.86)));
  c *= mix(1.0 - uVignette, 1.0, v);
  // Grain: strongest in the mid tones, animated at low rate so it does not crawl.
  float g = hash12(gl_FragCoord.xy + floor(uTime * 24.0) * 17.0) - 0.5;
  c += g * uGrain * (0.4 + 0.6 * (1.0 - abs(l - 0.45) * 1.6));
  gl_FragColor = vec4(c, 1.0);
}`;

export interface GradeOptions {
  msaa: boolean;
}

export class Grade {
  readonly target: THREE.WebGLRenderTarget;
  private bloomA: THREE.WebGLRenderTarget;
  private bloomB: THREE.WebGLRenderTarget;
  private brightMat: THREE.ShaderMaterial;
  private blurMat: THREE.ShaderMaterial;
  private material: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private w = 1;
  private h = 1;
  private time = 0;
  private waterTime = 0;
  private waterPass = new WaterRenderPass();
  enabled = true;
  /** Off on the low preset: it costs three small passes. */
  bloom = true;
  private bloomStrength = 0.24;

  constructor(private renderer: THREE.WebGLRenderer, opts: GradeOptions) {
    // Half-float targets need a WebGL2 colour-buffer extension; without one fall back to 8 bits (sun highlights clip, nothing else breaks).
    const half = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
    this.target = new THREE.WebGLRenderTarget(4, 4, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: opts.msaa ? 4 : 0, depthBuffer: true, colorSpace: THREE.LinearSRGBColorSpace });
    this.target.texture.minFilter = THREE.LinearFilter;
    this.target.texture.magFilter = THREE.LinearFilter;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this.target.texture },
        tBloom: { value: null as THREE.Texture | null },
        uBloom: { value: 0.24 },
        uTime: { value: 0 },
        uSaturation: { value: 0.92 },
        uContrast: { value: 1.1 },
        uVignette: { value: 0.18 },
        uGrain: { value: 0.012 },
        uEarth: { value: 1 },
        uNight: { value: 0 },
        uChromatic: { value: 0 },
        uTexel: { value: new THREE.Vector2(1, 1) },
        tDepth: { value: null as THREE.Texture | null },
        uWaterTime: { value: 0 },
        uUnder: { value: 0 },
        uUnderDepthReady: { value: 0 },
        uUnderColor: { value: new THREE.Color() },
        uUnderAbsorb: { value: new THREE.Vector3(0.3, 0.1, 0.08) },
        uUnderSurface: { value: 0 },
        uUnderNear: { value: 0.1 },
        uUnderFar: { value: 1400 },
        uUnderInverseProjection: { value: new THREE.Matrix4() },
        uUnderCameraWorld: { value: new THREE.Matrix4() },
        tUnderCaustics: { value: null as THREE.Texture | null },
        uUnderLight: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: true,
    });
    const bt = { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, depthBuffer: false, colorSpace: THREE.LinearSRGBColorSpace } as const;
    this.bloomA = new THREE.WebGLRenderTarget(4, 4, bt);
    this.bloomB = new THREE.WebGLRenderTarget(4, 4, bt);
    for (const t of [this.bloomA, this.bloomB]) {
      t.texture.minFilter = THREE.LinearFilter;
      t.texture.magFilter = THREE.LinearFilter;
    }
    this.material.uniforms.tBloom!.value = this.bloomA.texture;
    const pass = (frag: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false, toneMapped: false });
    this.brightMat = pass(BRIGHT_FRAG, { tScene: { value: this.target.texture }, uTexel: { value: new THREE.Vector2(1, 1) }, uThreshold: { value: 0.85 } });
    this.blurMat = pass(BLUR_FRAG, { tScene: { value: this.bloomA.texture }, uTexel: { value: new THREE.Vector2(1, 1) }, uDir: { value: new THREE.Vector2(1, 0) } });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    // Two passes per frame: keep the renderer's statistics for the whole frame instead of just the last pass.
    renderer.info.autoReset = false;
    this.quad = new THREE.Mesh(geo, this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  /** Size the offscreen target in device pixels. */
  setSize(width: number, height: number) {
    this.w = Math.max(2, Math.floor(width));
    this.h = Math.max(2, Math.floor(height));
    this.target.setSize(this.w, this.h);
    this.material.uniforms.uTexel!.value.set(1 / this.w, 1 / this.h);
    const bw = Math.max(2, Math.floor(this.w / 4));
    const bh = Math.max(2, Math.floor(this.h / 4));
    this.bloomA.setSize(bw, bh);
    this.bloomB.setSize(bw, bh);
    this.brightMat.uniforms.uTexel!.value.set(1 / this.w, 1 / this.h);
    this.blurMat.uniforms.uTexel!.value.set(1 / bw, 1 / bh);
  }

  setLook(o: { saturation?: number; contrast?: number; vignette?: number; grain?: number; earth?: number; night?: number; chromatic?: number }) {
    const u = this.material.uniforms;
    if (o.saturation !== undefined) u.uSaturation!.value = o.saturation;
    if (o.earth !== undefined) u.uEarth!.value = Math.max(0, Math.min(1, o.earth));
    if (o.contrast !== undefined) u.uContrast!.value = o.contrast;
    if (o.vignette !== undefined) u.uVignette!.value = o.vignette;
    if (o.grain !== undefined) u.uGrain!.value = o.grain;
    if (o.night !== undefined) u.uNight!.value = o.night;
    if (o.chromatic !== undefined) u.uChromatic!.value = Math.max(0, Math.min(0.01, o.chromatic));
  }

  /** The current look, so a caller can switch to another (the menu's) and restore this one exactly afterwards. */
  getLook(): { saturation: number; contrast: number; vignette: number; grain: number; earth: number; chromatic: number } {
    const u = this.material.uniforms;
    return { saturation: u.uSaturation!.value, contrast: u.uContrast!.value, vignette: u.uVignette!.value, grain: u.uGrain!.value, earth: u.uEarth!.value, chromatic: u.uChromatic!.value };
  }

  /** Individual visual controls for repeatable look-development captures. */
  setBloom(on: boolean) {
    this.bloom = on;
  }

  /** Turn multisampling on or off (quality setting). */
  setMsaa(on: boolean) {
    const samples = on ? 4 : 0;
    if (this.target.samples === samples) return;
    this.target.samples = samples;
    this.target.dispose();
  }

  private dropWaterDepth() {
    const depth = this.target.depthTexture;
    if (!depth) return;
    // Detach first: Three's target cleanup otherwise also dispatches depth.dispose().
    this.target.depthTexture = null;
    this.target.dispose();
    depth.dispose();
  }

  render(scene: THREE.Scene, camera: THREE.Camera, dt: number, water?: WaterRenderInputs) {
    this.renderer.info.reset();
    if (!this.enabled) {
      if (water) for (const mesh of water.meshes) detachWaterOptics(mesh.material);
      this.waterPass.releaseTargets();
      this.dropWaterDepth();
      this.renderer.render(scene, camera);
      return;
    }
    this.time += dt;
    this.material.uniforms.uTime!.value = this.time;
    if (water && !water.reducedMotion) this.waterTime += dt;
    this.material.uniforms.uWaterTime!.value = this.waterTime;
    const r = this.renderer;
    // Tone mapping belongs to the final pass (three applies it only when drawing to the screen); the scene itself is
    // written in linear light.
    let sceneColor = this.target.texture;
    if (water) {
      const capture = water.enabled && water.quality !== 'low';
      if (capture && !this.target.depthTexture) {
        this.target.dispose();
        this.target.depthTexture = new THREE.DepthTexture(this.w, this.h, THREE.UnsignedIntType);
      } else if (!capture && this.target.depthTexture) {
        this.dropWaterDepth();
      }
      sceneColor = this.waterPass.render(r, scene, camera, this.target, dt, water);
    } else {
      r.setRenderTarget(this.target);
      r.render(scene, camera);
    }
    this.material.uniforms.tScene!.value = sceneColor;
    this.brightMat.uniforms.tScene!.value = sceneColor;
    this.applyUnder(camera, water?.under ?? null);
    if (this.bloom) {
      // Bright pass into a quarter-resolution target, then a horizontal and a vertical blur.
      this.quad.material = this.brightMat;
      r.setRenderTarget(this.bloomA);
      r.render(this.scene, this.camera);
      this.quad.material = this.blurMat;
      this.blurMat.uniforms.tScene!.value = this.bloomA.texture;
      this.blurMat.uniforms.uDir!.value.set(1, 0);
      r.setRenderTarget(this.bloomB);
      r.render(this.scene, this.camera);
      this.blurMat.uniforms.tScene!.value = this.bloomB.texture;
      this.blurMat.uniforms.uDir!.value.set(0, 1);
      r.setRenderTarget(this.bloomA);
      r.render(this.scene, this.camera);
      this.quad.material = this.material;
    }
    this.material.uniforms.uBloom!.value = this.bloom ? this.bloomStrength : 0;
    r.setRenderTarget(null);
    r.render(this.scene, this.camera);
  }

  /** The underwater view's inputs: the camera's own matrices and the depth captured for the water pass, if any. */
  private applyUnder(camera: THREE.Camera, under: WaterUnder | null) {
    const u = this.material.uniforms;
    const perspective = camera as THREE.PerspectiveCamera;
    u.uUnder!.value = under && perspective.isPerspectiveCamera ? 1 : 0;
    if (!under || !perspective.isPerspectiveCamera) {
      u.tDepth!.value = null;
      u.tUnderCaustics!.value = null;
      return;
    }
    u.tUnderCaustics!.value = under.caustics;
    u.uUnderLight!.value = under.caustics ? under.light : 0;
    u.uUnderSurface!.value = Math.max(0, under.surface);
    (u.uUnderColor!.value as THREE.Color).copy(under.color);
    (u.uUnderAbsorb!.value as THREE.Vector3).copy(under.absorb);
    (u.uUnderInverseProjection!.value as THREE.Matrix4).copy(perspective.projectionMatrixInverse);
    (u.uUnderCameraWorld!.value as THREE.Matrix4).copy(perspective.matrixWorld);
    u.uUnderNear!.value = perspective.near;
    u.uUnderFar!.value = perspective.far;
    u.tDepth!.value = this.target.depthTexture;
    u.uUnderDepthReady!.value = this.target.depthTexture ? 1 : 0;
  }

  dispose() {
    this.waterPass.dispose();
    this.dropWaterDepth();
    this.target.dispose();
    this.bloomA.dispose();
    this.bloomB.dispose();
    this.brightMat.dispose();
    this.blurMat.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
