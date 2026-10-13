/** Read-only structural check. Finite vertices alone do not rule out collapsed bones. */
export function auditSkinnedBones(root) {
  root.updateMatrixWorld(true);
  const bones = new Set(), invalid = [];
  root.traverse(object => { if (object.isSkinnedMesh) for (const bone of object.skeleton.bones) bones.add(bone); });
  let minimumScale = Infinity;
  for (const bone of bones) {
    const scale = [bone.scale.x, bone.scale.y, bone.scale.z];
    const minimum = Math.min(...scale.map(Math.abs));
    minimumScale = Math.min(minimumScale, minimum);
    if (!scale.every(Number.isFinite)) invalid.push({ bone: bone.name, reason: 'nonfinite-scale' });
    else if (minimum <= 1e-8) invalid.push({ bone: bone.name, reason: 'collapsed-local-scale' });
    if (!bone.matrixWorld.elements.every(Number.isFinite)) invalid.push({ bone: bone.name, reason: 'nonfinite-world-transform' });
    else if (bone.matrixWorld.determinant() === 0) invalid.push({ bone: bone.name, reason: 'singular-world-transform' });
  }
  return { boneCount: bones.size, minimumScale: bones.size ? minimumScale : null, invalid, pass: bones.size > 0 && invalid.length === 0 };
}

/** Exact anchor collapse only: no artistic/anatomical proportion threshold. */
export function auditHeadAnchor(rig) {
  rig.root.updateMatrixWorld(true);
  const h = rig.head.matrixWorld.elements, t = rig.torso.matrixWorld.elements;
  const distance = Math.hypot(h[12] - t[12], h[13] - t[13], h[14] - t[14]);
  return { distance, pass: Number.isFinite(distance) && distance > 1e-8, scope: 'Head/torso anchor separation; does not inspect face geometry or skin weights.' };
}
