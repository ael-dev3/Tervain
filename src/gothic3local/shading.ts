import * as THREE from 'three';
import { type PropertyObject, propNumber, propString, propVector } from './genome';
import { type Proxy, type ShaderGraph, type ShaderNode, SLOT } from './material';
import { TextureCache } from './textures';

/**
 * Gothic 3 materials as Three.js materials. Each material's node graph is compiled to GLSL and spliced into Three's
 * Blinn-Phong material: the graph gives the diffuse colour and alpha, specular colour and power, self-illumination and
 * the tangent-space normal; Three supplies the lights, shadows and fog.
 *
 * Node semantics (inferred from the installed materials; see docs/engineering/gothic3-local.md):
 * - a sampler reads its image with texture coordinates from its input, or the mesh's first set;
 * - a proxy's component picks what a colour input passes on (0 the colour, 1–3 the red, green or blue channel, 4 the
 *   grey level, 5 the alpha) and, on a texture-coordinate input, which of the mesh's four sets feeds that chain;
 * - combiners add (0), subtract (1), multiply (2), take the maximum (3) or minimum (4) of two inputs;
 * - a blend mixes its first two inputs by its third; a vertex-colour node reads the mesh's colour;
 * - texture-coordinate nodes scale, scroll, oscillate, rotate or parallax-offset (bump offset) their coordinates.
 *
 * As in the original Direct3D 9 renderer, lighting works on the colours as stored (no sRGB decoding), and the renderer
 * writes without conversion; see main.ts.
 */

export interface MaterialOptions {
  /** Seconds, for animated texture coordinates. */
  time: { value: number };
  /** Global brightness applied to every material's lighting result (Gothic 3's "overbright"). */
  overbright: { value: number };
  /** The area drawn in full detail (Three.js x/z: min x, min z, max x, max z); far-variant geometry sinks inside it. */
  detailBox: { value: THREE.Vector4 };
}

/** Full-detail world, or the low-poly world drawn beyond it. */
export type Variant = 'detail' | 'far';

interface Sampler {
  uniform: string;
  image: string;
  clamp: boolean;
}

class GraphCompiler {
  readonly lines: string[] = [];
  readonly samplers: Sampler[] = [];
  private readonly colorVars = new Map<string, string>();
  private readonly uvVars = new Map<string, string>();
  private counter = 0;
  usesVertexColor = false;
  usesTime = false;
  usesParallax = false;
  private readonly graph: ShaderGraph;

  constructor(graph: ShaderGraph) {
    this.graph = graph;
  }

  private id(prefix: string): string {
    return `g3${prefix}${this.counter++}`;
  }

  private sampler(image: string, clamp: boolean): string {
    const found = this.samplers.find((s) => s.image === image && s.clamp === clamp);
    if (found) return found.uniform;
    const uniform = `g3Tex${this.samplers.length}`;
    this.samplers.push({ uniform, image, clamp });
    return uniform;
  }

