import {expect,it} from 'vitest';
import {Habitat,newSample} from '../../src/presentation/ground/habitat';
import {WORLD} from '../../src/world/layout';

it('preserves all interpolated channels and output identity at cell and raster seams',()=>{
  const nodes=17,channels=5,data=new Float32Array(nodes*nodes*channels),requests:number[][]=[];
  for(let z=0;z<nodes;z++)for(let x=0;x<nodes;x++)for(let c=0;c<channels;c++)data[(z*nodes+x)*channels+c]=(x*x*.07+z*.31+c*.13)/23;
  const habitat=Object.create(Habitat.prototype) as Habitat;
  Object.defineProperty(habitat,'tile',{value:(x:number,z:number)=>{requests.push([x,z]);return data;}});
  const out=newSample(),names=['open','wet','dry','wood','slope'] as const;
  for(const gx of [-16-1e-8,-16,-16+1e-8,-.3,0,.25,1,15.99999999,16,16.00000001,31.7])for(const gz of [-.2,0,.7,15.9,16,16.1]){
    const x=WORLD.minX+gx*WORLD.cell,z=WORLD.minZ+gz*WORLD.cell;
    const actualGX=(x-WORLD.minX)/WORLD.cell,actualGZ=(z-WORLD.minZ)/WORLD.cell;
    const tx=Math.floor(actualGX/16),tz=Math.floor(actualGZ/16),fx=actualGX-tx*16,fz=actualGZ-tz*16;
    const i=Math.min(15,Math.max(0,Math.floor(fx))),j=Math.min(15,Math.max(0,Math.floor(fz))),u=fx-i,v=fz-j;
    expect(habitat.sample(x,z,out)).toBe(out);expect(requests.at(-1)).toEqual([tx,tz]);
    for(let c=0;c<channels;c++){
      const at=(dx:number,dz:number)=>data[((j+dz)*nodes+i+dx)*channels+c]!;
      const expected=(at(0,0)*(1-u)+at(1,0)*u)*(1-v)+(at(0,1)*(1-u)+at(1,1)*u)*v;
      expect(out[names[c]!]).toBeCloseTo(expected,14);
    }
  }
});
