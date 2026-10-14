import fs from 'node:fs';import {pathToFileURL} from 'node:url';import {liveProofPage} from './live-proof-page.mjs';
export async function auditLiveCrowns(page,diagnostics) {
 return await page.eval(`const T=window.tervain,forest=T.world.modules.find(m=>m.name==='forest')?.module;if(!forest)throw new Error('No forest module');
 const {auditCanopies}=await import(${JSON.stringify(diagnostics+'/src/diagnostics/canopyAudit.ts')});
 const {leafCutoutSampler}=await import(${JSON.stringify(diagnostics+'/src/presentation/leafSurfaceSites.ts')});
 const {floraLodWeightsFor,FLORA_LOD_BANDS,SHRUB_LOD_BANDS}=await import(${JSON.stringify(diagnostics+'/src/presentation/floraPopulation.ts')});
 const roots=forest.canopyAuditTargets(0),meshes=forest.group.children.filter(o=>o.isInstancedMesh&&/:([012]):(wood|foliage)$/.test(o.name));
 const families=new Map();for(const t of roots){const near=meshes.find(m=>m.geometry===t.wood&&m.name.endsWith(':0:wood'));if(!near)throw new Error('Near geometry missing');const start=meshes.indexOf(near);let end=meshes.findIndex((m,i)=>i>start&&m.name.endsWith(':0:wood'));if(end<0)end=meshes.length;families.set(t.label,meshes.slice(start,end));}
 const levels=[],missing=[];
 for(let lod=0;lod<3;lod++){
 const native=forest.canopyAuditTargets(lod),nativeLod=native.every(t=>t.lod===lod),targets=roots.map((root,i)=>{const family=families.get(root.label),wood=family.find(m=>m.name.endsWith(':'+lod+':wood')),leaf=family.find(m=>m.name.endsWith(':'+lod+':foliage'));
 if(!wood){missing.push({label:root.label,lod,leavesPresent:!!leaf});return null;}
 const prefix=wood.name.split(':')[0],species=nativeLod?native.find(t=>t.label===root.label)?.species:prefix==='solitary-pine'?'pine':prefix;
 return{...root,...(nativeLod?native.find(t=>t.label===root.label):{}),lod,species,kind:prefix,wood:wood.geometry,leaves:leaf?.geometry??null,cutout:leaf?leafCutoutSampler(leaf.material):null,cutoutRequired:(leaf?.material?.alphaTest??0)>0};}).filter(Boolean);
 const audit=auditCanopies(targets,{lod,alpha:true,gap:.75,woodReach:1.5,maxOperations:80000000});levels.push({lod,...audit,expectedTrees:roots.length,coveredTrees:targets.length});}
 const snapshot=[],attributes=new Map();forest.group.traverse(o=>{snapshot.push({o,visible:o.visible,count:o.count,range:o.geometry?{...o.geometry.drawRange}:null});for(const a of [o.instanceMatrix,o.instanceColor,...Object.values(o.geometry?.attributes??{})])if(a?.array&&!attributes.has(a))attributes.set(a,{array:a.array.slice(),version:a.version,ranges:a.updateRanges?.map(r=>({...r}))});});
 const camera=T.cam.camera.clone(),focus=T.player.group.position.clone(),transitionRows=[];
 const matrix=roots[0].matrix.clone(),position=focus.clone(),centre=focus.clone(),eye=focus.clone();
 const interval=(mesh,root)=>{if(!mesh)return null;const coverage=mesh.geometry.getAttribute('aDistanceCoverage');if(!coverage)return null;mesh.updateWorldMatrix(true,false);for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);position.setFromMatrixPosition(matrix);const e=root.matrix.elements;if(Math.abs(position.x-e[12])<.0001&&Math.abs(position.y-e[13])<.0001&&Math.abs(position.z-e[14])<.0001)return[coverage.getX(i),coverage.getY(i)];}return null;};
 try{for(const root of roots){const family=families.get(root.label),species=levels[0].trees.find(t=>t.label===root.label)?.species??'unknown';root.wood.computeBoundingBox();centre.copy(root.wood.boundingBox.getCenter(position)).applyMatrix4(root.matrix);
 const bands=species==='shrub'?[SHRUB_LOD_BANDS.near,SHRUB_LOD_BANDS.middle]:[FLORA_LOD_BANDS.medium.near,FLORA_LOD_BANDS.medium.middle];
 for(let pair=0;pair<2;pair++)for(const fraction of [0,.1,.25,.5,.75,.9,1]){const d=bands[pair][0]+(bands[pair][1]-bands[pair][0])*fraction,e=root.matrix.elements;camera.position.set(e[12]+d,centre.y,e[14]);camera.lookAt(centre);camera.updateMatrixWorld();forest.update(0,{camera,focus,reducedMotion:true,treeDetailByDistance:true});
 const active=[];let paired=true;for(let lod=0;lod<3;lod++){const wood=family.find(m=>m.name.endsWith(':'+lod+':wood')),leaf=family.find(m=>m.name.endsWith(':'+lod+':foliage')),w=interval(wood,root),l=interval(leaf,root);if(w||l)active.push({lod,wood:w,leaves:l});if(leaf&&JSON.stringify(w)!==JSON.stringify(l))paired=false;}
 transitionRows.push({label:root.label,species,pair,fraction,distance:d,paired,active});}}
 }finally{for(const[a,s]of attributes){a.array.set(s.array);a.version=s.version;if(s.ranges){a.clearUpdateRanges();for(const r of s.ranges)a.addUpdateRange(r.start,r.count);}}for(const s of snapshot){s.o.visible=s.visible;if(s.count!==undefined)s.o.count=s.count;if(s.range)s.o.geometry.setDrawRange(s.range.start,s.range.count);}}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),expectedTrees:roots.length,levels,missing,transitionRows,transitionSamples:transitionRows.length,unpairedSamples:transitionRows.filter(r=>!r.paired).length,emptyTransitionSamples:transitionRows.filter(r=>!r.active.length).length,scope:'All registered native forest rest geometries at near/middle/far detail, alpha sampled at six barycentric subdivisions. Native medium-distance crossfade packing checked for every tree at seven points per adjacent band; high keeps full non-shrub models, so medium bands are exercised through treeDetailByDistance. This checks support candidates and matching wood/leaf coverage, not proof of per-pixel connectivity under every wind deformation.',qualityPass:null};`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));if(!args.diagnostics)throw new Error('Supply --diagnostics with the running diagnostic-module server origin');
const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high'});try{const report=await auditLiveCrowns(page,args.diagnostics);
 report.measurementPass=report.levels.every(l=>l.complete)&&report.transitionSamples===report.expectedTrees*14;
 fs.writeFileSync(args.out??'live-crown-transitions.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build:report.build,levels:report.levels.map(l=>({lod:l.lod,covered:l.coveredTrees,...l.summary})),missing:report.missing.length,transitionSamples:report.transitionSamples,unpairedSamples:report.unpairedSamples,emptyTransitionSamples:report.emptyTransitionSamples,measurementPass:report.measurementPass}));if(!report.measurementPass)process.exitCode=1;
}finally{page.close();}
}
