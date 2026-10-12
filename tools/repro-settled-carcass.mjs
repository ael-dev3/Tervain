#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).flatMap((arg,i,all)=>arg.startsWith('--')?[[arg.slice(2),all[i+1]]]:[]));
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const url=new URL(args.url??'http://127.0.0.1:4173/');
for(const[key,value]of Object.entries({shot:'1',quality:'low',place:'rillford',hud:'0'}))url.searchParams.set(key,value);
const out=args.out??'settled-carcass-proof';fs.mkdirSync(out,{recursive:true});
let page;
try{
  page=await openPage(url.href,{w:640,h:360,flags:['--use-gl=angle','--use-angle=swiftshader'],requestTimeoutMs:240000});
  let ready=false;
  for(let i=0;i<400;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}
  if(!ready)throw new Error('Build did not become ready');
  const report=await page.eval(`const T=window.tervain;T._proofRender=T.render;T.render=()=>{};await T.world.arrived;T.step=()=>{};
    const animals=T.world.animals,target=animals.snapshot().find(a=>a.species==='tiger');
    if(!target)throw new Error('Delivered tiger missing');
    const record={status:'dead',bodyHits:2,headshot:false,position:{x:target.x,y:target.y,z:target.z},yaw:target.yaw,atClock:T.game.state.clock};
    T.game.state.hunting={...T.game.state.hunting,tiger:record};animals.syncHunting(T.game.state.hunting,true);
    const focus=T.player.group.position.clone().set(target.x+2,target.y,target.z);
    const frame={focus,quality:'low',reducedMotion:false,wildlifeActive:true,nightness:0};
    let root;animals.group.traverse(o=>{if(o.name===('tiger / '+target.id))root=o;});if(!root)throw new Error('Tiger root missing');
    let settled=false;
    for(let i=0;i<120;i++){animals.update(1/60,frame);if(animals.skinningFrame('tiger',focus)?.ready){settled=true;break;}}
    if(!settled)throw new Error('Carcass support scan did not complete');
    const skeletons=new Set();root.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});
    const pose=()=>JSON.stringify({position:root.position.toArray(),rotation:root.quaternion.toArray(),bones:[...skeletons].flatMap(s=>s.bones.map(b=>[...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray()]))});
    const contact=()=>JSON.stringify(animals.contacts.find(c=>c.id===('animal:'+target.id)));
    const beforePose=pose(),beforeContact=contact(), originals=new Map();let updates=0;
    for(const skeleton of skeletons){originals.set(skeleton,skeleton.update);skeleton.update=function(){updates++;return originals.get(this).call(this);};}
    try{for(let i=0;i<120;i++)animals.update(1/60,frame);}finally{for(const[skeleton,update]of originals)skeleton.update=update;}
    const observations={animalCount:animals.snapshot().length,frames:120,skeletonUpdates:updates,poseUnchanged:pose()===beforePose,contactUnchanged:contact()===beforeContact,ready:animals.skinningFrame('tiger',focus)?.ready===true};
    T.cam.manual=true;T.cam.camera.position.set(root.position.x+3,root.position.y+1.8,root.position.z+3);T.cam.camera.lookAt(root.position.x,root.position.y+.3,root.position.z);T.lastFrameDt=1/60;T._proofRender.call(T);
    const version=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());
    return {...observations,build:{version:version.version,revision:version.revision},fixture:'actual delivered tiger corpse, frozen diagnostic simulation'};`);
  report.pass=report.animalCount===19&&report.ready&&report.poseUnchanged&&report.contactUnchanged&&(args.expect==='before'?report.skeletonUpdates===120:report.skeletonUpdates===0);
  await page.shot(path.join(out,'carcass.png'));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  if(!report.pass)process.exitCode=1;
}finally{page?.close();}
