import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {openPage} from './cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'vault-end-post-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/player.ts',parent='a439113f2da59638dbfd6ac95e894699f5008275',sources={before:execFileSync('git',['show',parent+':'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')};
const ids=Object.fromEntries(['before','after'].map(mode=>[path.resolve('src/presentation/__vault-end-'+mode+'.ts'),sources[mode]]));
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'vault-end-proof',enforce:'pre',resolveId(id){if(id.startsWith('/src/presentation/__vault-end-'))return path.resolve(id.slice(1));if(id==='/@vault-end-rapier')return '\0vault-end-rapier';},load(id){if(ids[id])return ids[id];if(id==='\0vault-end-rapier')return "export {default} from '@dimforge/rapier3d-compat';";}}],server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},optimizeDeps:{include:['three','@dimforge/rapier3d-compat'],noDiscovery:true}});let page;
try{await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port,url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');for(const[k,v]of Object.entries({shot:'1',quality:'low',place:'rillford',settle:'1',hud:'0',hour:'11'}))url.searchParams.set(k,v);
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,...(process.env.REPRO_INIT_FILE?{init:fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8')}:{})});let ready=false;for(let i=0;i<1200;i++){if(await page.eval('return window.tervain?.mode==="play"&&document.title==="READY"')){ready=true;break;}if(await page.eval('return window.tervain?.worldBuildFailed===true'))throw Error('World failed');await page.wait(250);}assert(ready,'published world ready');
 const report=await page.eval(`
 const T=window.tervain,P=T.player,input=T.input,phys=T.world.physics;T.step=()=>{};T.render=()=>{};await T.world.arrived;T.lastFrameDt=0;
 const modules={};for(const mode of ['before','after'])modules[mode]=await import(${JSON.stringify(origin)}+'/src/presentation/__vault-end-'+mode+'.ts');const R=(await import(${JSON.stringify(origin)}+'/@vault-end-rapier')).default;await R.init();
 const original={fenceVault:P.fenceVault,stepVault:P.stepVault},poses=phys.snapshot(),rows=[],images={};
 const key=(code,type)=>window.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
 const tick=ctx=>{phys.beginCharacter(P,1/60);P.update(1/60,ctx);phys.step(1/60,P,T.cam.yaw,T.cam.pitch);input.endFrame();};
 try{for(const mode of ['live','before','after']){P.fenceVault=mode==='live'?original.fenceVault:modules[mode].Player.prototype.fenceVault;P.stepVault=mode==='live'?original.stepVault:modules[mode].Player.prototype.stepVault;
 for(const index of [0,3,4,6])for(const side of [-1,1])for(const sprint of [false,true])for(const inset of [.1,-.15]){
  phys.restore(poses);input.releaseAll();P.stamina=100;P.exhausted=false;const c=T.world.colliders.withId('fence')[index],cs=Math.cos(c.yaw),sn=Math.sin(c.yaw),nx=-side*cs,nz=side*sn,yaw=Math.atan2(nx,nz),lx=side*(c.hw+.65),lz=c.hd-inset,x=c.x+lx*cs+lz*sn,z=c.z-lx*sn+lz*cs;
  P.setPosition(x,z,yaw,T.world.terrain);T.cam.yaw=yaw;const ctx=T.playerContext(true);key(T.settings.bindings.forward[0],'keydown');if(sprint)key(T.settings.bindings.sprint[0],'keydown');for(let i=0;i<12;i++)tick(ctx);
  const atJump={x:P.x,y:P.y,z:P.z,grounded:P.grounded,speed:Math.hypot(P.vx,P.vz)};key(T.settings.bindings.jump[0],'keydown');tick(ctx);key(T.settings.bindings.jump[0],'keyup');const accepted=!!P.vault,planned=P.vault?JSON.parse(JSON.stringify(P.vault)):null;input.releaseAll();
  const minY=c.minY,top=c.maxY-.6,box=new R.Cuboid(c.hw,(top-minY)/2,c.hd),capsule=new R.Capsule(.975-.4,.4),rotation={x:0,y:Math.sin(c.yaw/2),z:0,w:Math.cos(c.yaw/2)},frames=[];let minDistance=Infinity;
  for(let frame=0;frame<120;frame++){tick(ctx);const hit=capsule.contactShape({x:P.x,y:P.y+.975,z:P.z},{x:0,y:0,z:0,w:1},box,{x:c.x,y:(minY+top)/2,z:c.z},rotation,0),distance=hit?.distance??null;if(distance!==null)minDistance=Math.min(minDistance,distance);frames.push({frame,x:P.x,y:P.y,z:P.z,vault:!!P.vault,distance});
   if(index===0&&side===1&&!sprint&&inset===.1&&[10,30,60].includes(frame)){const cam=T.cam.camera;cam.position.set(c.x+c.hd*sn+3,atJump.y+3,c.z+c.hd*cs+4);cam.lookAt(c.x+c.hd*sn,atJump.y+.8,c.z+c.hd*cs);cam.updateMatrixWorld(true);T.renderWorld();images[mode+'-'+frame]=T.renderer.domElement.toDataURL('image/png');}}
  rows.push({mode,index,side,sprint,inset,atJump,accepted,planned,across:side*((P.x-c.x)*cs-(P.z-c.z)*sn),grounded:P.grounded,minRailDistance:Number.isFinite(minDistance)?minDistance:null,penetratingFrames:frames.filter(f=>f.distance!==null&&f.distance<-.02).length,frames});
 }}return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),nativeHero:!!P.rig.hero,rows,images};
 }finally{input.releaseAll();phys.restore(poses);P.fenceVault=original.fenceVault;P.stepVault=original.stepVault;}
 `);
 for(const[name,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 report.summary=Object.fromEntries(['live','before','after'].map(mode=>{const rows=report.rows.filter(r=>r.mode===mode);return[mode,{cases:rows.length,accepted:rows.filter(r=>r.accepted).length,crossed:rows.filter(r=>r.across<0).length,grounded:rows.filter(r=>r.grounded).length,penetratingFrames:rows.reduce((n,r)=>n+r.penetratingFrames,0)}];}));
 report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([mode,s])=>[mode,createHash('sha256').update(s).digest('hex')]));report.scope='Native published player, keyboard bindings, field fences, terrain and physics at fixed 60 Hz. Live reproduces the unmodified controller; before/after swap only the planner and executor methods, sharing the queued rail-clearance arc fix. Native end-post geometry is checked against a capsule through Rapier. Software-rendered frames are evidence of the controlled crossing, not hardware FPS or total fence coverage.';
 const{live,before,after}=report.summary;report.pass=report.nativeHero&&live.cases===32&&live.accepted===0&&live.crossed===8&&before.accepted===0&&before.crossed===8&&after.accepted===32&&after.crossed===32&&after.grounded===32&&after.penetratingFrames===0;
 const trace=gzipSync(Buffer.from(JSON.stringify(report.rows.map(({mode,index,side,sprint,inset,frames})=>({mode,index,side,sprint,inset,frames})))));fs.writeFileSync(path.join(out,'frames.json.gz'),trace);report.frameTrace={file:'frames.json.gz',sha256:createHash('sha256').update(trace).digest('hex'),cases:report.rows.length,framesPerCase:120};for(const row of report.rows)delete row.frames;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build:report.build,summary:report.summary,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
