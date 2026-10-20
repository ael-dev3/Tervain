import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
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
it('reuses plane lengths across translated tiles and invalidates them after normal or scale changes',()=>{
 const frustum=new THREE.Frustum(...Array.from({length:6},()=>new THREE.Plane(new THREE.Vector3(4,1,1),-24)));
 const sphere=new THREE.Sphere(new THREE.Vector3(),10),world=new THREE.Matrix4();
 const reference=()=>frustum.planes.every(p=>{
  const e=world.elements,n=p.normal,c=sphere.center;
  const x=n.x*e[0]+n.y*e[1]+n.z*e[2],y=n.x*e[4]+n.y*e[5]+n.z*e[6],z=n.x*e[8]+n.y*e[9]+n.z*e[10];
  const distance=x*c.x+y*c.y+z*c.z+p.constant+n.x*e[12]+n.y*e[13]+n.z*e[14];
  return distance+sphereSlabSupport(x,y,z,sphere.radius,6)>=-1e-6;
 });
 for(let frame=0;frame<20;frame++){
  frustum.planes.forEach((p,i)=>p.normal.set(4+frame*.01,1+i*.02,1));
  for(let tile=0;tile<100;tile++){
   world.compose(new THREE.Vector3(tile*.03-2,0,0),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,frame*.03,0)),new THREE.Vector3(1+frame*.02,.5,2));
   expect(horizontalSphereIntersects(frustum,sphere,6,world)).toBe(reference());
  }
 }
});

it('does not recalculate support lengths for translated tiles with the same plane normals',()=>{
 const frustum=new THREE.Frustum(...Array.from({length:6},()=>new THREE.Plane(new THREE.Vector3(4,1,1),-24)));
 const sphere=new THREE.Sphere(new THREE.Vector3(),10),world=new THREE.Matrix4();
 const hypot=vi.spyOn(Math,'hypot');
 try {
  expect(horizontalSphereIntersects(frustum,sphere,6,world)).toBe(true);
  expect(hypot).toHaveBeenCalledTimes(18);
  hypot.mockClear();
  for(let i=0;i<100;i++) {world.makeTranslation(i*.001,0,0);expect(horizontalSphereIntersects(frustum,sphere,6,world)).toBe(true);}
  expect(hypot).not.toHaveBeenCalled();
 } finally {hypot.mockRestore();}
});
