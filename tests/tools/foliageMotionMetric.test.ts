import {expect,it} from 'vitest';
import {rgbFrame,walkingFlicker,changeComponents} from '../../tools/foliage-motion-metric.mjs';
it('separates a white single-frame flash from an equally bright coloured flash',()=>{
 const w=48,h=48,base=Uint8Array.from({length:w*h*3},(_,i)=>70+(Math.imul(Math.floor(i/3)+7,1103515245)>>>16)%40);
 const white=base.slice(),coloured=base.slice(),k=(25*w+25)*3;
 white.set([250,250,250],k);coloured.set([255,230,30],k);
 const a=walkingFlicker([rgbFrame(base,w,h),rgbFrame(white,w,h),rgbFrame(base,w,h)],w,h);
 const b=walkingFlicker([rgbFrame(base,w,h),rgbFrame(coloured,w,h),rgbFrame(base,w,h)],w,h);
 expect(a.whitePixelsFlickered).toBeGreaterThan(0);expect(b.whitePixelsFlickered).toBe(0);expect(b.summary.sparkleShare).toBeGreaterThan(0);
});
it('rejects isolated sparkle pixels but counts abrupt connected stream patches',()=>{
 const w=32,h=32,a=new Uint8Array(w*h*3),b=a.slice();b.set([255,255,255],0);
 for(let y=4;y<8;y++)for(let x=4;x<8;x++)b.fill(80,(y*w+x)*3,(y*w+x)*3+3);
 const result=changeComponents(a,b,w,h);expect(result.changedPixels).toBe(17);expect(result.events).toEqual([{pixels:16,box:[4,4,4,4]}]);expect(changeComponents(b,b,w,h).events).toEqual([]);
});
it('does not join pixel components across a row boundary',()=>{
 const a=new Uint8Array(4*4*3),b=a.slice();b.fill(100,3*3,5*3);
 expect(changeComponents(a,b,4,4,{minPixels:1}).events).toHaveLength(2);
});