  /** A vec2 of texture coordinates for a texture-coordinate input (or the base set when there is none). */
  uv(proxy: Proxy | null, baseSet = 0, depth = 0): string {
    const set = Math.min(3, Math.max(0, proxy ? proxy.component : baseSet));
    const base = `vG3Uv${set}`;
    if (!proxy || depth > 8) return base;
    const node = this.graph.nodes.get(proxy.ref);
    if (!node) return base;
    const key = `${proxy.ref}|${set}`;
    const known = this.uvVars.get(key);
    if (known) return known;
    const p = node.object;
    const input = (i: number) => (node.inputs[i] ? this.uv(node.inputs[i]!, set, depth + 1) : base);
    let expr: string;
    switch (node.className) {
      case 'eCTexCoordSrcScale': {
        const s = propVector(p, 'Scale') ?? [1, 1];
        expr = `${input(0)} * vec2(${f(s[0] ?? 1)}, ${f(s[1] ?? 1)})`;
        break;
      }
      case 'eCTexCoordSrcScroller': {
        this.usesTime = true;
        const off = propVector(p, 'ScrollOffset') ?? [0, 0];
        const dir = propVector(p, 'Direction') ?? [0, 0];
        const rate = propNumber(p, 'Rate', 0);
        expr = `${input(0)} + vec2(${f(off[0] ?? 0)}, ${f(off[1] ?? 0)}) + vec2(${f(dir[0] ?? 0)}, ${f(dir[1] ?? 0)}) * (${f(rate)} * g3Time)`;
        break;
      }
      case 'eCTexCoordSrcOscillator': {
        this.usesTime = true;
        const amp = propVector(p, 'Amplitude') ?? [0, 0];
        const rate = propVector(p, 'Rate') ?? [0, 0];
        const phase = propVector(p, 'Phase') ?? [0, 0];
        const off = propVector(p, 'Offset') ?? [0, 0];
        expr = `${input(0)} + vec2(${f(off[0] ?? 0)}, ${f(off[1] ?? 0)}) + vec2(${f(amp[0] ?? 0)}, ${f(amp[1] ?? 0)}) * sin(6.2831853 * (vec2(${f(rate[0] ?? 0)}, ${f(rate[1] ?? 0)}) * g3Time + vec2(${f(phase[0] ?? 0)}, ${f(phase[1] ?? 0)})))`;
        break;
      }
      case 'eCTexCoordSrcBumpOffset': {
        // Parallax: offset the coordinates along the view direction by the height (the first input's chosen channel).
        this.usesParallax = true;
        const tc = node.inputs[1] ? this.uv(node.inputs[1]!, set, depth + 1) : base;
        const h = this.scalar(node.inputs[0] ?? null);
        const amount = propNumber(p, 'OffsetAmount', 0.02);
        expr = `g3Parallax(${tc}, ${h}, ${f(amount)})`;
        break;
      }
      default:
        expr = node.inputs[0] ? this.uv(node.inputs[0]!, set, depth + 1) : base;
    }
    const v = this.id('uv');
    this.lines.push(`vec2 ${v} = ${expr};`);
    this.uvVars.set(key, v);
    return v;
  }

  /** The raw vec4 a node produces. */
  private nodeColor(node: ShaderNode, depth: number): string {
    const known = this.colorVars.get(node.token);
    if (known) return known;
    const p = node.object;
    let expr: string;
    switch (node.className) {
      case 'eCColorSrcSampler': {
        const image = propString(p, 'ImageFilePath');
        if (!image) {
          expr = 'vec4(1.0)';
          break;
        }
        const clamp = propNumber(p, 'TexRepeatU', 0) === 2 || propNumber(p, 'TexRepeatV', 0) === 2;
        const tex = this.sampler(image, clamp);
        expr = `texture2D(${tex}, ${this.uv(node.inputs[0] ?? null, 0, depth + 1)})`;
        break;
      }
      case 'eCColorSrcConstant': {
        const c = constantColor(p);
        expr = `vec4(${f(c[0])}, ${f(c[1])}, ${f(c[2])}, ${f(propNumber(p, 'Alpha', 1))})`;
        break;
      }
      case 'eCColorSrcVertexColor':
        this.usesVertexColor = true;
        expr = 'vG3Color';
        break;
      case 'eCColorSrcCombiner': {
        const a = this.color(node.inputs[0] ?? null, depth + 1);
        const b = this.color(node.inputs[1] ?? null, depth + 1);
        const type = propNumber(p, 'CombinerType', 2);
        expr = type === 0 ? `(${a} + ${b})` : type === 1 ? `(${a} - ${b})` : type === 3 ? `max(${a}, ${b})` : type === 4 ? `min(${a}, ${b})` : `(${a} * ${b})`;
        break;
      }
      case 'eCColorSrcBlend': {
        const a = this.color(node.inputs[0] ?? null, depth + 1);
        const b = this.color(node.inputs[1] ?? null, depth + 1);
        const t = this.scalar(node.inputs[2] ?? null, depth + 1);
        expr = `mix(${a}, ${b}, clamp(${t}, 0.0, 1.0))`;
        break;
      }
      case 'eCColorSrcSkydomeSampler':
      case 'eCColorSrcCubeSampler':
        // Reflections of the sky: a cool sky tone stands in.
        expr = 'vec4(g3SkyColor, 1.0)';
        break;
      default:
        expr = 'vec4(1.0)';
    }
    const v = this.id('c');
    this.lines.push(`vec4 ${v} = ${expr};`);
    this.colorVars.set(node.token, v);
    return v;
  }

