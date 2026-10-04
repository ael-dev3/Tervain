import { BinaryReader, hex } from './binary';
import { type PropertyObject, openResource, readPropertyObject } from './genome';

/**
 * Compiled materials (.xshmat), as observed: an `eCResourceShaderMaterial_PS` object whose own data is a version (u16),
 * a word, then the shader: a property object (`eCShaderDefault`, …) whose own data is a version (u16), its input
 * "proxies", the shader element base, the number of nodes (u32) and the nodes, each a property object (samplers,
 * constants, combiners, texture-coordinate modifiers…).
 *
 * A proxy is 24 bytes: the component it takes (u32: 0 the colour, 5 the alpha), the GUID of the node it reads (16), a
 * valid flag (u8) and three bytes of padding. A node's own data is a version (u16), its proxies (and for samplers one
 * further word), then the element base: two versions (u16), the node's own GUID (its token), a valid flag, padding and
 * the node's rectangle in the material editor (4 × u32), 40 bytes in all.
 *
 * The default shader's seven inputs, in order (inferred from the installed materials; see docs): diffuse colour,
 * opacity, self-illumination, specular colour, specular power, normal, and a seventh that the installed materials
 * leave unconnected or use for distortion.
 */

export interface Proxy {
  component: number;
  ref: string;
}

export interface ShaderNode {
  className: string;
  object: PropertyObject;
  token: string;
  inputs: (Proxy | null)[];
}

export interface ShaderGraph {
  shaderClass: string;
  shader: PropertyObject;
  inputs: (Proxy | null)[];
  nodes: Map<string, ShaderNode>;
  physics: PropertyObject;
}

const BASE_SIZE = 40;

function readProxy(r: BinaryReader): Proxy | null {
  const component = r.u32();
  const ref = hex(r.bytesView(16));
  const valid = r.u8() !== 0;
  r.skip(3);
  return valid ? { component, ref } : null;
}

function readBaseToken(r: BinaryReader): string | null {
  r.u16();
  r.u16();
  const token = hex(r.bytesView(16));
  const valid = r.u8() !== 0;
  r.skip(3 + 16);
  return valid ? token : null;
}

function readNode(r: BinaryReader): ShaderNode | null {
  const object = readPropertyObject(r);
  if (!object) return null;
  r.pos = object.dataStart;
  r.u16();
  const middle = object.end - BASE_SIZE - r.pos;
  const inputs: (Proxy | null)[] = [];
  const proxies = Math.floor(middle / 24);
  for (let i = 0; i < proxies; i++) inputs.push(readProxy(r));
  r.pos = object.end - BASE_SIZE;
  const token = readBaseToken(r) ?? '';
  r.pos = object.end;
  return { className: object.className, object, token, inputs };
}

/** The first property object between `from` and `to` whose class passes the test, or -1. */
function findObject(r: BinaryReader, from: number, to: number, test: (className: string) => boolean): number {
  const b = r.bytes;
  for (let at = from; at + 8 <= to; at++) {
    if (b[at] !== 1 || b[at + 1] !== 0 || b[at + 2] !== 1 || b[at + 3] !== 1 || b[at + 4] !== 0 || b[at + 5] !== 1) continue;
    const probe = new BinaryReader(r.bytes, r.strings, at);
    try {
      const o = readPropertyObject(probe);
      if (o && test(o.className) && o.end <= to) return at;
    } catch {
      // Not an object here.
    }
  }
  return -1;
}

export function parseMaterial(bytes: Uint8Array): ShaderGraph {
  const f = openResource(bytes);
  const r = f.reader;
  const physics = readPropertyObject(r);
  if (!physics || physics.className !== 'eCResourceShaderMaterial_PS') throw new Error(`not a material (${physics?.className ?? 'empty'})`);
  // A few words precede the shader object; find the object itself.
  const shaderAt = findObject(r, physics.dataStart, physics.end, (n) => /^eCShader/.test(n));
  if (shaderAt < 0) throw new Error('material without a shader');
  r.pos = shaderAt;
  const shader = readPropertyObject(r);
  if (!shader) throw new Error('material without a shader');
  r.pos = shader.dataStart;
  r.u16();
  // The shader's proxies run up to its element base, which is followed by the node count and the nodes. Find the first
  // node (a property object) to know where the proxies end.
  const firstNode = findObject(r, r.pos, shader.end, (n) => /^eC(ColorSrc|TexCoordSrc|Shader)/.test(n));
  const proxyEnd = (firstNode >= 0 ? firstNode : shader.end) - 4 - BASE_SIZE;
  const inputs: (Proxy | null)[] = [];
  while (r.pos + 24 <= proxyEnd) inputs.push(readProxy(r));
  const nodes = new Map<string, ShaderNode>();
  if (firstNode >= 0) {
    r.pos = firstNode - 4;
    const count = r.u32();
    for (let i = 0; i < count && r.pos < shader.end; i++) {
      const node = readNode(r);
      if (node && node.token) nodes.set(node.token, node);
    }
  }
  return { shaderClass: shader.className, shader, inputs, nodes, physics };
}

/** Slot order of the default shader's inputs. */
export const SLOT = { diffuse: 0, opacity: 1, selfIllumination: 2, specular: 3, specularPower: 4, normal: 5, distortion: 6 } as const;
