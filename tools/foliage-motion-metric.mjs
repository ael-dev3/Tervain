import {frameShimmer,summarizeShimmer} from './shimmer-metric.mjs';
export function rgbFrame(rgb,width,height) {
 if(rgb.length!==width*height*3)throw new Error('Invalid RGB frame');
 const gray=new Uint8Array(width*height),white=new Uint8Array(width*height);
 for(let i=0;i<gray.length;i++){const r=rgb[i*3],g=rgb[i*3+1],b=rgb[i*3+2];gray[i]=Math.round(.2126*r+.7152*g+.0722*b);white[i]=Number(Math.min(r,g,b)>=180&&gray[i]>=200&&Math.max(r,g,b)-Math.min(r,g,b)<=40);}
 return{gray,white};
}
export function walkingFlicker(frames,width,height) {
 const samples=[];for(let i=1;i+1<frames.length;i++)samples.push({...frameShimmer(frames[i-1].gray,frames[i].gray,frames[i+1].gray,width,height,{searchRadius:6,sparkleMask:frames[i].white}),frame:i});
 const valid=samples.reduce((n,s)=>n+s.validPixels,0),white=samples.reduce((n,s)=>n+s.maskedSparklePixels,0);
 return{summary:summarizeShimmer(samples),whitePixelsFlickered:white,whiteFlickerShare:valid?white/valid:null,whiteThreshold:{minimumChannel:180,minimumLuma:200,maximumChannelSpread:40},samples};
}
export function changeComponents(before,after,width,height,{threshold=20,minPixels=16}={}) {
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||before.length!==width*height*3||after.length!==before.length)throw new Error('Invalid change frame');
 const mask=new Uint8Array(width*height),queue=new Uint32Array(width*height),events=[];let changedPixels=0;
 for(let i=0;i<mask.length;i++){let d=0;for(let c=0;c<3;c++)d=Math.max(d,Math.abs(before[i*3+c]-after[i*3+c]));if(d>=threshold){mask[i]=1;changedPixels++;}}
 for(let i=0;i<mask.length;i++)if(mask[i]){let start=0,end=1;queue[0]=i;mask[i]=0;let minX=width,minY=height,maxX=0,maxY=0;
 while(start<end){const k=queue[start++],x=k%width,y=Math.floor(k/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
 for(const n of [x? k-1:-1,x+1<width?k+1:-1,y?k-width:-1,y+1<height?k+width:-1])if(n>=0&&mask[n]){mask[n]=0;queue[end++]=n;}}
 if(end>=minPixels)events.push({pixels:end,box:[minX,minY,maxX-minX+1,maxY-minY+1]});}
 return{changedPixels,events};
}
