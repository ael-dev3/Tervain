import {expect,it} from 'vitest';
import {canopyGate} from '../../tools/canopy-detached-gate.mjs';
const report=(a=0,b=0)=>({complete:true,gap:.75,expectedTrees:2,scope:'fixture',summary:{trees:2,candidates:0,leafless:0,woodReach:1.5,detachedCards:a+b,detachedClumps:a+b},trees:[{label:'a',candidates:[],leafless:false,detachedCards:a,detachedClumps:a},{label:'b',candidates:[],leafless:false,detachedCards:b,detachedClumps:b}]});
it('rejects wood-detached clumps even when the crown is connected',()=>{expect(canopyGate(report(1)).pass).toBe(false);expect(canopyGate(report()).pass).toBe(true);});
it('rejects a newly affected tree despite a lower total and accepts per-tree improvements',()=>{expect(canopyGate(report(0,1),report(4,0)).regressions).toHaveLength(2);expect(canopyGate(report(2),report(4)).pass).toBe(true);});
it('rejects missing counts, forged summaries and changed reach thresholds',()=>{
 const a=report();delete (a.trees[0] as Partial<typeof a.trees[0]>).detachedCards;expect(canopyGate(a).pass).toBe(false);
 const b=report();b.summary.detachedClumps=1;expect(canopyGate(b).pass).toBe(false);
 const c=report();c.summary.woodReach=2;expect(canopyGate(c,report()).pass).toBe(false);
});
it('accepts explicitly leafless trees without inventing foliage measurements',()=>{
 const r=report();r.summary.leafless=1;const leafless={label:'b',candidates:[],leafless:true};r.trees[1]=leafless as unknown as typeof r.trees[1];expect(canopyGate(r).pass).toBe(true);
});
