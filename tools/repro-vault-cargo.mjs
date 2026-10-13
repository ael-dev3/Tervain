import fs from 'node:fs';
import assert from 'node:assert/strict';
const {openPage}=await import(process.env.CDP_DRIVER ?? './cdp.mjs');
const url=process.argv[2];const output=process.argv[3];const expect=process.argv[4];
if(!url||!output||!['before','after'].includes(expect))throw new Error('Usage: node tools/repro-vault-cargo.mjs URL OUTPUT_PREFIX before|after');
const page=await openPage(url,{w:640,h:360,flags:['--use-gl=angle','--use-angle=swiftshader'],requestTimeoutMs:360000,...(process.env.REPRO_INIT_FILE?{init:fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8')}:{})});
try{
 let ready=false;for(let i=0;i<1200;i++){const state=await page.eval('return {url:location.href,title:document.title,mode:window.tervain?.mode,build:document.querySelector(".menu-build")?.textContent};');if(i%80===0)console.log(JSON.stringify(state));if(await page.eval('return window.tervain?.worldBuildFailed === true')){console.log(JSON.stringify(page.console()));throw new Error('Game world failed to load');}if(state.mode==='play'){ready=true;break;}if(state.url.startsWith('chrome-error:'))throw new Error('Browser could not load verified live origin');await page.wait(250);}if(!ready){console.log(JSON.stringify(page.console()));throw new Error('Live game did not become ready');}
 const report=await page.eval(`const T=window.tervain,P=T.player,phys=T.world.physics,input=T.input,scene=T.world.scene,cam=T.cam.camera;T.step=()=>{};T.render=()=>{};
 const originalProps=phys.snapshot(),crate=phys.props.find(p=>p.spec.kind==='crate'),rows=[],captures=[];
 const key=(code,type)=>window.dispatchEvent(new KeyboardEvent(type,{code,key:code==='Space'?' ':code==='ShiftLeft'?'Shift':'w',bubbles:true}));
 const tick=ctx=>{phys.beginCharacter(P,1/60);P.update(1/60,ctx);phys.step(1/60,P,T.cam.yaw,T.cam.pitch);input.endFrame();};
 const supply=T.world.modules.find(m=>m.name==='physical supplies')?.module;
 for(const index of [0,2,4])for(const side of [-1,1])for(const sprint of [false,true])for(const angle of [-75,-45,0,45,75]){
  phys.restore(originalProps);input.releaseAll();P.stamina=100;P.exhausted=false;
  const c=T.world.colliders.withId('fence')[index],cos=Math.cos(c.yaw),sin=Math.sin(c.yaw),normalYaw=Math.atan2(-side*cos,side*sin),yaw=normalYaw+angle*Math.PI/180,normal=side*(c.hw+1.6),x=c.x+normal*cos,z=c.z-normal*sin;
  P.setPosition(x,z,yaw,T.world.terrain);T.cam.yaw=yaw;const ctx=T.playerContext(true);key(T.settings.bindings.forward[0],'keydown');if(sprint)key(T.settings.bindings.sprint[0],'keydown');
  for(let i=0;i<20;i++)tick(ctx);const before={x:P.x,y:P.y,z:P.z,grounded:P.grounded,speed:Math.hypot(P.vx,P.vz),stamina:P.stamina};key(T.settings.bindings.jump[0],'keydown');tick(ctx);key(T.settings.bindings.jump[0],'keyup');const accepted=!!P.vault,landing=P.vault?.to;
  input.releaseAll();for(let i=0;i<120;i++)tick(ctx);rows.push({index,side,sprint,angle,before,accepted,landing,final:{x:P.x,y:P.y,z:P.z,grounded:P.grounded}});
 }
 const c=T.world.colliders.withId('fence')[0],cos=Math.cos(c.yaw),sin=Math.sin(c.yaw),side=1,yaw=Math.atan2(-side*cos,side*sin),normal=side*(c.hw+.65),x=c.x+normal*cos,z=c.z-normal*sin;
 const obstacle=[];
 for(const kind of ['absent','landing','nearby']){
  phys.restore(originalProps);input.releaseAll();P.stamina=100;P.exhausted=false;P.setPosition(x,z,yaw,T.world.terrain);T.cam.yaw=yaw;const ctx=T.playerContext(true),planned=P.fenceVault(ctx);if(!planned)throw new Error('Controlled field approach has no vault');
  if(kind!=='absent'){const poses=phys.snapshot(),pose=poses.find(p=>p.id===crate.spec.id);pose.position={x:planned.to.x+(kind==='nearby'?2*sin:0),y:planned.to.y+crate.spec.height/2+.01,z:planned.to.z+(kind==='nearby'?2*cos:0)};pose.rotation={x:0,y:0,z:0,w:1};phys.restore(poses);}
  key(T.settings.bindings.jump[0],'keydown');tick(ctx);key(T.settings.bindings.jump[0],'keyup');const accepted=!!P.vault,frames=[];let minDistance=Infinity;
  for(let i=0;i<120;i++){tick(ctx);const hit=crate.collider.contactShape(phys.characterCollider.shape,{x:P.x,y:P.y+.975,z:P.z},{x:0,y:0,z:0,w:1},0),distance=hit?.distance??null;if(distance!==null)minDistance=Math.min(minDistance,distance);frames.push({i,x:P.x,y:P.y,z:P.z,vault:!!P.vault,distance});
   if(kind==='landing'&&(i===34||distance!==null&&distance<-.02&&captures.filter(c=>c.kind===kind).every(c=>distance<c.distance))){supply?.update();cam.position.set(P.x-3,P.y+2.5,P.z+4);cam.lookAt(P.x,P.y+.8,P.z);cam.updateMatrixWorld(true);T.renderWorld();captures.splice(0,captures.length,{kind,i,distance,image:T.renderer.domElement.toDataURL('image/png')});}
  }
  obstacle.push({kind,accepted,minDistance:Number.isFinite(minDistance)?minDistance:null,deepFrames:frames.filter(f=>f.distance!==null&&f.distance<-.02).length,frames});
 }
 return {build:document.querySelector('.menu-build')?.textContent,nativeHero:!!P.rig.hero,scope:'Compiled build; native controller/keyboard input/field colliders/rigid bodies at fixed 60 Hz. No hardware timing claim.',rows,obstacle,captures};`);
 for(const [i,capture]of report.captures.entries()){fs.writeFileSync(output+'-'+i+'.png',Buffer.from(capture.image.split(',')[1],'base64'));delete capture.image;}
 fs.writeFileSync(output+'.json',JSON.stringify(report,null,2));assert.equal(report.nativeHero,true);assert.equal(report.rows.length,60);assert.equal(report.rows.filter(r=>r.accepted).length,60);
 const landing=report.obstacle.find(r=>r.kind==='landing');assert.equal(landing.accepted,expect==='before');
 if(expect==='before')assert.ok(landing.minDistance<-.3);else assert.equal(landing.deepFrames,0);
 for(const kind of ['absent','nearby']){const r=report.obstacle.find(r=>r.kind===kind);assert.equal(r.accepted,true);assert.equal(r.deepFrames,0);}
 console.log(JSON.stringify({build:report.build,nativeHero:report.nativeHero,cases:report.rows.length,accepted:report.rows.filter(r=>r.accepted).length,failures:report.rows.filter(r=>!r.accepted),obstacles:report.obstacle.map(({kind,accepted,minDistance,deepFrames})=>({kind,accepted,minDistance,deepFrames})),captures:report.captures}));
}finally{page.close();}
