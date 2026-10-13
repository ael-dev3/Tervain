#!/usr/bin/env node
/** Count history/set identities in the compiled mover collector while checking lifecycle outputs. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, values) => arg.startsWith('--') ? [[arg.slice(2), values[i + 1]]] : []));
const { openPage } = await import(args.driver ? pathToFileURL(path.resolve(args.driver)).href : './cdp.mjs');
const out = args.out ?? 'grass-history-proof'; fs.mkdirSync(out, { recursive: true });
const url = new URL(args.url ?? 'http://127.0.0.1:4173/');
for (const [key, value] of Object.entries({ shot: '1', place: 'rillford', quality: 'low', settle: '1', hud: '0' })) url.searchParams.set(key, value);
let page;
try {
  page = await openPage(url.href, { w: 640, h: 360, requestTimeoutMs: 240000 });
  let ready = false;
  for (let i = 0; i < 800; i++) { if (await page.eval('return window.tervain?.mode === "play";')) { ready = true; break; } await page.wait(250); }
  if (!ready) throw new Error('Game not ready');
  const report = await page.eval(`
    const T=window.tervain;T.render=()=>{};T.step=()=>{};const W=T.world;
    if(!W.grassMovers||!W.grassLast)throw new Error('Compiled mover collector unavailable');
    const actors=Array.from({length:5},(_,i)=>({id:'fixture-animal-'+i,active:true,x:i*2,z:10+i*2,radius:.2+i*.1}));
    Object.defineProperty(W.animals,'physicalActors',{configurable:true,get:()=>actors});W.physics.motions=()=>[];W.grassPeople=[];W.grassLast.clear();
    const histories=new Set(),seenSets=new Set(),add=Set.prototype.add,snapshots=[];
    Set.prototype.add=function(value){if(typeof value==='string'&&value.startsWith('fixture-animal-'))add.call(seenSets,this);return add.call(this,value);};
    try{
      for(let frame=0;frame<120;frame++){
        for(const actor of actors){actor.x+=.02;actor.z+=.01;}
        actors[3].active=frame<30||frame>=40;if(frame===70)actors[2].x+=100;
        const movers=W.grassMovers(frame===20?0:1/60);
        for(const history of W.grassLast.values())histories.add(history);
        const saved=JSON.parse(JSON.stringify({movers,history:Array.from(W.grassLast)}));snapshots.push(saved);
        if(frame>=30&&frame<40&&W.grassLast.has(actors[3].id))throw new Error('Inactive actor history retained');
        if(frame===40&&movers.find(m=>m.radius===.625)?.vx!==0)throw new Error('Reappearing actor velocity not reset');
        if(frame===70&&movers[2].vx!==0)throw new Error('Teleport velocity not suppressed');
      }
    }finally{Set.prototype.add=add;}
    const text=JSON.stringify(snapshots),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),byte=>byte.toString(16).padStart(2,'0')).join('');
    return {schema:1,calls:120,fixtureActors:5,historyIdentities:histories.size,seenSetIdentities:seenSets.size,snapshotHash:hash,lifecycleAssertions:true,scope:'Actual compiled mover collector on controlled actor inputs; history and seen-set identities, not all allocations or hardware timings. Algorithm is shared across presets; this CPU-only fixture uses Low for startup.'};
  `);
  report.build=await page.eval('return fetch(new URL("version.json",document.baseURI)).then(r=>r.json());');
  report.pass=args.expect==='fresh'?report.historyIdentities===590&&report.seenSetIdentities===120:report.historyIdentities===6&&report.seenSetIdentities===1;
  if(args.baseline){const before=JSON.parse(fs.readFileSync(args.baseline,'utf8'));report.outputMatchesBaseline=report.snapshotHash===before.snapshotHash;report.pass&&=report.outputMatchesBaseline;}
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
} finally {page?.close();}
