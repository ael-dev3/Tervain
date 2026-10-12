#!/usr/bin/env node
import fs from 'node:fs';
import {openPage} from './cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',quality:'low',place:'rillford',hud:'1'}))url.searchParams.set(k,v);
let page;try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000});let ready=false;for(let i=0;i<600;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Journey not ready');
 const result=await page.eval(`const T=window.tervain;T.render=()=>{};await T.world.arrived;T.step=()=>{};T.overlay='none';T.worldPaused=false;T.game.state.inventory.hunting_bow=1;T.game.state.equippedWeapon='hunting_bow';T.game.state.inventory.arrow=0;T.player.state='free';T.player.swimming=false;T.player.mount=null;T.player.mountMove=null;T.world.physics.holding=null;
 document.querySelector('.toasts').replaceChildren();const pressed=T.input.pressed,down=T.input.isDown;T.input.pressed=a=>a==='attack';T.input.isDown=()=>false;
 try{T.hunting.controls(1/60,true);await new Promise(r=>setTimeout(r,1600));T.hunting.controls(1/60,true);T.hud.toast('Repro control message');T.hunting.controls(1/60,true);
 const toasts=[...document.querySelectorAll('.toasts .toast')],warnings=toasts.filter(el=>el.textContent.startsWith('Your quiver is empty.'));const build=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());return {build:{version:build.version,revision:build.revision},emptyWarnings:warnings.length,controlMessages:toasts.filter(el=>el.textContent==='Repro control message').length,arrows:T.game.state.inventory.arrow,shots:T.hunting.arrows.group.children.length};}finally{T.input.pressed=pressed;T.input.isDown=down;}`);
 await page.shot(args.shot??'quiver-toast.png');result.pass=result.emptyWarnings===(args.expect==='before'?3:1)&&result.controlMessages===1&&result.arrows===0&&result.shots===0;fs.writeFileSync(args.out??'quiver-toast.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));if(!result.pass)process.exitCode=1;
}finally{page?.close();}
