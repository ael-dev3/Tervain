import * as THREE from 'three';
import {expect,it} from 'vitest';
import {TileLayer} from '../../src/presentation/ground/tileStream';
import {smoothstep} from '../../src/world/noise';

function run(start:number,x:number,z:number,ymin=0,ymax=0){
  const cam=new THREE.Vector3(.1,.2,.3),tile={key:0,x0:x,z0:z,ymin,ymax,count:1,drawCount:3,attrs:[{array:new Float32Array([0,0,0,0])}],mesh:{visible:false},geo:{instanceCount:0}};
  // Isolate the retained-tile loop; generation keys are already resident.
  const layer=Object.assign(Object.create(TileLayer.prototype),{o:{tileSize:1,fadeStart:6,fadeEnd:8,power:1,band:{start,end:8}},tiles:new Map([[0,tile]]),pool:[],wantList:[],first:false,enabled:true,disposed:false,group:{visible:true},drawFocus:new THREE.Vector3(),trisPerInstance:1,key:()=>0});
  const d=layer.distTo(tile,cam),far=layer.farthest(tile,cam),native=layer.farthest;let calls=0;
  layer.farthest=function(...args:unknown[]){calls++;return native.apply(this,args);};
  layer.update(cam,{remaining:0});
  const visible=!(d>8||far<start)&&(1-smoothstep(6,8,d))>0;
  expect(tile.mesh.visible).toBe(visible);expect(tile.geo.instanceCount).toBe(visible?1:0);
  return{calls,d,far};
}
it('skips farthest distance where the nearest bound already excludes an inner-band rejection',()=>{
  expect(run(-2,0,0).calls).toBe(0);
  expect(run(0,0,0).calls).toBe(0);
  expect(run(2,3,0).calls).toBe(0);
  expect(run(2,2.1,.3,.2,.2).calls).toBe(0); // Exactly on the nearest-distance threshold.
});
it('retains exact band decisions at crossings, slopes, altitude and the outer cutoff',()=>{
  for(const start of [-2,0,2,4])for(const[x,z]of [[0,0],[1,0],[2,0],[3,0],[7,0],[8,0]])for(const[lo,hi]of [[0,0],[-2,3],[3,5]]){
    const {calls,d}=run(start,x!,z!,lo!,hi!);
    expect(calls).toBe(d<=8&&d<start?1:0);
  }
});
