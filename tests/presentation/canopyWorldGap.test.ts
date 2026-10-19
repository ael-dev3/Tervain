import * as THREE from 'three';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import * as canopy from '../../src/presentation/canopy';
import { createMeshyForest, type MeshyTreeTemplates } from '../../src/presentation/meshyTrees';
import { meshyTreeTemplate } from './meshyTreeFixture';
import { auditCanopies } from '../../src/diagnostics/canopyAudit';
import { detachedClumpSet } from '../../src/diagnostics/canopyConnectivity';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
let templates: MeshyTreeTemplates;
beforeAll(async()=>{templates=new Map([['hero-oak',await Promise.all(['near','mid','far'].map(lod=>meshyTreeTemplate(`../hero/hero-oak-${lod}.glb`))) as [GLTF,GLTF,GLTF]]]);},30000);
afterAll(()=>{for(const levels of templates?.values()??[])for(const gltf of levels)gltf.scene.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;mesh.geometry.dispose();for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();});});
it('uses the same world-metre clump graph as the audit at the supported maximum oak scale',()=>{
  const run=canopy.snapDetachedClumps,rows:{actual:number;expected:number;worldGap:number}[]=[];
  const spy=vi.spyOn(canopy,'snapDetachedClumps').mockImplementation((leaves,wood,reach,gap,pull)=>{
    const scale=canopy.MAX_TREE_SCALE;
    const actual=detachedClumpSet(leaves,wood,reach,gap??.75);
    const report=auditCanopies([{label:'oak',wood,leaves,matrix:new THREE.Matrix4().makeScale(scale,scale,scale)}],{gap:.75,woodReach:1.5,maxOperations:300000000});
    rows.push({actual:actual.detachedClumps,expected:report.trees[0]!.detachedClumps,worldGap:gap!*scale});
    const old=run(leaves,wood,reach,.75,pull),corrected=run(leaves,wood,reach,gap,pull);
    try {expect(Array.from(corrected.geometry.index!.array)).toEqual(Array.from(old.geometry.index!.array));
      expect(Object.keys(corrected.geometry.attributes)).toEqual(Object.keys(old.geometry.attributes));
      for(const name of Object.keys(old.geometry.attributes))if(name!=='position')expect(Array.from(corrected.geometry.getAttribute(name).array)).toEqual(Array.from(old.geometry.getAttribute(name).array));
      expect(corrected.geometry.getAttribute('position').count).toBe(old.geometry.getAttribute('position').count);
    } finally {old.geometry.dispose();}
    return corrected;
  });
  const forest=createMeshyForest(templates);
  try { forest.variant('oak',0,'hero-oak');expect(rows).toHaveLength(2);for(const row of rows){expect.soft(row.worldGap).toBeCloseTo(.75,12);expect(row.actual).toBe(row.expected);}}
  finally{forest.dispose();spy.mockRestore();}
},30000);
