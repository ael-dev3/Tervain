import * as THREE from 'three';
import {expect,it} from 'vitest';
import {auditCanopies, type CanopyAuditTarget} from '../../src/diagnostics/canopyAudit';
function fixture(x=0,scale=1):CanopyAuditTarget {return{label:'fixture',wood:new THREE.BoxGeometry(.4,2,.4),leaves:new THREE.BoxGeometry(.5,.5,.5).translate(x,1,0),matrix:new THREE.Matrix4().makeScale(scale,scale,scale)};}
it('welds split-normal faces and accepts a wood-connected leaf chunk',()=>{const r=auditCanopies([fixture()]);expect(r.complete).toBe(true);expect(r.summary.components).toBe(1);expect(r.summary.candidates).toBe(0);});
it('detects a separated chunk and reports its transformed position',()=>{const r=auditCanopies([fixture(4,2)]);expect(r.summary.candidates).toBe(1);expect(r.trees[0]!.candidates[0]!.position[0]).toBe(8);});
it('uses world-space gap thresholds and includes leafless trees in population coverage',()=>{const leafless=fixture();leafless.leaves=null;expect(auditCanopies([fixture(1),leafless]).summary).toMatchObject({trees:2,leafless:1,candidates:0});expect(auditCanopies([fixture(1,3)]).summary.candidates).toBe(1);});
it('rejects unsupported transforms and exhausted budgets instead of claiming coverage',()=>{const target=fixture();target.matrix.makeScale(1,2,1);expect(()=>auditCanopies([target])).toThrow(/nonuniform/);expect(()=>auditCanopies([fixture()],{maxOperations:1})).toThrow(/budget/);expect(()=>auditCanopies([fixture()],{gap:NaN})).toThrow(/Invalid/);});
