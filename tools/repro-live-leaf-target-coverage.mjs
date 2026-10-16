import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, transformWithOxc } from 'vite';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'leaf-target-coverage-proof';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const materialFile='src/presentation/foliage/foliageMaterial.ts',prepassFile='src/presentation/foliage/leafPrepass.ts',helperFile='src/presentation/foliage/leafTargetCoverage.ts';
const read=(file,ref)=>ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8',stdio:['ignore','pipe','ignore']}):fs.readFileSync(file,'utf8');
const sources={native:read(materialFile,'421d34b'),before:read(materialFile,'185537a9c'),after:read(materialFile,args['candidate-ref'])};
let helper;try{helper=read(helperFile,args['candidate-ref']);}catch{helper=null;}
const alpha=Object.fromEntries(Object.entries(sources).map(([mode,s])=>{const block=s.match(/const LEAF_ALPHA_TEST_GLSL =[^`]*`([\s\S]*?)`;/)?.[1];if(!block)throw Error('Leaf alpha patch missing');return[mode,block];}));
const modules={env:"export * as THREE from 'three';",helper:helper?(await transformWithOxc(helper,helperFile)).code:'export const installLeafTargetCoverage=null;'};
for(const mode of ['before','after'])modules[mode]=(await transformWithOxc(read(prepassFile,mode==='before'?'185537a9c':args['candidate-ref']),prepassFile)).code;
const cache=fs.mkdtempSync(path.join(tmpdir(),'leaf-target-proof-')),server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'leaf-target-proof',resolveId(id){if(id.startsWith('/@leaf-target-'))return '\0'+id;},load(id){if(id.startsWith('\0/@leaf-target-'))return modules[id.slice('\0/@leaf-target-'.length)];}}]});let page;
try{await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
 const{THREE}=await import(${JSON.stringify(origin)}+'/@leaf-target-env'),helper=await import(${JSON.stringify(origin)}+'/@leaf-target-helper'),prepass={};for(const mode of ['before','after'])prepass[mode]=await import(${JSON.stringify(origin)}+'/@leaf-target-'+mode);
 const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,target=F.canopyAuditTargets(0).find(t=>t.label==='tree:wild:40:42');if(!target?.leaves)throw Error('Native crown missing');let source;F.group.traverse(m=>{if(m.isInstancedMesh&&m.geometry===target.leaves)source=m;});if(!source?.material.alphaToCoverage)throw Error('Native coverage material missing');
 const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const alpha=${JSON.stringify(alpha)},w=640,h=360,R=T.renderer,oldTarget=R.getRenderTarget(),oldClear=R.getClearColor(new THREE.Color()).clone(),oldAlpha=R.getClearAlpha(),rows={},images={};
 const windowTarget=T.world.windowView.target,producerTargets={main:{samples:T.grade.target.samples},window:{samples:windowTarget.samples,cube:windowTarget.isWebGLCubeRenderTarget}};
 const p=target.matrix.elements,camera=new THREE.PerspectiveCamera(45,w/h,.1,200);camera.position.set(p[12]+14,p[13]+11,p[14]+9);camera.lookAt(p[12],p[13]+9,p[14]);camera.updateMatrixWorld(true);
 const geometry=target.leaves.clone();geometry.setAttribute('aDistanceCoverage',new THREE.InstancedBufferAttribute(new Float32Array([0,1]),2));
 const geometryHash=await hash({p:Array.from(target.leaves.getAttribute('position').array),index:Array.from(target.leaves.index.array)});
 try{for(const pipeline of ['direct','prepass']){rows[pipeline]={};for(const mode of ['native','before','after','reference']){
  const scene=new THREE.Scene(),material=source.material.clone(),hook=source.material.onBeforeCompile,mask={value:1},selected=mode==='reference'?'before':mode;
  material.onBeforeCompile=function(shader,renderer){hook.call(this,shader,renderer);if(!shader.fragmentShader.includes(alpha.native))throw Error('Native alpha patch differs');shader.fragmentShader=shader.fragmentShader.replace(alpha.native,alpha[selected]);shader.uniforms.uProofMask=mask;shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>'+String.fromCharCode(10)+'uniform float uProofMask;').replace('#include <opaque_fragment>','#include <opaque_fragment>'+String.fromCharCode(10)+'if(uProofMask>0.5)gl_FragColor=vec4(1.0);');};
  material.customProgramCacheKey=()=>source.material.customProgramCacheKey()+'|target-proof-'+mode;material.toneMapped=false;
  if(mode==='reference')material.alphaToCoverage=false;
  let coverage=null;if(mode==='after'&&helper.installLeafTargetCoverage)coverage=helper.installLeafTargetCoverage(material);
  const mesh=new THREE.InstancedMesh(geometry,material,1);mesh.frustumCulled=false;mesh.setMatrixAt(0,target.matrix);mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);
  const depth=pipeline==='prepass'?prepass[mode==='after'?'after':'before'].splitLeafPrepass(mesh):null;if(depth){depth.count=1;depth.visible=true;scene.add(depth);}
  scene.add(new THREE.AmbientLight(0xffffff,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(3,5,4);scene.add(light);
  const focus=source.material.userData.tvFoliage?.uFoliageFocus?.value,oldFocus=focus?.clone();if(focus)focus.w=0;
  const rt=new THREE.WebGLRenderTarget(w,h,{samples:0,type:THREE.UnsignedByteType,depthBuffer:true});rows[pipeline][mode]={};
  try{for(const [stage,samples]of (mode==='reference'?[['single',0]]:[['multi',4],['single',0],['multiAgain',4]])){
   if(rt.samples!==samples){rt.dispose();rt.samples=samples;}
   mask.value=1;R.setRenderTarget(rt);R.setClearColor(0,0);R.render(scene,camera);const data=new Uint8Array(w*h*4);R.readRenderTargetPixels(rt,0,0,w,h,data);let covered=0,fractional=0;for(let i=0;i<data.length;i+=4){if(data[i]>0)covered++;if(data[i]>0&&data[i]<255)fractional++;}
   if(covered<1000)throw Error('Empty crown capture');const gl=R.getContext();rows[pipeline][mode][stage]={targetSamples:rt.samples,readbackSamples:gl.getParameter(gl.SAMPLES),coveredPixels:covered,fractionalPixels:fractional,maskSha256:await hash(Array.from(data)),coverageUniform:coverage?.value??null};
   if(${args.images!=='0'}&&stage!=='multiAgain'){mask.value=0;R.setRenderTarget(null);R.setRenderTarget(rt);scene.background=new THREE.Color(0x8daac0);R.render(scene,camera);R.readRenderTargetPixels(rt,0,0,w,h,data);rows[pipeline][mode][stage].colourSha256=await hash(Array.from(data));images[pipeline+'-'+mode+'-'+stage]=Array.from(data);scene.background=null;}
  }}finally{if(focus&&oldFocus)focus.copy(oldFocus);rt.dispose();mesh.dispose();if(depth){depth.dispose();depth.material.dispose();}material.dispose();}
 }}}finally{R.setRenderTarget(oldTarget);R.setClearColor(oldClear,oldAlpha);geometry.dispose();}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),label:target.label,producerTargets,rows,images,geometryHash,geometryAfter:await hash({p:Array.from(target.leaves.getAttribute('position').array),index:Array.from(target.leaves.index.array)})};
 `);
 for(const[name,data]of Object.entries(report.images))await sharp(Buffer.from(data),{raw:{width:640,height:360,channels:4}}).flip().png().toFile(path.join(out,name+'.png'));delete report.images;
 report.sourceSha256=Object.fromEntries(Object.entries({...sources,helper:helper??''}).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 report.scope='Published native oak geometry, atlas and material hooks. Controlled High-style alpha-to-coverage materials on four/zero-sample targets, in direct and real split-depth pipelines; a reference disables alpha-to-coverage for the existing single-sample cutout. Target sequence 4→0→4 checks per-pass selection and depth-clone callbacks. Captures isolate one native crown rather than rebuilding a full High world or claiming hardware performance.';
 report.productionWiring=sources.after.includes('if (opts.leaf) installLeafTargetCoverage(material)')&&read(prepassFile,args['candidate-ref']).includes('depth.onBeforeRender = colour.onBeforeRender');
 report.pass=report.productionWiring&&!!helper&&report.geometryHash===report.geometryAfter&&Object.values(report.rows).every(r=>r.native.multi.maskSha256===r.before.multi.maskSha256&&r.native.single.maskSha256===r.before.single.maskSha256&&r.before.multi.maskSha256===r.after.multi.maskSha256&&r.before.multi.colourSha256===r.after.multi.colourSha256&&r.after.multi.maskSha256===r.after.multiAgain.maskSha256&&r.before.single.maskSha256!==r.reference.single.maskSha256&&r.after.single.maskSha256===r.reference.single.maskSha256&&r.after.single.coverageUniform===0&&r.after.multi.coverageUniform===1&&r.after.multiAgain.coverageUniform===1);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
