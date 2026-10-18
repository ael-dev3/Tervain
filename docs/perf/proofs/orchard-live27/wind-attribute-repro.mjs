import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import * as THREE from 'three';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const server=await createServer({root,configFile:false,logLevel:'error',server:{middlewareMode:true,hmr:false,ws:false}});
try {
 const {snapDetachedClumps}=await server.ssrLoadModule('/src/presentation/canopy.ts');
 const leaf=new THREE.PlaneGeometry(.2,.2).rotateX(-Math.PI/2),wood=new THREE.BoxGeometry(1,1,1);
 leaf.setAttribute('_wind',new THREE.Float32BufferAttribute(new Float32Array(leaf.attributes.position.count*4).fill(.5),4));
 leaf.setAttribute('_pivot',new THREE.Float32BufferAttribute(new Float32Array(leaf.attributes.position.count*3),3));
 const result=snapDetachedClumps(leaf,wood,1.5);
 assert.equal(result.moved,0);
 assert.deepEqual(Array.from(result.geometry.attributes.position.array),Array.from(leaf.attributes.position.array));
 assert.equal(result.geometry.index.count,leaf.index.count);
 // Baseline witness: this assertion intentionally stops matching after attribute preservation is fixed.
 assert.equal(result.geometry.getAttribute('_wind'),undefined);
 assert.equal(result.geometry.getAttribute('_pivot'),undefined);
 console.log(JSON.stringify({moved:result.moved,triangles:result.geometry.index.count/3,input:Object.keys(leaf.attributes),output:Object.keys(result.geometry.attributes),scope:'Source attribute-loss repro only; no shader, image or hardware PASS'}));
 leaf.dispose();wood.dispose();result.geometry.dispose();
} finally {await server.close();}
