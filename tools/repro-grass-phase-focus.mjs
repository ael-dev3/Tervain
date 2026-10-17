/** Deterministic contract repro, not a rendered or hardware timing receipt. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import * as after from './grass-phase-controls.mjs';
const legacySource=execFileSync('git',['show','d40777b:tools/grass-phase-controls.mjs'],{encoding:'utf8'});
const before=await import('data:text/javascript;base64,'+Buffer.from(legacySource).toString('base64'));
const phase={hour:12,cloudTime:0,wind:{time:0,direction:[1,0,0,0],scroll:[0,0,0,0]},sway:0,gradeTime:0},rows=[];
for(const[variant,helper]of Object.entries({before,after}))for(const player of [[-2,1.175548791885376,35],[-7,1,45],[-268,2,27]]){
 let skyFocus;
 const T={player:{x:player[0],y:player[1],z:player[2],group:new THREE.Group()},world:{foliage:{wind:{uniforms:{uGrassTime:{value:0},uWindDir:{value:new THREE.Vector4()},uGustScroll:{value:new THREE.Vector4()}}}},sway:{uTime:{value:0}},sky:{cloudTime:0,state:{nightness:0},update(hour,focus){assert.equal(hour,12);skyFocus=focus.toArray();}}},grade:{time:0,setLook(){}}};
 helper.applyGrassPhaseControls(T,phase);
 assert.deepEqual(T.player.group.position.toArray(),[0,0,0],'Lighting prep must not move the origin container');
 const focusErrorMetres=Math.hypot(...skyFocus.map((v,i)=>v-player[i]));
 if(variant==='before')assert.ok(focusErrorMetres>35);else assert.equal(focusErrorMetres,0);
 rows.push({variant,player,skyFocus,focusErrorMetres});
}
const sha=b=>createHash('sha256').update(b).digest('hex');
const report={baseline:'d40777b',helperSha256:sha(fs.readFileSync(new URL('./grass-phase-controls.mjs',import.meta.url))),rows,pass:true,scope:'Calls the real old/new phase helpers with a stationary origin container and moving physical player. Verifies the focus passed to SkyRig.update. Does not render shadows, measure shimmer, or certify frame pacing.'};
const out=process.argv[2];if(out)fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
