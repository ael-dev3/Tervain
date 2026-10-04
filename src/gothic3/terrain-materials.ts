import * as THREE from 'three';
import { readNativeBytes } from './resource';
import type { MaterialProxy, NativeMaterialGraph, NativeMaterialNode, TerrainTexture } from './terrain-types';

interface Expression { code: string; width: 1 | 3 | 4 }
interface Sampler { name: string; textureId: string; wrapS: THREE.Wrapping; wrapT: THREE.Wrapping }
interface CompiledGraph {
  body: string;
  diffuse: string;
  opacity: string | null;
  normal: string | null;
  specular: string | null;
  specularPower: string | null;
  emission: string | null;
  samplers: Sampler[];
  uvs: number[];
  root: NativeMaterialNode;
}

const uvNames = ['uv', 'uv1', 'uv2', 'uv3'] as const;
const wrapping = [THREE.RepeatWrapping, THREE.ClampToEdgeWrapping, THREE.MirroredRepeatWrapping] as const;
const float = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Non-finite native shader constant');
  const text = String(value);
  return /[.e]/i.test(text) ? text : text + '.0';
};
const vector = (value: unknown, size: number): string => {
  if (!Array.isArray(value) || value.length !== size) throw new Error('Native shader vector has wrong size');
  return `vec${size}(${value.map(float).join(',')})`;
};
const rgb = (expression: Expression): string => expression.width === 1 ? `vec3(${expression.code})` : `(${expression.code}).rgb`;
const scalar = (expression: Expression): string => expression.width === 1 ? expression.code : `(${expression.code}).r`;

