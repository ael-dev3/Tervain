import * as THREE from 'three';
import {expect,it} from 'vitest';
import {indexVerticalSupport} from '../../src/diagnostics/verticalSupports';

it('preserves exact distances, faces and boundary hits on transformed large support geometry',()=>{
  const geometry=new THREE.PlaneGeometry(256,256,32,32);geometry.rotateX(-Math.PI/2);
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry,material);mesh.rotation.y=.27;mesh.position.set(-7,2,11);mesh.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
  const points=[[-16,-16],[0,0],[16,16],[64,32],[-130,-130]];
  const probe=()=>points.map(([x,z])=>{ray.set(new THREE.Vector3(x,5,z),down);return ray.intersectObject(mesh).map(hit=>({distance:hit.distance,face:hit.faceIndex}));});
  const before=probe(),release=indexVerticalSupport(mesh);
  try{expect(probe()).toEqual(before);expect(mesh.geometry).toBe(geometry);}
  finally{release();geometry.dispose();material.dispose();}
});
it('leaves oblique rays exact and restores the original raycaster on disposal',()=>{
  const geometry=new THREE.PlaneGeometry(256,256,32,32);geometry.rotateX(-Math.PI/2);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,5,0),new THREE.Vector3(.1,-1,.2).normalize());
  const before=ray.intersectObject(mesh),original=mesh.raycast,release=indexVerticalSupport(mesh);
  expect(ray.intersectObject(mesh).map(x=>x.distance)).toEqual(before.map(x=>x.distance));release();expect(mesh.raycast).toBe(original);
});
