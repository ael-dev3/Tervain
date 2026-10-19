import * as THREE from 'three';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import * as canopy from '../../src/presentation/canopy';
import { createMeshyForest, type MeshyTreeTemplates } from '../../src/presentation/meshyTrees';
import { meshyTreeTemplate } from './meshyTreeFixture';
import { PlantedCrownIndex } from '../../src/presentation/plantedCrowns';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
let templates: MeshyTreeTemplates;
beforeAll(async () => { templates = new Map([['hero-oak', await Promise.all(['near','mid','far'].map(lod => meshyTreeTemplate(`../hero/hero-oak-${lod}.glb`))) as [GLTF,GLTF,GLTF]]]); },30000);
afterAll(() => { for(const levels of templates?.values() ?? []) for(const gltf of levels) gltf.scene.traverse(o => { const m=o as THREE.Mesh;if(!m.isMesh)return;m.geometry.dispose();for(const mat of Array.isArray(m.material)?m.material:[m.material])mat.dispose(); }); });
it('converts the near validation gap and preserves the rebuilt projected shade field exactly', () => {
  const real=canopy.snapDetachedClumps, rows: {gap:number|undefined;moved:number}[]=[];
  const spy=vi.spyOn(canopy,'snapDetachedClumps').mockImplementation((leaves,wood,reach,gap,pull,verticalGap) => {
    const before=real(leaves,wood,reach,gap,pull),after=real(leaves,wood,reach,gap,pull,verticalGap);
    try {
      const a=before.geometry.getAttribute('position'),b=after.geometry.getAttribute('position');
      expect(a.count).toBe(b.count);
      for(let i=0;i<a.count;i++){expect(Object.is(a.getX(i),b.getX(i))).toBe(true);expect(Object.is(a.getZ(i),b.getZ(i))).toBe(true);}
      expect(Array.from(after.geometry.index!.array)).toEqual(Array.from(before.geometry.index!.array));
      for(const name of Object.keys(before.geometry.attributes)) if(name!=='position') expect(Array.from(after.geometry.getAttribute(name).array)).toEqual(Array.from(before.geometry.getAttribute(name).array));
      const fields=[before.geometry,after.geometry].map(g=>{const f=new PlantedCrownIndex();f.add('oak',{x:0,z:0,s:1,yaw:0},g);return f;});
      for(let z=-24;z<=24;z+=.5)for(let x=-24;x<=24;x+=.5)expect(fields[1]!.coverAt(x,z)).toBe(fields[0]!.coverAt(x,z));
      rows.push({gap:verticalGap,moved:after.moved-before.moved});
    } finally {before.geometry.dispose();}
    return after;
  });
  const forest=createMeshyForest(templates);
  try{forest.variant('oak',0,'hero-oak');expect(rows).toHaveLength(2);expect(rows[0]!.gap!*canopy.MAX_TREE_SCALE).toBeCloseTo(.75,12);expect(rows[0]!.moved).toBeGreaterThan(0);expect(rows[1]).toEqual({gap:undefined,moved:0});}
  finally{forest.dispose();spy.mockRestore();}
},30000);