/** Compiles the recovered color/UV graph. Global lighting remains Three's preview. */
function compileGraph(graph: NativeMaterialGraph): CompiledGraph {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  if (nodes.size !== graph.nodes.length) throw new Error('Duplicate native shader node');
  const root = nodes.get(graph.root);
  if (root?.class !== 'eCShaderDefault' || !root.outputs) throw new Error('Unsupported native terrain shader root');
  if (root.values.TransformationType !== 0 || root.values.UseDepthBias !== false) throw new Error('Unsupported terrain transform/depth bias');
  const statements: string[] = [];
  const memo = new Map<string, Expression>();
  const coordinateMemo = new Map<string, string>();
  const visiting = new Set<string>();
  const samplers: Sampler[] = [];
  const uvs = new Set<number>();
  let serial = 0;

  const resolve = (proxy: MaterialProxy): NativeMaterialNode => {
    const node = nodes.get(proxy.token);
    if (!proxy.valid || !node) throw new Error('Native material input does not resolve: ' + proxy.token);
    return node;
  };
  const select = (expression: Expression, selector: number): Expression => {
    if (selector === 0) return expression;
    if (selector === 1) {
      if (expression.width === 1) return { code: `vec3(${expression.code})`, width: 3 };
      return { code: `(${expression.code}).rgb`, width: 3 };
    }
    if (selector < 2 || selector > 5 || !Number.isInteger(selector)) throw new Error('Unknown native color selector');
    if (expression.width === 1) return expression;
    if (selector === 5 && expression.width !== 4) throw new Error('Native alpha selector has no alpha input');
    return { code: `(${expression.code}).${'rgba'[selector - 2]}`, width: 1 };
  };
  const matchingWidth = (left: Expression, right: Expression): 1 | 3 | 4 => {
    if (left.width === right.width || right.width === 1) return left.width;
    if (left.width === 1) return right.width;
    throw new Error('Unsupported native mixed RGB/RGBA operation');
  };
  const lifted = (value: Expression, width: number): string => value.width === width ? value.code : `vec${width}(${value.code})`;
  const colorProxy = (proxy: MaterialProxy | undefined): Expression => {
    if (!proxy) throw new Error('Missing native color input');
    return select(colorNode(resolve(proxy)), proxy.selector);
  };
  const uvProxy = (proxy: MaterialProxy | undefined): string => {
    if (!proxy) throw new Error('Missing native coordinate input');
    // Native GetVSImplementation follows a valid node unchanged. Only the
    // missing-instance branch uses this proxy's selector as the source UV.
    if (!proxy.valid) {
      if (!Number.isInteger(proxy.selector) || proxy.selector < 0 || proxy.selector > 3) throw new Error('Unsupported native UV selector');
      uvs.add(proxy.selector);
      return `vG3UV${proxy.selector}`;
    }
    const node = resolve(proxy);
    const existing = coordinateMemo.get(node.id);
    if (existing) return existing;
    if (visiting.has(node.id)) throw new Error('Cycle in native shader graph');
    visiting.add(node.id);
    let code: string;
    if (node.class === 'eCTexCoordSrcScale') {
      code = `(${uvProxy(node.texCoord)} * ${vector(node.values.Scale, 2)})`;
    } else if (node.class === 'eCTexCoordSrcBumpOffset') {
      const height = node.inputs?.height;
      if (!height) throw new Error('Native bump offset lacks height');
      const selected = colorProxy({ ...height, selector: height.selector <= 1 ? 5 : height.selector });
      const amount = float(node.values.OffsetAmount);
      // Native generated HLSL has no division by tangent-space eye.z.
      code = `(${uvProxy(node.inputs?.texCoord)} + ((${scalar(selected)}) - 0.5) * vec2(${amount},-${amount}) * g3TangentEye)`;
    } else throw new Error('Unsupported native UV node: ' + node.class);
    const local = `g3UV${serial++}`;
    statements.push(`vec2 ${local} = ${code};`);
    coordinateMemo.set(node.id, local);
    visiting.delete(node.id);
    return local;
  };
  const colorNode = (node: NativeMaterialNode): Expression => {
    const existing = memo.get(node.id);
    if (existing) return existing;
    if (visiting.has(node.id)) throw new Error('Cycle in native shader graph');
    visiting.add(node.id);
    let expression: Expression;
    switch (node.class) {
      case 'eCColorSrcConstant':
        expression = { code: `vec4(${vector(node.values.Color, 3)},${float(node.values.Alpha)})`, width: 4 }; break;
      case 'eCColorSrcVertexColor':
        expression = { code: 'vG3Color', width: 4 }; break;
      case 'eCColorSrcSampler': {
        if (!node.textureId || node.selectionStatus?.includes('unresolved')) throw new Error('Native sampler texture unresolved: ' + node.id);
        if (node.values.AnimationSpeed !== 0 || node.values.SwitchRepeat !== 0) throw new Error('Animated native sampler is not implemented');
        const s = wrapping[Number(node.values.TexRepeatU)];
        const t = wrapping[Number(node.values.TexRepeatV)];
        if (s === undefined || t === undefined) throw new Error('Unknown native sampler wrapping');
        const name = 'g3Texture' + samplers.length;
        samplers.push({ name, textureId: node.textureId, wrapS: s, wrapT: t });
        expression = { code: `texture2D(${name}, ${uvProxy(node.texCoord)})`, width: 4 }; break;
      }
      case 'eCColorSrcCombiner': {
        const left = colorProxy(node.inputs?.color1), right = colorProxy(node.inputs?.color2);
        const width = matchingWidth(left, right);
        const a = lifted(left, width), b = lifted(right, width);
        const type = node.values.CombinerType;
        let code: string;
        if (type === 0 || type === 1 || type === 2) code = `(${a} ${['+', '-', '*'][type]} ${b})`;
        else if (type === 3 || type === 4) code = `${type === 3 ? 'max' : 'min'}(${a},${b})`;
        else throw new Error('Unknown native color combiner');
        expression = { code, width }; break;
      }
      case 'eCColorSrcBlend': {
        const left = colorProxy(node.inputs?.color1), right = colorProxy(node.inputs?.color2);
        const weight = colorProxy(node.inputs?.blend), width = matchingWidth(left, right);
        if (weight.width !== 1 && weight.width !== width) throw new Error('Native blend factor width differs');
        expression = { code: `mix(${lifted(left, width)},${lifted(right, width)},${weight.code})`, width }; break;
      }
      default: throw new Error('Unsupported native color node: ' + node.class);
    }
    const local = `g3Color${serial++}`;
    statements.push(`${expression.width === 1 ? 'float' : 'vec' + expression.width} ${local} = ${expression.code};`);
    expression = { code: local, width: expression.width };
    memo.set(node.id, expression);
    visiting.delete(node.id);
    return expression;
  };
  const output = (name: string): Expression | null => {
    const proxy = root.outputs![name];
    return proxy?.valid ? colorProxy(proxy) : null;
  };
  const diffuse = output('diffuse'), opacity = output('opacity'), normal = output('normal');
  const specular = root.values.EnableSpecular === true ? output('specular') : null;
  const specularPower = specular ? output('specularPower') : null;
  const emission = output('selfIllumination');
  if (normal && normal.width !== 4) throw new Error('Native AG normal map requires four components');
  if (output('distortion')) throw new Error('Native distortion is not implemented');
  return {
    body: statements.join('\n'), diffuse: diffuse ? rgb(diffuse) : 'vec3(1.0)',
    opacity: opacity ? scalar(opacity) : null, normal: normal?.code ?? null,
    specular: specular ? rgb(specular) : null, specularPower: specularPower ? scalar(specularPower) : null,
    emission: emission ? rgb(emission) : null, samplers, uvs: [...uvs].sort(), root,
  };
}

