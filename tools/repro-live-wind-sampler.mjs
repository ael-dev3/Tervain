import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'wind-sampler-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/grass/wind.ts'],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':src/presentation/grass/wind.ts'],{encoding:'utf8'}):fs.readFileSync('src/presentation/grass/wind.ts','utf8')},modules={};
for(const[mode,source]of Object.entries(sources)) {
 const start=source.indexOf('  gustAt(x: number, z: number): number {'),end=source.indexOf('\n  /** How hard',start);
 if(start<0||end<0)throw Error('Sampler instrumentation site missing');
 let body=source.slice(start,end).replace('number {','number { proof.queries++;');
 body=body.replace('    const at =','    proof.closures++; const at =').replaceAll('% n','% (proof.remainders++, n)');
 const code=(await transformWithOxc(source.slice(0,start)+body+source.slice(end),'wind.ts')).code.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'');
 modules[mode]=code+'\nconst proof={queries:0,closures:0,remainders:0};return {GrassWind,gustField,proof};';
}
let page;
try {
 const url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');url.searchParams.set('motion','1');
 page=await liveProofPage(url.href,{quality:'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,G=T.world.modules.find(m=>m.name==='groundcover').module,F=T.world.modules.find(m=>m.name==='forest').module,wind=G.wind;
if(T.settings.reducedMotion)throw Error('Native wind motion disabled');
const models=Object.fromEntries(Object.entries(${JSON.stringify(modules)}).map(([k,v])=>[k,new Function(v)()]));
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const texture=Array.from(wind.uniforms.tGust.value.image.data),textureSha256=await hash(texture);
for(const m of Object.values(models))if(await hash(Array.from(m.gustField()))!==textureSha256)throw Error('Native texture differs');
const original=wind.gustAt,queries=[],rows={},images={};let strikeAccepted=false;
try {
 wind.gustAt=function(x,z){const value=original.call(this,x,z),w=this.uniforms.uWindDir.value;queries.push([x,z,this.gustX,this.gustZ,w.z,w.w,value]);return value;};
 const candidates=T.world.colliders.all.filter(c=>c.kind==='circle'&&c.id?.startsWith('tree')).sort((a,b)=>Math.hypot(a.x+180,a.z-12)-Math.hypot(b.x+180,b.z-12));
 for(const c of candidates.slice(0,40)){for(const h of [.4,1.2,2]){if(F.strike(c.x,T.world.terrain.heightAt(c.x,c.z)+h,c.z,1,c.id)){strikeAccepted=true;break;}}if(strikeAccepted)break;}
 if(!strikeAccepted)throw Error('No native tree strike accepted');
 T.cam.wantDist=6.2;T.cam.yaw=0;T.cam.pitch=.32;T.cam.reset();
 for(let i=0;i<120;i++) {
  const x=-180+12*i/119,z=12+5*i/119;
  T.cam.yaw=i*.025;T.cam.follow(1/60,x,T.world.terrain.groundAt(x,z),z,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
  T.world.update(1/60,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
 }
 const final={x:wind.gustX,z:wind.gustZ,w:wind.uniforms.uWindDir.value.toArray()};
 if(!queries.length||!queries.every(q=>q.every(Number.isFinite)))throw Error('No finite native foliage wind query corpus');
 let control;
 for(const mode of ['native','before','after']) {
  let last;
  wind.gustAt=function(x,z){last=(mode==='native'?original:models[mode].GrassWind.prototype.gustAt).call(this,x,z);return last;};
  const values=[];
  for(const[x,z,gx,gz,steady,gust,expected]of queries){wind.gustX=gx;wind.gustZ=gz;wind.uniforms.uWindDir.value.z=steady;wind.uniforms.uWindDir.value.w=gust;const push=wind.pushAt(x,z);if(!Object.is(last,expected))throw Error(mode+' gust differs');values.push([last,push]);}
  const serialized=JSON.stringify(values);if(mode==='native')control=serialized;
  rows[mode]={nativeValuesMatch:serialized===control,valuesSha256:await hash(values),...(mode==='native'?{}:models[mode].proof)};
  wind.gustX=final.x;wind.gustZ=final.z;wind.uniforms.uWindDir.value.fromArray(final.w);T.lastFrameDt=0;
  T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
  rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;rows[mode].textureCount=T.renderer.info.memory.textures;
  images[mode]=T.renderer.domElement.toDataURL('image/png');
 }
}finally{wind.gustAt=original;}
return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),nativeQueries:queries.length,strikeAccepted,textureSha256,renderer:"SwiftShader",imageScope:"Frozen endpoint control; native motion correctness is checked by replaying captured gust/push values",rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(m=>sharp(path.join(out,m+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 report.pass=report.nativeQueries>0&&Object.values(report.rows).every(r=>r.nativeValuesMatch)&&report.rows.before.queries===report.nativeQueries&&report.rows.before.remainders===report.nativeQueries*16&&report.rows.after.queries===report.nativeQueries&&report.rows.after.remainders===0&&report.rows.after.closures===0&&report.identicalPixels;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
