import { expect, it } from 'vitest';
import { Region } from '../../src/presentation/regions';
import { Ctx } from '../../src/presentation/buildKit';
import { woodpile } from '../../src/presentation/structures';
import { mulberry32 } from '../../src/world/noise';

it.each([0, .6, .9, -1.2])('seats every bottom log on rotated slope %s without changing the stack', yaw => {
  const ground = (x: number, z: number) => .04 * x - .025 * z;
  const make = (seat: boolean) => {
    const r = new Region('pile', new Ctx());r.ctx.push(2,ground(2,3),3,.3);
    woodpile(r,mulberry32(6100),0,0,yaw,1.6,4,seat?ground:undefined);r.ctx.pop();return r.bark;
  };
  const before=make(false), after=make(true), shift=after.p.a[1]!-before.p.a[1]!;
  expect(shift).toBeLessThan(-.01);expect(shift).toBeGreaterThan(-.15);
  expect(after.ix.a.slice(0,after.ix.n)).toEqual(before.ix.a.slice(0,before.ix.n));
  for (const name of ['nr','uv','co'] as const) expect(after[name].a.slice(0,after[name].n)).toEqual(before[name].a.slice(0,before[name].n));
  for(let i=0;i<after.p.n;i+=3){expect(after.p.a[i]).toBe(before.p.a[i]);expect(after.p.a[i+2]).toBe(before.p.a[i+2]);expect(after.p.a[i+1]!-before.p.a[i+1]!).toBeCloseTo(shift,6);}
  // Each five-sided capped log has 24 vertices; first seven are the supporting row.
  for(let log=0;log<7;log++){
    let foot=log*72;for(let i=foot;i<(log+1)*72;i+=3)if(after.p.a[i+1]!<after.p.a[foot+1]!)foot=i;
    const gap=after.p.a[foot+1]!-ground(after.p.a[foot]!,after.p.a[foot+2]!);
    expect(gap).toBeLessThanOrEqual(-.00999);expect(gap).toBeGreaterThan(-.15);
  }
});

it('does not shift geometry authored before the stack or consume extra random values', () => {
  const make=(seat:boolean)=>{const r=new Region('pile',new Ctx());r.bark.box(.2,.2,.2,8,0,8,0xffffff);const previous=r.bark.p.a.slice(0,r.bark.p.n),rng=mulberry32(6100);woodpile(r,rng,0,0,0,1.6,4,seat?()=>0:undefined);return{r,previous,next:rng()};};
  const before=make(false),after=make(true);expect(after.next).toBe(before.next);
  expect(after.r.bark.p.a.slice(0,after.previous.length)).toEqual(after.previous);
  expect(after.r.bark.p.n).toBe(before.r.bark.p.n);
});

it('grounds both published standalone placements on their actual terrain', async () => {
  const { Terrain } = await import('../../src/world/terrain');
  const terrain = new Terrain(), ground=(x:number,z:number)=>terrain.heightAt(x,z);
  for(const [x,z,yaw,len] of [[-87,36,.6,1.6],[-96+2.45*Math.cos(.9)+3.15*Math.sin(.9),59-2.45*Math.sin(.9)+3.15*Math.cos(.9),.9,1.5]]){
    const r=new Region('pile',new Ctx());r.ctx.push(0,ground(x!,z!),0);woodpile(r,mulberry32(6100),x!,z!,yaw!,len!,4,ground);r.ctx.pop();
    for(let log=0;log<7;log++){
      let f=log*72;for(let i=f;i<(log+1)*72;i+=3)if(r.bark.p.a[i+1]!<r.bark.p.a[f+1]!)f=i;
      expect(r.bark.p.a[f+1]!-ground(r.bark.p.a[f]!,r.bark.p.a[f+2]!)).toBeLessThan(-.0099);
    }
  }
});