interface TextureEntry { texture: THREE.Texture; bytes: number; refs: number; image: ImageBitmap }
interface MaterialEntry { material: THREE.Material; textures: TextureEntry[]; refs: number }
export interface TerrainMaterialLease { material: THREE.Material; release(): void; limitation?: string }

/** Only resident cell references retain GPU materials/textures. Failed reads retry. */
export class TerrainMaterials {
  private readonly textures = new Map<string, Promise<TextureEntry>>();
  private readonly materials = new Map<string, Promise<MaterialEntry>>();
  private readonly graphs: Map<string, NativeMaterialGraph>;
  private readonly textureSources: Map<string, TerrainTexture>;
  private readonly compiled = new Map<string, CompiledGraph>();
  private disposed = false;
  private textureBytes = 0;
  readonly limitations = new Map<string, string>();

  constructor(graphs: NativeMaterialGraph[], textures: TerrainTexture[], private readonly renderer: THREE.WebGLRenderer) {
    this.graphs = new Map(graphs.map((graph) => [graph.id, graph]));
    this.textureSources = new Map(textures.map((texture) => [texture.id, texture]));
  }
  get estimatedTextureBytes(): number { return this.textureBytes; }

  async acquire(id: string, geometry: THREE.BufferGeometry): Promise<TerrainMaterialLease> {
    if (this.disposed) throw new Error('Terrain materials are disposed');
    let compiled = this.compiled.get(id);
    if (!compiled) {
      const graph = this.graphs.get(id);
      if (!graph) throw new Error('No original terrain graph: ' + id);
      try { compiled = compileGraph(graph); this.compiled.set(id, compiled); }
      catch (error) { return this.diagnostic(id, String(error)); }
    }
    // Some original primitives have a graph requesting UV1 but only a UV0
    // stream. Native missing-stream binding is unresolved; retain the mesh
    // without inventing a UV alias or allocating unusable textures.
    for (const uv of compiled.uvs) {
      const source = geometry.getAttribute(uvNames[uv]!);
      if (!source) return this.diagnostic(id, 'Original primitive lacks requested UV' + uv);
      geometry.setAttribute('g3UV' + uv, source);
    }
    for (const attribute of ['_g3_bgra', '_g3_tangent']) {
      if (!geometry.getAttribute(attribute)) return this.diagnostic(id, 'Original primitive lacks ' + attribute);
    }
    let pending = this.materials.get(id);
    if (!pending) {
      pending = this.createMaterial(id).catch((error: unknown) => { this.materials.delete(id); throw error; });
      this.materials.set(id, pending);
    }
    const entry = await pending;
    // A previously resolved cache promise can be evicted while this await's
    // continuation is queued. Never claim a disposed material from that entry.
    if (this.materials.get(id) !== pending) return this.acquire(id, geometry);
    entry.refs++;
    let released = false;
    const release = (): void => {
      if (released) return;
      released = true;
      if (--entry.refs === 0) {
        this.materials.delete(id);
        entry.material.dispose();
        for (const texture of entry.textures) this.releaseTexture(texture);
      }
    };
    try {
      if (this.disposed) throw new Error('Terrain material loader disposed during acquisition');
    } catch (error) { release(); throw error; }
    return {
      material: entry.material, limitation: this.limitations.get(id),
      release,
    };
  }

