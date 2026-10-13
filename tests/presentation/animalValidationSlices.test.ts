import * as THREE from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { validateAnimalTemplate, validateAnimalTemplateAsync } from '../../src/presentation/animals';
import { ANIMALS } from '../../src/presentation/animals/catalog';
import { animalFixture, animalTemplates } from './animalFixture';
const dog=ANIMALS.find(a=>a.species==='dog')!;
afterEach(()=>vi.restoreAllMocks());
function skinOf(source:ReturnType<typeof animalFixture>) {return source.scene.children.find(o=>(o as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;}

it('matches native skinned bounds with pose, nested transform and static accessories, in bounded batches',async()=>{
 const source=animalFixture(20),skin=skinOf(source),weights=skin.geometry.getAttribute('skinWeight');
 source.scene.position.y=.03;source.scene.rotation.y=.2;skin.skeleton.getBoneByName('head')!.position.x=.12;
 const horn=new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1),new THREE.MeshStandardMaterial());horn.position.set(.4,.6,0);source.scene.add(horn);
 source.scene.updateMatrixWorld(true);skin.computeBoundingBox();const expected=new THREE.Box3().setFromObject(source.scene);Reflect.set(skin,'boundingBox',null);
 let vertices=0,weightReads=0,totalVertices=0,maxVertices=0,maxWeights=0,yields=0;
 const get=skin.getVertexPosition,read=weights.getComponent;
 vi.spyOn(skin,'getVertexPosition').mockImplementation(function(i,out){vertices++;totalVertices++;return get.call(skin,i,out);});
 vi.spyOn(weights,'getComponent').mockImplementation((i,k)=>{weightReads++;return read.call(weights,i,k);});
 const actual=await validateAnimalTemplateAsync(source,dog,{budgetMs:0,yieldNow:async()=>{
  yields++;maxVertices=Math.max(maxVertices,vertices);maxWeights=Math.max(maxWeights,weightReads);
  if(skin.boundingBox!==null)expect(totalVertices).toBe(skin.geometry.getAttribute('position').count);
  vertices=weightReads=0;
 }});
 expect(actual.bounds.min.toArray()).toEqual(expected.min.toArray());expect(actual.bounds.max.toArray()).toEqual(expected.max.toArray());
 expect(totalVertices).toBe(skin.geometry.getAttribute('position').count);expect(maxVertices).toBe(512);expect(maxWeights).toBe(512*4);expect(yields).toBeGreaterThan(4);
 expect(actual.triangles).toBe((skin.geometry.index!.count+horn.geometry.index!.count)/3);expect(actual.motionSpeeds).toEqual({Walk:1,Run:2.6});
});

it('does not publish partial skin bounds when cancelled during a bounds batch',async()=>{
 const source=animalFixture(20),skin=skinOf(source),controller=new AbortController(),reason=new Error('cancel fixture');let read=false;
 const get=skin.getVertexPosition;vi.spyOn(skin,'getVertexPosition').mockImplementation((i,out)=>{read=true;return get.call(skin,i,out);});
 await expect(validateAnimalTemplateAsync(source,dog,{budgetMs:0,signal:controller.signal,yieldNow:async()=>{if(read)controller.abort(reason);}})).rejects.toBe(reason);
 expect(skin.boundingBox).toBeNull();expect(validateAnimalTemplate(source,dog).bounds.isEmpty()).toBe(false);
});

it('rejects a malformed weight beyond the first batch before computing bounds',async()=>{
 const source=animalFixture(20),skin=skinOf(source);skin.geometry.getAttribute('skinWeight').setX(650,.3);let yields=0;
 await expect(validateAnimalTemplateAsync(source,dog,{budgetMs:0,yieldNow:async()=>{yields++;}})).rejects.toThrow(/normalized/);
 expect(yields).toBeGreaterThan(0);expect(skin.boundingBox).toBeNull();
 expect(()=>validateAnimalTemplate(source,dog)).toThrow(/normalized/);
});

it('matches Three bounds for supplied moving and seated source skins',async()=>{
 const definitions=[dog,ANIMALS.find(a=>a.seated)!],templates=await animalTemplates(definitions);
 for(const definition of definitions){const source=templates.get(definition.id)!,skins:THREE.SkinnedMesh[]=[];source.scene.traverse(o=>{if((o as THREE.SkinnedMesh).isSkinnedMesh)skins.push(o as THREE.SkinnedMesh);});
  source.scene.updateMatrixWorld(true);skins.forEach(s=>s.computeBoundingBox());const expected=new THREE.Box3().setFromObject(source.scene);skins.forEach(s=>{Reflect.set(s,'boundingBox',null);});
  const actual=await validateAnimalTemplateAsync(source,definition,{budgetMs:0,yieldNow:async()=>{}});
  expect(actual.bounds.min.toArray()).toEqual(expected.min.toArray());expect(actual.bounds.max.toArray()).toEqual(expected.max.toArray());
 }
});
