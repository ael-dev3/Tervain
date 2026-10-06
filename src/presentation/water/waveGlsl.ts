import { SEA_LEVEL } from '../../world/layout';
import { BATHY, BATHY_NX, BATHY_NZ, OPEN_DEPTH } from '../../world/water/bathymetry';
import { GRAVITY, SWELL, SWELL_DIR, SWELL_K0, SWELL_OMEGA, WIND_WAVES } from '../../world/water/waves';

/**
 * The sea's wave functions in GLSL, generated from the same constants as world/water/waves.ts so the drawn sea, the
 * floating barrels and the swimmer all ride one surface. Each function here mirrors its TypeScript twin.
 */

const f = (v: number) => {
  const s = Number(v).toPrecision(9);
  return s.includes('.') || s.includes('e') ? s : `${s}.0`;
};

export const WAVE_GLSL = /* glsl */ `
#define SEA_LEVEL ${f(SEA_LEVEL)}
#define SWELL_OMEGA ${f(SWELL_OMEGA)}
#define SWELL_K0 ${f(SWELL_K0)}
#define SWELL_HEIGHT ${f(SWELL.height)}
#define SWELL_BREAKER ${f(SWELL.breaker)}
#define SWELL_RUNUP ${f(SWELL.runup)}
#define SWELL_MIN_DEPTH ${f(SWELL.minDepth)}
#define WATER_GRAVITY ${f(GRAVITY)}
const vec2 SWELL_DIR = vec2(${f(SWELL_DIR.x)}, ${f(SWELL_DIR.z)});

float waveNumberOf(float omega, float depth) {
  float h = max(depth, 0.0001);
  float deep = omega * omega / WATER_GRAVITY;
  float x = pow(omega * sqrt(h / WATER_GRAVITY), 1.5);
  if (x > 12.0) return deep;
  return deep * pow(1.0 / tanh(x), 2.0 / 3.0);
}
float swellSet(float phase, float t) {
  return 1.0 - ${f(SWELL.groupDepth * 0.5)} + ${f(SWELL.groupDepth * 0.5)} * sin((phase - SWELL_OMEGA * t) / ${f(SWELL.groupWaves)} + 0.7);
}
float crestWobble(vec2 p) {
  return 0.9 * sin(p.y * 0.027 + p.x * 0.004 + 1.3) + 0.45 * sin(p.y * 0.081 - p.x * 0.013 + 4.2);
}
float breakingOf(float height, float depth) {
  if (depth <= 0.0) return 1.0;
  return smoothstep(0.42, 0.98, height / (SWELL_BREAKER * depth));
}

// The swell and wind waves: displacement (xyz), and in 'slope' the surface gradient dy/dx, dy/dz; 'squeeze' is the
// Gerstner compression (crests gather the surface: whitecaps and breaking foam). 'lod' scales down waves too short for
// the local sample spacing, so a distant sea does not shimmer.
vec3 seaOffset(vec2 p, float t, float phase, float height, float steep, vec2 dir, float depth, float spacing,
  out vec2 slope, out float squeeze) {
  vec3 o = vec3(0.0);
  slope = vec2(0.0);
  squeeze = 0.0;
  if (height > 0.0) {
    float theta = phase + crestWobble(p) - SWELL_OMEGA * t;
    float a = height * 0.5 * swellSet(phase, t);
    float k = waveNumberOf(SWELL_OMEGA, max(depth, SWELL_MIN_DEPTH));
    float lean = 0.55 + 0.4 * steep;
    float side = (lean / k) * min(1.0, a * k * 2.4);
    float c = cos(theta), s = sin(theta);
    float keep = 1.0 - smoothstep(6.28318 / k * 0.25, 6.28318 / k * 0.5, spacing);
    o.y += a * (c + 0.18 * steep * (c * c - 0.5)) * keep;
    o.xz -= dir * side * s * keep;
    // d(theta)/dx = k * dir: the solved phase's gradient is the local wave vector.
    slope += -a * k * (s + 0.36 * steep * c * s) * dir * keep;
    squeeze += side * k * c * keep;
  }
  float wind = smoothstep(0.25, 7.0, depth);
  if (wind > 0.0) {
    ${WIND_WAVES.map((w, i) => `{
      const vec2 d${i} = vec2(${f(Math.cos(w.angle))}, ${f(Math.sin(w.angle))});
      const float k${i} = ${f((2 * Math.PI) / w.length)};
      float theta = k${i} * dot(d${i}, p) - ${f(Math.sqrt(GRAVITY * ((2 * Math.PI) / w.length)))} * t + ${f(w.phase)};
      float c = cos(theta), s = sin(theta);
      float keep = wind * (1.0 - smoothstep(${f(w.length * 0.25)}, ${f(w.length * 0.5)}, spacing));
      o.y += ${f(w.amp)} * c * keep;
      o.xz -= d${i} * ${f(w.chop / ((2 * Math.PI) / w.length))} * s * keep;
      slope += -${f(w.amp)} * k${i} * s * d${i} * keep;
      squeeze += ${f(w.chop)} * c * keep;
    }`).join('\n    ')}
  }
  return o;
}

float swashRise(float shorePhase, float breakerHeight, float t) {
  if (breakerHeight <= 0.0) return 0.0;
  float cycle = (shorePhase - SWELL_OMEGA * t) / 6.2831853;
  float fr = fract(cycle);
  float shape = fr < 0.3 ? sin(fr / 0.3 * 1.5707963) : (fr < 0.85 ? cos((fr - 0.3) / 0.55 * 1.5707963) : 0.0);
  return SWELL_RUNUP * breakerHeight * swellSet(shorePhase, t) * pow(max(shape, 0.0), 1.3);
}
`;

