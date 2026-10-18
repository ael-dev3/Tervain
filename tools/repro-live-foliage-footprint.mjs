import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';
import { installRenderCost } from './render-cost.mjs';
import { textureUploadBytes } from './webgl-upload-bytes.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((v, i, a) => v.startsWith('--') ? [[v.slice(2), a[i + 1]]] : []));
const out = args.out ?? 'foliage-footprint-proof', ref = args.baseline ?? 'bcb881c';
const frames = Number(args.frames ?? 5); assert.ok(Number.isInteger(frames) && frames >= 1 && frames <= 9);
const controller = fs.readFileSync(new URL(import.meta.url));
const file = 'src/presentation/foliage/foliageMaterial.ts';
const before = execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8' });
const after = fs.readFileSync(file, 'utf8');
const block = source => source.match(/const LEAF_ALPHA_TEST_GLSL =[^`]*`([\s\S]*?)`;/)[1];
const blocks = { before: block(before), after: block(after) };
const hash = b => createHash('sha256').update(b).digest('hex');
const decode = png => sharp(Buffer.from(png.split(',')[1], 'base64')).removeAlpha().raw().toBuffer();
fs.mkdirSync(out, { recursive: true }); fs.rmSync(path.join(out, 'report.json'), { force: true });
const page = await liveProofPage(args.url ?? 'https://ael-dev3.github.io/Tervain/', { quality: 'high', hour: 12 });
const rows = [];
try {
  const setup = await page.eval(`
    (${installRenderCost.toString()})(${textureUploadBytes.toString()});
    const T=window.tervain,W=T.world,gl=T.renderer.getContext();T.present=()=>{};T.perf=null;T.settings.reducedMotion=true;
    let links=0;const link=gl.linkProgram.bind(gl);gl.linkProgram=(...a)=>{links++;return link(...a);};
    const materials=new Set();W.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])
      if(m?.customProgramCacheKey().includes('tervain-foliage-v6-leaf-'))materials.add(m);});
    if(!materials.size)throw Error('No production leaf materials');
    window.MIP={mode:'before',materials:[...materials],patches:0,blocks:${JSON.stringify(blocks)},
      use(mode){this.mode=mode;for(const m of this.materials)m.needsUpdate=true;},
      pose(i){const x=-210+Math.sin(.8)*i*2.6/60,z=Math.cos(.8)*i*2.6/60,h=W.terrain.heightAt(x,z),c=T.cam.camera;
        T.player.setPosition(x,z,0,W.terrain);c.position.set(x,h+2,z);const yaw=.8+i*.003;
        c.lookAt(x+30*Math.sin(yaw),h+5,z+30*Math.cos(yaw));c.updateMatrixWorld();
        const focus=T.player.group.position.clone().set(T.player.x,T.player.y,T.player.z);
        W.update(0,T.game.state,focus,T.settings,12,c,false);W.sky.cloudTime=0;W.sky.update(12,focus,0,false);
        W.foliage.wind.uniforms.uGrassTime.value=0;W.sway.uTime.value=0;T.grade.time=0;T.worldLook=null;
      },
      render(){const s=window.__renderCostStates.get(gl),u=s?.uploads??0,l=links;
        T.renderer.info.autoReset=false;T.renderer.info.reset();T.lastFrameDt=0;T.renderWorld();
        if(gl.getError()||gl.isContextLost())throw Error('Invalid production draw');
        return{png:T.renderer.domElement.toDataURL(),cost:{draws:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,
          textures:T.renderer.info.memory.textures,uploadBytes:(window.__renderCostStates.get(gl)?.uploads??0)-u,links:links-l}};
      }};
    MIP.pose(0);const G=W.modules.find(m=>m.name==='groundcover').module;
    for(let i=0;i<100;i++){G.prepare?.(T.renderer,0);G.update(0,{camera:T.cam.camera,focus:T.player.rig.root.position,reducedMotion:true});}
    const native=MIP.render();
    const sources=T.renderer.info.programs.map(p=>gl.getShaderSource(p.fragmentShader)).filter(s=>s?.includes('float tvLod ='));
    const nativePrograms={leaf:sources.length,shared:sources.filter(s=>s.includes('tvMip = max( 0.0, tvLod );')).length,
      duplicate:sources.filter(s=>s.includes('vec2 tvTexels =')).length};
    for(const m of MIP.materials){const hook=m.onBeforeCompile,key=m.customProgramCacheKey;
      m.onBeforeCompile=function(sh,r){hook.call(this,sh,r);
        const original=sh.fragmentShader.includes(MIP.blocks.before)?MIP.blocks.before:sh.fragmentShader.includes(MIP.blocks.after)?MIP.blocks.after:null;
        if(!original)throw Error('Production alpha block mismatch');
        sh.fragmentShader=sh.fragmentShader.replace(original,MIP.blocks[MIP.mode]);MIP.patches++;};
      m.customProgramCacheKey=function(){return key.call(this)+'|mip-proof-'+MIP.mode;};m.needsUpdate=true;
    }
    return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),size:[T.renderer.domElement.width,T.renderer.domElement.height],
      post:T.grade.enabled,samples:T.grade.target.samples,materials:materials.size,nativePrograms,native:native.png};`);
  assert.equal(setup.post, true); assert.equal(setup.samples, 4);
  const nativeSource = execFileSync('git', ['show', `${setup.build.revision}:${file}`], { encoding: 'utf8' });
  assert.ok(nativeSource === before || nativeSource === after, 'Served foliage source is neither tested variant');
  assert.ok(setup.nativePrograms.leaf > 0, 'No linked native leaf programs');
  assert.equal(setup.nativePrograms[nativeSource === after ? 'shared' : 'duplicate'], setup.nativePrograms.leaf, 'Compiled native shader mismatch');
  for (let i = 0; i < frames; i++) {
    await page.eval(`MIP.pose(${i});window.tervain.renderer.shadowMap.autoUpdate=true;MIP.use('before');MIP.render();
      window.tervain.renderer.shadowMap.autoUpdate=false;for(const mode of ['before','after']){MIP.use(mode);MIP.render();}return null;`);
    const pair = {};
    for (const mode of ['before', 'after', 'restored']) {
      const capture = await page.eval(`MIP.use('${mode === 'restored' ? 'before' : mode}');return MIP.render();`);
      pair[mode] = { pixels: await decode(capture.png), cost: capture.cost };
      assert.equal(capture.cost.links, 0, 'Unwarmed shader');
      const dir = path.join(out, mode); fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${i}.png`), Buffer.from(capture.png.split(',')[1], 'base64'));
    }
    assert.ok(pair.before.pixels.equals(pair.after.pixels), 'Candidate changed forest pixels');
    assert.ok(pair.before.pixels.equals(pair.restored.pixels), 'Restored forest drifted');
    assert.deepEqual(pair.after.cost, pair.before.cost); assert.deepEqual(pair.restored.cost, pair.before.cost);
    if (i === 0) assert.ok((await decode(setup.native)).equals(pair[nativeSource === before ? 'before' : 'after'].pixels), 'Unmodified native control differs');
    rows.push({ frame: i, pixelsIdentical: true, restored: true,
      hashes: Object.fromEntries(Object.entries(pair).map(([k,v]) => [k,hash(v.pixels)])),
      costs: Object.fromEntries(Object.entries(pair).map(([k,v]) => [k,v.cost])) });
    console.log(JSON.stringify(rows.at(-1)));
  }
  delete setup.native;
  assert.equal(fs.readFileSync(file, 'utf8'), after, 'Source changed during acquisition');
  assert.ok(controller.equals(fs.readFileSync(new URL(import.meta.url))), 'Controller changed during acquisition');
  assert.ok(await page.eval('return MIP.patches>0;'));
  const errors = page.console().filter(l => l.startsWith('[error]') || l.startsWith('[exception]'));
  assert.deepEqual(errors, [], 'Console errors');
  const report = { setup, baseline: ref, controllerSha256: hash(controller), sourceSha256: { before: hash(before), after: hash(after) }, rows, pass: true,
    frames, metres: (frames-1)*2.6/60,
    scope: 'Native post/MSAA whole-scene forest, frozen wind/cloud/film phases. Synthetic 60 Hz walk/turn poses. Each variant warms before measurement; shadows are cached within each pair. Exact restored and native controls, full RGB equality and paired draw/upload budgets. Not hardware timing or a shimmer fix.' };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report,null,2)+'\n');
} finally { page.close(); }
