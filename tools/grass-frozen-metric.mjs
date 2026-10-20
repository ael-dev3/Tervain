/** Streaming image-space diagnostic. Luminance is Rec.709 on display RGB (0..255), not linear radiance. */
export class FrozenGrassMetric {
  constructor(width,height,{bright=180,jump=60}={}) {
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||![bright,jump].every(x=>Number.isFinite(x)&&x>=0&&x<=255))throw Error('Invalid metric settings');
    Object.assign(this,{width,height,bright,jump,count:0,frames:[],brightTransitions:0,allTransitions:0});
    const size=width*height;this.mean=new Float64Array(size);this.m2=new Float64Array(size);this.seen=new Uint8Array(size);this.previous=null;
  }
  add(rgb) {
    const size=this.width*this.height;if(rgb.length!==size*3)throw Error('Invalid RGB length');
    const luma=new Float64Array(size);let brightPixels=0,brightJumps=0,allJumps=0;
    for(let i=0;i<size;i++) {
      const l=.2126*rgb[i*3]+.7152*rgb[i*3+1]+.0722*rgb[i*3+2];luma[i]=l;
      const isBright=l>=this.bright;brightPixels+=Number(isBright);this.seen[i]|=Number(isBright);
      const delta=l-this.mean[i];this.mean[i]+=delta/(this.count+1);this.m2[i]+=delta*(l-this.mean[i]);
      if(this.previous&&Math.abs(l-this.previous[i])>this.jump){allJumps++;if(isBright||this.previous[i]>=this.bright)brightJumps++;}
    }
    this.count++;this.previous=luma;this.brightTransitions+=brightJumps;this.allTransitions+=allJumps;
    this.frames.push({frame:this.count-1,brightPixels,brightJumps,allJumps});
  }
  result() {
    if(this.count<2)throw Error('At least two frames required');
    const variance=Array.from(this.m2,v=>Math.max(0,v/this.count)),brightVariance=variance.filter((_,i)=>this.seen[i]);
    const summarize=a=>{if(!a.length)return null;const sorted=a.slice().sort((a,b)=>a-b);return{pixels:a.length,meanVariance:a.reduce((s,x)=>s+x,0)/a.length,p95Variance:sorted[Math.ceil(.95*a.length)-1],maxVariance:sorted.at(-1),varyingPixels:a.filter(x=>x>1e-10).length};};
    return{frames:this.count,thresholds:{brightLuminance:this.bright,jumpAbove:this.jump},allPixels:summarize(variance),everBrightPixels:summarize(brightVariance),brightTransitions:this.brightTransitions,allTransitions:this.allTransitions,perFrame:this.frames};
  }
}
export function compareFrozenFrames(a,b,{bright=180,jump=60}={}) {
  if(a.length!==b.length||a.length%3)throw Error('Comparison shape mismatch');
  let changed=0,jumps=0,union=0,intersection=0,brightChanged=0;
  for(let i=0;i<a.length;i+=3){const x=.2126*a[i]+.7152*a[i+1]+.0722*a[i+2],y=.2126*b[i]+.7152*b[i+1]+.0722*b[i+2],ab=x>=bright,bb=y>=bright;
    const different=a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2];changed+=Number(different);jumps+=Number(Math.abs(x-y)>jump);union+=Number(ab||bb);intersection+=Number(ab&&bb);brightChanged+=Number(ab!==bb);}
  return{pixels:a.length/3,changedPixels:changed,luminanceJumps:jumps,brightUnion:union,brightIntersection:intersection,brightMembershipChanges:brightChanged,brightJaccard:union?intersection/union:null};
}
