import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const dir=process.argv[2],r=JSON.parse(fs.readFileSync(dir+'/report.json','utf8'));assert(r.complete);
const y=(p,k)=>.2126*p[k]+.7152*p[k+1]+.0722*p[k+2];
const read=async(m,i)=>sharp(dir+'/'+m+'-'+i+'.png').removeAlpha().raw().toBuffer();
const summaries={};
for(const mode of ['noThrough','noSheen']){
 const s={affectedPixelObservations:0,baselineBright180:0,ablatedBright180:0,baselineBright220:0,ablatedBright220:0,baselineJumps60:0,ablatedJumps60:0,baselineBrightJumps60:0,ablatedBrightJumps60:0,maxBaselineLuminance:0,maxAblatedLuminance:0};let prev;
 for(let i=0;i<r.route.frames;i++){
  const b=await read('baseline',i),q=await read(mode,i);assert.equal(b.length,q.length);
  for(let k=0;k<b.length;k+=3){const affected=b[k]!==q[k]||b[k+1]!==q[k+1]||b[k+2]!==q[k+2],wasAffected=prev&&(prev.b[k]!==prev.q[k]||prev.b[k+1]!==prev.q[k+1]||prev.b[k+2]!==prev.q[k+2]);const v=y(b,k),w=y(q,k);
   if(affected){s.affectedPixelObservations++;s.baselineBright180+=Number(v>=180);s.ablatedBright180+=Number(w>=180);s.baselineBright220+=Number(v>=220);s.ablatedBright220+=Number(w>=220);s.maxBaselineLuminance=Math.max(s.maxBaselineLuminance,v);s.maxAblatedLuminance=Math.max(s.maxAblatedLuminance,w);}
   if(prev&&(affected||wasAffected)){const vb=y(prev.b,k),vq=y(prev.q,k),bj=Math.abs(v-vb)>60,qj=Math.abs(w-vq)>60;s.baselineJumps60+=Number(bj);s.ablatedJumps60+=Number(qj);s.baselineBrightJumps60+=Number(bj&&Math.max(v,vb)>=180);s.ablatedBrightJumps60+=Number(qj&&Math.max(w,vq)>=180);}
  }prev={b,q};
 }summaries[mode]=s;
}
const result={build:r.setup.build,buffer:r.setup.buffer,effectiveDpr:r.setup.dpr,route:r.route,summaries,scope:'Observations, not unique pixels. Temporal domain is the union of lighting-affected pixels in consecutive poses; camera motion and occlusion remain included. All same-pose controls are exact. No visual-quality or hardware timing PASS.'};fs.writeFileSync(dir+'/summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
