import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'trample-bounds-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/grass/trample.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/grass/trample.ts','utf8')},modules={three:"export * from 'three';"};
for(const mode of ['before','after'])modules[mode]=(await transformWithOxc(sources[mode].replace("from '../skyState'","from '/src/presentation/skyState.ts'"),'trample.ts')).code;
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true},plugins:[{name:'trample-proof',resolveId(id){if(id.startsWith('/@trample-'))return '\0'+id;},load(id){if(id.startsWith('\0/@trample-'))return modules[id.slice('\0/@trample-'.length)];}}]});
let page;
try {await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port,url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');url.searchParams.set('motion','1');
page=await liveProofPage(url.href,{quality:'low',hour:11});
const r=await page.eval(`const T=window.tervain,R=T.renderer,render=R.render,snapshots=[];
R.render=function(s,c){const m=s.children[0]?.material,u=m?.uniforms;if(u?.uMoverCount&&u?.uField&&u?.uKeep){const count=u.uMoverCount.value; snapshots.push({field:u.uField.value.toArray(),size:R.getRenderTarget().width,fragment:m.fragmentShader,stamps:u.uMovers.value.slice(0,count).map((v,i)=>({x:v.x,z:v.y,radius:v.z,weight:v.w,vx:u.uMoverVel.value[i].x,vz:u.uMoverVel.value[i].y}))});}return render.call(this,s,c);};
try{T.world.prepareGrass(R,1/30);}finally{R.render=render;}
if(!snapshots.length)throw Error('No native trample pass; motion must be enabled');const snapshot=snapshots[0],THREE=await import(${JSON.stringify(origin)}+'/@trample-three');
const hash=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(v=>v.toString(16).padStart(2,'0')).join('');
const [x,z,extent]=snapshot.field,size=snapshot.size,oldTarget=R.getRenderTarget(),clear=new THREE.Color();R.getClearColor(clear);const clearAlpha=R.getClearAlpha(),results={};R.setClearColor(0,0);
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,0,2],2));
const copyMaterial=new THREE.ShaderMaterial({uniforms:{tSource:{value:null},preview:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D tSource;uniform float preview;varying vec2 vUv;void main(){vec4 s=texture2D(tSource,vUv);gl_FragColor=preview>0.5?vec4(0.5+0.5*s.xy,s.z,1.):s;}',depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.NoBlending});
const copyScene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1),quad=new THREE.Mesh(geometry,copyMaterial);quad.frustumCulled=false;copyScene.add(quad);
const readTarget=new THREE.WebGLRenderTarget(size,size,{type:THREE.FloatType,format:THREE.RGBAFormat,depthBuffer:false,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,colorSpace:THREE.NoColorSpace});
try{for(const mode of ['before','after']){const {GrassTrample}=await import(${JSON.stringify(origin)}+'/@trample-'+mode),field=new GrassTrample(size,extent,{x:x+extent/2,z:z+extent/2}),frames=[];let image;
try{if(field.stepMaterial.fragmentShader!==snapshot.fragment)throw Error('Native shader differs from source baseline');field.warm(R);field.setMovers(snapshot.stamps);
for(let i=0;i<8;i++){let submitted=null,draws=0,triangles=0;R.render=function(s,c){const u=s.children[0]?.material?.uniforms;if(u?.uMoverCount&&u?.uField&&u?.uKeep)submitted=u.uMoverCount.value;const oldDraws=R.info.render.calls,oldTris=R.info.render.triangles,autoReset=R.info.autoReset;const result=render.call(this,s,c);draws+=R.info.render.calls-(autoReset?0:oldDraws);triangles+=R.info.render.triangles-(autoReset?0:oldTris);return result;};try{field.update(R,x+extent/2,z+extent/2,1/30);}finally{R.render=render;}
copyMaterial.uniforms.tSource.value=field.uniforms.tTrample.value;copyMaterial.uniforms.preview.value=0;R.setRenderTarget(readTarget);R.render(copyScene,camera);const pixels=new Float32Array(size*size*4);R.readRenderTargetPixels(readTarget,0,0,size,size,pixels);if(!pixels.every(Number.isFinite))throw Error('Nonfinite field');const nonzero=pixels.filter((v,j)=>j%4!==3&&Math.abs(v)>.001).length;
frames.push({i,submitted,draws,triangles,nonzero,stateSha256:await hash(pixels.buffer),glError:R.getContext().getError()});}
copyMaterial.uniforms.preview.value=1;R.setRenderTarget(null);R.render(copyScene,camera);image=R.domElement.toDataURL('image/png');results[mode]={frames,image,fieldTextures:2,fieldTexturePayloadBytes:size*size*4*2*2};
}finally{field.dispose();}}
}finally{R.render=render;R.setClearColor(clear,clearAlpha);R.setRenderTarget(oldTarget);geometry.dispose();copyMaterial.dispose();readTarget.dispose();}
const outside=snapshot.stamps.filter(m=>m.x+m.radius<x||m.x-m.radius>x+extent||m.z+m.radius<z||m.z-m.radius>z+extent).length;
delete snapshot.fragment;return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),motionEnabled:!T.settings.reducedMotion,snapshot,outside,results};`);
for(const mode of ['before','after']){fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(r.results[mode].image.split(',')[1],'base64'));delete r.results[mode].image;}
const rgb=await Promise.all(['before','after'].map(mode=>sharp(path.join(out,mode+'.png')).removeAlpha().raw().toBuffer()));
r.identicalPixels=rgb[0].equals(rgb[1]);r.identicalFieldStates=r.results.before.frames.every((a,i)=>a.stateSha256===r.results.after.frames[i].stateSha256);r.sourceSha256=createHash('sha256').update(sources.after).digest('hex');r.scope='Published native motion-enabled Low trample uniform snapshot replayed through both actual source classes in the same software-WebGL renderer. Fresh black-cleared fields; eight steps, full float field readback and diagnostic push/flattening previews. Field target memory is nominal RGBA16F payload only, excluding readback/preview targets and driver overhead. Not a candidate whole-world replay or hardware timing.';
r.pass=r.motionEnabled&&r.outside>0&&r.identicalPixels&&r.identicalFieldStates&&r.results.after.frames.every((b,i)=>b.submitted<r.results.before.frames[i].submitted&&b.draws===r.results.before.frames[i].draws&&b.triangles===r.results.before.frames[i].triangles&&b.nonzero>0&&b.glError===0)&&r.results.before.frames.every(a=>a.glError===0);
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({build:r.build,submittedBefore:r.results.before.frames[0].submitted,submittedAfter:r.results.after.frames[0].submitted,outside:r.outside,identicalFieldStates:r.identicalFieldStates,identicalPixels:r.identicalPixels,pass:r.pass}));if(!r.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