  private diagnostic(id: string, reason: string): TerrainMaterialLease {
    const limitation = id + ': ' + reason;
    this.limitations.set(limitation, limitation);
    const material = new THREE.MeshBasicMaterial({ color: 0xc34b9e, side: THREE.DoubleSide });
    material.name = id + ' [unresolved native material]';
    let released = false;
    return { material, limitation, release: () => { if (!released) { released = true; material.dispose(); } } };
  }

  private async texture(sampler: Sampler): Promise<TextureEntry> {
    const key = `${sampler.textureId}|${sampler.wrapS}|${sampler.wrapT}`;
    let pending = this.textures.get(key);
    if (!pending) {
      pending = (async () => {
        const source = this.textureSources.get(sampler.textureId);
        if (!source) throw new Error('Native texture absent from terrain manifest: ' + sampler.textureId);
        const bytes = await readNativeBytes('terrain/' + source.url, source);
        const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none', imageOrientation: 'none' });
        if (image.width !== source.width || image.height !== source.height || this.disposed) {
          image.close(); throw new Error('Native texture dimensions differ or loader disposed');
        }
        const texture = new THREE.Texture(image);
        texture.name = sampler.textureId;
        // Original UVs and decoded bytes are unchanged. Native sampler gamma
        // state remains unresolved, so no unproved sRGB conversion is inserted.
        texture.flipY = false;
        texture.colorSpace = THREE.NoColorSpace;
        texture.wrapS = sampler.wrapS; texture.wrapT = sampler.wrapT;
        texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        texture.needsUpdate = true;
        texture.userData.nativeCacheKey = key;
        const estimated = Math.ceil(source.width * source.height * 4 * 4 / 3);
        this.textureBytes += estimated;
        return { texture, bytes: estimated, refs: 0, image };
      })().catch((error: unknown) => { this.textures.delete(key); throw error; });
      this.textures.set(key, pending);
    }
    const entry = await pending;
    if (this.textures.get(key) !== pending) return this.texture(sampler);
    entry.refs++;
    return entry;
  }

  private releaseTexture(entry: TextureEntry): void {
    if (--entry.refs !== 0) return;
    this.textures.delete(String(entry.texture.userData.nativeCacheKey));
    entry.texture.dispose(); entry.image.close(); this.textureBytes -= entry.bytes;
  }

