import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { expect, it } from 'vitest';
import { auditCanopies } from '../../src/diagnostics/canopyAudit';

for (const separation of [0, .2, 1, 2]) it(`evaluates each support bound once per leaf sample at separation ${separation}`, () => {
  const woodParts=Array.from({length:32},(_,i)=>new THREE.PlaneGeometry(2,2).translate(i*4,1,0));
  const leafParts=Array.from({length:32},(_,i)=>new THREE.PlaneGeometry(.4,.4).translate(i*4,1,separation));
  const wood=mergeGeometries(woodParts), leaves=mergeGeometries(leafParts);
  const original=THREE.Box3.prototype.distanceToPoint;
  const seen=new WeakMap<THREE.Box3,WeakSet<THREE.Vector3>>();let queries=0,repeated=0;
  THREE.Box3.prototype.distanceToPoint=function(point) {
    queries++;let points=seen.get(this);if(!points){points=new WeakSet();seen.set(this,points);}
    if(points.has(point))repeated++;points.add(point);
    return original.call(this,point);
  };
  try {
    const report=auditCanopies([{label:'supported-cards',wood,leaves,matrix:new THREE.Matrix4()}]);
    expect(report.complete).toBe(true);
    expect(report.summary).toMatchObject({components:32,candidates:separation>.75?32:0,detachedCards:separation>1.5?32:0,detachedClumps:separation>1.5?32:0});
    expect(queries).toBeGreaterThan(0);
    expect(repeated).toBe(0);
  } finally {
    THREE.Box3.prototype.distanceToPoint=original;
    for(const g of [...woodParts,...leafParts,wood,leaves])g.dispose();
  }
});
