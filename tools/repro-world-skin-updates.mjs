#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {pathToFileURL} from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const out=args.out??'world-skin-proof';fs.mkdirSync(out,{recursive:true});
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'high',settle:'1',hud:'0'}))url.searchParams.set(k,v);
let page;
try {
 page=await openPage(url.href,{w:320,h:180,requestTimeoutMs:240000});let ready=false;
 for(let i=0;i<800;i++){if(await page.eval('return window.tervain?.mode==="play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Game not ready');
 const report=await page.eval(`
 const T=window.tervain;T.render=()=>{};T.step=()=>{};await T.world.arrived;await T.castLoad;T.arrivals.warm=null;
 for(let i=0;i<5000&&T.arrivals.count;i++){T.arrivals.update(T.npcAssets,()=>false);await new Promise(r=>setTimeout(r,0));}if(T.arrivals.count)throw new Error('Cast incomplete');
 const W=T.world,R=T.renderer,root=T.player.rig.root,camera=T.cam.camera,at=root.position.clone().set(-7,W.terrain.groundAt(-7,45),45);root.position.copy(at);T.player.x=at.x;T.player.y=at.y;T.player.z=at.z;T.player.group.visible=true;T.cam.manual=true;
 camera.position.copy(at).add(at.clone().set(0,1.8,-4));camera.lookAt(at.clone().add(at.clone().set(0,1.2,1)));camera.updateMatrixWorld();W.update(0,T.game.state,at,T.settings,12,camera,false);T.updateActors(0,12);T.lastFrameDt=0;T.renderWorld();
 const skeletons=new Map();W.scene.traverse(mesh=>{if(mesh.isSkinnedMesh&&mesh.userData.npcDualQuaternion&&!skeletons.has(mesh.skeleton))skeletons.set(mesh.skeleton,{label:mesh.name||'unnamed',bones:mesh.skeleton.bones.length});});
 const frames=[],proto=root.matrix.constructor.prototype,decompose=proto.decompose,render=R.render;let current=null,active=null,pass=null,control=false;
 proto.decompose=function(...args){if(active)active.decompositions++;return decompose.apply(this,args);};
 R.render=function(scene,cam){const old=pass,target=R.getRenderTarget();pass={world:scene===W.scene,mainCamera:cam===camera,target:target?[target.width,target.height]:null};try{return render.call(this,scene,cam);}finally{pass=old;}};
 const originals=[];
 for(const[skeleton,meta]of skeletons){const update=skeleton.update;originals.push([skeleton,update]);skeleton.update=function(){const old=active,entry={...meta,pass:pass?{...pass}:null,decompositions:0,changedWords:null,skipped:control&&current.last.has(this)};active=entry;try{if(!entry.skipped)update.call(this);}finally{active=old;}const data=this.boneTexture.image.data,words=new Uint32Array(data.buffer,data.byteOffset,data.length),before=current.last.get(this);if(before){let n=0;for(let i=0;i<words.length;i++)n+=Number(words[i]!==before[i]);entry.changedWords=n;}current.last.set(this,words.slice());current.updates.push(entry);};}
 const images={},snapshots=new Map();let comparedWords=0,packedEqual=true;
 try{for(const mode of ['native','per-frame-control']){control=mode!=='native';for(let i=0;i<2;i++){current={updates:[],last:new Map()};T.renderWorld();frames.push({mode,updates:current.updates,updatesTotal:current.updates.length,executedUpdates:current.updates.filter(e=>!e.skipped).length,decompositions:current.updates.reduce((n,e)=>n+e.decompositions,0),duplicateUnchangedUpdates:current.updates.filter(e=>e.changedWords===0).length});}images[mode]=R.domElement.toDataURL('image/png');for(const[skeleton]of skeletons){const data=skeleton.boneTexture.image.data,words=new Uint32Array(data.buffer,data.byteOffset,data.length);if(mode==='native')snapshots.set(skeleton,words.slice());else{const before=snapshots.get(skeleton);for(let i=0;i<words.length;i++){comparedWords++;packedEqual&&=words[i]===before[i];}}}}}

 finally{for(const[skeleton,update]of originals)skeleton.update=update;proto.decompose=decompose;R.render=render;}
 return{schema:1,images,packedEqual,comparedWords,skeletons:skeletons.size,frames,pass:skeletons.size>0&&frames.every(f=>f.updatesTotal>0),scope:'Native full renderWorld at High. Counts production skeleton update and Matrix4.decompose calls; repeated packed words compare within each draw frame. Per-frame skip is capture-only for a frozen pose and must not be used as a global animation cache. Instrumentation is diagnostic and does not measure hardware frame time.'};
 `);
 report.build=await page.eval('return fetch(new URL("version.json",document.baseURI)).then(r=>r.json());');const decoded={};for(const [mode,data] of Object.entries(report.images)){const file=path.join(out,mode+'.png');fs.writeFileSync(file,Buffer.from(data.split(',')[1],'base64'));decoded[mode]=await sharp(file).removeAlpha().raw().toBuffer();}delete report.images;report.pixelIdentical=decoded.native.equals(decoded['per-frame-control']);report.pass&&=report.packedEqual&&report.pixelIdentical&&report.frames.some(f=>f.mode==='native'&&f.duplicateUnchangedUpdates>0)&&report.frames.filter(f=>f.mode==='per-frame-control').every(f=>f.executedUpdates<f.updatesTotal);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build:report.build,skeletons:report.skeletons,packedEqual:report.packedEqual,comparedWords:report.comparedWords,pixelIdentical:report.pixelIdentical,frames:report.frames.map(({mode,decompositions,executedUpdates,duplicateUnchangedUpdates})=>({mode,decompositions,executedUpdates,duplicateUnchangedUpdates})),pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
