import * as THREE from 'three';
import {expect, it} from 'vitest';
import {TileLayer} from '../../src/presentation/ground/tileStream';

it('does not touch rank attributes outside the fade, while retaining the boundary search inside it', () => {
  const layer = new TileLayer({name:'ranks',tileSize:12,capacity:8,geometry:new THREE.PlaneGeometry(),material:new THREE.MeshBasicMaterial(),fadeStart:12,fadeEnd:48,power:1.3,maxHeight:2,receiveShadow:false,generate:()=>0});
  // Deliberately make attribute access observable: an invisible reserve tile needs no rank data.
  let reads=0;
  const tile={count:8,get attrs(){reads++;return [{array:new Float32Array([0,0,0,0,0,0,0,.1,0,0,0,.2,0,0,0,.3,0,0,0,.4,0,0,0,.5,0,0,0,.6,0,0,0,.7])}];}};
  const sample=(layer as unknown as {instanceCountAt(t:typeof tile,d:number):number}).instanceCountAt.bind(layer);
  try {
    for(const d of [48,49,100,Infinity])expect(sample(tile,d)).toBe(0);
    expect(reads).toBe(0);
    expect(sample(tile,12)).toBe(8);
    expect(sample(tile,47.999)).toBe(1); // Rank zero still has the original conservative epsilon.
    expect(reads).toBe(2);
  }finally{layer.dispose();}
});
