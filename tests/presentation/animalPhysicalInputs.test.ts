import * as THREE from 'three';
import fs from 'node:fs';
import {expect,it} from 'vitest';
import {buildAnimals} from '../../src/presentation/animals';
import {ANIMALS} from '../../src/presentation/animals/catalog';
import {Colliders} from '../../src/world/colliders';
import type {Terrain} from '../../src/world/terrain';
import type {AnimalHuntRecord} from '../../src/game/hunting';
import {createInitialState} from '../../src/game/state';
import {worldView} from '../../src/game/worldView';
import type {FrameContext} from '../../src/presentation/context';
import {animalFixture} from './animalFixture';
const tigerDefinition=ANIMALS.find(a=>a.species==='tiger')!, mountDefinition=ANIMALS.find(a=>a.tame)!;
const definitions=[tigerDefinition,mountDefinition];
const tigerId='animal:'+tigerDefinition.id,mountId='animal:'+mountDefinition.id;
const terrain={heightAt:()=>0,groundAt:()=>0,walkable:()=>true,carveAt:()=>0,seaDepth:()=>0,deckAt:()=>null,normalAt:(_x:number,_z:number,out:number[])=>{out[0]=0;out[1]=1;out[2]=0;return out;}} as unknown as Terrain;
const build=()=>buildAnimals({terrain,colliders:new Colliders(),quality:'low'},new Map(definitions.map(d=>[d.id,animalFixture(3)])),definitions,()=>{});
it('reuses physical input records while refreshing every moved root',()=>{
 const world=build(),arrays=new Set(),records=new Set(),snapshots=[];try{const roots=world.movers!();for(let i=0;i<120;i++){for(const root of roots){root.position.x+=.01;root.position.y+=.001;root.position.z+=.02;}const rows=world.physicalActors;arrays.add(rows);for(const row of rows){records.add(row);const root=roots.find(r=>r.name.endsWith(' / '+row.id.slice(7)))!;expect([row.x,row.y,row.z]).toEqual(root.position.toArray());expect(row.active).toBe(true);expect(row.radius).toBeGreaterThan(0);expect(row.height).toBeGreaterThan(0);}snapshots.push(structuredClone(rows));}
 if(process.env.ANIMAL_INPUT_RECEIPT)fs.writeFileSync(process.env.ANIMAL_INPUT_RECEIPT,JSON.stringify({calls:120,animals:definitions.length,arrayIdentities:arrays.size,recordIdentities:records.size,snapshots},null,2)+'\n');
 expect(arrays.size).toBe(1);expect(records.size).toBe(2);
 }finally{world.dispose?.();}
});
it('removes ridden and skinned inputs, refreshes corpse dimensions and restores visible records',()=>{
 const world=build();try{expect(world.physicalActors).toHaveLength(2);const mount=world.mount(mountDefinition.id)!;world.ride(mountDefinition.id,{...mount,speed:0});expect(world.physicalActors.map(a=>a.id)).toEqual([tigerId]);world.ride(mountDefinition.id,null);
 const tiger=world.snapshot().find(a=>a.id===tigerDefinition.id)!,record:AnimalHuntRecord={status:'dead',bodyHits:2,headshot:false,position:{x:tiger.x,y:tiger.y,z:tiger.z},yaw:tiger.yaw,atClock:1};
 world.syncHunting({tiger:record},true);const input={camera:new THREE.PerspectiveCamera(),focus:new THREE.Vector3(150,0,22),time:0,nightness:0,sunDir:new THREE.Vector3(0,1,0),reducedMotion:false,hour:12,view:worldView(createInitialState()),quality:'low',wildlifeActive:true} as FrameContext;for(let i=0;i<60;i++)world.update(1/60,input);const corpse=world.contacts.find(c=>c.id===tigerId)!,actor=world.physicalActors.find(a=>a.id===tigerId)!;expect(corpse.kind).toBe('box');if(corpse.kind!=='box')throw Error('Expected corpse box');expect(actor.radius).toBe(Math.max(.18,Math.hypot(corpse.hw,corpse.hd)));expect(actor.height).toBe(Math.max(.25,corpse.maxY!-corpse.minY!));expect(actor.y).toBe(corpse.minY);
 world.syncHunting({tiger:{...record,status:'skinned'}},true);expect(world.physicalActors.map(a=>a.id)).toEqual([mountId]);world.syncHunting({},true);expect(world.physicalActors).toHaveLength(2);
 }finally{world.dispose?.();}
});
it('does not share returned storage between worlds',()=>{const a=build(),b=build();try{expect(a.physicalActors).not.toBe(b.physicalActors);expect(a.physicalActors[0]).not.toBe(b.physicalActors[0]);}finally{a.dispose?.();b.dispose?.();}});
