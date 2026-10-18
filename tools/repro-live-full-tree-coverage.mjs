import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const count=Number(args.frames??5);assert.ok(Number.isInteger(count)&&count>=2&&count<=31);
const out=args.out??'full-tree-coverage';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const source=fs.readFileSync('src/presentation/distanceVisibility.ts','utf8');
const candidateStart=source.indexOf('#ifndef TV_LEAF_SHADE_ONLY'),candidateEnd=source.indexOf('#endif',candidateStart)+6;
const candidate=source.slice(candidateStart,candidateEnd);
assert.ok(candidate.includes('if (vDistanceCoverage.x > 0.0 || vDistanceCoverage.y < 1.0)'));
const {liveProofPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./live-proof-page.mjs');
const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:12});
const rgb=png=>sharp(Buffer.from(png.split(',')[1],'base64')).removeAlpha().raw().toBuffer();
const hash=data=>createHash('sha256').update(data).digest('hex');
try{
 const setup=await page.eval(`const T=window.tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module;
 T.present=()=>{};T.settings.reducedMotion=true;T.lastFrameDt=0;T.cam.manual=true;T.perf?.end(0);T.perf=null;
 const materials=[...new Set(F.group.children.filter(o=>o.isInstancedMesh&&o.geometry.getAttribute('aDistanceCoverage')).map(o=>o.material))].filter(m=>m&&!Array.isArray(m));
 window.FC={toggle:{value:0},programs:[],
 place(i){const x=-210+i*.043333333333,z=i*.02,h=W.terrain.heightAt(x,z),c=T.cam.camera,yaw=.8+i*.003;
 if(x<W.terrain.vertexX(0)||x>W.terrain.vertexX(W.terrain.nx)||z<W.terrain.vertexZ(0)||z>W.terrain.vertexZ(W.terrain.nz))throw Error('Out of terrain');
 T.player.setPosition(x,z,0,W.terrain);c.position.set(x,h+2,z);c.lookAt(x+30*Math.sin(yaw),h+5,z+30*Math.cos(yaw));c.updateMatrixWorld();
 W.update(0,T.game.state,T.player.group.position,T.settings,12,c,false);W.sky.cloudTime=0;W.foliage.wind.uniforms.uGrassTime.value=0;W.sway.uTime.value=0;T.grade.time=0;T.worldLook=null;},
 render(){T.renderer.info.autoReset=false;T.renderer.info.reset();T.renderWorld();const gl=T.renderer.getContext();
 if(gl.getError()||gl.isContextLost())throw Error('Invalid native draw');
 const coverage=[];for(const mesh of F.group.children){const a=mesh.geometry?.getAttribute('aDistanceCoverage');if(!a||!mesh.visible||!mesh.count)continue;
 let full=0,partial=0;for(let i=0;i<mesh.count;i++){if(a.getX(i)<=0&&a.getY(i)>=1)full++;else partial++;}coverage.push({mesh:mesh.name,full,partial});}
 return {png:T.renderer.domElement.toDataURL(),coverage,cost:{draws:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textures:T.renderer.info.memory.textures}};}};
 FC.place(0);const G=W.modules.find(m=>m.name==='groundcover').module;for(let i=0;i<100;i++){G.prepare?.(T.renderer,0);G.update(0,{camera:T.cam.camera,focus:T.player.group.position,reducedMotion:true});}
 FC.render();T.renderer.shadowMap.autoUpdate=false;const native=FC.render();
 for(const material of materials){const compile=material.onBeforeCompile,key=material.customProgramCacheKey;
 material.onBeforeCompile=function(sh,r){compile.call(this,sh,r);
 const re=/float tvCoverageSample = ([^;]+);\\s*#ifndef TV_LEAF_SHADE_ONLY\\s*if \\(tvCoverageSample < vDistanceCoverage.x \\|\\| tvCoverageSample >= vDistanceCoverage.y\\) discard;\\s*#endif/;
 const match=sh.fragmentShader.match(re);if(!match)throw Error('Missing native distance rule: '+material.name);
 sh.uniforms.uFullCoverageProof=FC.toggle;
 sh.fragmentShader='uniform float uFullCoverageProof;\\n'+sh.fragmentShader.replace(re,
 ${JSON.stringify(candidate)}.replace('$'+'{world}',match[1]).replace('if (vDistanceCoverage.x > 0.0', 'if (uFullCoverageProof < 0.5 || vDistanceCoverage.x > 0.0'));
 FC.programs.push(material.name||material.type);
 };material.customProgramCacheKey=function(){return key.call(this)+'|full-coverage-proof';};material.needsUpdate=true;}
 const control=FC.render();return {native:native.png,control:control.png,samples:T.grade.target.samples,post:T.grade.enabled,
 build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),size:[T.renderer.domElement.width,T.renderer.domElement.height]};`);
 assert.equal(hash(await rgb(setup.native)),hash(await rgb(setup.control)),'Inactive adapter changed native pixels');
 delete setup.native;delete setup.control;assert.equal(setup.samples,4);assert.equal(setup.post,true);
 const rows=[];
 console.log(JSON.stringify({setup:setup.build}));
 for(let i=0;i<count;i++){
   await page.eval(`FC.toggle.value=0;FC.place(${i});FC.render();return null;`);
   const before=await page.eval('FC.toggle.value=0;return FC.render();');
   const after=await page.eval('FC.toggle.value=1;return FC.render();');
   const restored=await page.eval('FC.toggle.value=0;return FC.render();');
   const a=await rgb(before.png),b=await rgb(after.png),c=await rgb(restored.png);let changed=0;for(let k=0;k<a.length;k+=3)changed+=Number(a[k]!==b[k]||a[k+1]!==b[k+1]||a[k+2]!==b[k+2]);
   assert.equal(changed,0);assert.equal(hash(a),hash(c));assert.deepEqual(before.cost,after.cost);assert.deepEqual(before.coverage,after.coverage);
   assert.ok(new Set(a).size>100,'Blank image');
   for(const [mode,r]of [['before',before],['after',after]]){const dir=path.join(out,mode);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,String(i).padStart(4,'0')+'.png'),Buffer.from(r.png.split(',')[1],'base64'));}
   console.log(JSON.stringify({frame:i,changedPixels:changed}));
   rows.push({frame:i,changedPixels:changed,beforeHash:hash(a),afterHash:hash(b),restoredHash:hash(c),cost:before.cost,coverage:before.coverage});
 }
 const programs=await page.eval('return FC.programs');assert.ok(programs.length>0);
 const report={setup,programs,rows,pass:true,sourceSha256:hash(source),scope:'Native High post/MSAA forest synthetic walk/turn, clock and wind fixed. Full colour images and restored baseline exact. Coverage rows are submitted instances, not fragment invocations; no hardware timing claim. General shimmer and LOD shape differences remain open.'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({build:setup.build,pairs:rows.length,programs:programs.length,pass:true}));
}finally{page.close();}
