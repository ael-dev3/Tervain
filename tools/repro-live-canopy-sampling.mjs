import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'canopy-sampling-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','9a5efa61a:src/diagnostics/canopyAudit.ts'],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':src/diagnostics/canopyAudit.ts'],{encoding:'utf8'}):fs.readFileSync('src/diagnostics/canopyAudit.ts','utf8')},modules={};
for(const[mode,source]of Object.entries(sources))modules[mode]=(await transformWithOxc(source,'canopyAudit.ts')).code;
const server=await createServer({configFile:false,logLevel:'error',optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'sampling-proof',resolveId(id){if(id.startsWith('/@sampling-'))return '\0'+id;},load(id){if(id.startsWith('\0/@sampling-'))return modules[id.slice('\0/@sampling-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,rows=[],fixtures=[],models={};
for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@sampling-'+mode);
const budget=${JSON.stringify(Number(args['max-alpha-queries']??20000000))};if(!Number.isInteger(budget)||budget<1)throw Error('Invalid alpha-query budget');let totalAlphaQueries=0;
T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,T.world.terrain.groundAt(-180,12),12,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
const drawStats=()=>{const r=T.renderer.info.render;return{calls:r.calls,triangles:r.triangles,points:r.points,lines:r.lines};};
const images={native:T.renderer.domElement.toDataURL('image/png')},drawsBefore=drawStats();
for(const lod of [0,1,2]){
 const seen=new Set();
 const targets=F.canopyAuditTargets(lod).filter(t=>{if(!t.leaves||!t.cutout)return false;if(!/pine|fir/.test(t.species??t.kind??t.label))return false;const key=t.leaves.uuid;if(seen.has(key))return false;seen.add(key);return true;});
 for(const t of targets){
  const g=t.leaves,index=g.index,uv=g.getAttribute(t.cutout.uv),position=g.getAttribute('position'),patterns=new Map();let degenerateTriangles=0;if(!uv)throw Error('Native masked geometry has no UV attribute');
  for(let i=0;i+2<(index?.count??uv.count);i+=3){const v=[0,1,2].map(k=>index?.getX(i+k)??i+k),a=v.map(j=>[position.getX(j),position.getY(j),position.getZ(j)]),e=a[1].map((x,k)=>x-a[0][k]),f=a[2].map((x,k)=>x-a[0][k]),areaSquared=(e[1]*f[2]-e[2]*f[1])**2+(e[2]*f[0]-e[0]*f[2])**2+(e[0]*f[1]-e[1]*f[0])**2;if(!Number.isFinite(areaSquared))throw Error('Nonfinite native triangle area');if(areaSquared===0){degenerateTriangles++;continue;}const p=v.flatMap(j=>[uv.getX(j),uv.getY(j)]),key=p.join(',');let entry=patterns.get(key);if(!entry){entry={uv:p,triangles:0,triangle:i/3};patterns.set(key,entry);}entry.triangles++;}
  let coarseEmpty=0,missedPatterns=0,missedTriangles=0,alphaQueries=0;const witnesses=[];
  const hit=(p,N)=>{for(let a=0;a<=N;a++)for(let b=0;a+b<=N;b++){const w=[a/N,b/N,(N-a-b)/N],u=w[0]*p[0]+w[1]*p[2]+w[2]*p[4],v=w[0]*p[1]+w[1]*p[3]+w[2]*p[5];if(++totalAlphaQueries>budget)throw Error('Alpha-query budget exhausted');alphaQueries++;const alpha=t.cutout.alpha(u,v);if(alpha>=t.cutout.cutoff)return{weights:w,uv:[u,v],alpha};}return null;};
  for(const p of patterns.values()){if(hit(p.uv,6))continue;coarseEmpty++;const witness=hit(p.uv,48);if(witness){missedPatterns++;missedTriangles+=p.triangles;if(witnesses.length<8)witnesses.push({...p,witness});}}
  if(t.wood&&witnesses.length)fixtures.push({t,record:witnesses[0]});
  rows.push({label:t.label,species:t.species,kind:t.kind,lod,triangles:(index?.count??uv.count)/3,patterns:patterns.size,degenerateTriangles,coarseEmpty,missedPatterns,missedTriangles,alphaQueries,witnesses});
 }
}
if(!rows.length)throw Error('No native masked conifers selected');
const omissionCases=[];
for(const {t,record}of fixtures){
 const g=t.leaves.clone(),sourceIndex=t.leaves.index;g.setIndex([0,1,2].map(k=>sourceIndex?.getX(record.triangle*3+k)??record.triangle*3+k));
 try{const result={label:t.label,species:t.species,lod:t.lod,triangle:record.triangle,cutoff:t.cutout.cutoff,witness:record.witness};
  for(const mode of ['before','after']){try{const r=models[mode].auditCanopies([{...t,leaves:g}],{alpha:true,lod:t.lod,maxOperations:20000000});result[mode]={complete:r.complete,components:r.summary.components,candidates:r.summary.candidates,error:null};}catch(error){result[mode]={error:error.message};}}
  omissionCases.push(result);
 }finally{g.dispose();}
}
if(!fixtures.length)throw Error('No native omission fixture with wood support available');
const first=fixtures[0],g=first.t.leaves.clone(),sourceIndex=first.t.leaves.index;g.setIndex([0,1,2].map(k=>sourceIndex?.getX(first.record.triangle*3+k)??first.record.triangle*3+k));
const controls=[];
try{for(const [name,alpha,enabled]of [['opaque',()=>1,true],['transparent',()=>0,true],['geometry-only',()=>0,false]]){
 const values={};for(const mode of ['before','after']){const r=models[mode].auditCanopies([{...first.t,leaves:g,cutout:{...first.t.cutout,alpha}}],{alpha:enabled,lod:first.t.lod,maxOperations:20000000});values[mode]={complete:r.complete,components:r.summary.components,candidates:r.summary.candidates};}controls.push({name,...values});}
}finally{g.dispose();}
const size=512,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(size,size),p=first.record.uv;
for(let y=0;y<size;y++)for(let x=0;x<size;x++){const a=x/(size-1),b=y/(size-1),inside=a+b<=1,alpha=inside?first.t.cutout.alpha((1-a-b)*p[0]+a*p[2]+b*p[4],(1-a-b)*p[1]+a*p[3]+b*p[5]):0;const value=inside?(alpha>=first.t.cutout.cutoff?220:35):10,k=(y*size+x)*4;pixels.data[k]=pixels.data[k+1]=pixels.data[k+2]=value;pixels.data[k+3]=255;}
ctx.putImageData(pixels,0,0);ctx.fillStyle='#26b9ff';for(let a=0;a<=6;a++)for(let b=0;a+b<=6;b++){ctx.beginPath();ctx.arc(b/6*(size-1),(6-a-b)/6*(size-1),3,0,Math.PI*2);ctx.fill();}
images.coarseMask=canvas.toDataURL('image/png');const w=first.record.witness.weights;ctx.strokeStyle='#ff4e45';ctx.lineWidth=3;ctx.beginPath();ctx.arc(w[1]*(size-1),w[2]*(size-1),9,0,Math.PI*2);ctx.stroke();images.witnessMask=canvas.toDataURL('image/png');
T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();images.after=T.renderer.domElement.toDataURL('image/png');const drawsAfter=drawStats();
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rows,omissionCases,controls,totalAlphaQueries,budget,drawsBefore,drawsAfter,images};
`);
 report.missedPatterns=report.rows.reduce((n,r)=>n+r.missedPatterns,0);report.missedTriangles=report.rows.reduce((n,r)=>n+r.missedTriangles,0);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const images=await Promise.all(['native','after'].map(n=>sharp(path.join(out,n+'.png')).raw().toBuffer()));report.identicalScenePixels=images[0].equals(images[1]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.baselineRevision='9a5efa61a';
 report.pass=report.rows.length>0&&[0,1,2].every(l=>report.rows.some(r=>r.lod===l))&&report.missedTriangles>0&&report.omissionCases.length>0&&report.omissionCases.every(r=>r.before.complete&&r.before.components===0&&r.before.candidates===0&&r.after.error?.includes('Canopy alpha sampling missed opaque foliage'))&&report.controls.every(r=>r.before.complete&&JSON.stringify(r.before)===JSON.stringify(r.after))&&report.identicalScenePixels&&JSON.stringify(report.drawsBefore)===JSON.stringify(report.drawsAfter);
 report.scope='Native retained Low conifer source geometries and cutout samplers across all three LODs, deduplicated by geometry identity per LOD; not a full-tree-population count. 48-step positive witnesses prove omissions by the current six-step grid, not exhaustive texel coverage. Actual audit sources checked on one isolated native triangle per omitted masked geometry with wood. Controls retain opacity/geometry semantics. Scene captures are unchanged-rendering controls; mask diagrams show native base-level sampler alpha, blue coarse samples and a red positive witness. No visual repair or hardware timing claim.';
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build:report.build,targets:report.rows.length,missedPatterns:report.missedPatterns,missedTriangles:report.missedTriangles,cases:report.omissionCases.length,identicalScenePixels:report.identicalScenePixels,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
