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
  const report=await page.eval(`const T=window.tervain, source=T.world.water.splashes;
    if(!source)throw new Error('Build has no spray implementation');
    const spray=new source.constructor(), attrs=Object.values(spray.points.geometry.attributes);
    const dirtyBytes=(before)=>attrs.reduce((sum,attribute,i)=>sum+(attribute.version-before[i])*attribute.array.byteLength,0);
    const versions=()=>attrs.map(attribute=>attribute.version);
    try{
      spray.update(0); const before=versions();
      for(let i=0;i<120;i++)spray.update(1/60);
      const idleUploadBytes=dirtyBytes(before);
      const emission=versions();spray.emit(0,1,0,2,1);spray.update(1/60);
      const emittedUploadBytes=dirtyBytes(emission), emittedVisible=Array.from(spray.points.geometry.getAttribute('aFade').array).some(value=>value>0);
      for(let i=0;i<240;i++)spray.update(.1);
      const cleared=Array.from(spray.points.geometry.getAttribute('aFade').array).every(value=>value===0), afterExpiry=versions();
      for(let i=0;i<120;i++)spray.update(1/60);
      const expiredIdleUploadBytes=dirtyBytes(afterExpiry);
      const version=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());
      return {build:{version:version.version,revision:version.revision},idleFrames:120,idleUploadBytes,emittedUploadBytes,emittedVisible,cleared,expiredIdleUploadBytes};
    }finally{spray.dispose();}`);
  const before=args.expect==='before';
  report.pass=report.emittedVisible&&report.cleared&&report.emittedUploadBytes===9600&&(before?report.idleUploadBytes===1152000&&report.expiredIdleUploadBytes===1152000:report.idleUploadBytes===0&&report.expiredIdleUploadBytes===0);
  fs.writeFileSync(args.out??'idle-spray-repro.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  if(!report.pass)process.exitCode=1;
}finally{page?.close();}
