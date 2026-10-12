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
  page=await openPage(url.href,{w:640,h:360,flags:['--use-gl=angle','--use-angle=swiftshader']});
  let ready=false;
  for(let i=0;i<400;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}
  if(!ready)throw new Error('Build did not become ready');
  const report=await page.eval(`const T=window.tervain,Surface=T.world.terrain.rockSurfaces.constructor;
    const positions=new Float32Array(1800);for(let i=0;i<200;i++)positions.set([i*2,.2,0,i*2,.2,1,i*2+1,.2,0],i*9);
    let reads=0;const counted=new Proxy(positions,{get(target,key){if(typeof key==='string' && /^\\d+$/.test(key))reads++;return Reflect.get(target,key,target);}});
    const surface=new Surface();surface.register([{id:'fixture',positions:counted,indices:Uint32Array.from({length:600},(_,i)=>i),bounds:{minX:0,maxX:399,minY:.2,maxY:.2,minZ:0,maxZ:1}}]);reads=0;
    const height=surface.supportAt(.25,.25,.2),coordinateReads=reads;
    const rock=T.world.colliders.rockMeshes.find(rock=>rock.id.startsWith('source-rock-pile:'));
    if(!rock)throw new Error('Delivered rock geometry missing');
    const actual=new Surface();actual.register([rock]);const values=[];
    for(let z=0;z<20;z++)for(let x=0;x<20;x++)values.push(actual.supportAt(rock.bounds.minX+(rock.bounds.maxX-rock.bounds.minX)*x/19,rock.bounds.minZ+(rock.bounds.maxZ-rock.bounds.minZ)*z/19,rock.bounds.maxY));
    const bytes=new TextEncoder().encode(JSON.stringify(values)),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');
    const version=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());
    return {build:{version:version.version,revision:version.revision},fixtureTriangles:200,coordinateReads,supportHeight:height,source:{triangles:rock.indices.length/3,queries:400,hits:values.filter(value=>value!==null).length,heightSum:values.reduce((sum,value)=>sum+(value??0),0),digest}};`);
  report.pass=Math.abs(report.supportHeight-.2)<1e-6 && report.source.hits>0 && (args.expect==='before'?report.coordinateReads===1800:report.coordinateReads===9);
  if(args.baseline){const baseline=JSON.parse(fs.readFileSync(args.baseline,'utf8'));report.sameSourceResults=JSON.stringify(report.source)===JSON.stringify(baseline.source);report.pass&&=report.sameSourceResults;}
  fs.writeFileSync(args.out??'rock-support-repro.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  if(!report.pass)process.exitCode=1;
}finally{page?.close();}
