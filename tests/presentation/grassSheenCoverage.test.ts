import {describe,expect,it} from 'vitest';
import {GRASS_BLADE_GLSL} from '../../src/presentation/grass/grassMaterial';
// Evaluate the production lighting assignment, rather than a separately maintained fade formula.
const info=GRASS_BLADE_GLSL.match(/vGInfo = vec2\(([^;]+)\);/)?.[1];
if(!info)throw Error('Missing grass-light assignment');
const expressions=info.split(',');
const evaluate=new Function('uLook','aTint','gT','gThin','gBladeCov','gThrough','gLying',`return [${expressions.join(',')}];`) as (...args:unknown[])=>number[];
function light(width:number,t=.9){
 const q=Math.max(0,Math.min(1,(width-.8)/(2.5-.8))),coverage=q*q*(3-2*q);
 const thin=GRASS_BLADE_GLSL.match(/float gThin = ([^;]+);/)?.[1];
 if(!thin)throw Error('Missing transmission thickness');
 const gThin=new Function('mix','gBladeCov',`return ${thin};`)((a:number,b:number,q:number)=>a*(1-q)+b*q,coverage);
 return evaluate({z:1,w:.3},{w:.8},t,gThin,coverage,.75,0);
}
describe('grass highlight sampling footprint',()=>{
 it.each([0,.01,.4,.79,.8])('rejects unresolved highlight energy at %s pixels',width=>{
  const [through,sheen]=light(width);expect(sheen).toBe(0);expect(through).toBeCloseTo(.75*.8*.4,8);
 });
 it.each([2.5,5,20])('preserves resolved highlight strength at %s pixels',width=>{
  const [through,sheen]=light(width);expect(sheen).toBeCloseTo(.3*.8*(.35+.65*.9),8);expect(through).toBeCloseTo(.75*.8,8);
 });
 it('fades continuously without overshooting resolved strength',()=>{
  let previous=0;for(let i=0;i<=100;i++){const value=light(i/20)[1]!;expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(previous-1e-12);expect(value).toBeLessThanOrEqual(light(20)[1]!+1e-12);previous=value;}
 });
});
