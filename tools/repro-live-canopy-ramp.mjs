import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((v, i, a) => v.startsWith('--') ? [[v.slice(2), a[i + 1]]] : []));
const out = args.out ?? 'canopy-ramp-proof', file = 'src/presentation/foliage/foliageMaterial.ts';
fs.mkdirSync(out, { recursive: true });
fs.rmSync(path.join(out, 'report.json'), { force: true });
const sources = {
  before: execFileSync('git', ['show', '421d34b:' + file], { encoding: 'utf8' }),
  after: args['candidate-ref'] ? execFileSync('git', ['show', args['candidate-ref'] + ':' + file], { encoding: 'utf8' }) : fs.readFileSync(file, 'utf8'),
};
const expressions = Object.fromEntries(Object.entries(sources).map(([mode, source]) => {
  const line = source.split('\n').find(s => s.includes('tvShell * smoothstep('));
  const expression = line?.match(/smoothstep\(.*\)/)?.[0];
  if (!expression) throw Error('Canopy gap expression missing');
  return [mode, expression];
}));
const invalidEdges = s => [...s.matchAll(/smoothstep\(\s*(-?[\d.]+),\s*(-?[\d.]+),/g)].filter(m => Number(m[1]) >= Number(m[2])).length;
const cache = fs.mkdtempSync(path.join(tmpdir(), 'canopy-ramp-'));
const server = await createServer({ configFile: false, logLevel: 'error', cacheDir: cache, optimizeDeps: { noDiscovery: true }, server: { host: '127.0.0.1', port: 0, cors: true, hmr: false, ws: false }, plugins: [{ name: 'canopy-ramp', resolveId(id) { if (id === '/@canopy-ramp') return '\0' + id; }, load(id) { if (id === '\0/@canopy-ramp') return "export * as THREE from 'three';"; } }] });
let page;
try {
  await server.listen();
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  page = await liveProofPage(args.url ?? 'https://ael-dev3.github.io/Tervain/', { quality: 'low', hour: 11 });
  const report = await page.eval(`
    const {THREE}=await import(${JSON.stringify(origin)}+'/@canopy-ramp'),T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,expressions=${JSON.stringify(expressions)};
    const rows=[];F.group.traverse(mesh=>{if(mesh.isInstancedMesh&&mesh.name.endsWith(':foliage'))rows.push({mesh,material:mesh.material});});if(!rows.length)throw Error('No native leaf meshes');
    const compiled=[];for(const {material}of rows){const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms)};material.onBeforeCompile.call(material,shader,T.renderer);if(!shader.fragmentShader.includes(expressions.before))throw Error('Native opacity expression differs');compiled.push(shader.fragmentShader);}
    const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
    const geometry=()=>rows.map(({mesh})=>({name:mesh.name,p:Array.from(mesh.geometry.getAttribute('position').array),index:mesh.geometry.index?Array.from(mesh.geometry.index.array):null}));const geometryBefore=await hash(geometry());
    const N=1025,rt=new THREE.WebGLRenderTarget(N,1,{type:THREE.FloatType,depthBuffer:false}),quadGeometry=new THREE.PlaneGeometry(2,2),scene=new THREE.Scene(),camera=new THREE.Camera(),samples={},images={},cost={},created=[],oldTarget=T.renderer.getRenderTarget(),oldSamples=T.grade.target.samples,oldPosition=T.cam.camera.position.clone(),oldQuaternion=T.cam.camera.quaternion.clone();
    try{for(const mode of ['before','after']){const mat=new THREE.ShaderMaterial({vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'void main(){float tvClump=(gl_FragCoord.x-0.5)/'+(N-1)+'.0;gl_FragColor=vec4('+expressions[mode]+',0.,0.,1.);}',depthTest:false,depthWrite:false});const quad=new THREE.Mesh(quadGeometry,mat);scene.add(quad);T.renderer.setRenderTarget(rt);T.renderer.render(scene,camera);const data=new Float32Array(N*4);T.renderer.readRenderTargetPixels(rt,0,0,N,1,data);if(Array.from({length:N},(_,i)=>data[i*4+3]).some(a=>a!==1))throw Error('Ramp samples incomplete');samples[mode]=Array.from({length:N},(_,i)=>data[i*4]);scene.remove(quad);mat.dispose();}
      T.renderer.setRenderTarget(oldTarget);
      const target=F.canopyAuditTargets(0).find(t=>t.label==='tree:wild:40:42');if(!target)throw Error('Native oak missing');const e=target.matrix.elements;T.cam.camera.position.set(e[12]+Math.cos(.5)*15,e[13]+12,e[14]+Math.sin(.5)*15);T.cam.camera.lookAt(e[12],e[13]+10,e[14]);T.cam.camera.updateMatrixWorld(true);T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
      if(${args.images!=='0'})for(const mode of ['before','after']){for(const row of rows){const mat=row.material.clone(),hook=row.material.onBeforeCompile,key=row.material.customProgramCacheKey;mat.onBeforeCompile=function(shader,renderer){hook.call(this,shader,renderer);shader.fragmentShader=shader.fragmentShader.replace(expressions.before,expressions[mode]);};mat.customProgramCacheKey=function(){return key.call(this)+'|ramp-proof-'+mode;};row.mesh.material=mat;created.push(mat);}
        for(const msaa of [false,true]){T.grade.setMsaa(msaa);T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();const name=mode+'-'+(msaa?'4samples':'0samples');cost[name]={drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};images[name]=T.renderer.domElement.toDataURL('image/png');}
      }
    }finally{for(const row of rows)row.mesh.material=row.material;for(const mat of created)mat.dispose();T.grade.setMsaa(oldSamples>0);T.renderer.setRenderTarget(oldTarget);T.cam.camera.position.copy(oldPosition);T.cam.camera.quaternion.copy(oldQuaternion);T.cam.camera.updateMatrixWorld(true);rt.dispose();quadGeometry.dispose();}
    return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),quality:'low',label:'tree:wild:40:42',nativeLeafMeshCount:rows.length,nativeInvalidEdgeCalls:compiled.reduce((n,s)=>n+Array.from(s.matchAll(/smoothstep\\(\\s*(-?[\\d.]+),\\s*(-?[\\d.]+),/g)).filter(m=>Number(m[1])>=Number(m[2])).length,0),geometryBefore,geometryAfter:await hash(geometry()),samples,images,cost};
  `);
  for (const [name, data] of Object.entries(report.images)) fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
  delete report.images;
  report.changedChannels = {};
  if (args.images !== '0') for (const sample of ['0samples', '4samples']) {
    const pixels = await Promise.all(['before', 'after'].map(mode => sharp(path.join(out, mode + '-' + sample + '.png')).raw().toBuffer()));
    report.changedChannels[sample] = pixels[0].reduce((n, v, i) => n + Number(v !== pixels[1][i]), 0);
  }
  report.expressions = expressions;
  report.invalidEdgeCalls = Object.fromEntries(Object.entries(expressions).map(([k, v]) => [k, invalidEdges(v)]));
  report.candidateInvalidEdgeCalls = report.nativeInvalidEdgeCalls - report.nativeLeafMeshCount * (report.invalidEdgeCalls.before - report.invalidEdgeCalls.after);
  report.sourceSha256 = Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, createHash('sha256').update(v).digest('hex')]));
  report.maxRampDifference = Math.max(...report.samples.before.map((v, i) => Math.abs(v - report.samples.after[i])));
  report.maxExpectedError = Math.max(...report.samples.after.map((v, i) => { const t = Math.max(0, Math.min(1, (.5 - i / 1024) / (.5 - .27))); return Math.abs(v - t * t * (3 - 2 * t)); }));
  report.scope = 'Published native leaf shaders and full wooded view. Only the extracted canopy-gap expression is overlaid. Scalar float captures cover 1025 noise inputs. Four-sample control uses the same Low world geometry, not a Medium world rebuild. Readbacks are diagnostics, not hardware timings or a shimmer score.';
  report.pass = report.nativeInvalidEdgeCalls > 0 && report.invalidEdgeCalls.before === 1 && report.invalidEdgeCalls.after === 0 && report.candidateInvalidEdgeCalls === 0 && report.maxRampDifference === 0 && report.maxExpectedError < 1e-6 && report.geometryBefore === report.geometryAfter && (args.images === '0' || ['0samples', '4samples'].every(s => report.changedChannels[s] === 0 && JSON.stringify(report.cost['before-' + s]) === JSON.stringify(report.cost['after-' + s])));
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report, samples: undefined }));
  if (!report.pass) process.exitCode = 1;
} finally { page?.close(); await server.close(); fs.rmSync(cache, { recursive: true, force: true }); }
