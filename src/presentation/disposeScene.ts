import * as THREE from 'three';

type Resource = THREE.BufferGeometry | THREE.Material | THREE.Texture;

/** Let module hooks release their private allocations, then release the remaining scene-owned resources once. */
export function disposeSceneResources(scene: THREE.Scene, disposeOwned: () => void, retainedObjects: THREE.Object3D[] = []) {
  const resources = new Set<Resource>();
  const disposed = new Set<Resource>();
  const retained = new Set<Resource>();
  const visitMaterial = (mat: THREE.Material, visit: (resource: Resource) => void) => {
    visit(mat);
    for (const value of Object.values(mat) as unknown[]) {
      if (value && (value as THREE.Texture).isTexture) visit(value as THREE.Texture);
    }
    const uniforms = (mat as THREE.ShaderMaterial).uniforms;
    if (uniforms) {
      for (const uniform of Object.values(uniforms)) {
        if (uniform && (uniform.value as THREE.Texture | undefined)?.isTexture) visit(uniform.value as THREE.Texture);
      }
    }
  };
  const visitObject = (object: THREE.Object3D, visit: (resource: Resource) => void) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) visit(mesh.geometry);
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((mat) => visitMaterial(mat, visit));
    else if (material) visitMaterial(material, visit);
  };
  // A detached persistent rig can still share a texture with an old NPC material.
  // Keep that dependency alive as well as its own meshes and materials.
  for (const root of retainedObjects) root.traverse((object) => visitObject(object, (resource) => retained.add(resource)));
  scene.traverse((object) => visitObject(object, (resource) => resources.add(resource)));
  if (scene.environment) resources.add(scene.environment);
  const listeners = new Map<Resource, () => void>();
  for (const resource of resources) {
    const listener = () => disposed.add(resource);
    resource.addEventListener('dispose', listener);
    listeners.set(resource, listener);
  }
  try {
    disposeOwned();
    const release = (resource: Resource) => {
      if (disposed.has(resource) || retained.has(resource)) return;
      disposed.add(resource);
      resource.dispose();
    };
    scene.traverse((object) => {
      visitObject(object, release);
      if ((object as THREE.InstancedMesh).isInstancedMesh) (object as THREE.InstancedMesh).dispose();
      if ((object as THREE.Light).isLight) (object as THREE.Light & { dispose?: () => void }).dispose?.();
    });
    if (scene.environment) release(scene.environment);
    scene.clear();
  } finally {
    for (const [resource, listener] of listeners) resource.removeEventListener('dispose', listener);
  }
}
