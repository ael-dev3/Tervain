import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import * as C from '../../src/presentation/canopy';
import { createMeshyForest } from '../../src/presentation/meshyTrees';
import { meshyTreeTemplates } from './meshyTreeFixture';

function rootGaps(wood: THREE.BufferGeometry, twigs: readonly C.CanopyTwig[]) {
  const ringVertices=wood.hasAttribute('uv')||wood.hasAttribute('tangent')?4:3;
  const vertices=twigs.reduce((sum,t)=>sum+(t.from.distanceTo(t.to)>1e-3?(C.twigTriangles([t])/6+1)*ringVertices:0),0);
  let vertex=wood.getAttribute('position').count-vertices, index=wood.userData.twigIndex as number;
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

it('reconnects the retained birch twig roots while preserving every leaf and planned triangle',async()=>{
  const ids=['verdant-sentinel','tree-1527','tree-4815'], templates=await meshyTreeTemplates(ids),real=C.growTwigs;
  let enabled=false;
  const spy=vi.spyOn(C,'growTwigs').mockImplementation((wood,twigs,reconnect)=>real(wood,twigs,enabled&&reconnect));
  const before=createMeshyForest(templates),after=createMeshyForest(templates);
  try {
    const originals=ids.map(id=>before.variant('birch',0,id));enabled=true;
    const candidates=ids.map(id=>after.variant('birch',0,id));
    for(let i=0;i<ids.length;i++)for(let lod=0;lod<3;lod++) {
      const a=originals[i]!.lods[lod]!,b=candidates[i]!.lods[lod]!;
      expect(a.tris).toBe(b.tris);expect(a.wood!.index!.array).toEqual(b.wood!.index!.array);
      expect(a.leaf!.index!.array).toEqual(b.leaf!.index!.array);
      for(const name of Object.keys(a.leaf!.attributes))expect(a.leaf!.getAttribute(name).array).toEqual(b.leaf!.getAttribute(name).array);
      if(ids[i]!=='verdant-sentinel'||lod!==0)for(const name of Object.keys(a.wood!.attributes))expect(a.wood!.getAttribute(name).array).toEqual(b.wood!.getAttribute(name).array);
    }
    const a=originals[0]!.lods[0],b=candidates[0]!.lods[0],twigs=(a.leaf!.userData.canopy as {twigs:C.CanopyTwig[]}).twigs;
    const oldGaps=rootGaps(a.wood!,twigs),newGaps=rootGaps(b.wood!,twigs);
    expect(oldGaps.filter(x=>x>.12)).toHaveLength(4);
    expect(Math.max(...oldGaps)).toBeGreaterThan(1.2);
    expect(newGaps.filter(x=>x>.12)).toHaveLength(0);
  } finally {before.dispose();after.dispose();spy.mockRestore();}
},120000);
