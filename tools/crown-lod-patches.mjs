import * as THREE from 'three';
import {attachInstanceDistanceVisibility as before} from '/tools/baseline-distance.ts';
import {attachInstanceDistanceVisibility as after} from '/src/presentation/distanceVisibility.ts';
export {THREE};
/** Obtain the production hook's exact chunks, rather than maintain a second shader implementation. */
export function distancePatches(){const result={};for(const [mode,attach]of [['before',before],['after',after]]){
 const material=new THREE.MeshStandardMaterial(),geometry=new THREE.PlaneGeometry(),mesh=new THREE.InstancedMesh(geometry,material,1),visibility=attach(mesh);
 const shader={uniforms:{},vertexShader:'__v0__#include <common>__v1__#include <begin_vertex>__v2__',fragmentShader:'__f0__#include <common>__f1__void main() {__f2__#include <alphatest_fragment>__f3__}'};
 material.onBeforeCompile(shader,{});
 const between=(text,a,b)=>text.split(a)[1].split(b)[0];
 result[mode]={vertexDecl:between(shader.vertexShader,'__v0__','__v1__').replace('#include <common>',''),vertexBody:between(shader.vertexShader,'__v1__','__v2__').replace('#include <begin_vertex>',''),
   fragmentDecl:between(shader.fragmentShader,'__f0__','__f1__').replace('#include <common>',''),prelude:between(shader.fragmentShader,'__f1__','__f2__').replace('void main() {',''),
   fragmentBody:between(shader.fragmentShader,'__f2__','__f3__').replace('#include <alphatest_fragment>',''),viewport:shader.uniforms.uDistanceViewport};
 visibility.dispose();mesh.dispose();geometry.dispose();material.dispose();
}return result;}
