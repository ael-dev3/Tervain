import {expect,it} from 'vitest';
import {GrassTrample,TRAMPLE_MAX_MOVERS,type GrassMover} from '../../src/presentation/grass/trample';

it('reuses mover selection storage across walking updates without changing nearest-body selection',()=>{
  const field=new GrassTrample(16,20,{x:0,z:0});
  const movers:GrassMover[]=Array.from({length:80},(_,i)=>({x:i,z:0,radius:.5}));
  movers.push({x:NaN,z:0,radius:1},{x:0,z:Infinity,radius:1},{x:0,z:0,radius:0});
  const original=movers.slice(),arrays=new Set<GrassMover[]>();
  try{
    for(let i=0;i<600;i++){
      const x=i%80;field.setMovers(movers,x,0);
      const selected=(field as unknown as {movers:GrassMover[]}).movers;
      arrays.add(selected);
      const expected=original.filter(m=>Number.isFinite(m.x)&&Number.isFinite(m.z)&&Number.isFinite(m.radius)&&m.radius>0)
        .sort((a,b)=>Math.abs(a.x-x)-Math.abs(b.x-x)).slice(0,TRAMPLE_MAX_MOVERS);
      expect(selected).toEqual(expected);
      expect(selected.every((m,j)=>m===expected[j])).toBe(true);
    }
    expect(movers).toEqual(original);
    expect(arrays.size).toBe(1);
  }finally{field.dispose();}
});

it('drops stale selection when empty and retains input order when distance ranking is unavailable',()=>{
  const field=new GrassTrample(16,20,{x:0,z:0});
  const movers=Array.from({length:60},(_,i)=>({x:i-20,z:0,radius:.5}));
  try{
    field.setMovers(movers,NaN,0);
    expect((field as unknown as {movers:GrassMover[]}).movers).toEqual(movers.slice(0,48));
    expect(field.activeMovers).toBe(21);
    field.setMovers([]);
    expect(field.activeMovers).toBe(0);
  }finally{field.dispose();}
});
