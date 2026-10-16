import * as THREE from 'three';
import {expect,it,vi} from 'vitest';
import {buildForestFloor} from '../../src/presentation/forestFloor';
import {Terrain} from '../../src/world/terrain';
import {Exclusions} from '../../src/presentation/vegetation';
import {disposeTreeTextures} from '../../src/presentation/treeTextures';

it('keeps static floor local matrices while propagating moving parent transforms',()=>{
  const terrain=new Terrain(),floor=buildForestFloor(terrain,new Exclusions(terrain),'low');
  const meshes=floor.group.children.filter((o):o is THREE.InstancedMesh=>o instanceof THREE.InstancedMesh);
  const spies=meshes.map(m=>vi.spyOn(m.matrix,'compose'));
  try{
    expect(meshes.length).toBeGreaterThan(0);
    const local=meshes.map(m=>m.matrix.clone()),instances=meshes.map(m=>Array.from(m.instanceMatrix.array));
    for(let i=0;i<12;i++){
      floor.group.position.set(i*.3,1,-i*.2);floor.group.rotation.y=i*.07;floor.group.scale.setScalar(1+i*.01);
      floor.group.updateMatrixWorld(true);
      for(let j=0;j<meshes.length;j++){
        expect(meshes[j]!.matrixWorld.equals(new THREE.Matrix4().multiplyMatrices(floor.group.matrixWorld,local[j]!))).toBe(true);
        expect(Array.from(meshes[j]!.instanceMatrix.array)).toEqual(instances[j]);
      }
    }
    expect(floor.group.position.x).toBeGreaterThan(0);
    for(const spy of spies)expect(spy).not.toHaveBeenCalled();
  }finally{for(const spy of spies)spy.mockRestore();floor.dispose!();disposeTreeTextures();}
});
