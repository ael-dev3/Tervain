import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer, transformWithOxc } from 'vite';
const ref='9ab40b387',out=process.argv[2]??'arrow-resource-proof';fs.mkdirSync(out,{recursive:true});
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/huntingArrow.ts`],{encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
const html=`<!doctype html><html><body style="margin:0"><script type="module">
import * as THREE from 'three';import {HuntingArrows} from '/src/presentation/huntingArrow.ts';import {HuntingArrows as Old} from '/@baseline-arrow';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(640,360);renderer.setClearColor(0x24303a);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
const gl=renderer.getContext();let uploads=0;
const size=v=>typeof v==='number'?v:v?.byteLength??0;
const data=gl.bufferData.bind(gl),sub=gl.bufferSubData.bind(gl);
gl.bufferData=(target,value,...rest)=>{uploads+=size(value);return data(target,value,...rest);};
gl.bufferSubData=(target,offset,value,...rest)=>{uploads+=size(value);return sub(target,offset,value,...rest);};
const camera=new THREE.PerspectiveCamera(50,640/360,.1,100);camera.position.set(0,4,7);camera.lookAt(0,1.5,0);
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x456070,2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(3,7,2);sun.castShadow=true;sun.shadow.mapSize.set(512,512);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0x67765c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const old=new Old(),next=new HuntingArrows(),counts={before:{geometry:new Set(),materials:new Set(),uploads:0,draws:0,triangles:0,disposals:0},after:{geometry:new Set(),materials:new Set(),uploads:0,draws:0,triangles:0,disposals:0}},rows=[],captures=[];
const remember=(shot,state)=>shot.mesh.traverse(o=>{if(!o.isMesh)return;for(const [set,item]of [[state.geometry,o.geometry],[state.materials,o.material]])if(!set.has(item)){set.add(item);item.addEventListener('dispose',()=>state.disposals++);}});
const pixels=()=>{const p=new Uint8Array(640*360*4);gl.readPixels(0,0,640,360,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
const draw=(arrows,name)=>{scene.add(arrows.group);renderer.info.reset();const start=uploads;renderer.render(scene,camera);const result={uploads:uploads-start,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixels:pixels()};scene.remove(arrows.group);counts[name].uploads+=result.uploads;counts[name].draws+=result.draws;counts[name].triangles+=result.triangles;return result;};
renderer.render(scene,camera);const emptyPixels=pixels();
let changedChannels=0,poseDifferences=0,shots=0,visibleFrames=0;
for(let frame=0;frame<90;frame++){
 if(frame%15===0){old.clear();next.clear();}
 if(frame%3===0){shots++;for(const [name,a]of [['before',old],['after',next]]){const shot=a.launch(new THREE.Vector3((frame%15/3-2)*.6,2.5,-.8),new THREE.Vector3(.1,-.2,.8),8);remember(shot,counts[name]);}}
 for(const a of [old,next])a.update(1/60,()=>null);
 const poses=a=>a.group.children.map(o=>({position:o.position.toArray(),quaternion:o.quaternion.toArray(),children:o.children.map(c=>({position:c.position.toArray(),quaternion:c.quaternion.toArray(),scale:c.scale.toArray()}))}));
 poseDifferences+=Number(JSON.stringify(poses(old))!==JSON.stringify(poses(next)));
 const a=draw(old,'before'),b=draw(next,'after');if(b.pixels.some((v,i)=>v!==emptyPixels[i]))visibleFrames++;let changed=0;for(let i=0;i<a.pixels.length;i++)changed+=Number(a.pixels[i]!==b.pixels[i]);changedChannels+=changed;
 rows.push({frame,beforeUploads:a.uploads,afterUploads:b.uploads,beforeDraws:a.draws,afterDraws:b.draws,beforeTriangles:a.triangles,afterTriangles:b.triangles,changedChannels:changed});
 if([14,44,89].includes(frame)){draw(old,'before');const before=renderer.domElement.toDataURL('image/png');draw(next,'after');captures.push({frame,before,after:renderer.domElement.toDataURL('image/png')});}
}
const summary=s=>({geometries:s.geometry.size,materials:s.materials.size,uploadBytes:s.uploads,drawCalls:s.draws,triangles:s.triangles,disposals:s.disposals});
const before=summary(counts.before),after=summary(counts.after);old.clear();next.clear();const afterClearDisposals=counts.after.disposals;old.dispose();next.dispose();next.dispose();
const ext=gl.getExtension('WEBGL_debug_renderer_info');const softwareWebGL=!!ext&&/SwiftShader/i.test(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
window.proof={baselineRef:'${ref}',scope:'Native arrow geometry, patched lit materials and shadow passes in isolated SwiftShader renders. Repeated release/clear workload; not whole-game frame timing or proof of first-shot hitch removal.',softwareWebGL,shots,frames:90,visibleFrames,before,after,afterClearDisposals,afterDisposeDisposals:counts.after.disposals,changedChannels,poseDifferences,rows,captures,pass:softwareWebGL&&visibleFrames===90&&changedChannels===0&&poseDifferences===0&&after.geometries===5&&after.materials===3&&after.uploadBytes<before.uploadBytes&&afterClearDisposals===0&&counts.after.disposals===8&&after.drawCalls===before.drawCalls&&after.triangles===before.triangles};document.title='READY';
</script></body></html>`;
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'fixture',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url==='/arrow-proof'){res.setHeader('Content-Type','text/html');server.transformIndexHtml('/arrow-proof',html).then(result=>res.end(result)).catch(error=>{res.statusCode=500;res.end(String(error));});}else next();});},resolveId(id){if(id==='/@baseline-arrow')return '\0baseline-arrow';},load(id){if(id==='\0baseline-arrow')return baseline;}}],server:{port:0,host:'127.0.0.1',hmr:false,ws:false}});
let page;
try{await server.listen();const {openPage}=await import('./cdp.mjs');page=await openPage('http://127.0.0.1:'+server.httpServer.address().port+'/arrow-proof',{w:640,h:360,requestTimeoutMs:300000});
let ready=false;for(let i=0;i<240;i++){if(await page.eval('return document.title === "READY";')){ready=true;break;}await page.wait(250);}if(!ready){console.log(JSON.stringify(page.console()));throw new Error('Arrow resource proof did not finish');}
const report=await page.eval('return window.proof;');for(const capture of report.captures)for(const name of ['before','after'])fs.writeFileSync(path.join(out,capture.frame+'-'+name+'.png'),Buffer.from(capture[name].split(',')[1],'base64'));delete report.captures;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
