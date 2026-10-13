#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
const ref='0b45a36',baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/animals/navigation.ts`],{encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/animals',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-nav',resolveId(id){if(id==='/@baseline-nav')return '\0baseline-nav';},load(id){if(id==='\0baseline-nav')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});
try {
 const before=await server.ssrLoadModule('/@baseline-nav'),after=await server.ssrLoadModule('/src/presentation/animals/navigation.ts'),{ANIMALS}=await server.ssrLoadModule('/src/presentation/animals/catalog.ts'),{BUILDINGS}=await server.ssrLoadModule('/src/world/layout.ts'),{Colliders}=await server.ssrLoadModule('/src/world/colliders.ts');
 const points=[];for(let z=-130;z<=130;z+=8)for(let x=-290;x<=130;x+=8)points.push({x,z});for(const b of BUILDINGS)for(const radius of [0,15-1e-7,15,15+1e-7,20-1e-7,20,20+1e-7])points.push({x:b.x+b.w/2+radius,z:b.z});
 const originalCos=Math.cos,originalSin=Math.sin;let trig=0;Math.cos=x=>{trig++;return originalCos(x);};Math.sin=x=>{trig++;return originalSin(x);};let oldFlags,newFlags,beforeChecks,afterChecks;try{oldFlags=ANIMALS.flatMap(d=>points.map(p=>before.animalHabitatAllowed(d,p)));beforeChecks=trig;trig=0;newFlags=ANIMALS.flatMap(d=>points.map(p=>after.animalHabitatAllowed(d,p)));afterChecks=trig;}finally{Math.cos=originalCos;Math.sin=originalSin;}
 let mismatches=0;oldFlags.forEach((flag,i)=>{mismatches+=Number(flag!==newFlags[i]);});
 const terrain={heightAt:()=>0,walkable:()=>true,carveAt:()=>0,seaDepth:()=>0,deckAt:()=>null},colliders=new Colliders();let placementsCompared=0,placementDifferences=0,successfulPlacements=0;
 const placement=(module,d)=>{try{return module.findAnimalSite(d,.8,terrain,colliders);}catch(e){return{error:e.message};}};
 for(const d of ANIMALS){placementsCompared++;const old=placement(before,d),now=placement(after,d);successfulPlacements+=Number(Number.isFinite(old.x));placementDifferences+=Number(JSON.stringify(old)!==JSON.stringify(now));}
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/presentation/animals/navigation.ts')).digest('hex'),scope:'Actual habitat validators on authored definitions and world/building-boundary samples; all trig calls during queries counted, one-time module work excluded. Actual placement control uses flat terrain/no scenery; not live frame time.',samples:oldFlags.length,buildings:BUILDINGS.length,beforeChecks,afterChecks,mismatches,placementsCompared,successfulPlacements,placementDifferences,pass:mismatches===0&&placementDifferences===0&&successfulPlacements>0&&afterChecks<beforeChecks};const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
