import {expect,it} from 'vitest';
import {crownBoom,CROWN_CORE,CROWN_MIN_BOOM,type CameraCrown} from '../../src/presentation/cameraCrowns';

function reference(p:{x:number;y:number;z:number},d:{x:number;y:number;z:number},boom:number,crowns:readonly CameraCrown[]){
 const inside=(c:CameraCrown,t:number)=>{const x=p.x+d.x*t-c.x,y=p.y+d.y*t-c.y,z=p.z+d.z*t-c.z;return p.y+d.y*t>=c.floor&&(x*x+z*z)/(c.h*CROWN_CORE)**2+y*y/(c.v*CROWN_CORE)**2<1;};
 let allowed=boom;for(const c of crowns){if(inside(c,0))continue;for(let distance=.2;distance-.2<allowed;distance+=.2){const t=Math.min(distance,allowed);if(inside(c,t)){allowed=Math.min(allowed,t-.3);break;}if(t===allowed)break;}}
 return Math.max(Math.min(boom,CROWN_MIN_BOOM),allowed);
}
it.each([{x:4,z:3},{x:-4,z:3},{x:0,z:-4}])('skips a core outside the horizontal segment: %j',({x,z})=>{
 let reads=0;const c:CameraCrown={x,y:3,z,h:1,v:3,floor:0};Object.defineProperty(c,'y',{get(){reads++;return 3;}});
 expect(crownBoom({x:0,y:3,z:0},{x:0,y:0,z:1},6.2,[c])).toBe(6.2);
 expect(reads).toBeLessThanOrEqual(2);
});
it('matches the full sampled reference through turns, floors, inside pivots and short booms',()=>{
 let seed=12097;const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 for(let i=0;i<2000;i++){
  const p={x:(rand()-.5)*40,y:rand()*15,z:(rand()-.5)*40},yaw=rand()*Math.PI*2,pitch=(rand()-.5)*Math.PI,boom=.04+rand()*14;
  const d={x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:Math.cos(yaw)*Math.cos(pitch)};
  const crowns=Array.from({length:8},()=>({x:p.x+(rand()-.5)*30,y:rand()*20,z:p.z+(rand()-.5)*30,h:.1+rand()*12,v:.1+rand()*9,floor:rand()*5}));
  expect(crownBoom(p,d,boom,crowns)).toBe(reference(p,d,boom,crowns));
 }
});
it('retains boundary and rounding cases on the sampled path',()=>{
 for(const offset of [-1e-7,0,1e-7]){const c={x:.75+offset,y:3,z:3,h:1,v:2,floor:0},p={x:0,y:3,z:0},d={x:0,y:0,z:1};expect(crownBoom(p,d,6.2,[c])).toBe(reference(p,d,6.2,[c]));}
});
