import * as THREE from 'three';

/**
 * The final image. The scene is drawn into a half-float target (multisampled where the quality allows), then one
 * full-screen pass tone maps it and gives it the look this game is after: earthy, slightly desaturated, hard contrast
 * with cool shadows and warm lights, a soft vignette and fine film grain to take the digital polish off. No bloom
 * and no depth of field, so the cost is one extra pass over the screen.
 */

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D tScene;
uniform float uTime;
uniform float uSaturation;
uniform float uContrast;
uniform float uVignette;
uniform float uGrain;
uniform float uNight;
uniform vec2 uTexel;
varying vec2 vUv;

vec3 sRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 c = texture2D(tScene, vUv).rgb;
  // A whisper of chromatic softness at the edges of the frame: cheap, and it reads as an old lens rather than a sensor.
  vec2 d = vUv - 0.5;
  float r2 = dot(d, d);
  vec2 off = d * r2 * 0.0035;
  c.r = mix(c.r, texture2D(tScene, vUv + off).r, 0.6);
  c.b = mix(c.b, texture2D(tScene, vUv - off).b, 0.6);

  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  c = gl_FragColor.rgb;
  // Work in display space from here.
  c = clamp(sRGB(c), 0.0, 1.0);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  // Cool shadows, warm lights.
  vec3 shadowTint = vec3(0.94, 0.99, 1.06);
  vec3 lightTint = vec3(1.06, 1.0, 0.9);
  c *= mix(shadowTint, lightTint, smoothstep(0.12, 0.7, l));
  // Saturation and an S-curve around mid grey.
  l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  c = clamp((c - 0.5) * uContrast + 0.5 + (0.0 - 0.02), 0.0, 1.0);
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
  private material: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private w = 1;
  private h = 1;
  private time = 0;
  enabled = true;

  constructor(private renderer: THREE.WebGLRenderer, opts: GradeOptions) {
    this.target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: opts.msaa ? 4 : 0, depthBuffer: true, colorSpace: THREE.LinearSRGBColorSpace });
    this.target.texture.minFilter = THREE.LinearFilter;
    this.target.texture.magFilter = THREE.LinearFilter;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this.target.texture },
        uTime: { value: 0 },
        uSaturation: { value: 0.86 },
        uContrast: { value: 1.1 },
        uVignette: { value: 0.32 },
        uGrain: { value: 0.03 },
        uNight: { value: 0 },
        uTexel: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      depthTest: false,
      depthWrite: false,
      toneMapped: true,
    });
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
  }

  setLook(o: { saturation?: number; contrast?: number; vignette?: number; grain?: number; night?: number }) {
    const u = this.material.uniforms;
    if (o.saturation !== undefined) u.uSaturation!.value = o.saturation;
    if (o.contrast !== undefined) u.uContrast!.value = o.contrast;
    if (o.vignette !== undefined) u.uVignette!.value = o.vignette;
    if (o.grain !== undefined) u.uGrain!.value = o.grain;
    if (o.night !== undefined) u.uNight!.value = o.night;
  }

  /** Turn multisampling on or off (quality setting). */
  setMsaa(on: boolean) {
    const samples = on ? 4 : 0;
    if (this.target.samples === samples) return;
    this.target.samples = samples;
    this.target.dispose();
  }

  render(scene: THREE.Scene, camera: THREE.Camera, dt: number) {
    this.renderer.info.reset();
    if (!this.enabled) {
      this.renderer.render(scene, camera);
      return;
    }
    this.time += dt;
    this.material.uniforms.uTime!.value = this.time;
    const r = this.renderer;
    // Tone mapping belongs to the final pass (three applies it only when drawing to the screen); the scene itself is
    // written in linear light.
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.scene, this.camera);
  }

  dispose() {
    this.target.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
