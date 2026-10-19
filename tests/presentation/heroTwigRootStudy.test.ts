import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import * as C from '../../src/presentation/canopy';
import { createMeshyForest } from '../../src/presentation/meshyTrees';
import { meshyTreeTemplate } from './meshyTreeFixture';

function rootGaps(wood: THREE.BufferGeometry, twigs: readonly C.CanopyTwig[]) {
  const ringVertices=wood.hasAttribute('uv')||wood.hasAttribute('tangent')?4:3;
  const vertices=twigs.reduce((sum,t)=>sum+(t.from.distanceTo(t.to)>1e-3?(C.twigTriangles([t])/6+1)*ringVertices:0),0);
  let vertex=wood.getAttribute('position').count-vertices, index=wood.index!.count-twigs.reduce((sum,t)=>sum+(t.from.distanceTo(t.to)>1e-3?C.twigTriangles([t])*3:0),0);
  const geometry=new THREE.BufferGeometry().setAttribute('position',wood.getAttribute('position')), hit=new THREE.Vector3(), rows:number[]=[];
  try {
    for(const twig of twigs) {
      if(!(twig.from.distanceTo(twig.to)>1e-3))continue;
      const count=C.twigTriangles([twig])*3,centre=new THREE.Vector3();
      for(let i=0;i<3;i++)centre.add(new THREE.Vector3().fromBufferAttribute(wood.getAttribute('position'),vertex+i));
      centre.divideScalar(3);
      geometry.setIndex([...wood.index!.array.slice(0,index),...wood.index!.array.slice(index+count)]);
      rows.push(C.woodAnchor(geometry)(centre,hit));
      vertex+=(count/18+1)*ringVertices;index+=count;
    }
    expect(index).toBe(wood.index!.count);expect(vertex).toBe(wood.getAttribute('position').count);
    return rows;
  } finally {geometry.dispose();}
}

it('records the hero root study without changing geometry',async()=>{
 const ids=['hero-oak','hero-oak-b','hero-oak-c'],templates=new Map();
 for(const id of ids)templates.set(id,await Promise.all(['near','mid','far'].map(l=>meshyTreeTemplate('../hero/'+id+'-'+l+'.glb'))));
 const f=createMeshyForest(templates);try{const rows=[];for(const id of ids){const v=f.variant('oak',0,id).lods[0],wood=v.wood,leaf=v.leaf;if(!wood?.index||!leaf)throw Error('Missing hero source geometry');const twigs=leaf.userData.canopy.twigs as readonly C.CanopyTwig[],arrays=[wood.getAttribute('position').array,wood.index.array],hash=createHash('sha256');for(const a of arrays)hash.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));const gaps=rootGaps(wood,twigs);
 rows.push({id,lod:0,woodSha256:hash.digest('hex'),twigs:twigs.map(x=>({...x,from:x.from.toArray(),to:x.to.toArray()})),rootsAbove12cm:gaps.filter(x=>x>.12).length,maxLocalMetres:Math.max(...gaps),gaps});}
 if(process.env.HERO_ROOT_STUDY_OUT)writeFileSync(process.env.HERO_ROOT_STUDY_OUT,JSON.stringify({scope:'Root-ring centres vs other wood surfaces, template-local units; not whole-stem connectivity or a visual score.',rows}));
 expect(rows).toHaveLength(3);for(const row of rows){expect(row.woodSha256).toHaveLength(64);expect(row.gaps.length).toBe(row.twigs.length);expect(row.gaps.every(x=>Number.isFinite(x)&&x>=0)).toBe(true);}}finally{f.dispose();}
},180000);
