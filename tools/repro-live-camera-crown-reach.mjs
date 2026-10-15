import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer, transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'camera-crown-reach-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/cameraCrowns.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/cameraCrowns.ts','utf8')},modules={};
for(const[mode,source]of Object.entries(sources)) {
 const needle='function inCore(c: CameraCrown, x: number, y: number, z: number): boolean {';
 if(!source.includes(needle))throw Error('Missing crown core test');
 modules[mode]=(await transformWithOxc(source.replace(needle,needle+'\n  proof.coreTests++;')+'\nexport const proof = {coreTests: 0};','cameraCrowns.ts')).code;
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-crown-reach-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'crown-proof',resolveId(id){if(id.startsWith('/@crown-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@crown-proof-'))return modules[id.slice('\0/@crown-proof-'.length)];}}]});let page;
try {
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@crown-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module;
const models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@crown-proof-'+mode);
const crowns=Array.from(F.crownsNear(0,0,1000)),ids=new Map(crowns.map((c,i)=>[c,i]));
const index={};for(const mode of ['before','after']){index[mode]=new models[mode].CrownIndex();for(const c of crowns)index[mode].add(c);}
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const original=T.cam.crowns,rows={},images={};let nativeStates;
const routes=[{name:'walk-fence',x:-2,z:34.6,dx:0,dz:4.9},{name:'forest-resume',x:-268,z:27,dx:8,dz:5},{name:'grove',x:-180,z:12,dx:12,dz:5}];
try {
 for(const mode of ['native','before','after']) {
  const states=[],booms=[],perRoute=[];let nativeListsMatch=true,returned=0;
  if(mode!=='native')models[mode].proof.coreTests=0;
  T.cam.crowns=(x,z,r)=>{
   const expected=Array.from(original(x,z,r));
   if(mode==='native')return expected;
   const found=index[mode].near(x,z,r);returned+=found.length;
   if(mode==='before'&&JSON.stringify(found.map(c=>ids.get(c)))!==JSON.stringify(expected.map(c=>ids.get(c))))nativeListsMatch=false;
   const cp=Math.cos(T.cam.pitch),dir={x:-Math.sin(T.cam.yaw)*cp,y:Math.sin(T.cam.pitch),z:-Math.cos(T.cam.yaw)*cp};
   booms.push(models[mode].crownBoom(T.cam.followPivot,dir,r,found));
   return found;
  };
  for(const route of routes) {
   const start=states.length,returnedStart=returned,coreStart=mode==='native'?0:models[mode].proof.coreTests;
   T.cam.wantDist=6.2;T.cam.yaw=0;T.cam.pitch=.32;T.cam.reset();
   for(let i=0;i<120;i++) {
    const x=route.x+route.dx*i/119,z=route.z+route.dz*i/119;
    T.cam.yaw=i*.05;T.cam.pitch=.32+.55*Math.sin(i*Math.PI/119);
    T.cam.follow(1/60,x,T.world.terrain.groundAt(x,z),z,T.world.terrain,T.world.colliders,true,0);
    T.cam.camera.updateMatrixWorld(true);
    states.push([...T.cam.camera.position.toArray(),...T.cam.camera.quaternion.toArray(),T.cam.curDist,T.cam.bodyVisible]);
   }
   perRoute.push({name:route.name,frames:states.length-start,returnedCrowns:returned-returnedStart,coreTests:mode==='native'?null:models[mode].proof.coreTests-coreStart});
  }
  if(mode==='native')nativeStates=JSON.stringify(states);
  rows[mode]={frames:states.length,nativeCameraMatches:JSON.stringify(states)===nativeStates,nativeListsMatch,returnedCrowns:returned,
    coreTests:mode==='native'?null:models[mode].proof.coreTests,cameraSha256:await hash(states),boomSha256:await hash(booms),perRoute};
  T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
  T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
  rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;rows[mode].textureCount=T.renderer.info.memory.textures;
  if(mode!=='native')images[mode]=T.renderer.domElement.toDataURL('image/png');
 }
}finally{T.cam.crowns=original;}
return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),crowns:crowns.length,rows,images};
`);
 // Native is the camera-state control; operation counters are measured only in instrumented arms.
 delete report.rows.native.returnedCrowns;delete report.rows.native.boomSha256;delete report.rows.native.nativeListsMatch;
 for(const r of report.rows.native.perRoute)delete r.returnedCrowns;
 delete report.rows.after.nativeListsMatch;
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 report.scope='Native published crown objects and follow-camera, 360 terrain-following walk/turn/look-up updates on three routes. Baseline query lists must match native identity/order. Actual crown-query source per arm; unchanged crownBoom instrumented only to count core tests. Full native camera state and computed booms must match; final native Grade/post pixels compared. No hardware timing claim.';
 const a=report.rows.before,b=report.rows.after;
 report.pass=report.crowns>0&&a.nativeListsMatch&&a.nativeCameraMatches&&b.nativeCameraMatches&&a.boomSha256===b.boomSha256&&b.returnedCrowns<a.returnedCrowns&&b.coreTests<a.coreTests&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
