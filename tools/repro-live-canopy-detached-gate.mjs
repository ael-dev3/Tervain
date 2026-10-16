import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'canopy-detached-gate-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
let data,page;const cache=fs.mkdtempSync(path.join(tmpdir(),'canopy-detached-gate-'));
try{
 if(args['receipt-dir']){
  data=JSON.parse(fs.readFileSync(path.join(args['receipt-dir'],'native-data.json'),'utf8'));
  for(const mode of ['before','after'])fs.copyFileSync(path.join(args['receipt-dir'],mode+'.png'),path.join(out,mode+'.png'));
 }else{
  page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
  data=await page.eval(`const T=window.tervain;const baseline=await T.auditCanopies({lod:0,alpha:false,woodReach:3,maxOperations:80000000}),current=await T.auditCanopies({lod:0,alpha:false,woodReach:1.5,maxOperations:80000000});
  T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,T.world.terrain.groundAt(-180,12),12,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
  const images={},cost={};for(const mode of ['before','after']){T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();cost[mode]={drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};images[mode]=T.renderer.domElement.toDataURL('image/png');}
  return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),baseline,current,images,cost};`);
  for(const[mode,image]of Object.entries(data.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(image.split(',')[1],'base64'));delete data.images;
  page.close();page=null;
 }
 fs.writeFileSync(path.join(out,'native-data.json'),JSON.stringify(data,null,2)+'\n');
 const rows={},sourceHashes={};
 for(const mode of ['before','after']){
  const dir=path.join(cache,mode);fs.mkdirSync(dir);const ref=mode==='before'?'421d34b':args['candidate-ref'];sourceHashes[mode]={};
  for(const file of ['audit-canopy.mjs','canopy-baseline.mjs']){
   const source=ref?execFileSync('git',['show',ref+':tools/'+file],{encoding:'utf8'}):fs.readFileSync('tools/'+file,'utf8');
   fs.writeFileSync(path.join(dir,file),source);sourceHashes[mode][file]=createHash('sha256').update(source).digest('hex');
  }
  const driver=path.join(dir,'driver.mjs');fs.writeFileSync(driver,`export async function openPage(){return {eval:async s=>s.includes('auditCanopies(')?${JSON.stringify(data.current)}:true,wait:async()=>{},close(){}}}`);
  rows[mode]={};
  for(const[name,baseline]of [['absolute',null],['changedReach',data.baseline],['identity',data.current]]){
   const output=path.join(dir,name+'.json'),cli=[path.join(dir,'audit-canopy.mjs'),'--driver',driver,'--out',output];
   if(baseline){const file=path.join(dir,name+'-baseline.json');fs.writeFileSync(file,JSON.stringify(baseline));cli.push('--baseline',file);}
   const run=spawnSync(process.execPath,cli,{encoding:'utf8',timeout:30000});if(run.error)throw run.error;if(!fs.existsSync(output))throw Error(mode+' '+name+' did not emit a gate report');
   const report=JSON.parse(fs.readFileSync(output,'utf8'));rows[mode][name]={exitCode:run.status,pass:report.pass,reasons:report.baselineComparison?.reasons??[],regressions:report.baselineComparison?.regressions??[]};
  }
 }
 const pixels=await Promise.all(['before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));
 const report={build:data.build,inputSource:args['receipt-dir']?'saved-native-receipt':'live-pages',nativeDataSha256:createHash('sha256').update(JSON.stringify(data)).digest('hex'),baseline:{complete:data.baseline.complete,summary:data.baseline.summary},current:{complete:data.current.complete,summary:data.current.summary},rows,sourceHashes,identicalPixels:pixels[0].equals(pixels[1]),cost:data.cost,scope:'Actual CLI and baseline comparator replay captured native full-forest reports. Default geometry-only rest audit, not alpha/mip/wind visibility proof; detached counts are diagnostic candidates, not confirmed visible floaters. Absolute gate and changed-threshold baseline must reject; an identical nonzero baseline remains valid. Images are frozen native endpoint controls, not candidate tree rendering or hardware timing.'};
 report.pass=data.current.complete&&data.current.summary.trees>0&&data.current.summary.candidates===0&&data.current.summary.detachedClumps>0&&rows.before.absolute.pass===true&&rows.before.absolute.exitCode===0&&rows.after.absolute.pass===false&&rows.after.absolute.exitCode===1&&rows.before.changedReach.pass===true&&rows.after.changedReach.pass===false&&rows.after.changedReach.exitCode===1&&rows.after.changedReach.regressions.length>0&&rows.before.identity.pass===true&&rows.after.identity.pass===true&&rows.after.identity.exitCode===0&&report.identicalPixels&&data.cost.before.drawCalls===data.cost.after.drawCalls&&data.cost.before.triangles===data.cost.after.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:Object.fromEntries(Object.entries(rows).map(([mode,cases])=>[mode,Object.fromEntries(Object.entries(cases).map(([name,r])=>[name,{...r,regressions:r.regressions.slice(0,3),regressionCount:r.regressions.length}]))]))}));if(!report.pass)process.exitCode=1;
}finally{page?.close();fs.rmSync(cache,{recursive:true,force:true});}
