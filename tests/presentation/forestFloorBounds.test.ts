import * as THREE from 'three';
import {expect,it,vi} from 'vitest';
import {buildForestFloor} from '../../src/presentation/forestFloor';
import {Terrain} from '../../src/world/terrain';
import {Exclusions} from '../../src/presentation/vegetation';
import {disposeTreeTextures} from '../../src/presentation/treeTextures';
import type {FrameContext} from '../../src/presentation/context';
import {worldView} from '../../src/game/worldView';
import {createInitialState} from '../../src/game/state';

it('reads placement spheres without copying them during view and shadow selection',()=>{
  const terrain=new Terrain(),floor=buildForestFloor(terrain,new Exclusions(terrain),'high');
  const camera=new THREE.PerspectiveCamera(65,16/9,.1,600);
  const frame:FrameContext={camera,quality:'high',time:0,focus:camera.position,nightness:0,sunDir:new THREE.Vector3(0,1,0),reducedMotion:true,hour:15,view:worldView(createInitialState())};
  const copies=vi.spyOn(THREE.Sphere.prototype,'copy');
  let drawn=0;
  try{
    for(let i=0;i<12;i++){
      const x=-80+i*.2,z=12,y=terrain.groundAt(x,z)+3,yaw=i*.17;
      camera.position.set(x,y,z);camera.lookAt(x+Math.sin(yaw)*20,y-1,z+Math.cos(yaw)*20);camera.updateMatrixWorld();
      frame.shadowFrustum=i%2?new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)):null;
      floor.update(1/60,frame);
      drawn+=floor.stats!().forestFloorDrawn!;
    }
    expect(drawn).toBeGreaterThan(0);
    expect(copies.mock.calls.length).toBe(0);
  }finally{copies.mockRestore();floor.dispose!();disposeTreeTextures();}
});
