import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { walkingFlicker, rgbFrame } from './foliage-motion-metric.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((a, i, all) => a.startsWith('--') ? [[a.slice(2), all[i + 1]]] : []));
const out = args.out ?? 'crown-stipple-motion';
const count = Number(args.frames ?? 9);
const nativeMode = args.native ?? 'before';
assert.ok(['before', 'after'].includes(nativeMode));
assert.ok(Number.isInteger(count) && count >= 5 && count <= 61);
fs.mkdirSync(out, { recursive: true });
fs.rmSync(path.join(out, 'report.json'), { force: true });
const source = fs.readFileSync('src/presentation/foliage/foliageMaterial.ts', 'utf8');
const start = source.indexOf('float tvInRamp = step( 0.0, tvCov )');
const end = source.indexOf('if ( diffuseColor.a <= 0.0 ) discard;', start);
assert.ok(start >= 0 && end > start);
const candidate = source.slice(start, end);
assert.ok(candidate.includes('tvStipple *= 1.0 - smoothstep( 0.0, 1.0, tvMip )'));
const { liveProofPage } = await import(args.driver ? pathToFileURL(path.resolve(args.driver)).href : './live-proof-page.mjs');
const routes = [
  { name: 'forest', x: -210, z: 0, yaw: .8, rise: 3, roi: { left: 256, top: 0, width: 384, height: 280 } },
  { name: 'far-fir', x: -199.2356279095, z: -53.0698323403, yaw: Math.PI / 2, targetY: 20,
    roi: { left: 160, top: 0, width: 320, height: 260 }, target: { x: -134.2356279095, z: -53.0698323403, distance: 65 } },
].filter(route => !args.route || route.name === args.route);
assert.ok(routes.length > 0, 'Unknown route');
for (const route of routes) fs.rmSync(path.join(out, `route-${route.name}.json`), { force: true });
const page = await liveProofPage(args.url ?? 'https://ael-dev3.github.io/Tervain/', { quality: 'high', hour: 12, headed: args.headed === '1' });
const decode = async png => sharp(Buffer.from(png.split(',')[1], 'base64')).removeAlpha().raw().toBuffer();
const hash = b => createHash('sha256').update(b).digest('hex');
const all = [];
try {
  const setup = await page.eval(`
    const T=window.tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module;
    T.present=()=>{};T.perf?.end(0);T.perf=null;T.settings.reducedMotion=true;T.lastFrameDt=0;T.cam.manual=true;
    const meshes=F.group.children.filter(o=>/:foliage(:depth)?$/.test(o.name)&&/^(hero-pine|solitary-pine|fir-spire|palm-)/.test(o.name));
    const materials=[...new Set(meshes.map(o=>o.material))];if(!materials.length)throw Error('No non-oak leaves');
    window.CSM={enabled:{value:${nativeMode === 'after' ? 1 : 0}},original:materials.map(m=>({m,compile:m.onBeforeCompile,key:m.customProgramCacheKey})),
      place(route,i){const d=i*2.6/60,x=route.x+Math.sin(route.yaw)*d,z=route.z+Math.cos(route.yaw)*d,
        h=W.terrain.heightAt(x,z),c=T.cam.camera,yaw=route.yaw+i*.003;
        if(x<W.terrain.vertexX(0)+4||x>W.terrain.vertexX(W.terrain.nx)-4||z<W.terrain.vertexZ(0)+4||z>W.terrain.vertexZ(W.terrain.nz)-4)throw Error('Route outside playable terrain');
        T.player.setPosition(x,z,0,W.terrain);c.position.set(x,h+2,z);
        const y=route.targetY===undefined?h+2+route.rise:h+2+(route.targetY-(h+2))*30/65;
        c.lookAt(x+30*Math.sin(yaw),y,z+30*Math.cos(yaw));c.updateMatrixWorld();
        W.update(0,T.game.state,T.player.group.position,T.settings,12,c,false);
        W.sky.cloudTime=0;W.foliage.wind.uniforms.uGrassTime.value=0;W.sway.uTime.value=0;T.grade.time=0;T.worldLook=null;
      },
      render(){T.renderer.info.autoReset=false;T.renderer.info.reset();T.renderWorld();
        const gl=T.renderer.getContext();if(gl.getError()||gl.isContextLost())throw Error('Invalid native draw');
        return{png:T.renderer.domElement.toDataURL(),cost:{draws:T.renderer.info.render.calls,
          triangles:T.renderer.info.render.triangles,textures:T.renderer.info.memory.textures}};}
    };
    CSM.place(${JSON.stringify(routes[0])},0);
    let rejected=false;try{CSM.place({...${JSON.stringify(routes[0])},z:W.terrain.vertexZ(0)-1},0);}catch(error){if(!String(error).includes('Route outside playable terrain'))throw error;rejected=true;}
    if(!rejected)throw Error('Invalid route was accepted');
    const G=W.modules.find(m=>m.name==='groundcover').module;
    for(let i=0;i<100;i++){G.prepare?.(T.renderer,0);G.update(0,{camera:T.cam.camera,focus:T.player.group.position,reducedMotion:true});}
    CSM.render();T.renderer.shadowMap.autoUpdate=false;const native=CSM.render();
    const replacement=${JSON.stringify(candidate)}.replace('tvStipple *= 1.0 - smoothstep','tvStipple *= 1.0 - uStippleProof * smoothstep');
    for(const s of CSM.original){s.m.onBeforeCompile=function(sh,r){s.compile.call(this,sh,r);
      const a=sh.fragmentShader.indexOf('float tvInRamp = step( 0.0, tvCov )'),b=sh.fragmentShader.indexOf('if ( diffuseColor.a <= 0.0 ) discard;',a);
      if(a<0||b<a)throw Error('Missing native coverage ramp');sh.uniforms.uStippleProof=CSM.enabled;
      sh.fragmentShader='uniform float uStippleProof;\\n'+sh.fragmentShader.slice(0,a)+replacement+sh.fragmentShader.slice(b);
    };s.m.customProgramCacheKey=function(){return s.key.call(this)+'|crown-stipple-proof';};s.m.needsUpdate=true;}
    const control=CSM.render();
    return{native:native.png,control:control.png,build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),
      samples:T.grade.target.samples,post:T.grade.enabled,routeBoundsChecked:rejected,treeDetailByDistance:T.settings.treeDetailByDistance,size:[T.renderer.domElement.width,T.renderer.domElement.height],meshes:meshes.map(o=>o.name)};
  `);
  assert.equal(hash(await decode(setup.native)), hash(await decode(setup.control)), 'Inactive instrumentation changed native pixels');
  delete setup.native; delete setup.control;
  assert.equal(setup.samples, 4); assert.equal(setup.post, true);
  for (const route of routes) {
    const frames = { before: [], after: [] }, stationary = [], rows = [];
    for (const mode of ['before', 'after']) fs.mkdirSync(path.join(out, route.name, mode), { recursive: true });
    for (let i = -2; i < count; i++) {
      await page.eval(`CSM.enabled.value=0;CSM.place(${JSON.stringify(route)},${Math.max(0, i)});CSM.render();return null;`);
      const pair = {};
      for (const [mode, value] of [['before', 0], ['after', 1]]) {
        const result = await page.eval(`CSM.enabled.value=${value};return CSM.render();`);
        pair[mode] = { ...result, rgb: await decode(result.png) };
      }
      if (i < 0) stationary.push(Object.fromEntries(Object.entries(pair).map(([m, r]) => [m, hash(r.rgb)])));
      else {
        let changed = 0; const mean = { before: 0, after: 0 };
        for (let k = 0; k < pair.before.rgb.length; k += 3) {
          changed += [0, 1, 2].some(c => pair.before.rgb[k + c] !== pair.after.rgb[k + c]);
          for (const m of ['before', 'after']) mean[m] += .2126 * pair[m].rgb[k] + .7152 * pair[m].rgb[k + 1] + .0722 * pair[m].rgb[k + 2];
        }
        for (const mode of ['before', 'after']) {
          mean[mode] /= pair[mode].rgb.length / 3;
          const file = path.join(out, route.name, mode, `${String(i).padStart(4, '0')}.png`);
          fs.writeFileSync(file, Buffer.from(pair[mode].png.split(',')[1], 'base64'));
          const rgb = await sharp(file).removeAlpha().extract(route.roi).raw().toBuffer();
          frames[mode].push(rgbFrame(rgb, route.roi.width, route.roi.height));
        }
        rows.push({ frame: i, changedPixels: changed, meanLuma: mean, costs: { before: pair.before.cost, after: pair.after.cost } });
      }
      if (i === count - 1) {
        const restore = await page.eval('CSM.enabled.value=0;return CSM.render();');
        assert.equal(hash(await decode(restore.png)), hash(pair.before.rgb), 'Restored scene drifted');
      }
      console.log(JSON.stringify({ route: route.name, frame: i }));
    }
    const metrics = Object.fromEntries(Object.entries(frames).map(([m, f]) => [m, walkingFlicker(f, route.roi.width, route.roi.height)]));
    all.push({ route: { ...route, frames: count, speed: 2.6, cadence: 60, metres: (count - 1) * 2.6 / 60, yawStep: .003 },
      rows, stationary, metrics, stationaryIdentical: ['before', 'after'].every(m => stationary.every(s => s[m] === stationary[0][m])) });
    fs.writeFileSync(path.join(out, `route-${route.name}.json`), JSON.stringify({ setup, sourceSha256: hash(source), route: all.at(-1), restored: true }, null, 2) + '\n');
  }
  const assertions = { nativeControl: true, restored: true, stationary: all.every(r => r.stationaryIdentical),
    equalWork: all.every(r => r.rows.every(f => JSON.stringify(f.costs.before) === JSON.stringify(f.costs.after))),
    lessShimmer: all.every(r => r.metrics.after.summary.sparkleShare < r.metrics.before.summary.sparkleShare) };
  const report = { schema: 1, nativeMode, setup, sourceSha256: hash(source), routes: all, assertions,
    pass: Object.values(assertions).every(Boolean),
    scope: 'Published whole scene via native post/MSAA; fixed wind, lighting, actors and film noise. Synthetic 60 Hz walk+turn, non-oak materials only. Pixel residuals are motion estimates, not leaf counts or hardware frame timings. Shader toggle shares program identity. No geometry or LOD weights are changed.' };
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ assertions, routes: all.map(r => ({ name: r.route.name, before: r.metrics.before.summary, after: r.metrics.after.summary })) }));
  if (!report.pass) process.exitCode = 1;
} catch (error) { console.error(page.console?.()); throw error; }
finally { page.close(); }