  /** A colour input as a vec4, with the proxy's component applied. */
  color(proxy: Proxy | null, depth = 0): string {
    if (!proxy || depth > 16) return 'vec4(1.0)';
    const node = this.graph.nodes.get(proxy.ref);
    if (!node) return 'vec4(1.0)';
    const v = this.nodeColor(node, depth);
    switch (proxy.component) {
      case 1:
        return `vec4(${v}.rrr, ${v}.a)`;
      case 2:
        return `vec4(${v}.ggg, ${v}.a)`;
      case 3:
        return `vec4(${v}.bbb, ${v}.a)`;
      case 4:
        return `vec4(vec3(dot(${v}.rgb, vec3(0.299, 0.587, 0.114))), ${v}.a)`;
      case 5:
        return `vec4(${v}.aaa, ${v}.a)`;
      default:
        return v;
    }
  }

  /** The images of the samplers an input reads, through any combiners and blends. */
  imagesUnder(proxy: Proxy | null, depth = 0, out: string[] = []): string[] {
    if (!proxy || depth > 16) return out;
    const node = this.graph.nodes.get(proxy.ref);
    if (!node) return out;
    if (node.className === 'eCColorSrcSampler') {
      const image = propString(node.object, 'ImageFilePath');
      if (image) out.push(image);
      return out;
    }
    for (const p of node.inputs) this.imagesUnder(p, depth + 1, out);
    return out;
  }

  /** A single value from an input: its chosen channel (the alpha for component 5, the red channel of the colour). */
  scalar(proxy: Proxy | null, depth = 0): string {
    if (!proxy) return '1.0';
    return `${this.color(proxy, depth)}.r`;
  }
}

function f(n: number): string {
  if (!Number.isFinite(n)) return '0.0';
  const s = n.toPrecision(7);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

/** A constant's colour: 3 floats, preceded by a word in the 16-byte form. */
export function constantColor(p: PropertyObject): [number, number, number] {
  const c = p.props.get('Color');
  if (Array.isArray(c) && c.length >= 3) return [c[0]!, c[1]!, c[2]!];
  if (c instanceof Uint8Array && c.length >= 12) {
    const dv = new DataView(c.buffer, c.byteOffset, c.byteLength);
    const o = c.length >= 16 ? 4 : 0;
    return [dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)];
  }
  return [1, 1, 1];
}

const COMMON = /* glsl */ `
uniform float g3Time;
uniform float g3Overbright;
uniform vec3 g3SkyColor;
varying vec2 vG3Uv0;
varying vec2 vG3Uv1;
varying vec2 vG3Uv2;
varying vec2 vG3Uv3;
varying vec4 vG3Color;
// Tangent frame from screen-space derivatives (no stored tangents needed; works with mirrored instances).
mat3 g3Frame(vec3 n, vec3 p, vec2 uv) {
  vec3 dp1 = dFdx(p);
  vec3 dp2 = dFdy(p);
  vec2 duv1 = dFdx(uv);
  vec2 duv2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, n);
  vec3 dp1perp = cross(n, dp1);
  vec3 t = dp2perp * duv1.x + dp1perp * duv2.x;
  vec3 b = dp2perp * duv1.y + dp1perp * duv2.y;
  float inv = inversesqrt(max(max(dot(t, t), dot(b, b)), 1e-20));
  return mat3(t * inv, b * inv, n);
}
vec2 g3Parallax(vec2 uv, float height, float amount) {
  vec3 n = normalize(vNormal);
  mat3 tbn = g3Frame(n, -vViewPosition, uv);
  vec3 v = normalize(vViewPosition);
  vec3 e = vec3(dot(tbn[0], v), dot(tbn[1], v), dot(n, v));
  return uv + (height * amount - amount * 0.5) * e.xy;
}
`;

export interface G3MaterialInfo {
  blend: 'opaque' | 'mask' | 'blend' | 'add';
  textures: string[];
}

