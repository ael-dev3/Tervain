import fs from 'node:fs';
import {liveProofPage} from './live-proof-page.mjs';
const [url,out,expected]=process.argv.slice(2);if(!url||!out||!/^[a-f0-9]{7}$/.test(expected??''))throw Error('Usage: node tools/verify-orchard-releases.mjs URL OUTPUT EXPECTED_REVISION');fs.mkdirSync(out,{recursive:true});fs.rmSync(out+'/report.json',{force:true});
const page=await liveProofPage(url,{quality:'high',hour:15,w:1470,h:956,dpr:2});
try{
 const setup=await page.eval(`const T=window.tervain;T.frame=()=>{};T.present=()=>{};T.perf?.end(0);T.perf=null;T.lastFrameDt=0;const stamp=await T.auditPlacement({kind:'root',maxChecks:1});if(stamp.revision!==${JSON.stringify(expected)})throw Error('Revision mismatch '+stamp.revision);const F=T.world.modules.find(m=>m.name==='forest').module;const targets=F.canopyAuditTargets(0);const labels=['tree:orchard:0:2',...targets.filter(t=>t.species==='orchard'&&t.label!=='tree:orchard:0:2').map(t=>t.label).sort().slice(0,2)];for(const label of labels)if(!targets.find(t=>t.label===label))throw Error('Missing '+label);window.__receiptTargets=targets.filter(t=>labels.includes(t.label));return {version:stamp.version,revision:stamp.revision,viewport:[innerWidth,innerHeight,devicePixelRatio],buffer:[T.renderer.domElement.width,T.renderer.domElement.height],settings:T.settings,targets:window.__receiptTargets.map(t=>({label:t.label,species:t.species,position:t.matrix.elements.slice(12,15)}))};`);
 fs.writeFileSync(out+'/setup.json',JSON.stringify(setup,null,2));console.log(JSON.stringify({stage:'loaded',...setup}));
 console.log(JSON.stringify({stage:'audit-start'}));
 const audit=await page.eval(`return await window.tervain.auditCanopies({lod:0,alpha:false,gap:0.75,woodReach:1.5,maxOperations:300000000});`);
 fs.writeFileSync(out+'/audit.json',JSON.stringify(audit,null,2));if(audit.revision!==expected)throw Error('Audit revision mismatch');
 const renders=[];
 for(let i=0;i<3;i++){
  const result=await page.eval(`const T=window.tervain,t=window.__receiptTargets[${i}],e=t.matrix.elements,cam=T.cam.camera;T.player.group.position.set(e[12],e[13],e[14]);cam.position.set(e[12],e[13]+4,e[14]+12);cam.lookAt(e[12],e[13]+5,e[14]);cam.updateMatrixWorld(true);T.world.update(0,T.game.state,T.player.group.position,T.settings,15,cam,false);T.lastFrameDt=0;T.world.foliage.strength.value=0;const R=T.renderer,old=R.info.autoReset;R.info.autoReset=false;R.info.reset();T.renderWorld();const warm={...R.info.render};R.info.reset();const begin=performance.now();T.renderWorld();const result={label:t.label,camera:cam.position.toArray(),warm,render:{...R.info.render},submissionMs:performance.now()-begin};R.info.autoReset=old;return result;`);
  renders.push(result);fs.writeFileSync(out+'/renders.json',JSON.stringify(renders,null,2));if(process.env.ORCHARD_SCREENSHOTS==='1')await page.shot(out+'/orchard-'+i+'.png');console.log(JSON.stringify({stage:'render',...result}));
 }
 const errors=page.console().filter(s=>/\[error\]|\[exception\]/.test(s));
 const report={setup,renders,complete:audit.complete,operations:audit.operations,summary:audit.summary,trees:audit.trees.filter(t=>setup.targets.some(x=>x.label===t.label)),errors,console:page.console()};fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));if(!audit.complete||report.trees.length!==3||errors.length)throw Error('Incomplete audit or console errors');console.log(JSON.stringify(report));
}finally{page.close();}
