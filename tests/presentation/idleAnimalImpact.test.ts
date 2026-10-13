import * as THREE from 'three';
import {expect,it} from 'vitest';
import {AnimalImpactEffects} from '../../src/presentation/animals/hunting/impact';
const pool=(effects:AnimalImpactEffects)=>effects.group.children.find(o=>(o as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh;
it('does not request instance uploads for an empty impact pool',()=>{
 const effects=new AnimalImpactEffects({heightAt:()=>0});try{const mesh=pool(effects),before=mesh.instanceMatrix.version;for(let i=0;i<120;i++)effects.update(1/60);expect(mesh.count).toBe(0);expect(mesh.instanceMatrix.version-before).toBe(0);}finally{effects.dispose();}
});
it('retains emission, expiry and reduced-motion behavior',()=>{
 const effects=new AnimalImpactEffects({heightAt:()=>0}),root=new THREE.Group();try{
 effects.impact({root,scene:root},{id:'tiger',zone:'body',point:{x:0,y:1,z:0},position:{x:0,y:0,z:0},yaw:0,distance:1},new THREE.Vector3(0,0,1));
 const mesh=pool(effects),before=mesh.instanceMatrix.version;effects.update(1/60);expect(mesh.count).toBe(6);expect(mesh.instanceMatrix.version).toBeGreaterThan(before);
 for(let i=0;i<60;i++)effects.update(1/60);expect(mesh.count).toBe(0);const expired=mesh.instanceMatrix.version;for(let i=0;i<120;i++)effects.update(1/60);expect(mesh.instanceMatrix.version).toBe(expired);
 effects.setReduced(true);effects.impact({root,scene:root},{id:'tiger',zone:'body',point:{x:0,y:1,z:0},position:{x:0,y:0,z:0},yaw:0,distance:1},new THREE.Vector3(0,0,1));effects.update(1/60);expect(mesh.count).toBe(0);
 }finally{effects.dispose();}
});