/** The sea bed's two textures, read with manual bilinear filtering so float data needs no filtering extension. */
export const BATHY_GLSL = /* glsl */ `
uniform highp sampler2D tBathy;      // bed, phase, shore phase, swell height (-1: not sea)
uniform highp sampler2D tBathyWave;  // wave vector x, z (rad/m), shelter, rocky shore
#define BATHY_MIN vec2(${f(BATHY.minX)}, ${f(BATHY.minZ)})
#define BATHY_MAX vec2(${f(BATHY.maxX)}, ${f(BATHY.maxZ)})
#define BATHY_CELL ${f(BATHY.cell)}
#define BATHY_SIZE ivec2(${BATHY_NX + 1}, ${BATHY_NZ + 1})
#define OPEN_DEPTH ${f(OPEN_DEPTH)}

vec4 bathyFetch(highp sampler2D tex, vec2 p) {
  vec2 g = (p - BATHY_MIN) / BATHY_CELL;
  vec2 i = floor(g);
  vec2 w = g - i;
  ivec2 c = ivec2(i);
  ivec2 hi = BATHY_SIZE - 1;
  vec4 a = texelFetch(tex, clamp(c, ivec2(0), hi), 0);
  vec4 b = texelFetch(tex, clamp(c + ivec2(1, 0), ivec2(0), hi), 0);
  vec4 cc = texelFetch(tex, clamp(c + ivec2(0, 1), ivec2(0), hi), 0);
  vec4 d = texelFetch(tex, clamp(c + ivec2(1, 1), ivec2(0), hi), 0);
  return mix(mix(a, b, w.x), mix(cc, d, w.x), w.y);
}
bool insideBathy(vec2 p) {
  return all(greaterThanEqual(p, BATHY_MIN)) && all(lessThanEqual(p, BATHY_MAX));
}
// Sea state at p: bed height, swell phase, shore phase, swell height; wave vector. Outside the grid: open ocean to the
// west; to the north and south the coast runs on as it leaves the grid (sea only off the edge's own sea); none inland.
void bathySample(vec2 p, out vec4 bed, out vec4 wave) {
  if (insideBathy(p)) {
    bed = bathyFetch(tBathy, p);
    wave = bathyFetch(tBathyWave, p);
    // A missing (unreached) corner blends to -1 height: never treat a mixed land/sea texel as open water.
  } else {
    float open = SWELL_K0 * dot(SWELL_DIR, p);
    float height = SWELL_HEIGHT;
    if (p.x > BATHY_MAX.x) height = -1.0;
    else if (p.x >= BATHY_MIN.x && bathyFetch(tBathy, vec2(p.x, clamp(p.y, BATHY_MIN.y, BATHY_MAX.y))).w < 0.0) height = -1.0;
    bed = vec4(SEA_LEVEL - OPEN_DEPTH, open, open, height);
    wave = vec4(SWELL_DIR * SWELL_K0, 1.0, 0.0);
  }
}
`;
