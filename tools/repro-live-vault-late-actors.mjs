import fs from 'node:fs';
import {transformWithOxc} from 'vite';
import {liveProofPage} from './live-proof-page.mjs';
const source=fs.readFileSync('src/presentation/player.ts','utf8'),from=source.indexOf('  private stepVault('),to=source.indexOf('\n  private tryMove',from);
if(from<0||to<0)throw Error('Cannot locate vault executor');
const constants=fs.readFileSync('src/world/playerPlacement.ts','utf8');
const foot=Number(constants.match(/PLAYER_FOOT_CLEARANCE = ([\d.]+)/)?.[1]),height=Number(constants.match(/PLAYER_BODY_HEIGHT = ([\d.]+)/)?.[1]);
if(!foot||!height)throw Error('Missing body constants');
const code=(await transformWithOxc('class Candidate {\n'+source.slice(from,to)+'\n}','candidate.ts')).code;
const page=await liveProofPage(process.argv[2]??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
try {
 const r=await page.eval(`const T=window.tervain,P=T.player,c=T.world.colliders.withId('fence')[0],ctx=T.playerContext(true),n=ctx.npcs.find(n=>!n.hidden&&ctx.game.state.npcs[n.id]?.available);if(!n)throw Error('No active resident');const cos=Math.cos(c.yaw),sin=Math.sin(c.yaw),normal=c.hw+.65,original=P.stepVault,saved={x:n.x,y:n.y,z:n.z},rows={};
 const candidate=new Function('PLAYER_RADIUS','PLAYER_FOOT_CLEARANCE','PLAYER_BODY_HEIGHT',${JSON.stringify(code+';return Candidate.prototype.stepVault;')})(.4,${foot},${height});
 P.vaultActorSweep=new ctx.colliders.constructor();
 for(const mode of ['before','after']) {
  Object.assign(n,saved);P.stepVault=mode==='before'?original:candidate;
  P.setPosition(c.x+normal*cos,c.z-normal*sin,Math.atan2(-cos,sin),T.world.terrain);const v=P.fenceVault(ctx);if(!v)throw Error('No clear vault');P.vault=v;P.grounded=false;
  const frames=[];let worst=null,injectionOverlap=false;
  for(let i=0;i<90&&P.vault;i++) {
   if(i===8){n.x=v.to.x;n.z=v.to.z;n.y=v.to.y;injectionOverlap=Math.hypot(P.x-n.x,P.z-n.z)<.75&&P.y+${height}>n.y&&P.y<n.y+2.1;}
   P.stepVault(1/60,ctx);const vertical=P.y+${height}>n.y&&P.y<n.y+2.1,gap=Math.hypot(P.x-n.x,P.z-n.z)-.75;
   const frame={i,x:P.x,y:P.y,z:P.z,gap,vertical,vault:!!P.vault};frames.push(frame);if(!worst||vertical&&gap<worst.gap)worst=frame;
  }
  const pose=mode==='before'?worst:frames.at(-1);P.rig.root.position.set(pose.x,pose.y,pose.z);P.rig.root.visible=true;n.rig.root.position.set(n.x,n.y,n.z);n.rig.root.visible=true;
  P.rig.root.updateMatrix();n.rig.root.updateMatrix();const cam=T.cam.camera;cam.position.set(v.to.x+3,v.to.y+2.5,v.to.z+4);cam.lookAt(v.to.x,v.to.y+1,v.to.z);cam.updateMatrix();cam.updateMatrixWorld(true);T.renderWorld();
  rows[mode]={frames,injectionOverlap,penetrating:frames.filter(f=>f.vertical&&f.gap<-.001).length,completed:v.t===1,image:T.renderer.domElement.toDataURL('image/png')};
 }
 P.stepVault=original;Object.assign(n,saved);
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),resident:n.id,rows,scope:'Published controller and authored field fence; native resident repositioned into the landing after eight 60 Hz steps. Candidate borrows only the source stepVault method and actor-only query object into that controller. Actual world render through Grade/post/MSAA. Controlled late-actor contact, not an organic approach, complete candidate build or hardware timing.'};`);
 const prefix=process.argv[3]??'live-late-actors';
 for(const mode of ['before','after']){fs.writeFileSync(prefix+'-'+mode+'.png',Buffer.from(r.rows[mode].image.split(',')[1],'base64'));delete r.rows[mode].image;}
 r.pass=!r.rows.before.injectionOverlap&&!r.rows.after.injectionOverlap&&r.rows.before.penetrating>0&&r.rows.after.penetrating===0&&!r.rows.after.completed;
 fs.writeFileSync(prefix+'.json',JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({build:r.build,before:r.rows.before.penetrating,after:r.rows.after.penetrating,pass:r.pass}));if(!r.pass)process.exitCode=1;
}finally{page.close();}
