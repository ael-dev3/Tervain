/** Separate diagnostic renderer: shows registered wood geometry only; this is not game appearance. */
export function birchWoodDiagnostic(THREE, variant, matrix) {
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}),scene=new THREE.Scene();
  const material=new THREE.MeshBasicMaterial({color:0xb8c6cb,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(variant.before,material),camera=new THREE.PerspectiveCamera(35,640/360,.01,100),rows=[];
  renderer.setSize(640,360);renderer.setClearColor(0x101820,1);
  mesh.matrix.copy(matrix);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;scene.add(mesh);
  const localLook=new THREE.Vector3(4.5,7.5,-1.7),look=localLook.clone().applyMatrix4(matrix);
  try {
    for(let pose=0;pose<2;pose++) {
      camera.position.copy(localLook).add(pose?new THREE.Vector3(0,0,5):new THREE.Vector3(5,0,0)).applyMatrix4(matrix);
      camera.lookAt(look);camera.updateMatrixWorld(true);
      for(const mode of ['before','after','restore']) {
        mesh.geometry=mode==='restore'?variant.before:variant[mode];renderer.info.reset();renderer.render(scene,camera);
        if(renderer.getContext().getError())throw Error('Diagnostic GL error');
        rows.push({pose,mode,png:renderer.domElement.toDataURL(),cost:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},camera:camera.position.toArray(),look:look.toArray()});
      }
    }
    return {rows,scope:'Diagnostic wood-only rest geometry. Unlit grey double-sided material, no leaves, no wind, separate software WebGL renderer. Uses the same native registered before/candidate buffers and target matrix. This is not native game appearance.'};
  } finally {material.dispose();renderer.dispose();renderer.forceContextLoss();}
}
