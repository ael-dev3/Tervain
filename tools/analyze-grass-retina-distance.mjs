import {grassDistanceBucket,grassLuminanceUnits} from './grass-distance-metric.mjs';import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import sharp from 'sharp';import {createGzip} from 'node:zlib';import {once} from 'node:events';import {finished} from 'node:stream/promises';
const [dir,out]=process.argv.slice(2);if(!dir||!out)throw Error('Supply complete capture directory and output directory');fs.mkdirSync(out,{recursive:true});
const r=JSON.parse(fs.readFileSync(path.join(dir,'report.json')));assert.equal(r.complete,true);assert.equal(r.build.version,'0.0.27');assert.equal(r.inactiveChangedChannels,0);assert.equal(r.stationaryChangedChannels,0);assert.deepEqual(r.profile.browser,[1470,956]);assert.equal(r.profile.dpr,2);assert.equal(r.profile.samples,4);assert.equal(r.poses.length,25);
const width=2940,height=1912,n=width*height,names=['0-20','20-60','60-120','ambiguous'];
const zero=()=>({eligibleUnion:0,eligibleCurrent:0,jumpsAbsOver60:0,risesOver60:0,fallsOver60:0,jumpsCurrentGrass:0,jumpsBothFullGrass:0,brightEndpoint180:0,maxAbsJump:0});
const totals=names.map(zero),occupancy=names.map(()=>({observations:0,fullCoverageObservations:0})),frames=[],examples=[];
let previous=null,prevBin=null,prevCov=null;const gzip=createGzip({level:6}),file=fs.createWriteStream(path.join(out,'events.bin.gz'));gzip.pipe(file);
for(let i=0;i<r.poses.length;i++){
 const tag=String(i).padStart(2,'0'),normal=await sharp(path.join(dir,'frame-'+tag+'.png')).removeAlpha().raw().toBuffer(),meta=await sharp(path.join(dir,'frame-'+tag+'.png')).metadata();assert.equal(meta.width,width);assert.equal(meta.height,height);
 const mask=await sharp(path.join(dir,'bins-'+tag+'.png')).removeAlpha().resize(width,height,{kernel:'linear'}).raw().toBuffer();
 const bins=new Uint8Array(n),cov=new Uint8Array(n),counts=names.map(zero);let ambig=0;
 for(let p=0;p<n;p++){
  const k=p*3,a=mask[k],b=mask[k+1],c=mask[k+2],sum=a+b+c,m=Math.max(a,b,c);cov[p]=Math.min(255,sum);
  bins[p]=grassDistanceBucket(a,b,c);
  if(bins[p]!==255){occupancy[bins[p]].observations++;occupancy[bins[p]].fullCoverageObservations+=Number(cov[p]>=230);ambig+=Number(bins[p]===3);}
 }
 let bytes=0,events=0;const buffer=previous?Buffer.allocUnsafe(n*18):null;
 if(previous)for(let p=0;p<n;p++){
  const current=bins[p],prior=prevBin[p];if(current===255&&prior===255)continue;
  const bin=current!==255?current:prior,t=counts[bin],k=p*3;
  t.eligibleUnion++;t.eligibleCurrent+=Number(current!==255);
  const y=grassLuminanceUnits(normal[k],normal[k+1],normal[k+2]),old=grassLuminanceUnits(previous[k],previous[k+1],previous[k+2]),delta=y-old,abs=Math.abs(delta);
  t.maxAbsJump=Math.max(t.maxAbsJump,abs/10000);if(abs<=600000)continue;
  const bothFull=current!==255&&prior!==255&&cov[p]>=230&&prevCov[p]>=230;
  const bright=Math.max(y,old)>=1800000;
  t.jumpsAbsOver60++;t.risesOver60+=Number(delta>0);t.fallsOver60+=Number(delta<0);t.jumpsCurrentGrass+=Number(current!==255);t.jumpsBothFullGrass+=Number(bothFull);t.brightEndpoint180+=Number(bright);
  const flags=Number(current!==255)|Number(prior!==255)<<1|Number(bothFull)<<2|Number(bright)<<3;
  buffer.writeUInt32LE(p,bytes);buffer[bytes+4]=i;buffer[bytes+5]=current;buffer[bytes+6]=prior;buffer[bytes+7]=flags;buffer.writeUInt32LE(old,bytes+8);buffer.writeUInt32LE(y,bytes+12);buffer[bytes+16]=prevCov[p];buffer[bytes+17]=cov[p];bytes+=18;events++;
  const example={frame:i,x:p%width,y:Math.floor(p/width),bucket:names[bin],beforeLuminance:old/10000,afterLuminance:y/10000,delta:delta/10000,bothFull,brightEndpoint180:bright};
  if(examples.length<100)examples.push(example);else{let min=0;for(let j=1;j<examples.length;j++)if(Math.abs(examples[j].delta)<Math.abs(examples[min].delta))min=j;if(abs/10000>Math.abs(examples[min].delta))examples[min]=example;}
 }
 if(bytes&&!gzip.write(buffer.subarray(0,bytes)))await once(gzip,'drain');
 for(let b=0;b<names.length;b++)for(const k of Object.keys(totals[b]))totals[b][k]=k==='maxAbsJump'?Math.max(totals[b][k],counts[b][k]):totals[b][k]+counts[b][k];
 frames.push({frame:i,events,ambiguousMaskPixels:ambig,buckets:Object.fromEntries(names.map((name,b)=>[name,counts[b]]))});previous=normal;prevBin=bins;prevCov=cov;console.log(JSON.stringify({frame:i,events}));
}
gzip.end();await Promise.all([finished(gzip),finished(file)]);
for(let b=0;b<3;b++)assert.ok(occupancy[b].observations>0,'Requested distance bucket has no samples: '+names[b]);
const report={schema:1,build:r.build,profile:r.profile,screen:[width,height],frames:r.poses.length,syntheticCadence:60,seconds:r.poses.at(-1).t,strafeMetres:r.poses.at(-1).d,yawDegrees:[r.poses[0].yaw*180/Math.PI,r.poses.at(-1).yaw*180/Math.PI],distance:'Native gDist: camera-to-clump-root Euclidean world metres. Bucket selection uses current grass where present, otherwise previous grass. Ambiguous cross-bucket samples are separate.',mask:'Raw 4x MSAA geometric labels at native buffer resolution, linearly resampled to screenshot dimensions. At least 25% coverage, dominant bucket >=80%; both-full subset requires >=90% coverage in both frames. Mask bypasses post; normal picture uses native post/MSAA.',metric:'Same screen-pixel consecutive decoded RGB luminance difference, absolute >60. Includes ordinary camera motion, occlusion and post effects; no optical-flow compensation or shimmer-only verdict. Luminance uses exact integer coefficients 2126,7152,722 /10000.',controls:{inactiveChangedChannels:r.inactiveChangedChannels,stationaryChangedChannels:r.stationaryChangedChannels},buckets:Object.fromEntries(names.map((name,b)=>[name,{...occupancy[b],...totals[b]}])),examples:examples.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)),perFrame:frames,eventFormat:{file:'events.bin.gz',recordBytes:18,littleEndian:true,fields:{pixelIndex:'uint32 @0 (y*2940+x)',frame:'uint8 @4',currentBucket:'uint8 @5; 0/1/2 bins,3 ambiguous,255 absent',previousBucket:'uint8 @6',flags:'uint8 @7: current grass bit0, previous grass bit1, both-full bit2, either endpoint >=180 bit3',beforeLuminance:'uint32 @8 /10000',afterLuminance:'uint32 @12 /10000',previousCoverage:'uint8 @16 /255',currentCoverage:'uint8 @17 /255'}}};
fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({buckets:report.buckets,frames:report.frames,seconds:report.seconds}));
