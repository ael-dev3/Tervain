import * as THREE from 'three';
import { expect, it } from 'vitest';
import { horizontalSphereIntersects, sphereSlabSupport } from '../../src/presentation/ground/extentCull';
it('retains the whole old vertical sphere while tightening known horizontal extents',()=>{
 expect(sphereSlabSupport(1,0,0,10,6)).toBe(6);expect(sphereSlabSupport(0,1,0,10,6)).toBe(10);
 expect(sphereSlabSupport(1,0,1,10,6)).toBe(12);expect(sphereSlabSupport(4,1,1,10,6)).toBeCloseTo(24+8*Math.SQRT2);
 expect(sphereSlabSupport(0,0,0,10,6)).toBe(0);expect(sphereSlabSupport(1,1,1,10,20)).toBeCloseTo(10*Math.sqrt(3));
});
it('never underestimates any sampled point of the clipped sphere, including narrow caps',()=>{
 for(const half of [2,6,8,11])for(const n of [[1,0,0],[0,1,0],[0,0,1],[4,1,1],[-2,.1,3],[1,8,-4]]){
  const limit=sphereSlabSupport(n[0]!,n[1]!,n[2]!,10,half);
  for(let ix=-10;ix<=10;ix++)for(let iy=-10;iy<=10;iy++)for(let iz=-10;iz<=10;iz++){
   if(Math.abs(ix)>half||Math.abs(iz)>half||ix*ix+iy*iy+iz*iz>100)continue;
   expect(n[0]!*ix+n[1]!*iy+n[2]!*iz).toBeLessThanOrEqual(limit+1e-9);
  }
 }
});
it('rejects a sphere-only false positive and preserves a rotated/scaled visible point',()=>{
 const sphere=new THREE.Sphere(new THREE.Vector3(),10),world=new THREE.Matrix4();
 const outside=new THREE.Frustum(...Array.from({length:6},()=>new THREE.Plane(new THREE.Vector3(1,0,0),-7)));
 expect(outside.intersectsSphere(sphere)).toBe(true);expect(horizontalSphereIntersects(outside,sphere,6,world)).toBe(false);
 world.compose(new THREE.Vector3(13,4,-8),new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,.7,.1)),new THREE.Vector3(2,.5,3));
 const point=new THREE.Vector3(5,2,-4).applyMatrix4(world),camera=new THREE.PerspectiveCamera(35,1,.1,100);
 camera.position.copy(point).add(new THREE.Vector3(0,0,20));camera.lookAt(point);camera.updateMatrixWorld();
 const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
 expect(horizontalSphereIntersects(frustum,sphere,6,world)).toBe(true);
});
