#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).flatMap((arg,i,all)=>arg.startsWith('--')?[[arg.slice(2),all[i+1]]]:[]));
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const url=new URL(args.url??'http://127.0.0.1:4173/');
for(const[key,value]of Object.entries({shot:'1',quality:'low',place:'rillford',hud:'0'}))url.searchParams.set(key,value);
let page;
try{
  page=await openPage(url.href,{w:640,h:360,flags:['--use-gl=angle','--use-angle=swiftshader'],requestTimeoutMs:240000});
  for(let i=0;i<400;i++){if(await page.eval('return window.tervain?.mode === "play";'))break;await page.wait(250);}
  const report=await page.eval(`const T=window.tervain, render=T.render,step=T.step;
    try{
      T.render=()=>{};await T.world.arrived;T.step=()=>{};
      const animals=T.world.animals,skeletons=new Set();
      animals.group.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});
      const originals=new Map(), vector=T.player.group.position.clone(), direction=vector.clone().set(0,0,1);
      let updates=0,hits=0;
      for(const skeleton of skeletons){originals.set(skeleton,skeleton.update);skeleton.update=function(){updates++;return originals.get(this).call(this);};}
      let misses;
      try{vector.set(13000,300,13000);for(let i=0;i<120;i++)if(animals.traceArrow(vector,direction,.55))hits++;misses=updates;}
      finally{for(const[skeleton,update]of originals)skeleton.update=update;}
      const target=animals.snapshot().find(a=>a.species==='boar');
      if(!target)throw new Error('Missing delivered boar');
      let nearHits=0;
      // Scan exact mesh surfaces across the torso rather than guessing one model's muzzle height.
      for(const height of [.25,.4,.55,.7,.85,1]){
        vector.set(target.x,target.y+height,target.z-4);
        const hit=animals.traceArrow(vector,direction,8);if(hit && /^boar-/.test(hit.id) && Math.hypot(hit.position.x-target.x,hit.position.z-target.z)<.001)nearHits++;
      }
      const version=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());
      return {build:{version:version.version,revision:version.revision},animalCount:animals.snapshot().length,skeletonCount:skeletons.size,queries:120,distantHits:hits,distantSkeletonUpdates:misses,nearHits};
    }finally{T.render=render;T.step=step;}`);
  report.pass=report.animalCount===19&&report.skeletonCount>=19&&report.distantHits===0&&report.nearHits>0&&(args.expect==='before'?report.distantSkeletonUpdates>=120:report.distantSkeletonUpdates===0);
  fs.writeFileSync(args.out??'animal-ray-repro.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  if(!report.pass)process.exitCode=1;
}finally{page?.close();}
