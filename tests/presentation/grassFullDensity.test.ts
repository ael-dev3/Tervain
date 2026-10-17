import * as THREE from 'three';
import {expect, it} from 'vitest';
import {TileLayer, RANK_HEADROOM} from '../../src/presentation/ground/tileStream';
import {smoothstep} from '../../src/world/noise';

it('checks a full ranked prefix once and retains the search when the highest rank is excluded', () => {
  const layer = new TileLayer({name:'full-ranks',tileSize:12,capacity:1024,geometry:new THREE.PlaneGeometry(),material:new THREE.MeshBasicMaterial(),fadeStart:12,fadeEnd:48,power:1.3,maxHeight:2,receiveShadow:false,generate:()=>0});
  const data=new Float32Array(1024*4);
  for(let i=0;i<1024;i++)data[i*4+3]=i/1024;
  let reads=0;
  const array=new Proxy(data,{get(target,key){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(target,key,target);}});
  const tile={count:1024,attrs:[{array}]};
  const sample=(layer as unknown as {instanceCountAt(t:typeof tile,d:number):number}).instanceCountAt.bind(layer);
  try {
    expect(sample(tile,0)).toBe(1024);expect(reads).toBe(1);
    reads=0;
    const limit=Math.pow(1-smoothstep(12,48,30),1.3)*RANK_HEADROOM+1e-6;
    const expected=Array.from({length:1024},(_,i)=>data[i*4+3]!).filter(rank=>rank<limit).length;
    expect(sample(tile,30)).toBe(expected);expect(reads).toBeGreaterThan(1);
    // A nonstandard highest rank must fall through to the existing binary search.
    for(const tail of [1.5,Infinity,NaN]) {
      data[1023*4+3]=tail;reads=0;
      expect(sample(tile,0)).toBe(1023);expect(reads).toBeGreaterThan(1);
    }
    reads=0;expect(sample(tile,48)).toBe(0);expect(reads).toBe(0);
  }finally{layer.dispose();}
});
