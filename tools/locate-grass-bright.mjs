import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
const dir=process.argv[2],out=process.argv[3];if(!dir||!out)throw Error('Supply capture directory and output JSON');
const r=JSON.parse(fs.readFileSync(path.join(dir,'report.json'))),roi=r.roi,rows=[],byFrame=[];
for(let i=0;i<r.route.frames;i++){
 const t=String(i).padStart(2,'0'),a=await sharp(path.join(dir,'baseline-'+t+'.png')).extract(roi).removeAlpha().raw().toBuffer(),m=await sharp(path.join(dir,'mask-'+t+'.png')).extract(roi).removeAlpha().raw().toBuffer();
 let count=0,minX=Infinity,minY=Infinity,maxX=0,maxY=0;
 for(let k=0;k<a.length;k+=3){if(Math.max(m[k],m[k+1],m[k+2])<64)continue;const y=.2126*a[k]+.7152*a[k+1]+.0722*a[k+2];if(y<180)continue;const x=roi.left+k/3%roi.width,z=roi.top+Math.floor(k/3/roi.width);rows.push({frame:i,x,y:z,luminance:y,rgb:[a[k],a[k+1],a[k+2]],maskRGB:[m[k],m[k+1],m[k+2]]});count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,z);maxY=Math.max(maxY,z);}
 byFrame.push({frame:i,count,bounds:count?[minX,minY,maxX,maxY]:null});
}
fs.writeFileSync(out,JSON.stringify({count:rows.length,byFrame,rows},null,2)+'\n');console.log(JSON.stringify({count:rows.length,frames:byFrame.length}));
