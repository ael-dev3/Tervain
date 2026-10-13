import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {expect,it} from 'vitest';
import {auditCanopies, type CanopyAuditTarget} from '../../src/diagnostics/canopyAudit';
function fixture(x=0,scale=1):CanopyAuditTarget {return{label:'fixture',wood:new THREE.BoxGeometry(.4,2,.4),leaves:new THREE.BoxGeometry(.5,.5,.5).translate(x,1,0),matrix:new THREE.Matrix4().makeScale(scale,scale,scale)};}
it('welds split-normal faces and accepts a wood-connected leaf chunk',()=>{const r=auditCanopies([fixture()]);expect(r.complete).toBe(true);expect(r.summary.components).toBe(1);expect(r.summary.candidates).toBe(0);});
it('detects a separated chunk and reports its transformed position',()=>{const r=auditCanopies([fixture(4,2)]);expect(r.summary.candidates).toBe(1);expect(r.trees[0]!.candidates[0]!.position[0]).toBe(8);});
it('uses world-space gap thresholds and includes leafless trees in population coverage',()=>{const leafless=fixture();leafless.leaves=null;expect(auditCanopies([fixture(1),leafless]).summary).toMatchObject({trees:2,leafless:1,candidates:0});expect(auditCanopies([fixture(1,3)]).summary.candidates).toBe(1);});
it('rejects unsupported transforms and exhausted budgets instead of claiming coverage',()=>{const target=fixture();target.matrix.makeScale(1,2,1);expect(()=>auditCanopies([target])).toThrow(/nonuniform/);expect(()=>auditCanopies([fixture()],{maxOperations:1})).toThrow(/budget/);expect(()=>auditCanopies([fixture()],{gap:NaN})).toThrow(/Invalid/);});
it('rejects empty leaves and nonfinite geometry/transforms instead of reporting complete',()=>{const target=fixture();target.leaves=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([],3));expect(()=>auditCanopies([target])).toThrow(/Missing leaf/);const bad=fixture();bad.matrix.elements[12]=NaN;expect(()=>auditCanopies([bad])).toThrow(/transform/);const badLeaf=fixture();badLeaf.leaves!.translate(NaN,0,0);expect(()=>auditCanopies([badLeaf])).toThrow(/Nonfinite/);});
it('ignores unreferenced source vertices instead of flagging invisible debris',()=>{const t=fixture(),p=t.leaves!.getAttribute('position'),positions=new Float32Array(p.array.length+3);positions.set(p.array);positions.set([100,100,100],p.array.length);t.leaves!.setAttribute('position',new THREE.BufferAttribute(positions,3));const r=auditCanopies([t]);expect(r.summary.components).toBe(1);expect(r.summary.candidates).toBe(0);});

it('keeps transitive crown connectivity at instance-scaled gap cutoffs',()=>{const t=fixture();t.leaves=mergeGeometries([.45,1.45,2.45].map(x=>new THREE.BoxGeometry(.5,.5,.5).translate(x,1,0)));expect(auditCanopies([t]).summary).toMatchObject({components:3,chunks:1,candidates:0});t.matrix.makeScale(2,2,2);expect(auditCanopies([t]).summary).toMatchObject({chunks:3,candidates:2});});
it('collapses overlap cliques while retaining a detached crown cluster',()=>{const t=fixture();t.leaves=mergeGeometries([.4,.6,.8,4,4.2].map(x=>new THREE.BoxGeometry(.5,.5,.5).translate(x,1,0)));expect(auditCanopies([t]).summary).toMatchObject({components:5,chunks:2,candidates:1});});

it('reports species coverage and the selected LOD separately from candidate counts', () => {
  const pine = { ...fixture(4), species: 'pine', lod: 1 };
  const fir = { ...fixture(), species: 'fir', lod: 1 };
  const dead = { ...fixture(), species: 'dead', lod: 1, leaves: null };
  const report = auditCanopies([pine, fir, dead], { lod: 1 });
  expect(report.lod).toBe(1);
  expect(report.bySpecies).toEqual({ pine: { trees: 1, leafless: 0, candidates: 1 }, fir: { trees: 1, leafless: 0, candidates: 0 }, dead: { trees: 1, leafless: 1, candidates: 0 } });
  expect(() => auditCanopies([pine], { lod: 3 })).toThrow(/LOD/);
  expect(() => auditCanopies([pine], { lod: 0 })).toThrow(/mismatch/);
});
