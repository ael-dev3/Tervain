#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).flatMap((arg,i,all)=>arg.startsWith('--')?[[arg.slice(2),all[i+1]]]:[]));
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const url=new URL(args.url??'http://127.0.0.1:4173/');
for(const[key,value]of Object.entries({shot:'1',quality:'low',place:'rillford',hud:'0'}))url.searchParams.set(key,value);
const selected=args.case??'mount';if(!['mount','vault'].includes(selected))throw new Error('Select mount or vault');
const out=args.out??'player-contact-proof';fs.mkdirSync(out,{recursive:true});let page;
try{
  page=await openPage(url.href,{w:640,h:360,flags:['--use-gl=angle','--use-angle=swiftshader']});
  let ready=false;for(let i=0;i<400;i++){if(await page.eval('return document.title === "READY";')){ready=true;break;}await page.wait(250);}
  if(!ready)throw new Error('Native journey did not become ready');
  const report=await page.eval(`const T=window.tervain;T.step=()=>{};T.render=()=>{};
    const Player=T.player.constructor,Colliders=T.world.colliders.constructor,Game=T.game.constructor,rig=T.player.rig;
    if(!rig.hero)throw new Error('Native imported hero missing');
    const setup=(yaw=0,slope=0,sprint=false,approach=0)=>{
      rig.hero.reset(); const player=new Player(rig),colliders=new Colliders(),game=new Game();let pressed=false,moving=false;
      const ground=(x,z)=>slope*(x*Math.cos(yaw)-z*Math.sin(yaw));
      const terrain={groundAt:ground,heightAt:ground,supportAt:ground,walkable:()=>true,valleyRadius:()=>0,deckAt:()=>null,carveAt:()=>0,seaDepth:()=>0,slopeAt:()=>Math.abs(slope)};
      const input={move:()=>({x:0,y:moving?1:0}),held:a=>a==='sprint'&&sprint,pressed:a=>a==='jump'&&pressed,clearToggle(){},uiOpen:false};
      const noop=()=>{}, audio={footstep:noop,swing:noop,hit:noop,hurt:noop,jump:noop,land:noop,dodge:noop};
      const ctx={terrain,input,audio,colliders,settings:T.settings,game,npcs:[],enemies:[],viewYaw:Math.PI/2+yaw+approach,controllable:true,onHitEnemy:noop,onHurt:noop,onDeath:noop,onBoundary:noop};
      player.setPosition(0,0,Math.PI/2+yaw+approach,terrain);
      return {player,colliders,terrain,ctx,warm(){moving=true;for(let i=0;i<60;i++)player.update(1/60,ctx);player.x=player.z=player.y=0;player.grounded=true;rig.hero.reset();},jump(move=false){moving=move;pressed=true;player.update(1/60,ctx);pressed=false;},tick(){player.update(1/60,ctx);},stop(){moving=false;},dispose(){player.dispose();}};
    };
    const mount=[],vault=[];let photo;
    if(${selected==='mount'})for(const type of ['jump','vault']){
      const s=setup();if(type==='vault')s.colliders.box('fence',.8,0,.12,3,0,true,{minY:-.3,maxY:1.7});
      s.jump();const groundedAtRequest=s.player.grounded,wasVault=!!s.player.vault,initialHeight=s.player.y;
      const accepted=s.player.beginMount('1005232412',1.3,{x:2,y:0,z:0,yaw:0},s.ctx);
      for(let i=0;i<15;i++)s.tick();const heightAfter15=s.player.y;
      if(type==='jump')photo={player:s.player};
      mount.push({type,groundedAtRequest,wasVault,accepted,initialHeight,heightAfter15});
      s.dispose();
      const landed=setup();if(type==='vault')landed.colliders.box('fence',.8,0,.12,3,0,true,{minY:-.3,maxY:1.7});landed.jump();for(let i=0;i<90;i++)landed.tick();
      mount[mount.length-1].landed=landed.player.grounded;mount[mount.length-1].acceptedAfterLanding=landed.player.beginMount('1005232412',1.3,{x:2,y:0,z:0,yaw:0},landed.ctx);landed.dispose();
    }
    if(${selected==='vault'})for(const yaw of [0,Math.PI/4,Math.PI/2])for(const slope of [-.2,0,.2])for(const sprint of [false,true])for(const approach of [-180,-120,-90,-75,-60,-30,0,30,60,75,90,120,180].map(angle=>angle*Math.PI/180))for(const other of ['absent','active','inactive']){
      const s=setup(yaw,slope,sprint,approach);s.warm();const approachSpeed=Math.hypot(s.player.vx,s.player.vz),cos=Math.cos(yaw),sin=Math.sin(yaw);
      s.colliders.box('fence',.8*cos,-.8*sin,.12,3,yaw,true,{minY:-.3+.8*slope,maxY:1.7+.8*slope});
      if(other!=='absent')s.colliders.box('fence',.5*cos,-.5*sin,.05,3,yaw,other==='active',{minY:-.3+.5*slope,maxY:2+.5*slope});
      s.jump(true);const accepted=!!s.player.vault;
      vault.push({yawDegrees:yaw*180/Math.PI,slope,sprint,approachDegrees:Math.round(approach*180/Math.PI),other,accepted,approachSpeed});
      s.dispose();
    }
    // A separate native hero sample, since the shared rig is reset between controlled cases.
    const shown=setup();if(${selected==='mount'}){shown.jump();shown.player.beginMount('1005232412',1.3,{x:2,y:0,z:0,yaw:0},shown.ctx);for(let i=0;i<15;i++)shown.tick();}
    else{shown.colliders.box('fence',.8,0,.12,3,0,true,{minY:-.3,maxY:1.7});shown.colliders.box('fence',.5,0,.05,3,0,true,{minY:-.3,maxY:2});shown.jump();for(let i=0;i<5;i++)shown.tick();}
    const scene=new T.world.scene.constructor();scene.add(shown.player.group);
    T.world.scene.traverse(o=>{if(o.isLight){const light=o.clone();light.castShadow=false;scene.add(light);}});
    let template;T.world.scene.traverse(o=>{if(!template&&o.isMesh&&!o.isInstancedMesh&&!o.isSkinnedMesh&&o.geometry.getAttribute('position')?.array instanceof Float32Array)template=o;});
    if(${selected==='vault'}){
      const geometry=template.geometry.clone();for(const key of Object.keys(geometry.attributes))geometry.deleteAttribute(key);
      const Attribute=template.geometry.getAttribute('position').constructor;
      geometry.setAttribute('position',new Attribute(new Float32Array([-.5,-.5,-.5,.5,-.5,-.5,.5,.5,-.5,-.5,.5,-.5,-.5,-.5,.5,.5,-.5,.5,.5,.5,.5,-.5,.5,.5]),3));
      geometry.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5]);geometry.boundingBox=null;geometry.boundingSphere=null;
      for(const[x,width,height]of [[.8,.24,.7],[.5,.1,1]]){const mesh=new template.constructor(geometry);mesh.position.set(x,height/2,0);mesh.scale.set(width,height,6);scene.add(mesh);}
    }
    const camera=T.cam.camera.clone();camera.position.set(-3,3.5,5);camera.lookAt(.8,.8,0);T.renderer.setRenderTarget(null);T.renderer.render(scene,camera);
    const version=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());
    return {build:{version:version.version,revision:version.revision},fixture:'compiled player with native hero rig, deterministic terrain and colliders; input-driven updates',mount,vault};`);
  const before=args.expect==='before';
  report.pass=selected==='mount'?report.mount.length===2 && report.mount.every(c=>!c.groundedAtRequest&&c.accepted===before&&c.landed&&c.acceptedAfterLanding):report.vault.length===702 && report.vault.every(c=>c.accepted===(Math.abs(c.approachDegrees)<=75 ? (c.other==='active'?before:true) : false) && (c.sprint?c.approachSpeed>5 && c.approachSpeed<6.1:c.approachSpeed>1.5 && c.approachSpeed<1.8));
  report.selected=selected;await page.shot(path.join(out,'native-player.png'));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({selected,pass:report.pass,cases:report[selected].length}));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
