import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { disposeSceneResources } from '../../src/presentation/disposeScene';

describe('scene resource ownership', () => {
  it('retains a shared texture while a persistent player still uses it', () => {
    const texture = new THREE.Texture();
    const player = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ normalMap: texture }));
    const oldGeometry = new THREE.BoxGeometry();
    const oldMaterial = new THREE.MeshStandardMaterial({ normalMap: texture });
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(oldGeometry, oldMaterial));
    const disposeTexture = vi.spyOn(texture, 'dispose');
    const disposeOldGeometry = vi.spyOn(oldGeometry, 'dispose');
    const disposeOldMaterial = vi.spyOn(oldMaterial, 'dispose');
    disposeSceneResources(scene, () => {}, [player]);
    expect(disposeTexture).not.toHaveBeenCalled();
    expect(disposeOldGeometry).toHaveBeenCalledTimes(1);
    expect(disposeOldMaterial).toHaveBeenCalledTimes(1);
  });

  it('releases shared scene geometry, material and texture only once', () => {
    const scene = new THREE.Scene();
    const geometry = new THREE.BoxGeometry();
    const texture = new THREE.Texture();
    const material = new THREE.MeshStandardMaterial({ map: texture, normalMap: texture });
    scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    const textureDispose = vi.spyOn(texture, 'dispose');
    disposeSceneResources(scene, () => {});
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(scene.children).toHaveLength(0);
  });

  it('runs module cleanup before fallback without disposing hook-owned resources twice', () => {
    const scene = new THREE.Scene();
    const texture = new THREE.Texture();
    const privateTexture = new THREE.Texture();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ map: texture });
    scene.add(new THREE.Mesh(geometry, material));
    const disposeTexture = vi.spyOn(texture, 'dispose');
    const disposePrivate = vi.spyOn(privateTexture, 'dispose');
    const disposeMaterial = vi.spyOn(material, 'dispose');
    const disposeGeometry = vi.spyOn(geometry, 'dispose');
    disposeSceneResources(scene, () => {
      expect(disposeGeometry).not.toHaveBeenCalled();
      privateTexture.dispose();
      texture.dispose();
      material.dispose();
    });
    expect(disposeTexture).toHaveBeenCalledTimes(1);
    expect(disposePrivate).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
  });

  it('preserves detached persistent rigs and disposes shader-uniform textures in the old scene', () => {
    const scene = new THREE.Scene();
    const playerGeometry = new THREE.BoxGeometry();
    const playerMaterial = new THREE.MeshStandardMaterial();
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    scene.add(player);
    scene.remove(player);
    const texture = new THREE.Texture();
    const material = new THREE.ShaderMaterial({ uniforms: { atlas: { value: texture } } });
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
    const disposePlayer = vi.spyOn(playerGeometry, 'dispose');
    const disposePlayerMat = vi.spyOn(playerMaterial, 'dispose');
    const disposeTexture = vi.spyOn(texture, 'dispose');
    disposeSceneResources(scene, () => {});
    expect(disposePlayer).not.toHaveBeenCalled();
    expect(disposePlayerMat).not.toHaveBeenCalled();
    expect(disposeTexture).toHaveBeenCalledTimes(1);
  });
});