/** Build a Three.js material for a Gothic 3 material graph (or a plain fallback when the graph is missing). */
export async function buildMaterial(name: string, graph: ShaderGraph | null, textures: TextureCache, options: MaterialOptions, variant: Variant = 'detail'): Promise<{ material: THREE.Material; info: G3MaterialInfo }> {
  if (!graph) {
    const m = new THREE.MeshPhongMaterial({ color: 0x8a8070, shininess: 4, specular: 0x000000 });
    m.name = name;
    return { material: m, info: { blend: 'opaque', textures: [] } };
  }
  const g = new GraphCompiler(graph);
  const slot = (i: number) => graph.inputs[i] ?? null;
  const diffuse = slot(SLOT.diffuse) ? g.color(slot(SLOT.diffuse)) : 'vec4(1.0)';
  const opacity = slot(SLOT.opacity) ? g.scalar(slot(SLOT.opacity)) : null;
  const emissive = slot(SLOT.selfIllumination) ? `${g.color(slot(SLOT.selfIllumination))}.rgb` : 'vec3(0.0)';
  const enableSpecular = propNumber(graph.shader, 'EnableSpecular', 0) !== 0;
  const specular = enableSpecular && slot(SLOT.specular) ? `${g.color(slot(SLOT.specular))}.rgb` : 'vec3(0.0)';
  const power = slot(SLOT.specularPower) ? g.scalar(slot(SLOT.specularPower)) : '0.25';
  const normal = slot(SLOT.normal) ? g.color(slot(SLOT.normal)) : null;
  // The texture coordinates the normal map is read with, for its tangent frame.
  const normalUv = normal ? normalUvOf(g, graph, slot(SLOT.normal)) : 'vG3Uv0';
  const blendIndex = propNumber(graph.shader, 'BlendMode', 0);
  const blend: G3MaterialInfo['blend'] = blendIndex === 1 ? 'mask' : blendIndex === 2 ? 'blend' : blendIndex >= 3 ? 'add' : 'opaque';
  const maskRef = propNumber(graph.shader, 'MaskReference', 0);
  const alphaRef = blend === 'mask' ? (maskRef > 0 ? maskRef / 255 : 0.5) : 0;
  const unlit = propNumber(graph.shader, 'DisableLighting', 0) !== 0;

  const material = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff, shininess: 30 });
  material.name = name;
  const uniforms: Record<string, THREE.IUniform> = {
    g3Time: options.time,
    g3Overbright: options.overbright,
    g3SkyColor: { value: new THREE.Color(0.55, 0.62, 0.66) },
    g3DetailBox: options.detailBox,
  };
  const loaded = await Promise.all(g.samplers.map((s) => textures.get(s.image, s.clamp)));
  g.samplers.forEach((s, i) => (uniforms[s.uniform] = { value: loaded[i] ?? textures.neutral() }));
  // DXT5 normal maps keep X in alpha and Y in green (red and blue empty); others keep XYZ in RGB.
  const normalImages = normal ? g.imagesUnder(slot(SLOT.normal)) : [];
  const formatOf = (image: string) => loaded[g.samplers.findIndex((s) => s.image === image)]?.userData.format as string | undefined;
  const swizzledNormal = normalImages.length > 0 && normalImages.every((i) => formatOf(i) === 'DXT5');
  const declarations = g.samplers.map((s) => `uniform sampler2D ${s.uniform};`).join('\n');
  const body = g.lines.join('\n  ');

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec2 g3uv0;
attribute vec2 g3uv1;
attribute vec2 g3uv2;
attribute vec2 g3uv3;
attribute vec4 g3color;
varying vec2 vG3Uv0;
varying vec2 vG3Uv1;
varying vec2 vG3Uv2;
varying vec2 vG3Uv3;
varying vec4 vG3Color;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vG3Uv0 = g3uv0; vG3Uv1 = g3uv1; vG3Uv2 = g3uv2; vG3Uv3 = g3uv3; vG3Color = g3color;`,
      )
      .replace('#include <common>', '#include <common>\nuniform vec4 g3DetailBox;')
      .replace(
        '#include <project_vertex>',
        variant === 'far'
          ? `#include <project_vertex>
{
  // The low-poly world sinks out of sight where the full-detail world is drawn.
  vec4 g3World = modelMatrix * vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    g3World = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
  #endif
  if (g3World.x > g3DetailBox.x && g3World.x < g3DetailBox.z && g3World.z > g3DetailBox.y && g3World.z < g3DetailBox.w) {
    g3World.y -= 60.0;
    gl_Position = projectionMatrix * viewMatrix * g3World;
  }
}`
          : '#include <project_vertex>',
      );
    // The helpers read vNormal and vViewPosition, which Three declares after <common>; put them just before main().
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${declarations}`)
      .replace('void main() {', `${COMMON}\nvoid main() {`)
      .replace(
        '#include <map_fragment>',
        `vec4 g3Diffuse; vec3 g3Specular; float g3Power; vec3 g3Emissive; vec4 g3Normal; vec2 g3NormalUv; float g3Opacity;
{
  ${body}
  g3NormalUv = ${normalUv};
  g3Diffuse = ${diffuse};
  g3Specular = ${specular};
  g3Power = ${power};
  g3Emissive = ${emissive};
  g3Normal = ${normal ?? 'vec4(0.5, 0.5, 1.0, 1.0)'};
  g3Opacity = ${opacity ?? '-1.0'};
}
diffuseColor *= g3Diffuse;
if (g3Opacity >= 0.0) diffuseColor.a = g3Opacity;`,
      )
      .replace(
        '#include <alphatest_fragment>',
        blend === 'mask' ? `if (diffuseColor.a < ${f(alphaRef)}) discard;` : '',
      )
      .replace('#include <specularmap_fragment>', 'float specularStrength = 1.0;')
      .replace(
        '#include <normal_fragment_maps>',
        normal
          ? `{
  ${swizzledNormal ? 'vec3 mapN; mapN.xy = g3Normal.ag * 2.0 - 1.0; mapN.z = sqrt(max(0.0, 1.0 - dot(mapN.xy, mapN.xy)));' : 'vec3 mapN = g3Normal.xyz * 2.0 - 1.0;'}
  mat3 tbn = g3Frame(normal, -vViewPosition, g3NormalUv);
  normal = normalize(tbn * mapN);
}`
          : '',
      )
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance += g3Emissive;')
      .replace(
        '#include <lights_phong_fragment>',
        `#include <lights_phong_fragment>
material.specularColor = g3Specular;
material.specularShininess = max(1.0, g3Power * 64.0);`,
      )
      .replace(
        '#include <opaque_fragment>',
        // The brightening lifts diffuse light only; highlights and glow keep their strength.
        `${unlit ? 'outgoingLight = diffuseColor.rgb + totalEmissiveRadiance;' : 'outgoingLight += (reflectedLight.directDiffuse + reflectedLight.indirectDiffuse) * (g3Overbright - 1.0);'}
#include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => `g3:${name}:${variant}`;
  if (blend === 'blend') {
    material.transparent = true;
    material.depthWrite = false;
  } else if (blend === 'add') {
    material.transparent = true;
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;
  }
  if (blend === 'mask' || blend === 'blend') material.side = THREE.DoubleSide;
  return { material, info: { blend, textures: g.samplers.map((s) => s.image) } };
}

/** The texture coordinates a normal input's sampler reads (for the normal's tangent frame). */
function normalUvOf(g: GraphCompiler, graph: ShaderGraph, proxy: Proxy | null): string {
  let node = proxy ? graph.nodes.get(proxy.ref) : undefined;
  for (let i = 0; node && i < 8; i++) {
    if (node.className === 'eCColorSrcSampler') return g.uv(node.inputs[0] ?? null, 0);
    const next: Proxy | null | undefined = node.inputs.find((p) => p && graph.nodes.get(p.ref));
    node = next ? graph.nodes.get(next.ref) : undefined;
  }
  return 'vG3Uv0';
}

/** Placeholder material for a missing material file. */
export function missingMaterial(name: string): THREE.Material {
  const m = new THREE.MeshPhongMaterial({ color: 0x80786a, shininess: 2, specular: 0x000000 });
  m.name = `${name} (missing)`;
  return m;
}

export { TextureCache };