  private async createMaterial(id: string): Promise<MaterialEntry> {
    const graph = this.graphs.get(id);
    if (!graph) throw new Error('No original terrain graph: ' + id);
    const compiled = this.compiled.get(id) ?? compileGraph(graph);
    const textures: TextureEntry[] = [];
    try {
      for (const sampler of compiled.samplers) textures.push(await this.texture(sampler));
      if (this.disposed) throw new Error('Terrain materials disposed during read');
      const blend = compiled.root.values.BlendMode;
      if (blend !== 0 && blend !== 1 && blend !== 2) throw new Error('Unsupported native terrain blend mode');
      const material = new THREE.MeshPhongMaterial({
        color: 0xffffff, specular: 0xffffff, side: THREE.DoubleSide,
        transparent: blend === 2, depthWrite: blend !== 2,
      });
      material.name = id;
      material.userData.nativeGraph = id;
      material.customProgramCacheKey = () => 'gothic3-terrain-graph-v1:' + id;
      material.onBeforeCompile = (shader) => {
        for (let index = 0; index < compiled.samplers.length; index++) {
          shader.uniforms[compiled.samplers[index]!.name] = { value: textures[index]!.texture };
        }
        const varyings = 'varying vec4 vG3Color;\nvarying vec3 vG3T;\nvarying vec3 vG3B;\n' +
          compiled.uvs.map((uv) => `varying vec2 vG3UV${uv};`).join('\n');
        const vertexDeclarations = 'attribute vec4 _g3_bgra;\nattribute vec3 _g3_tangent;\n' +
          compiled.uvs.map((uv) => `attribute vec2 g3UV${uv};`).join('\n');
        shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\n' + varyings + '\n' + vertexDeclarations)
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n' +
            'vG3Color = _g3_bgra.zyxw / 255.0;\n' +
            'vG3T = normalMatrix * normalize(_g3_tangent);\n' +
            'vG3B = normalMatrix * (cross(normalize(normal), normalize(_g3_tangent)) * (2.0 * (_g3_bgra.z / 255.0) - 1.0));\n' +
            compiled.uvs.map((uv) => `vG3UV${uv} = g3UV${uv};`).join('\n'));
        const declarations = varyings + '\n' + compiled.samplers.map((sampler) => `uniform sampler2D ${sampler.name};`).join('\n');
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + declarations)
          .replace('#include <map_fragment>', `
            vec3 g3Eye = normalize(vViewPosition);
            vec2 g3TangentEye = vec2(dot(g3Eye,vG3T),dot(g3Eye,vG3B));
            ${compiled.body}
            diffuseColor.rgb *= ${compiled.diffuse};
            ${compiled.opacity ? `diffuseColor.a *= ${compiled.opacity};` : ''}
            ${blend === 1 ? `if (diffuseColor.a <= ${float(Number(compiled.root.values.MaskReference) / 255)}) discard;` : ''}
          `);
        if (compiled.normal) shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
          vec4 g3NormalMap = (${compiled.normal} - 0.5) * 2.0;
          vec3 g3MapNormal = vec3(g3NormalMap.a, g3NormalMap.g, sqrt(max(0.0, 1.0 - dot(g3NormalMap.ag,g3NormalMap.ag))));
          normal = normalize(mat3(vG3T,vG3B,vNormal) * g3MapNormal) * faceDirection;
        `);
        if (compiled.emission) shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `totalEmissiveRadiance += ${compiled.emission};`);
        shader.fragmentShader = shader.fragmentShader.replace('#include <lights_phong_fragment>', `
          BlinnPhongMaterial material;
          material.diffuseColor = diffuseColor.rgb;
          material.specularColor = ${compiled.specular ?? 'vec3(0.0)'};
          // Native non-lookup fallback uses power * 127. Three's BRDF and
          // preview lights do not reproduce the original specular lookup.
          material.specularShininess = max(1.0, (${compiled.specularPower ?? '0.5'}) * 127.0);
          material.specularStrength = 1.0;
        `);
        if (compiled.root.values.DisableLighting === true) shader.fragmentShader = shader.fragmentShader.replace(
          'vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;',
          'vec3 outgoingLight = diffuseColor.rgb + totalEmissiveRadiance;');
      };
      return { material, textures, refs: 0 };
    } catch (error) {
      for (const texture of textures) this.releaseTexture(texture);
      this.compiled.delete(id);
      throw error;
    }
  }

  destroy(): void { this.disposed = true; }
}
