import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { TileLayer } from '../../src/presentation/ground/tileStream';

function fixture() {
  const material=new THREE.MeshBasicMaterial(), geometry=new THREE.PlaneGeometry(.2,.2);
  let generated=0;
  const layer=new TileLayer({name:'settled',tileSize:10,capacity:4,geometry,material,fadeStart:5,fadeEnd:20,power:1,maxHeight:.3,maxRadius:.3,receiveShadow:false,
    drawCountAt:d=>d<8?6:3,
    generate(tx,tz,out){generated++;out.ymin=out.ymax=0;for(let i=0;i<4;i++)out.base.set([tx*10+5,0,tz*10+5,(i+.5)/4],i*4);return 4;},
  });
  const states=()=>layer.group.children.map(o=>{const m=o as THREE.Mesh<THREE.InstancedBufferGeometry>;return[m.visible,m.geometry.instanceCount,m.geometry.drawRange.count];});
  const stats=()=>[layer.visibleInstances,layer.visibleTriangles,layer.drawCalls,layer.activeTiles];
  return{layer,states,stats,generated:()=>generated,dispose(){layer.dispose();geometry.dispose();material.dispose();}};
}

it('retains a settled selection without repeating distance/rank work, and refreshes after movement or re-enable',()=>{
  const f=fixture(),cam=new THREE.Vector3(.1,2,.3);
  try{
    for(let i=0;i<3;i++)f.layer.update(cam);
    const states=f.states(),stats=f.stats(),distances=vi.spyOn(f.layer as unknown as {distTo(...a:unknown[]):number},'distTo');
    for(let i=0;i<120;i++)f.layer.update(cam,{remaining:0});
    expect(f.states()).toEqual(states);expect(f.stats()).toEqual(stats);expect(distances.mock.calls.length).toBe(0);
    f.layer.enabled=false;f.layer.update(cam);expect(f.layer.group.visible).toBe(false);expect(f.layer.drawCalls).toBe(0);
    f.layer.enabled=true;f.layer.update(cam);expect(distances).toHaveBeenCalled();expect(f.states()).toEqual(states);expect(f.stats()).toEqual(stats);
    distances.mockClear();cam.x+=.001;f.layer.update(cam);expect(distances).toHaveBeenCalled();
    cam.x+=5;f.layer.update(cam);expect(f.states()).not.toEqual(states);
  }finally{f.dispose();}
});

it('continues reserve work at an unmoving camera and keeps capture-camera selection independent',()=>{
  const f=fixture(),cam=new THREE.PerspectiveCamera(60,1,.1,200);
  cam.position.set(.1,2,.3);cam.lookAt(5,0,5);cam.updateMatrixWorld(true);
  try{
    f.layer.update(cam.position);cam.position.x+=10;cam.updateMatrixWorld(true);
    f.layer.update(cam.position,{remaining:0});const before=f.generated();
    for(let i=0;i<40;i++)f.layer.update(cam.position,{remaining:2});
    expect(f.generated()).toBeGreaterThan(before);
    const mesh=f.layer.group.children.find(o=>o.visible) as THREE.Mesh<THREE.InstancedBufferGeometry>,saved=mesh.geometry.instanceCount;
    const capture=cam.clone();capture.position.copy(mesh.geometry.boundingSphere!.center).add(new THREE.Vector3(0,2,2));capture.lookAt(mesh.geometry.boundingSphere!.center);capture.updateMatrixWorld(true);f.layer.group.updateMatrixWorld(true);
    const renderer={} as THREE.WebGLRenderer,scene=new THREE.Scene();
    mesh.onBeforeRender(renderer,scene,capture,mesh.geometry,mesh.material as THREE.Material,{} as THREE.Group);
    mesh.onAfterRender(renderer,scene,capture,mesh.geometry,mesh.material as THREE.Material,{} as THREE.Group);
    expect(mesh.geometry.instanceCount).toBe(saved);
    mesh.onBeforeRender(renderer,scene,cam,mesh.geometry,mesh.material as THREE.Material,{} as THREE.Group);
    mesh.onAfterRender(renderer,scene,cam,mesh.geometry,mesh.material as THREE.Material,{} as THREE.Group);
    expect(mesh.geometry.instanceCount).toBe(saved);
  }finally{f.dispose();}
});
