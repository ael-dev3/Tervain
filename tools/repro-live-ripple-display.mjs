import fs from 'node:fs';
import path from 'node:path';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'live-ripple-display-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');url.searchParams.set('motion','1');
const page=await liveProofPage(url.href,{quality:'medium',hour:11});
try{
 const r=await page.eval(`const T=window.tervain,f=T.world.water.ripples;if(!f)throw Error('Native ripple field unavailable');const render=T.renderer.render;let calls=0;T.renderer.render=function(...args){calls++;return render.apply(this,args)};const draws=[];try{f.update(T.renderer,5,9,1/60);for(let i=0;i<12;i++){const start=calls;f.update(T.renderer,5,9,1/120);draws.push(calls-start);}}finally{T.renderer.render=render;}return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),size:f.size,extent:f.extent,draws};`);
 r.scope='Published native ripple object, twelve directly driven 1/120 s updates at a fixed focus. Counts renderer calls; this is a solver-subtick repro, not a natural 60 Hz frame-time measurement.';
 r.expect=args.expect??'before';const low=r.expect==='after'?0:1;
 r.pass=r.draws.length===12&&r.draws.every((n,i)=>[low,2].includes(n)&&(i===0||n+r.draws[i-1]===low+2));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify(r));if(!r.pass)process.exitCode=1;
}finally{page.close();}
