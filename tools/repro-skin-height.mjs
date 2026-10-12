#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).flatMap((arg,i,all)=>arg.startsWith('--')?[[arg.slice(2),all[i+1]]]:[]));
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[key,value]of Object.entries({shot:'1',quality:'low',place:'rillford',hud:'0'}))url.searchParams.set(key,value);
const out=args.out??'skin-height-proof';fs.mkdirSync(out,{recursive:true});let page;
try{
  page=await openPage(url.href,{w:640,h:360,flags:['--use-gl=angle','--use-angle=swiftshader']});
  let ready=false;for(let i=0;i<400;i++){if(await page.eval('return document.title === "READY";')){ready=true;break;}await page.wait(250);}
  if(!ready)throw new Error('Native journey not ready');
  const report=await page.eval(`const T=window.tervain;T.step=()=>{};T.render=()=>{};
    const Player=T.player.constructor,Game=T.game.constructor,Controller=T.hunting.constructor,Colliders=T.world.colliders.constructor,rig=T.player.rig;
    if(!rig.hero)throw new Error('Native hero missing');const rows=[];let photo;
    for(const offset of [-4,-2,0,2,4]){
      rig.hero.reset();const player=new Player(rig),game=new Game(),colliders=new Colliders(),ground=4+offset,noop=()=>{};
      const terrain={groundAt:()=>ground,heightAt:()=>ground,supportAt:()=>ground,walkable:()=>true,valleyRadius:()=>0,deckAt:()=>null,carveAt:()=>0,seaDepth:()=>0,slopeAt:()=>0};
      const input={move:()=>({x:0,y:0}),held:()=>false,pressed:()=>false,isDown:()=>false,label:a=>a,clearToggle(){},uiOpen:false};
      const audio={footstep:noop,swing:noop,hit:noop,hurt:noop,jump:noop,land:noop,dodge:noop,huntingSound:noop,stopHuntingSounds:noop};
      player.setPosition(-188,-61,0,terrain);game.setPlayerTransform(player.x,player.y,player.z,player.yaw);game.state.inventory.skinning_knife=1;
      game.state.hunting['bear-a']={status:'dead',bodyHits:2,headshot:false,position:{x:-188,y:4,z:-60},yaw:0,atClock:game.state.clock};
      let hudState;
      const world={scene:new T.world.scene.constructor(),physics:{holding:false,traceProjectile:()=>null},animals:{nearestCarcass:()=>({id:'bear-a',species:'bear',position:{x:-188,y:4,z:-60},yaw:0,distance:1}),skinningFrame:()=>({ready:true,target:{x:-188,y:4.4,z:-60},stance:{x:-188,y:4,z:-61},yaw:0}),syncHunting:noop}};
      const host={player,game,input,audio,world,settings:T.settings,cam:{camera:T.cam.camera,yaw:0,setAiming:noop},hud:{setHunting:value=>{hudState=value;},toast:noop}};
      const controller=new Controller(host,()=>true),ctx={terrain,input,audio,colliders,settings:T.settings,game,npcs:[],enemies:[],viewYaw:0,controllable:true,onHitEnemy:noop,onHurt:noop,onDeath:noop,onBoundary:noop};
      controller.updateHud();const canSkin=hudState.canSkin;controller.skin();const started=player.skinningProgress!==null;
      for(let i=0;i<20;i++){controller.controls(1/60,true);player.update(1/60,ctx);}
      if(offset===4){
        const scene=new T.world.scene.constructor();scene.add(player.group);T.world.scene.traverse(o=>{if(o.isLight){const light=o.clone();light.castShadow=false;scene.add(light);}});
        const camera=T.cam.camera.clone();camera.position.set(player.x+3,player.y+2,player.z+4);camera.lookAt(player.x,player.y+.9,player.z);T.renderer.setRenderTarget(null);T.renderer.render(scene,camera);
      }
      for(let i=20;i<220;i++){controller.controls(1/60,true);player.update(1/60,ctx);}
      rows.push({offset,canSkin,started,hide:game.state.inventory.animal_hide??0,status:game.state.hunting['bear-a'].status});
      controller.arrows.dispose();player.dispose();
    }
    const version=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),compiled=/v([0-9.]+) *· *([0-9a-f]+)/.exec(document.querySelector('.menu-build')?.textContent??'');
    if(!compiled||compiled[1]!==version.version||compiled[2]!==version.revision)throw new Error('Build artifact changed during repro');
    return {build:{version:version.version,revision:version.revision},fixture:'actual controller, domain and native player with ready-carcass/clear-line-of-sight I/O fixtures',rows};`);
  const before=args.expect==='before';report.pass=report.rows.length===5&&report.rows.every(row=>Math.abs(row.offset)>2?row.canSkin===before&&row.started===before&&row.hide===0&&row.status==='dead':row.canSkin&&row.started&&row.hide>0&&row.status==='skinned');
  await page.shot(path.join(out,'native-skinning.png'));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
