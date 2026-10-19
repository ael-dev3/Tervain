import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
if(!args.url||!args.out)throw Error('Use --url <candidate-build-url> --out <output-directory>');
fs.mkdirSync(args.out,{recursive:true});
const rows=[];
for(const quality of ['low','high']){
 let page;
 try{
  page=await liveProofPage(args.url,{quality,hour:11});
  const row=await page.eval(`const T=tervain,F=T.world.modules.find(m=>m.name==='forest').module;
  T.frame=()=>{};T.present=()=>{};T.perf=null;T.lastFrameDt=0;T.cam.manual=true;T.grade.time=0;T.worldLook=null;
  T.world.sway.uTime.value=0;T.world.foliage.wind.uniforms.uGrassTime.value=0;
  globalThis.__restoreOrchardRaster?.();if(globalThis.__tervainCpuNoRaster===true)throw Error('Raster suppressed');
  const records=()=>[0,1,2].map(lod=>({lod,canopies:F.canopyAuditTargets(lod).map(t=>({label:t.label,kind:t.kind,matrix:t.matrix.elements})),roots:F.placementAuditTargets(lod).map(t=>({label:t.label,matrix:t.matrix.elements}))}));
  const before=records();T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();const image=T.renderer.domElement.toDataURL(),cost={draws:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};
  const after=records();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Audit results unstable');
  for(const level of after){const labels=new Set(level.canopies.map(t=>t.label));if(labels.size!==level.canopies.length)throw Error('Duplicate identity');for(const root of level.roots){const canopy=level.canopies.find(t=>t.label===root.label);if(!canopy||JSON.stringify(canopy.matrix)!==JSON.stringify(root.matrix))throw Error('Root/canopy identity mismatch');}}
  T.renderer.info.reset();T.renderWorld();return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),levels:after,image,afterImage:T.renderer.domElement.toDataURL(),cost,afterCost:{draws:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles}};`);
  for(const [name,data]of [['before',row.image],['after',row.afterImage]])fs.writeFileSync(path.join(args.out,quality+'-'+name+'.png'),Buffer.from(data.split(',')[1],'base64'));
  const a=await sharp(path.join(args.out,quality+'-before.png')).removeAlpha().raw().toBuffer(),b=await sharp(path.join(args.out,quality+'-after.png')).removeAlpha().raw().toBuffer();row.changedChannels=a.reduce((n,v,i)=>n+Number(v!==b[i]),0);delete row.image;delete row.afterImage;row.quality=quality;row.errors=page.console().filter(s=>/^\[(error|exception)\]/.test(s));rows.push(row);
 }finally{page?.close();}
}
const key=t=>t.kind+':'+t.matrix[12]+':'+t.matrix[14],high=new Map(rows[1].levels[0].canopies.map(t=>[key(t),t]));
let shared=0,mismatches=[];for(const t of rows[0].levels[0].canopies){const h=high.get(key(t));if(h){shared++;if(h.label!==t.label)mismatches.push({low:t,high:h});}}
const report={rows,shared,mismatches,scope:'Actual candidate builds on Low and High. Images compare the frozen scene before and after read-only audit calls, not old/new tree appearance.',pass:shared>0&&!mismatches.length&&rows.every(r=>!r.errors.length&&!r.changedChannels&&JSON.stringify(r.cost)===JSON.stringify(r.afterCost))};
fs.writeFileSync(path.join(args.out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({shared,mismatches:mismatches.length,rows:rows.map(r=>({quality:r.quality,build:r.build,changedChannels:r.changedChannels,cost:r.cost,errors:r.errors})),pass:report.pass}));if(!report.pass)process.exitCode=1;
