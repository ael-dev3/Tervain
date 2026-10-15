import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-full-density-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','a65b17257:src/presentation/ground/tileStream.ts'],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':src/presentation/ground/tileStream.ts'],{encoding:'utf8'}):fs.readFileSync('src/presentation/ground/tileStream.ts','utf8')},modules={};
const noise=(await transformWithOxc(fs.readFileSync('src/world/noise.ts','utf8'),'noise.ts')).code.replace(/^export /gm,'');
for(const[mode,source]of Object.entries(sources)) {
 const query='    const q = Math.pow(1 - smoothstep(this.o.fadeStart, this.o.fadeEnd, d), this.o.power);';
 const read='      if (base[mid * 4 + 3]! < limit)';
 if(!source.includes(query)||!source.includes(read))throw Error('Rank-search instrumentation site missing');
 let instrumented=source.replace(query,query+' proof.queries++; if(q<=0)proof.zeroQueries++; if(q>=1)proof.fullQueries++;').replace(read,'      proof.rankReads++; if(q<=0)proof.zeroRankReads++; if(q>=1)proof.fullRankReads++;\n'+read);
 instrumented=instrumented.replace('base[(t.count - 1) * 4 + 3]!', '(proof.rankReads++, proof.fullRankReads++, proof.tailReads++, base[(t.count - 1) * 4 + 3]!)');
 const code=(await transformWithOxc(instrumented,'tileStream.ts')).code.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'');
 modules[mode]=noise+'\n'+code+'\nconst proof={queries:0,zeroQueries:0,rankReads:0,zeroRankReads:0,fullQueries:0,fullRankReads:0,tailReads:0};return {TileLayer,proof};';
}
let page;
try {
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,G=T.world.modules.find(m=>m.name==='groundcover').module,iterate=Array.prototype[Symbol.iterator];let layers;
Array.prototype[Symbol.iterator]=function(){if(this.length===2&&this[0]?.group?.name==='grass-near'&&this[1]?.group?.name==='grass-far')layers=[this[0],this[1]];return iterate.call(this);};
try{G.update(0,{camera:T.cam.camera,focus:T.player.group.position.clone(),reducedMotion:true});}finally{Array.prototype[Symbol.iterator]=iterate;}
if(!layers)throw Error('Native grass layers missing');
const models=Object.fromEntries(Object.entries(${JSON.stringify(modules)}).map(([k,v])=>[k,new Function(v)()]));
const originals=layers.map(l=>l.instanceCountAt),queries=[],snapshots=new Map();let frame=0;
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
try {
 layers.forEach((layer,index)=>{layer.instanceCountAt=function(tile,d){let snap=snapshots.get(tile);if(!snap||snap.tx!==tile.tx||snap.tz!==tile.tz){snap={tx:tile.tx,tz:tile.tz,count:tile.count,attrs:[{array:tile.attrs[0].array.slice(0,tile.count*4)}]};snapshots.set(tile,snap);}const n=originals[index].call(this,tile,d);queries.push({index,tile:snap,d,n,frame});return n;};});
 T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();
 for(frame=0;frame<120;frame++){
  const x=-180+12*frame/119,z=12+5*frame/119;T.cam.yaw=.8+frame*.025;
  T.cam.follow(1/60,x,T.world.terrain.groundAt(x,z),z,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
  G.prepare(T.renderer,0); // Start each update with the native per-frame reserve allowance; reduced motion skips GPU trample work.
  G.update(0,{camera:T.cam.camera,focus:T.player.group.position.clone(),reducedMotion:true});
 }
}finally{layers.forEach((l,i)=>l.instanceCountAt=originals[i]);}
if(!queries.length)throw Error('No native density queries');
// Synchronize the rest of the native world with the endpoint camera before capturing images.
T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
const rows={},images={};let control;
for(const mode of ['native','before','after']){
 const results=[],perFrame=[];
 for(const q of queries){const m=mode==='native'?originals[q.index]:models[mode].TileLayer.prototype.instanceCountAt;const n=m.call(layers[q.index],q.tile,q.d);if(n!==q.n)throw Error(mode+' count differs');results.push(n);perFrame[q.frame]=(perFrame[q.frame]??0)+1;}
 const serialized=JSON.stringify(results);if(mode==='native')control=serialized;
 rows[mode]={nativeCountsMatch:serialized===control,countsSha256:await hash(results),...(mode==='native'?{}:models[mode].proof)};
 T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
 rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;rows[mode].textureCount=T.renderer.info.memory.textures;
 images[mode]=T.renderer.domElement.toDataURL('image/png');
}
return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),updates:120,nativeQueries:queries.length,nonemptyQueries:queries.filter(q=>q.tile.count>0).length,rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(m=>sharp(path.join(out,m+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 const a=report.rows.before,b=report.rows.after;
 report.pass=report.nativeQueries>0&&report.nonemptyQueries>0&&Object.values(report.rows).every(r=>r.nativeCountsMatch)&&a.queries===report.nativeQueries&&b.queries===a.queries&&a.fullQueries>0&&a.fullRankReads>0&&b.fullQueries===a.fullQueries&&b.fullRankReads===b.tailReads&&b.tailReads>0&&b.rankReads<a.rankReads&&b.rankReads===a.rankReads-a.fullRankReads+b.fullRankReads&&report.identicalPixels;
 report.scope='Native published density calls captured during 120 turning grove updates; copied native rank buffers preserve recycled tile contents. Exact count replay and frozen endpoint image controls; not independent motion clips or hardware timing.';
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
