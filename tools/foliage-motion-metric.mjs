import {frameShimmer,summarizeShimmer} from './shimmer-metric.mjs';
export function rgbFrame(rgb,width,height) {
 if(rgb.length!==width*height*3)throw new Error('Invalid RGB frame');
 const gray=new Uint8Array(width*height),white=new Uint8Array(width*height);
 for(let i=0;i<gray.length;i++){const r=rgb[i*3],g=rgb[i*3+1],b=rgb[i*3+2];gray[i]=Math.round(.2126*r+.7152*g+.0722*b);white[i]=Number(Math.min(r,g,b)>=180&&gray[i]>=200&&Math.max(r,g,b)-Math.min(r,g,b)<=40);}
 return{gray,white};
}
export function walkingFlicker(frames,width,height,{searchRadius=6}={}) {
 const samples=[];for(let i=1;i+1<frames.length;i++)samples.push({...frameShimmer(frames[i-1].gray,frames[i].gray,frames[i+1].gray,width,height,{searchRadius,sparkleMask:frames[i].white}),frame:i});
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

/**
 * Do the parts of a crown move together? (A135) Splits a crown region into a grid of cells and follows each cell's
 * horizontal and vertical image motion over the frames (block matching between consecutive grey frames, parabola
 * sub-pixel), then returns the mean Pearson correlation between the motion signals of every pair of cells that moved.
 * A crown whose whole mass moves in phase (jelly) scores near 1; branches swinging each at their own phase score lower.
 * `frames` are grey Uint8Arrays of width x height; `region` is [x, y, w, h].
 */
export function regionMotionCorrelation(frames, width, height, region, { grid = 5, search = 4 } = {}) {
 const [rx,ry,rw,rh]=region,cw=Math.floor(rw/grid),ch=Math.floor(rh/grid),cells=[];
 for(let gy=0;gy<grid;gy++)for(let gx=0;gx<grid;gx++)cells.push({x:rx+gx*cw,y:ry+gy*ch,dx:[],dy:[]});
 const sad=(a,b,x,y,ox,oy)=>{let s=0;for(let j=2;j<ch-2;j+=2)for(let i=2;i<cw-2;i+=2)s+=Math.abs(a[(y+j)*width+x+i]-b[(y+j+oy)*width+x+i+ox]);return s;};
 const sub=(m,z,p)=>{const d=m-2*z+p;return d>1e-9?0.5*(m-p)/d:0;};
 for(let f=1;f<frames.length;f++)for(const c of cells){
  if(c.x<search||c.y<search||c.x+cw+search>=width||c.y+ch+search>=height){c.dx.push(0);c.dy.push(0);continue;}
  const e=[];let best=Infinity,bx=0,by=0;
  for(let oy=-search;oy<=search;oy++){e[oy+search]=[];for(let ox=-search;ox<=search;ox++){const v=sad(frames[f-1],frames[f],c.x,c.y,ox,oy);e[oy+search][ox+search]=v;if(v<best){best=v;bx=ox;by=oy;}}}
  const px=bx>-search&&bx<search?sub(e[by+search][bx-1+search],e[by+search][bx+search],e[by+search][bx+1+search]):0;
  const py=by>-search&&by<search?sub(e[by-1+search][bx+search],e[by+search][bx+search],e[by+1+search][bx+search]):0;
  c.dx.push(bx+px);c.dy.push(by+py);
 }
 const corr=(a,b)=>{const n=a.length;let ma=0,mb=0;for(let i=0;i<n;i++){ma+=a[i];mb+=b[i];}ma/=n;mb/=n;let sab=0,saa=0,sbb=0;for(let i=0;i<n;i++){sab+=(a[i]-ma)*(b[i]-mb);saa+=(a[i]-ma)**2;sbb+=(b[i]-mb)**2;}return saa>1e-9&&sbb>1e-9?sab/Math.sqrt(saa*sbb):null;};
 const moving=cells.filter(c=>Math.hypot(...c.dx.map(Math.abs),...c.dy.map(Math.abs))>0.5);
 const pairs=[];for(let i=0;i<moving.length;i++)for(let j=i+1;j<moving.length;j++)for(const k of ['dx','dy']){const r=corr(moving[i][k],moving[j][k]);if(r!==null)pairs.push(r);}
 const mean=pairs.length?pairs.reduce((a,b)=>a+b,0)/pairs.length:null;
 const abs=pairs.length?pairs.reduce((a,b)=>a+Math.abs(b),0)/pairs.length:null;
 const amp=moving.length?moving.reduce((a,c)=>a+Math.sqrt(c.dx.reduce((s,v)=>s+v*v,0)/c.dx.length),0)/moving.length:0;
 return{cellsMoving:moving.length,cells:cells.length,pairs:pairs.length,meanCorrelation:mean,meanAbsCorrelation:abs,rmsPixelMotionPerFrame:amp};
}
