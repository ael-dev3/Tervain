import * as THREE from 'three';

/** Borrowed render textures: the Grade owns their lifetime, never a water mesh. */
export function makeWaterOpticsUniforms() {
  return {
    tWaterColor: { value: null as THREE.Texture | null },
    tWaterDepth: { value: null as THREE.Texture | null },
    uWaterResolution: { value: new THREE.Vector2(1, 1) },
    uWaterNear: { value: 0.1 },
    uWaterFar: { value: 1200 },
    uWaterCapture: { value: 0 },
    tWaterReflection: { value: null as THREE.Texture | null },
    uWaterReflectionMatrix: { value: new THREE.Matrix4() },
    uWaterReflectionReady: { value: 0 },
  };
}

export function detachWaterOptics(material: THREE.ShaderMaterial) {
  const u = material.uniforms;
  for (const key of ['tWaterColor', 'tWaterDepth', 'tWaterReflection']) if (u[key]) u[key]!.value = null;
  for (const key of ['uWaterCapture', 'uWaterReflectionReady']) if (u[key]) u[key]!.value = 0;
}

/** Original inexpensive screen-space transmission; no FFT or purchased shader code. */
export const WATER_OPTICS_GLSL = /* glsl */ `
uniform sampler2D tWaterColor;
uniform sampler2D tWaterDepth;
uniform vec2 uWaterResolution;
uniform float uWaterNear;
uniform float uWaterFar;
uniform float uWaterCapture;
uniform sampler2D tWaterReflection;
uniform mat4 uWaterReflectionMatrix;
uniform float uWaterReflectionReady;

float waterViewDepth(float d) {
  return uWaterNear * uWaterFar / max(uWaterFar - d * (uWaterFar - uWaterNear), 0.0001);
}

vec3 waterTransmission(vec3 body, vec3 normal, vec3 world, float depth, float clarity) {
  if (uWaterCapture < 0.5) return body;
  vec2 base = gl_FragCoord.xy / uWaterResolution;
  float surface = max(0.001, -(viewMatrix * vec4(world, 1.0)).z);
  // Small view-space bending, increasingly visible through deeper water.
  vec3 viewNormal = mat3(viewMatrix) * normal;
  vec2 offset = viewNormal.xy * 0.018 * smoothstep(0.0, 2.0, depth);
  vec2 sampleUV = clamp(base + offset, vec2(0.001), vec2(0.999));
  float raw = texture2D(tWaterDepth, sampleUV).r;
  float bed = waterViewDepth(raw);
  // Never refract the sky or a dry foreground object into the water.
  if (raw > 0.9999 || bed < surface + 0.025) {
    sampleUV = base;
    raw = texture2D(tWaterDepth, sampleUV).r;
    bed = waterViewDepth(raw);
  }
  if (raw > 0.9999 || bed < surface - 0.03) return body;
  float path = clamp(bed - surface, 0.0, 24.0);
  vec3 transmittance = exp(-vec3(0.48, 0.21, 0.13) * path / max(clarity, 0.2));
  vec3 bedColor = texture2D(tWaterColor, sampleUV).rgb;
  return bedColor * transmittance + body * (vec3(1.0) - transmittance);
}

vec3 waterReflection(vec3 sky, vec3 normal, vec3 world) {
  if (uWaterReflectionReady < 0.5) return sky;
  vec4 projected = uWaterReflectionMatrix * vec4(world.x, 0.0, world.z, 1.0);
  if (projected.w <= 0.0) return sky;
  vec2 uv = projected.xy / projected.w;
  uv += normal.xz * 0.05;
  float valid = smoothstep(0.0, 0.025, uv.x) * (1.0 - smoothstep(0.975, 1.0, uv.x))
              * smoothstep(0.0, 0.025, uv.y) * (1.0 - smoothstep(0.975, 1.0, uv.y));
  vec3 reflected = texture2D(tWaterReflection, clamp(uv, vec2(0.002), vec2(0.998))).rgb;
  return mix(sky, reflected, valid * 0.9);
}

float waterContactEdge(vec3 world) {
  if (uWaterCapture < 0.5) return 0.0;
  vec2 uv = gl_FragCoord.xy / uWaterResolution;
  float raw = texture2D(tWaterDepth, uv).r;
  if (raw > 0.9999) return 0.0;
  float surface = -(viewMatrix * vec4(world, 1.0)).z;
  float gap = waterViewDepth(raw) - surface;
  return smoothstep(0.0, 0.035, gap) * (1.0 - smoothstep(0.04, 0.28, gap));
}
`;
