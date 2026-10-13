import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createServer,transformWithOxc} from 'vite';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const ref='0b45a36',out=args.out??'spray-draw-proof';fs.mkdirSync(out,{recursive:true});
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/water/splashes.ts`],{encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/water',p)}'`);
const html=`<!doctype html><html><body style="margin:0"><script type="module">
import * as THREE from 'three';import {Splashes} from '/src/presentation/water/splashes.ts';import {Splashes as Old} from '/@baseline-spray';
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(640,360);renderer.setClearColor(0x24303a);document.body.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(50,640/360,.1,100);camera.position.set(0,2,7);camera.lookAt(0,1,0);
const old=new Old(),next=new Splashes(),scene=new THREE.Scene(),rows=[],captures=[];
const pixels=()=>{const gl=renderer.getContext(),p=new Uint8Array(640*360*4);gl.readPixels(0,0,640,360,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
const draw=s=>{scene.add(s.points);renderer.info.reset();renderer.render(scene,camera);const result={calls:renderer.info.render.calls,points:renderer.info.render.points,pixels:pixels()};scene.remove(s.points);return result;};
let emptyPixels,visibleCaptureFrames=0;
let differences=0,attributeDifferences=0,beforeCalls=0,afterCalls=0,beforePoints=0,afterPoints=0;
for(let frame=0;frame<240;frame++){
 for(const s of [old,next]){
  if(frame===2)s.emit(0,1,0,2,1.5,.15);
  if(frame===60)s.emit(.5,1,0,24,2,.1);
  if(frame===100)for(let n=0;n<4;n++)s.emit((n-1.5)*.3,1,0,120,2,.08);
  if(frame===101)s.emit(-.5,1,0,120,2,.08);
  s.update(1/60);
 }
 for(const key of ['position','aSize','aFade']){const a=old.points.geometry.getAttribute(key).array,b=next.points.geometry.getAttribute(key).array;for(let i=0;i<a.length;i++)attributeDifferences+=Number(a[i]!==b[i]);}
 const a=draw(old),b=draw(next);let changed=0;for(let i=0;i<a.pixels.length;i++)changed+=Number(a.pixels[i]!==b.pixels[i]);differences+=changed;
 if(frame===0)emptyPixels=a.pixels;
 if([3,62,101].includes(frame)&&b.pixels.some((v,i)=>v!==emptyPixels[i]))visibleCaptureFrames++;
 beforeCalls+=a.calls;afterCalls+=b.calls;beforePoints+=a.points;afterPoints+=b.points;
 rows.push({frame,active:next.active,beforeCalls:a.calls,afterCalls:b.calls,beforePoints:a.points,afterPoints:b.points,changedChannels:changed});
 if([0,3,62,101,235].includes(frame)){draw(old);const before=renderer.domElement.toDataURL('image/png');draw(next);captures.push({frame,before,after:renderer.domElement.toDataURL('image/png')});}
}
const debug=renderer.getContext().getExtension('WEBGL_debug_renderer_info');const softwareWebGL=!!debug&&/SwiftShader/i.test(renderer.getContext().getParameter(debug.UNMASKED_RENDERER_WEBGL));
window.proof={schema:1,softwareWebGL,visibleCaptureFrames,baselineRef:'${ref}',renderer:renderer.getContext().getParameter(renderer.getContext().RENDERER),scope:'Native water spray shader in software WebGL, 240 deterministic frames; isolated draw cost, not Mac hardware frame time.',beforeCalls,afterCalls,beforePoints,afterPoints,attributeDifferences,changedChannels:differences,rows,captures,pass:softwareWebGL&&visibleCaptureFrames===3&&attributeDifferences===0&&differences===0&&afterCalls<beforeCalls&&afterPoints<beforePoints&&rows[0].afterCalls===0&&rows[235].afterCalls===0};document.title='READY';
</script></body></html>`;
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'fixture',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url==='/spray-proof'){res.setHeader('Content-Type','text/html');server.transformIndexHtml('/spray-proof',html).then(result=>res.end(result)).catch(error=>{res.statusCode=500;res.end(String(error));});}else next();});},resolveId(id){if(id==='/@baseline-spray')return '\0baseline-spray';},load(id){if(id==='\0baseline-spray')return baseline;}}],server:{port:0,host:'127.0.0.1',hmr:false,ws:false}});
let page;
try{
 await server.listen();const port=server.httpServer.address().port;
 const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
 page=await openPage(`http://127.0.0.1:${port}/spray-proof`,{w:640,h:360,flags:['--use-gl=angle','--use-angle=swiftshader']});
 let ready=false;for(let i=0;i<240;i++){if(await page.eval('return document.title === "READY";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Spray shader fixture did not finish');
 const report=await page.eval('return window.proof;');for(const capture of report.captures)for(const name of ['before','after'])fs.writeFileSync(path.join(out,`${capture.frame}-${name}.png`),Buffer.from(capture[name].split(',')[1],'base64'));delete report.captures;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
