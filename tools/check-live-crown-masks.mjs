import fs from 'node:fs';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const output=args.out??'live-crown-mask-coverage.json';fs.rmSync(output,{force:true});
const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high'});
try {
 const report=await page.eval(`const T=window.tervain,forest=T.world.modules.find(m=>m.name==='forest').module,meshes=[];forest.group.traverse(o=>{if(o.isMesh)meshes.push(o)});const levels=[];for(let lod=0;lod<3;lod++){const targets=forest.canopyAuditTargets(lod);levels.push({lod,trees:targets.length,records:targets.map(t=>{const m=meshes.find(m=>m.geometry===t.leaves&&m.name.endsWith(':'+lod+':foliage'))??meshes.find(m=>m.geometry===t.leaves);return{label:t.label,species:t.species,sourceLod:t.lod??null,leafless:!t.leaves,alphaTest:m?.material?.alphaTest??null,cutoutAvailable:!!t.cutout}})});}return{expectedTrees:forest.counts?.trees??null,build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),levels};`);
 report.scope='Published forest native adapter and selected material readback. Rest-source mask availability only, not alpha connectivity or visual quality.';
 report.levels=report.levels.map(l=>({...l,masked:l.records.filter(r=>r.alphaTest>0).length,missingRequired:l.records.filter(r=>r.alphaTest>0&&!r.cutoutAvailable).length,unknownMaterial:l.records.filter(r=>!r.leafless&&r.alphaTest===null).length}));
 report.maskAvailabilityPass=report.levels.every(l=>Number.isInteger(report.expectedTrees)&&report.expectedTrees>0&&l.trees===report.expectedTrees&&l.unknownMaterial===0&&l.missingRequired===0);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');if(!report.maskAvailabilityPass)process.exitCode=1;console.log(JSON.stringify({build:report.build,levels:report.levels.map(({records,...l})=>l)}));
}finally{page.close();}
