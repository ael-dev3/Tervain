import * as THREE from 'three';

/** Native XACT vertices can have seventeen influences. Keep every exported set. */
export function configureNativeSkinning(mesh: THREE.SkinnedMesh): void {
  const geometry = mesh.geometry;
  const original = geometry.getAttribute('_g3_weights_0');
  if (!original) throw new Error('Native weight backup missing for ' + mesh.name);
  // GLTFLoader normalizes only WEIGHTS_0. Restore the exact native subset;
  // normalizing that subset would over-weight it relative to the other sets.
  geometry.setAttribute('skinWeight', original.clone());
  const sets: { joints: THREE.BufferAttribute | THREE.InterleavedBufferAttribute; weights: THREE.BufferAttribute | THREE.InterleavedBufferAttribute }[] = [
    { joints: geometry.getAttribute('skinIndex'), weights: geometry.getAttribute('skinWeight') },
  ];
  for (let i = 1; geometry.hasAttribute('joints_' + i); i++) {
    const weights = geometry.getAttribute('weights_' + i);
    if (!weights) throw new Error('Native skin weight set missing: ' + i);
    sets.push({ joints: geometry.getAttribute('joints_' + i), weights });
  }
  for (const set of sets) {
    if (!set.joints || !set.weights || set.joints.itemSize !== 4 || set.weights.itemSize !== 4 ||
        set.joints.count !== geometry.getAttribute('position').count || set.weights.count !== set.joints.count) {
      throw new Error('Invalid native influence layout for ' + mesh.name);
    }
  }
  const declarations = sets.slice(1).map((_, i) =>
    'attribute vec4 joints_' + (i + 1) + ';\nattribute vec4 weights_' + (i + 1) + ';').join('\n');
  const sums = sets.map((_, i) => {
    const joints = i ? 'joints_' + i : 'skinIndex';
    const weights = i ? 'weights_' + i : 'skinWeight';
    return ['x', 'y', 'z', 'w'].map((component) =>
      'g3SkinMatrix += ' + weights + '.' + component + ' * getBoneMatrix(' + joints + '.' + component + ');').join('\n');
  }).join('\n');
  const configure = (source: THREE.Material): THREE.Material => {
    const material = source.clone();
    material.userData.gothic3ActorOwned = true;
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <skinning_pars_vertex>', '#include <skinning_pars_vertex>\n#ifdef USE_SKINNING\n' + declarations + '\n#endif')
        .replace('#include <skinbase_vertex>', '#ifdef USE_SKINNING\nmat4 g3SkinMatrix = mat4(0.0);\n' + sums + '\ng3SkinMatrix = bindMatrixInverse * g3SkinMatrix * bindMatrix;\n#endif')
        .replace('#include <skinnormal_vertex>', '#ifdef USE_SKINNING\nobjectNormal = (g3SkinMatrix * vec4(objectNormal, 0.0)).xyz;\n#ifdef USE_TANGENT\nobjectTangent = (g3SkinMatrix * vec4(objectTangent, 0.0)).xyz;\n#endif\n#endif')
        .replace('#include <skinning_vertex>', '#ifdef USE_SKINNING\ntransformed = (g3SkinMatrix * vec4(transformed, 1.0)).xyz;\n#endif');
    };
    material.customProgramCacheKey = () => 'gothic3-native-skin:' + sets.length;
    return material;
  };
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(configure) : configure(mesh.material);

  // Box3, raycasts and getVertexPosition must use the same weights as the GPU.
  const base = new THREE.Vector4();
  const contribution = new THREE.Vector4();
  const transform = new THREE.Matrix4();
  mesh.applyBoneTransform = <T extends THREE.Vector3 | THREE.Vector4>(index: number, target: T): T => {
    base.set(target.x, target.y, target.z, target instanceof THREE.Vector4 ? target.w : 1).applyMatrix4(mesh.bindMatrix);
    if (target instanceof THREE.Vector4) target.set(0, 0, 0, 0);
    else target.set(0, 0, 0);
    for (const set of sets) {
      for (let component = 0; component < 4; component++) {
        const weight = set.weights.getComponent(index, component);
        if (!weight) continue;
        const joint = set.joints.getComponent(index, component);
        const bone = mesh.skeleton.bones[joint];
        const inverse = mesh.skeleton.boneInverses[joint];
        if (!bone || !inverse) throw new Error('Native joint out of range: ' + joint);
        transform.multiplyMatrices(bone.matrixWorld, inverse);
        contribution.copy(base).applyMatrix4(transform);
        target.addScaledVector(contribution, weight);
      }
    }
    if (target instanceof THREE.Vector4) target.w = base.w;
    target.applyMatrix4(mesh.bindMatrixInverse);
    return target;
  };
  mesh.userData.nativeInfluenceSets = sets.length;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  // Animation can move limbs outside the bind-pose bounds. Recomputing every
  // vertex each frame is unnecessary for the small, isolated model inspector.
  mesh.frustumCulled = false;
}
