import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createGunzip} from 'node:zlib';
const dir=process.argv[2];if(!dir)throw Error('Supply metrics directory');const m=JSON.parse(fs.readFileSync(path.join(dir,'metrics.json'))),names=['0-20','20-60','60-120','ambiguous'];
assert.deepEqual(m.profile.browser,[1470,956]);assert.equal(m.profile.dpr,2);assert.deepEqual(m.screen,[2940,1912]);assert.equal(m.frames,25);assert.equal(m.syntheticCadence,60);assert.equal(m.controls.inactiveChangedChannels,0);assert.equal(m.controls.stationaryChangedChannels,0);assert.equal(m.eventFormat.recordBytes,18);
const totals=names.map(()=>({abs:0,rises:0,falls:0,current:0,both:0,bright:0,max:0})),byFrame=new Uint32Array(m.frames),stream=fs.createReadStream(path.join(dir,m.eventFormat.file)).pipe(createGunzip());
const peaks=names.map(()=>({fullGrass:0,partialGrass:0,notGrass:0,bothFull:0,examples:[]}));
let pending=Buffer.alloc(0),lastFrame=0,lastPixel=-1,records=0;
for await(const chunk of stream){const a=pending.length?Buffer.concat([pending,chunk]):chunk;let k=0;for(;k+18<=a.length;k+=18){
 const p=a.readUInt32LE(k),frame=a[k+4],current=a[k+5],prior=a[k+6],flags=a[k+7],old=a.readUInt32LE(k+8),now=a.readUInt32LE(k+12),pc=a[k+16],cc=a[k+17];
 assert.ok(p<m.screen[0]*m.screen[1]);assert.ok(frame>0&&frame<m.frames);assert.ok(frame>lastFrame||frame===lastFrame&&p>lastPixel);assert.ok([0,1,2,3,255].includes(current)&&[0,1,2,3,255].includes(prior));assert.ok(current!==255||prior!==255);assert.ok(old<=2550000&&now<=2550000);const delta=now-old;assert.ok(Math.abs(delta)>600000);
 const both=current!==255&&prior!==255&&pc>=230&&cc>=230,bright=Math.max(old,now)>=1800000,expected=Number(current!==255)|Number(prior!==255)<<1|Number(both)<<2|Number(bright)<<3;assert.equal(flags,expected);
 const bucket=current!==255?current:prior,t=totals[bucket];if(bright){const highNow=now>=old,bin=highNow?current:prior,coverage=highNow?cc:pc,kind=bin!==255&&coverage>=230?'fullGrass':bin!==255?'partialGrass':'notGrass',peak=peaks[bucket];peak[kind]++;peak.bothFull+=Number(both);if(peak.examples.length<6)peak.examples.push({frame,x:p%m.screen[0],y:Math.floor(p/m.screen[0]),before:old/10000,after:now/10000,brighterEndpoint:kind,bothFull:both});}t.abs++;t.rises+=Number(delta>0);t.falls+=Number(delta<0);t.current+=Number(current!==255);t.both+=Number(both);t.bright+=Number(bright);t.max=Math.max(t.max,Math.abs(delta)/10000);byFrame[frame]++;records++;lastFrame=frame;lastPixel=p;
 }pending=a.subarray(k);
}
assert.equal(pending.length,0,'Partial binary record');
for(let b=0;b<4;b++){
 const r=m.buckets[names[b]],t=totals[b];for(const [actual,key]of [[t.abs,'jumpsAbsOver60'],[t.rises,'risesOver60'],[t.falls,'fallsOver60'],[t.current,'jumpsCurrentGrass'],[t.both,'jumpsBothFullGrass'],[t.bright,'brightEndpoint180']])assert.equal(actual,r[key],names[b]+' '+key);
 if(t.abs)assert.equal(t.max,r.maxAbsJump);assert.ok(r.jumpsAbsOver60<=r.eligibleUnion);assert.ok(r.jumpsCurrentGrass<=r.eligibleCurrent);if(b<3)assert.ok(r.observations>0);
}
for(let i=0;i<m.frames;i++)assert.equal(byFrame[i],m.perFrame[i].events);
console.log(JSON.stringify({verifiedEventRecords:records,perFrameCountsMatch:true,allRequestedBucketsSampled:true,brightEndpointOwnership:Object.fromEntries(names.map((name,i)=>[name,peaks[i]])),scope:'Collection integrity only; no game-quality or hardware performance verdict.'}));
