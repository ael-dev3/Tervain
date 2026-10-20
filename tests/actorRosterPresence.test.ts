import {beforeAll,expect,it} from 'vitest';
import type RAPIER from '@dimforge/rapier3d-compat';
import {RealmPhysics,initializePhysics} from '../src/world/physics';
import {Colliders} from '../src/world/colliders';
import type {Terrain} from '../src/world/terrain';
const floor={nx:10,nz:10,vertexX:(i:number)=>i*2-10,vertexZ:(i:number)=>i*2-10,vertexHeight:()=>0,heightAt:()=>0,groundAt:()=>0} as unknown as Terrain;
const a={id:'person:a',x:0,y:0,z:0,radius:.25,height:1.8,active:true},b={...a,id:'person:b',x:3};
beforeAll(()=>initializePhysics());
it('updates an existing roster without constructing a membership Set',()=>{
 const p=new RealmPhysics(floor,new Colliders(),[]),NativeSet=globalThis.Set;let created=0,observed=-1;
 class ObservedSet<T> extends NativeSet<T>{constructor(values?:Iterable<T>|null){super(values);created++;}}
 try{p.syncActors([a,b]);globalThis.Set=ObservedSet;
  try{p.syncActors([a]);observed=created;}finally{globalThis.Set=NativeSet;}
  expect(observed).toBe(0);
  const actors=Reflect.get(p,'actors') as Map<string,{active:boolean;body:RAPIER.RigidBody}>;
  expect(actors.get(a.id)!.body.isEnabled()).toBe(true);
  expect(actors.get(b.id)!.active).toBe(false);expect(actors.get(b.id)!.body.isEnabled()).toBe(false);
 }finally{globalThis.Set=NativeSet;p.dispose();}
});
it('clears stale presence marks before rollover and keeps returning actors enabled',()=>{
 const p=new RealmPhysics(floor,new Colliders(),[]);
 try{p.syncActors([a,b]);const actors=Reflect.get(p,'actors') as Map<string,{active:boolean;body:RAPIER.RigidBody}>;
  Reflect.set(p,'actorSyncSerial',0x3ffffffe);p.syncActors([a]);
  expect(Reflect.get(p,'actorSyncSerial')).toBe(1);
  expect(actors.get(a.id)!.active).toBe(true);expect(actors.get(b.id)!.body.isEnabled()).toBe(false);
  p.syncActors([]);p.syncActors([]);expect(actors.get(a.id)!.body.isEnabled()).toBe(false);
  p.syncActors([{...b,x:8}]);expect(actors.get(b.id)!.active).toBe(true);
  expect(actors.get(b.id)!.body.translation().x).toBe(8);expect(actors.get(a.id)!.active).toBe(false);
 }finally{p.dispose();}
});
