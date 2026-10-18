import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';

/** Raw screen-space changes; ordinary camera motion is included, not classified as shimmer. */
export function temporalGrassCounts(previous,current,previousMask,currentMask,{threshold=20,maskThreshold=64}={}) {
 if(!previous.length||previous.length%3||[current,previousMask,currentMask].some(a=>a.length!==previous.length))throw Error('Invalid RGB frame dimensions');
 if(!Number.isFinite(threshold)||threshold<=0||threshold>255||!Number.isFinite(maskThreshold)||maskThreshold<0||maskThreshold>255)throw Error('Invalid thresholds');
 let eligiblePixels=0,changedPixels=0,brightChangedPixels=0,maskChangedPixels=0;
 const luma=(a,k)=>.2126*a[k]+.7152*a[k+1]+.0722*a[k+2];
 const white=(a,k)=>Math.min(a[k],a[k+1],a[k+2])>=180&&luma(a,k)>=200&&Math.max(a[k],a[k+1],a[k+2])-Math.min(a[k],a[k+1],a[k+2])<=40;
 for(let k=0;k<previous.length;k+=3){
  // Intersection avoids counting pixels newly entering/leaving the grass mask as grass flicker.
  const wasGrass=Math.max(previousMask[k],previousMask[k+1],previousMask[k+2])>=maskThreshold,isGrass=Math.max(currentMask[k],currentMask[k+1],currentMask[k+2])>=maskThreshold;
  maskChangedPixels+=Number(wasGrass!==isGrass);if(!wasGrass||!isGrass)continue;
  eligiblePixels++;
  if(Math.abs(luma(current,k)-luma(previous,k))>threshold){changedPixels++;brightChangedPixels+=Number(white(current,k)||white(previous,k));}
 }
 return{eligiblePixels,changedPixels,brightChangedPixels,maskChangedPixels,changedShare:eligiblePixels?changedPixels/eligiblePixels:null};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const input=process.argv[2];if(!input)throw Error('Supply capture directory');
 const capture=JSON.parse(fs.readFileSync(path.join(input,'report.json'),'utf8')),roi=capture.roi;
 if(!Number.isInteger(capture.route?.frames)||capture.route.frames<3||!roi||['left','top','width','height'].some(k=>!Number.isInteger(roi[k]))||roi.left<0||roi.top<0||roi.width<1||roi.height<1)throw Error('Invalid capture dimensions or frame count');
 const read=async(name,i)=>sharp(path.join(input,`${name}-${String(i).padStart(2,'0')}.png`)).removeAlpha().extract(roi).raw().toBuffer();
 const samples=[];let previous,previousMask;
 for(let i=0;i<capture.route.frames;i++){const current=await read('baseline',i),mask=await read('mask',i);if(previous)samples.push({frame:i,...temporalGrassCounts(previous,current,previousMask,mask)});previous=current;previousMask=mask;}
 const firstMask=await read('mask',0),firstFrame=await read('baseline',0),control=await sharp(path.join(input,'control.png')).removeAlpha().extract(roi).raw().toBuffer();
 const stationaryControl=temporalGrassCounts(control,firstFrame,firstMask,firstMask);
 const total=key=>samples.reduce((n,s)=>n+s[key],0),sorted=samples.map(s=>s.changedPixels).sort((a,b)=>a-b);
 const report={schema:1,build:capture.build,profile:capture.profile,route:capture.route,controls:capture.controls,roi,stationaryControl,threshold:20,maskThreshold:64,mask:'Intersection of consecutive native post/MSAA grass-contribution masks; not exclusive grass ownership.',interpretation:'Raw screen-space luminance changes >20/255, including ordinary camera motion. Bright subset: min RGB >=180, luminance >=200, channel spread <=40. No quality pass or hardware timing claim.',summary:{pairs:samples.length,eligibleObservations:total('eligiblePixels'),changedObservations:total('changedPixels'),brightChangedObservations:total('brightChangedPixels'),maskChangedObservations:total('maskChangedPixels'),changedShare:total('eligiblePixels')?total('changedPixels')/total('eligiblePixels'):null,meanChangedPixels:total('changedPixels')/samples.length,p95ChangedPixels:sorted[Math.ceil(sorted.length*.95)-1]},samples};
 fs.writeFileSync(path.join(input,'temporal.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({summary:report.summary,stationaryControl}));
}
