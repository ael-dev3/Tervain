import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer,transformWithOxc} from 'vite';
import * as THREE from 'three';
const baseline=(await transformWithOxc(execFileSync('git',['show','0b45a36:src/presentation/canopy.ts'],{encoding:'utf8'}),'baseline.ts')).code;
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline',resolveId(id){if(id==='/@baseline')return '\0baseline';},load(id){if(id==='\0baseline')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});
try{
 const old=await server.ssrLoadModule('/@baseline'),now=await server.ssrLoadModule('/src/presentation/canopy.ts'),leaf=new THREE.SphereGeometry(4,24,16).translate(0,5,0),wood=new THREE.CylinderGeometry(.25,.5,6,8).translate(0,3,0);
 let beforeClones=0,afterClones=0,differences=0,words=0;const original=THREE.Vector3.prototype.clone;let clones=0;THREE.Vector3.prototype.clone=function(){clones++;return original.call(this);};
 try{for(const seed of [1,31,177,991])for(const [options,cards]of [[now.NEAR_CANOPY,3200],[now.MID_CANOPY,1600]]){clones=0;const a=old.buildCanopy(leaf,wood,{...options,cards,seed});beforeClones+=clones;clones=0;const b=now.buildCanopy(leaf,wood,{...options,cards,seed});afterClones+=clones;for(const key of ['position','normal','uv','index']){const x=key==='index'?a.index.array:a.getAttribute(key).array,y=key==='index'?b.index.array:b.getAttribute(key).array;words+=x.length;differences+=Number(!Buffer.from(x.buffer,x.byteOffset,x.byteLength).equals(Buffer.from(y.buffer,y.byteOffset,y.byteLength)));}a.dispose();b.dispose();}}finally{THREE.Vector3.prototype.clone=original;}
 const report={schema:1,baselineRef:'0b45a36',sourceSha256:createHash('sha256').update(fs.readFileSync('src/presentation/canopy.ts')).digest('hex'),scope:'Actual canopy builders, controlled source sphere/trunk, four seeds and near/mid options. Clone counts and exact output buffers, not hardware timing or the unreleased crown revision.',beforeClones,afterClones,comparedElements:words,differentArrays:differences,pass:differences===0&&beforeClones-afterClones===38400};fs.writeFileSync(process.argv[2]??'canopy-card-basis.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
