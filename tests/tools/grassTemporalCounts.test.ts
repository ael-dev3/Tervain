import {test} from 'vitest';
import assert from 'node:assert/strict';
import {temporalGrassCounts as count} from '../../tools/grass-temporal-counts.mjs';
test('threshold strictness, intersection mask, and bright subset',()=>{
 const a=Uint8Array.from([0,0,0,0,0,0,200,200,200,0,0,0]);
 const b=Uint8Array.from([20,20,20,21,21,21,230,230,230,255,255,255]);
 const mask=Uint8Array.from([255,255,255,255,255,255,255,255,255,255,255,255]);
 const next=mask.slice();next.fill(0,9);
 assert.deepEqual(count(a,b,mask,next),{eligiblePixels:3,changedPixels:2,brightChangedPixels:1,maskChangedPixels:1,changedShare:2/3});
 assert.equal(count(a,a,mask,mask).changedPixels,0);
 assert.equal(count(a,b,new Uint8Array(12),mask).changedShare,null);
 assert.throws(()=>count(a,b,mask,new Uint8Array(3)));
 assert.throws(()=>count(a,b,mask,mask,{threshold:NaN}));
});
