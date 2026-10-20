import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {createServer} from 'vite';
const root=new URL(process.argv[2]??'./',import.meta.url),bytes=fs.readFileSync(new URL('native.json.gz',root));
if(createHash('sha256').update(bytes).digest('hex')!==fs.readFileSync(new URL('native.sha256',root),'utf8').split(/\s/)[0])throw Error('Native fixture checksum mismatch');
const r=JSON.parse(gunzipSync(bytes)),w=JSON.parse(fs.readFileSync(new URL('witnesses.json',root))),server=await createServer({server:{middlewareMode:true},logLevel:'error'});
try{
 const {detachedClumpSet}=await server.ssrLoadModule('/src/diagnostics/canopyConnectivity.ts'),{woodAnchor}=await server.ssrLoadModule('/src/presentation/canopy.ts');
 const make=d=>{const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(d.position,3));if(d.index)g.setIndex(d.index);return g;},wood=make(r.wood),leaf=make(r.leaves),p=leaf.getAttribute('position'),scale=Math.hypot(...r.matrix.slice(0,3)),set=detachedClumpSet(leaf,wood,1.5/scale,.75/scale),anchor=woodAnchor(wood),hit=new THREE.Vector3(),point=new THREE.Vector3(),corner=new THREE.Vector3(),rows=[];
 if(set.far.filter(Boolean).length!==55||w.rows.length!==10)throw Error('Native flag/witness count changed');
 for(const row of w.rows){const {triangle,barycentric}=row.witness;if(barycentric.some(v=>v<0||v>1)||Math.abs(barycentric.reduce((n,v)=>n+v,0)-1)>1e-10)throw Error('Point outside leaf triangle');point.set(0,0,0);for(let k=0;k<3;k++)point.addScaledVector(corner.fromBufferAttribute(p,leaf.index.getX(triangle*3+k)),barycentric[k]);const d=anchor(point,hit)*scale;if(!set.far[row.part]||d>1.5||Math.abs(d-row.distanceWorld)>1e-6)throw Error('Contact witness failed');rows.push({part:row.part,distanceWorld:d,point:point.toArray(),woodPoint:hit.toArray()});}
 const report={build:r.build,label:r.label,scale,oldFlags:set.far.filter(Boolean).length,verifiedUnmaskedContacts:rows.length,rows,scope:'Positive points on original indexed leaf triangles inside the world-metre wood reach despite sampled distance flags. No opaque-alpha, visual-island, repair, hardware or budget claim.'};console.log(JSON.stringify(report,null,2));
}finally{await server.close();}
