import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { prepareSceneTextures } from '../../src/platform/prepareSceneTextures';

afterEach(() => vi.restoreAllMocks());

describe('cooperative preparation of first-view scene textures', () => {
  it('uploads shared material samplers, nested shader structs/arrays, background and environment exactly once per identity', async () => {
    const scene = new THREE.Scene(), base = new THREE.Texture(), normal = new THREE.Texture(), detail = new THREE.Texture();
    const background = new THREE.CubeTexture(), environment = new THREE.Texture();
    const standard = new THREE.MeshStandardMaterial({ map: base, normalMap: normal });
    const cyclic: Record<string, unknown> = { layers: [{ albedo: base }, { relief: detail }], normal };
    cyclic.self = cyclic;
    const otherScene = new THREE.Scene(), unrelated = new THREE.Texture();
    otherScene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ map: unrelated })));
    cyclic.unrelatedScene = otherScene;
    cyclic.numericData = new Float32Array(100_000);
    const shader = new THREE.ShaderMaterial({ uniforms: { surfaces: { value: cyclic }, arrays: { value: [[detail, base], null] } } });
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), [standard, shader]), new THREE.Mesh(new THREE.BoxGeometry(), standard));
    scene.background = background; scene.environment = environment;
    const renderer = { initTexture: vi.fn() }, progress = vi.fn();
    await prepareSceneTextures(renderer, scene, { onProgress: progress, yieldNow: async () => {} });
    const uploaded = renderer.initTexture.mock.calls.map(([texture]) => texture);
    expect(new Set(uploaded)).toEqual(new Set([background, environment, base, normal, detail]));
    expect(uploaded).toHaveLength(5); expect(uploaded).not.toContain(unrelated);
    expect(progress.mock.calls).toEqual([[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5]]);
    expect(standard.map).toBe(base); expect(standard.normalMap).toBe(normal); expect(cyclic.layers).toEqual([{ albedo: base }, { relief: detail }]);
  });

  it('preserves sampler variants sharing the same source and never changes images, sampling or scene ownership', async () => {
    const image = { width: 2, height: 2 }, texture = new THREE.Texture(image as unknown as HTMLImageElement), variant = texture.clone();
    variant.wrapS = THREE.RepeatWrapping; variant.anisotropy = 16;
    const dispose = vi.spyOn(texture, 'dispose'), variantDispose = vi.spyOn(variant, 'dispose');
    const scene = new THREE.Scene(); scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: texture, normalMap: variant })));
    const renderer = { initTexture: vi.fn() };
    await prepareSceneTextures(renderer, scene);
    expect(renderer.initTexture.mock.calls.map(([value]) => value)).toEqual([texture, variant]);
    expect(texture.source).toBe(variant.source); expect(texture.image).toBe(image); expect(variant.image).toBe(image);
    expect(variant.wrapS).toBe(THREE.RepeatWrapping); expect(variant.anisotropy).toBe(16);
    expect(dispose).not.toHaveBeenCalled(); expect(variantDispose).not.toHaveBeenCalled();
  });

  it('prepares cube/data/array samplers through the renderer while leaving render-target attachments to their passes', async () => {
    const scene = new THREE.Scene(), cube = new THREE.CubeTexture(), data = new THREE.DataTexture(new Uint8Array(16), 2, 2);
    const array = new THREE.DataArrayTexture(new Uint8Array(32), 2, 2, 2), target = new THREE.WebGLRenderTarget(2, 2);
    scene.background = cube; scene.environment = target.texture;
    const material = new THREE.ShaderMaterial({ uniforms: { samplers: { value: [data, array, target.texture] } } });
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
    const renderer = { initTexture: vi.fn() }, progress = vi.fn(), dispose = vi.spyOn(target, 'dispose');
    await prepareSceneTextures(renderer, scene, { onProgress: progress });
    expect(renderer.initTexture.mock.calls.map(([texture]) => texture)).toEqual([cube, data, array]);
    expect(progress.mock.calls).toEqual([[0, 3], [1, 3], [2, 3], [3, 3]]);
    expect(material.uniforms.samplers!.value[2]).toBe(target.texture); expect(dispose).not.toHaveBeenCalled();
  });

  it('warms only enabled presentation objects and materials, leaving hidden LODs and their descendants untouched', async () => {
    const scene = new THREE.Scene(), enabled = new THREE.Texture(), hiddenLod = new THREE.Texture(), hiddenMaterial = new THREE.Texture();
    const active = new THREE.MeshBasicMaterial({ map: enabled }), disabled = new THREE.MeshBasicMaterial({ map: hiddenMaterial }); disabled.visible = false;
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), [active, disabled]));
    const hidden = new THREE.Group(); hidden.visible = false;
    hidden.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ map: hiddenLod }))); scene.add(hidden);
    const renderer = { initTexture: vi.fn() }, progress = vi.fn();
    await prepareSceneTextures(renderer, scene, { onProgress: progress });
    expect(renderer.initTexture).toHaveBeenCalledExactlyOnceWith(enabled);
    expect(progress.mock.calls).toEqual([[0, 1], [1, 1]]);
    expect(hidden.visible).toBe(false); expect(disabled.visible).toBe(false);
  });

  it('uses the actual entry-camera frustum/layers while honoring uncullable geometry and scene samplers', async () => {
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, 0.1, 20);
    const front = new THREE.Texture(), behind = new THREE.Texture(), uncullable = new THREE.Texture(), otherLayer = new THREE.Texture(), background = new THREE.CubeTexture();
    const mesh = (texture: THREE.Texture, x: number, z: number) => {
      const result = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ map: texture })); result.position.set(x, 0, z); return result;
    };
    const a = mesh(front, 0, -4), b = mesh(behind, 0, 4), c = mesh(uncullable, 50, -4), d = mesh(otherLayer, 0, -4);
    c.frustumCulled = false; d.layers.set(1); scene.add(a, b, c, d); scene.background = background;
    const renderer = { initTexture: vi.fn() };
    await prepareSceneTextures(renderer, scene, { camera });
    expect(new Set(renderer.initTexture.mock.calls.map(([texture]) => texture))).toEqual(new Set([background, front, uncullable]));
    expect(b.visible).toBe(true); expect(d.visible).toBe(true);
    expect(b.material.map).toBe(behind); expect(d.material.map).toBe(otherLayer);
  });

  it('prepares explicitly exposed shader-extension samplers without walking unrelated material metadata', async () => {
    const scene = new THREE.Scene(), albedo = new THREE.DataArrayTexture(), normal = new THREE.DataArrayTexture(), unrelated = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial(), exposed = [albedo, normal];
    material.userData.preparationTextures = exposed; material.userData.otherMetadata = { unused: unrelated };
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
    const renderer = { initTexture: vi.fn() };
    await prepareSceneTextures(renderer, scene);
    expect(renderer.initTexture.mock.calls.map(([texture]) => texture)).toEqual(exposed);
    expect(material.userData.preparationTextures).toBe(exposed);
    expect(material.userData.otherMetadata.unused).toBe(unrelated);
  });

  it('yields before the next upload when a measured batch uses its budget, without adding a minimum delay', async () => {
    let clock = 0; vi.spyOn(performance, 'now').mockImplementation(() => clock);
    const scene = new THREE.Scene(), textures = Array.from({ length: 4 }, () => new THREE.Texture());
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.ShaderMaterial({ uniforms: { textures: { value: textures } } })));
    const observed: number[] = [], renderer = { initTexture: vi.fn(() => { clock += 5; }) };
    const yieldNow = vi.fn(async () => { observed.push(renderer.initTexture.mock.calls.length); });
    await prepareSceneTextures(renderer, scene, { yieldNow, budgetMs: 8 });
    expect(observed).toEqual([2]); expect(renderer.initTexture).toHaveBeenCalledTimes(4);
    expect(yieldNow).toHaveBeenCalledOnce();
  });

  it('stops uploads on cancellation between batches and leaves successfully uploaded shared maps intact for Retry', async () => {
    const scene = new THREE.Scene(), textures = Array.from({ length: 3 }, () => new THREE.Texture()), controller = new AbortController();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.ShaderMaterial({ uniforms: { textures: { value: textures } } })));
    const disposals = textures.map(texture => vi.spyOn(texture, 'dispose'));
    const renderer = { initTexture: vi.fn() }, progress = vi.fn();
    await expect(prepareSceneTextures(renderer, scene, { signal: controller.signal, budgetMs: 0, onProgress: progress,
      yieldNow: async () => { controller.abort(new Error('load cancelled')); },
    })).rejects.toThrow('load cancelled');
    expect(renderer.initTexture).toHaveBeenCalledExactlyOnceWith(textures[0]);
    expect(progress.mock.calls).toEqual([[0, 3], [1, 3]]);
    disposals.forEach(dispose => expect(dispose).not.toHaveBeenCalled());
    const retry = { initTexture: vi.fn() };
    await prepareSceneTextures(retry, scene, { budgetMs: 0, yieldNow: async () => {} });
    expect(retry.initTexture.mock.calls.map(([texture]) => texture)).toEqual(textures);
  });

  it('rejects upload failures without reporting completion or disposing borrowed source resources', async () => {
    const scene = new THREE.Scene(), texture = new THREE.Texture(), dispose = vi.spyOn(texture, 'dispose');
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ map: texture })));
    const renderer = { initTexture: vi.fn(() => { throw new Error('context lost during upload'); }) }, progress = vi.fn();
    await expect(prepareSceneTextures(renderer, scene, { onProgress: progress })).rejects.toThrow('context lost during upload');
    expect(progress.mock.calls).toEqual([[0, 1]]); expect(dispose).not.toHaveBeenCalled();
  });

  it('reports an empty scene honestly and checks pre-cancellation before collecting or uploading resources', async () => {
    const renderer = { initTexture: vi.fn() }, progress = vi.fn(), yieldNow = vi.fn(async () => {});
    await prepareSceneTextures(renderer, new THREE.Scene(), { onProgress: progress, yieldNow });
    expect(progress.mock.calls).toEqual([[0, 0]]); expect(renderer.initTexture).not.toHaveBeenCalled(); expect(yieldNow).not.toHaveBeenCalled();
    const controller = new AbortController(); controller.abort(new Error('already cancelled'));
    await expect(prepareSceneTextures(renderer, new THREE.Scene(), { signal: controller.signal })).rejects.toThrow('already cancelled');
  });
});
