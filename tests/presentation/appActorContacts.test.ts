import * as THREE from 'three';
import { expect, it } from 'vitest';
import { App } from '../../src/app';

it('refreshes earlier resident contacts before the next resident moves and isolates replacement actors',()=>{
  const state={npcs:{first:{available:true},second:{available:true}}};
  const first={id:'first',x:0,y:0,z:0,solid:true,rig:{height:1.8},update:()=>{first.x=2;first.y=3;first.rig.height=2;first.solid=false;}};
  let observed:unknown;
  const second={id:'second',x:4,y:0,z:0,solid:true,rig:{height:1.8},update:(_dt:number,ctx:{residentContacts:unknown[]})=>{observed=JSON.parse(JSON.stringify(ctx.residentContacts[0]));}};
  const app=Object.assign(Object.create(App.prototype),{game:{state},npcs:[first,second],enemies:[],cam:{camera:new THREE.PerspectiveCamera()},poseFrustum:new THREE.Frustum(),viewMatrix:new THREE.Matrix4(),poseSphere:new THREE.Sphere(),poseCentre:new THREE.Vector3(),residentContactRecords:new WeakMap(),enemyContactRecords:new WeakMap(),actorContext:()=>({})});
  Reflect.get(app,'updateActors').call(app,1/60,7);
  expect(observed).toMatchObject({id:'person:first',x:2,minY:3,maxY:5,active:false});
  const contact=Reflect.get(app,'residentContact').call(app,first);
  state.npcs.first.available=false;first.solid=true;
  expect(Reflect.get(app,'residentContact').call(app,first).active).toBe(false);
  const replacement={...first,x:8};
  expect(Reflect.get(app,'residentContact').call(app,replacement)).not.toBe(contact);
});

it('refreshes enemy radius, height and alive state without sharing records across actors',()=>{
  const app=Object.assign(Object.create(App.prototype),{enemyContactRecords:new WeakMap()});
  const enemy={id:'one',x:1,y:2,z:3,radius:.4,alive:true,rig:{height:1.8}};
  Reflect.get(app,'enemyContact').call(app,enemy);
  Object.assign(enemy,{x:4,y:3,z:5,radius:.6,alive:false});enemy.rig.height=2;
  const refreshed=Reflect.get(app,'enemyContact').call(app,enemy);
  expect(refreshed).toMatchObject({x:4,z:5,r:.6,minY:3,maxY:5,active:false});
  expect(Reflect.get(app,'enemyContact').call(app,{...enemy})).not.toBe(refreshed);
});
