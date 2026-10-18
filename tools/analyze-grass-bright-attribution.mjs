import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
const [capture,locationsFile,previous,out]=process.argv.slice(2);if(!out)throw Error('Supply diagnostic capture, locations JSON, previous capture and output JSON');
const reportFile=['report.json','progress.json','attribution-capture.json'].find(f=>fs.existsSync(path.join(capture,f)));if(!reportFile)throw Error('Capture report missing');const labelsOnly=process.argv.includes('--labels-only');
const r=JSON.parse(fs.readFileSync(path.join(capture,reportFile))),locations=JSON.parse(fs.readFileSync(locationsFile));
const rows=[],byClass={},ablations=[];
const sample=(a,w,h,x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,values=[0,0,0];for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const xx=Math.max(0,Math.min(w-1,ix+dx)),yy=Math.max(0,Math.min(h-1,iy+dy)),weight=(dx?fx:1-fx)*(dy?fy:1-fy);for(let c=0;c<3;c++)values[c]+=a[(yy*w+xx)*3+c]*weight/255;}return values;};
const yAt=(a,p)=>{const k=(p.y*2880+p.x)*3;return .2126*a[k]+.7152*a[k+1]+.0722*a[k+2];};
for(const entry of r.old){
 const tag=String(entry.frame).padStart(2,'0'),name='old-label-'+tag+'.png',direct=path.join(capture,name),image=await sharp(fs.existsSync(direct)?direct:path.join(capture,'old-labels',name)).removeAlpha().raw().toBuffer();
 for(const p of locations.rows.filter(x=>x.frame===entry.frame)){
  const weights=sample(image,entry.crop.width,entry.crop.height,(p.x+.5)*.75-.5-entry.crop.left,(p.y+.5)*.75-.5-entry.crop.top),[g,solid,sky]=weights;
  const label=g>=.9?'grass-interior':g>=.1&&sky>=.1?'grass-sky-edge':g>=.1&&solid>=.1?'grass-other-edge':g<.1&&sky>.5?'sky-legacy-mask-hit':g<.1&&solid>.5?'other-legacy-mask-hit':'ambiguous';
  rows.push({...p,weights:{grass:g,other:solid,sky},label});byClass[label]=(byClass[label]??0)+1;
 }
 if(entry.reference&&!labelsOnly){
  const list=rows.filter(x=>x.frame===entry.frame),baseline=await sharp(path.join(capture,'old-baseline-'+entry.frame+'.png')).removeAlpha().raw().toBuffer(),terms={};
  for(const term of ['noSheen','noThrough']){
   const a=await sharp(path.join(capture,'old-'+term+'-'+entry.frame+'.png')).removeAlpha().raw().toBuffer();const pairs=list.filter(p=>p.label==='grass-interior').map(p=>({x:p.x,y:p.y,before:yAt(baseline,p),after:yAt(a,p)}));
   terms[term]={grassInteriorObservations:pairs.length,remainAbove180:pairs.filter(p=>p.after>=180).length,meanLuminanceDrop:pairs.length?pairs.reduce((n,p)=>n+p.before-p.after,0)/pairs.length:null,pairs};
  }ablations.push({frame:entry.frame,reference:entry.reference,terms});
 }
}
assert.equal(rows.length,locations.count);if(!labelsOnly){assert.deepEqual(ablations.map(a=>a.frame),[0,23,60]);for(const a of ablations)assert.equal(a.reference.changedChannels,0);}
const report={schema:1,labelsOnly,build:r.build,located:locations.count,classified:rows.length,byClass,ablations,scope:'Raw 4-sample geometric surface labels, bilinearly aligned to original screenshot pixels. Grass interior >=90%; mixed edges >=10% each. Representative lighting ablations are not an all-frame causal count. Existing normal frames must match before interpreting those ablations.',rows};
fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined,ablations:ablations.map(a=>({...a,terms:Object.fromEntries(Object.entries(a.terms).map(([k,v])=>[k,{...v,pairs:undefined}]))}))}));
