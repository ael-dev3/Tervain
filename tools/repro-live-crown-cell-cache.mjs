import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'camera-crown-cell-cache-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','544b4e4b8:src/presentation/cameraCrowns.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/cameraCrowns.ts','utf8')},modules={};
for(const[mode,source]of Object.entries(sources)) {
 const needle='const list = this.cells.get(this.key(ix, iz));';
 if(!source.includes(needle))throw Error('Crown cell lookup instrumentation site missing');
 const instrumented=source.replace(needle,'proof.cellLookups++; '+needle);
 const code=(await transformWithOxc(instrumented,'cameraCrowns.ts')).code.replace(/^export /gm,'');
 modules[mode]=code+'\nconst proof={cellLookups:0};return {CrownIndex,proof};';
}
let page;
try {
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module;
const models=Object.fromEntries(Object.entries(${JSON.stringify(modules)}).map(([mode,code])=>[mode,new Function(code)()]));
const crowns=Array.from(F.crownsNear(0,0,1000)),ids=new Map(crowns.map((c,i)=>[c,i]));
const index={};for(const mode of ['before','after']){index[mode]=new models[mode].CrownIndex();for(const c of crowns)index[mode].add(c);}
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const original=T.cam.crowns,rows={},images={};let nativeStates;
const routes=[{name:'walk-fence',x:-2,z:34.6,dx:0,dz:4.9},{name:'forest-resume',x:-268,z:27,dx:8,dz:5},{name:'grove',x:-180,z:12,dx:12,dz:5}];
try {
 for(const mode of ['native','before','after']) {
  const states=[],lists=[],perRoute=[];let nativePolicyListsMatch=true,returned=0;
  if(mode!=='native')Object.assign(models[mode].proof,{cellLookups:0});
  T.cam.crowns=(x,z,r)=>{
   const expected=Array.from(original(x,z,r));
   if(mode==='native')return expected;
   const found=index[mode].near(x,z,r);returned+=found.length;
   const policyExpected=expected.filter(c=>Math.hypot(c.x-x,c.z-z)<=r+c.h);
   const result=found.map(c=>ids.get(c));lists.push(result);
   if(JSON.stringify(result)!==JSON.stringify(policyExpected.map(c=>ids.get(c))))nativePolicyListsMatch=false;
   return found;
  };
  for(const route of routes) {
   const start=states.length,returnedStart=returned,lookupStart=mode==='native'?0:models[mode].proof.cellLookups;
   T.cam.wantDist=6.2;T.cam.yaw=0;T.cam.pitch=.32;T.cam.reset();
   for(let i=0;i<120;i++) {
    const x=route.x+route.dx*i/119,z=route.z+route.dz*i/119;
    T.cam.yaw=i*.05;T.cam.pitch=.32+.55*Math.sin(i*Math.PI/119);
    T.cam.follow(1/60,x,T.world.terrain.groundAt(x,z),z,T.world.terrain,T.world.colliders,true,0);
    T.cam.camera.updateMatrixWorld(true);
    states.push([...T.cam.camera.position.toArray(),...T.cam.camera.quaternion.toArray(),T.cam.curDist,T.cam.bodyVisible]);
   }
   perRoute.push({name:route.name,frames:states.length-start,returnedCrowns:returned-returnedStart,lookups:mode==='native'?null:models[mode].proof.cellLookups-lookupStart});
  }
  if(mode==='native')nativeStates=JSON.stringify(states);
  rows[mode]={frames:states.length,nativeCameraMatches:JSON.stringify(states)===nativeStates,nativePolicyListsMatch,returnedCrowns:returned,
    ...(mode==='native'?{}:{...models[mode].proof,totalLookups:models[mode].proof.cellLookups}),cameraSha256:await hash(states),listsSha256:await hash(lists),perRoute};
  T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
  T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
  rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;rows[mode].textureCount=T.renderer.info.memory.textures;
  images[mode]=T.renderer.domElement.toDataURL('image/png');
 }
}finally{T.cam.crowns=original;}
return {baselineRevision:"544b4e4b8",build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),crowns:crowns.length,rows,images};
`);
 // Native is the camera-state control; operation counters are measured only in instrumented arms.
 delete report.rows.native.returnedCrowns;delete report.rows.native.listsSha256;delete report.rows.native.nativePolicyListsMatch;
 for(const r of report.rows.native.perRoute)delete r.returnedCrowns;
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 report.scope='Native published crown objects, follow camera and terrain. 360 terrain-following turn/look-up updates on three routes. Actual source query indexes; cell Map.get counts measured only inside query calls after construction. Baseline is the individual-reach query from #538 (544b4e4b8); baseline/candidate identities and ordering must match the native query filtered by that existing reach policy on every update. Full native camera states and final native Grade/post pixels must match. No hardware timing or historical-hitch resolution claim.';
 const a=report.rows.before,b=report.rows.after;
 report.pass=report.crowns>0&&a.nativePolicyListsMatch&&b.nativePolicyListsMatch&&a.nativeCameraMatches&&b.nativeCameraMatches&&a.cameraSha256===b.cameraSha256&&a.listsSha256===b.listsSha256&&b.returnedCrowns===a.returnedCrowns&&b.totalLookups<a.totalLookups&&b.perRoute.every((r,i)=>r.lookups<=a.perRoute[i].lookups)&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
