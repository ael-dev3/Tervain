import * as THREE from 'three';
import {expect,it} from 'vitest';
import {buildForestFloor} from '../../src/presentation/forestFloor';
import {Terrain} from '../../src/world/terrain';
import {Exclusions} from '../../src/presentation/vegetation';
import {disposeTreeTextures} from '../../src/presentation/treeTextures';
import type {FrameContext} from '../../src/presentation/context';
import {worldView} from '../../src/game/worldView';
import {createInitialState} from '../../src/game/state';

it('resends cached floor coverage when catch-up pans regrow the drawn prefix',()=>{
  const terrain=new Terrain(),floor=buildForestFloor(terrain,new Exclusions(terrain),'high');
  const camera=new THREE.PerspectiveCamera(65,16/9,.1,600);
  camera.position.set(-80,terrain.groundAt(-80,12)+3,12);camera.lookAt(-100,camera.position.y-1,12);camera.updateMatrixWorld(true);
  const frame:FrameContext={camera,quality:'high',time:0,focus:camera.position,nightness:0,sunDir:new THREE.Vector3(0,1,0),reducedMotion:true,hour:11,view:worldView(createInitialState())};
  floor.update(1/60,frame);
  const meshes=floor.group.children.filter((m):m is THREE.InstancedMesh=>m instanceof THREE.InstancedMesh);
  const tracked=meshes.flatMap(mesh=>[mesh.instanceMatrix,mesh.instanceColor,mesh.geometry.getAttribute('aDistanceCoverage')].filter((a):a is THREE.InstancedBufferAttribute=>!!a).map(attribute=>({mesh,attribute,gpu:attribute.array.slice() as Float32Array,version:attribute.version})));
  for(const t of tracked)t.attribute.clearUpdateRanges();
  let step=0,checked=0;
  try{
    for(let draw=0;draw<300;draw++){
      // Three 60 Hz simulation steps can precede one draw after a 50 ms frame.
      for(let i=0;i<3;i++,step++){
        const x=-80,z=12,y=terrain.groundAt(x,z)+3,yaw=step*.035;
        camera.position.set(x,y,z);camera.lookAt(x+Math.sin(yaw)*20,y-1,z+Math.cos(yaw)*20);camera.updateMatrixWorld(true);
        floor.update(1/60,frame);
      }
      for(const t of tracked){
        const data=t.attribute.array as Float32Array;
        // Mirror WebGLAttributes: apply pending ranges only when the version advances, then clear them.
        if(t.version!==t.attribute.version){
          if(!t.attribute.updateRanges.length)t.gpu.set(data);
          else for(const r of t.attribute.updateRanges)t.gpu.set(data.subarray(r.start,r.start+r.count),r.start);
          t.version=t.attribute.version;t.attribute.clearUpdateRanges();
        }
        const end=t.mesh.count*t.attribute.itemSize;
        let bad=-1;for(let j=0;j<end;j++)if(t.gpu[j]!==data[j]){bad=j;break;}
        expect(bad,`${t.mesh.name}, itemSize ${t.attribute.itemSize}, draw ${draw}`).toBe(-1);
        checked+=end;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  }finally{floor.dispose!();disposeTreeTextures();}
});
