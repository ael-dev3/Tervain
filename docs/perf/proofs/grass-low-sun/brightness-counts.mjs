import fs from 'node:fs';
import sharp from 'sharp';
const dir=process.argv[2],r=JSON.parse(fs.readFileSync(dir+'/report.json'));let totalGrass=0,nearWhite=0,above180=0,maxY=0;const samples=[];
for(let i=0;i<r.route.frames;i++){
 const name=String(i).padStart(2,'0');const a=await sharp(`${dir}/baseline-${name}.png`).removeAlpha().extract(r.roi).raw().toBuffer(),m=await sharp(`${dir}/mask-${name}.png`).removeAlpha().extract(r.roi).raw().toBuffer();let grass=0,white=0,bright=0,peak=0;
 for(let k=0;k<a.length;k+=3){if(Math.max(m[k],m[k+1],m[k+2])<64)continue;grass++;const y=.2126*a[k]+.7152*a[k+1]+.0722*a[k+2];peak=Math.max(peak,y);bright+=Number(y>=180);white+=Number(Math.min(a[k],a[k+1],a[k+2])>=180&&y>=200&&Math.max(a[k],a[k+1],a[k+2])-Math.min(a[k],a[k+1],a[k+2])<=40);}
 totalGrass+=grass;nearWhite+=white;above180+=bright;maxY=Math.max(maxY,peak);samples.push({frame:i,grass,nearWhite:white,luminanceAtLeast180:bright,maxLuminance:peak});
}
const result={build:r.build,criteria:'Grass-contribution mask >=64; near-white min RGB >=180, luminance >=200, channel spread <=40; decoded 8-bit RGB luma .2126/.7152/.0722.',summary:{frames:r.route.frames,grassPixelObservations:totalGrass,nearWhiteObservations:nearWhite,luminanceAtLeast180:above180,maxLuminance:maxY},samples};fs.writeFileSync(dir+'/brightness.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary));
