#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { openPage } from './cdp.mjs';
import { installRenderCost } from './render-cost.mjs';
import { textureUploadBytes } from './webgl-upload-bytes.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, all) => arg.startsWith('--') ? [[arg.slice(2), all[i + 1]]] : []));
const out = args.out ?? 'software-webgl-proof';
const timeout = Number(args.timeout ?? 180000);
if (!Number.isFinite(timeout) || timeout <= 0) throw new Error('Invalid check timeout');
fs.mkdirSync(out, { recursive: true });
const url = new URL(args.url ?? 'http://127.0.0.1:4173/');
for (const [key, value] of Object.entries({ shot: '1', place: 'rillford', quality: 'low', settle: '1', hud: '0' })) url.searchParams.set(key, value);
const quality = args.quality ?? 'low';
if (!['low', 'medium', 'high'].includes(quality)) throw new Error('Invalid quality');
url.searchParams.set('quality', quality);
const report = { schema: 2, preset: quality, width: 640, height: 360, assertions: {}, performanceGate: false };
let page;
try {
  page = await openPage(url.href, { w: 640, h: 360, requestTimeoutMs: timeout, init: `(${installRenderCost.toString()})(${textureUploadBytes.toString()});` });
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await page.eval('return window.tervain?.mode === "play" && !!window.tervain?.renderer;');
    if (ready) { report.assertions.gameReady = true; break; }
    await page.wait(250);
  }
  if (!report.assertions.gameReady) throw new Error('Game readiness assertion failed');
  const context = await page.eval(`const gl = window.tervain.renderer.getContext(); const ext = gl.getExtension('WEBGL_debug_renderer_info'); return { webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext, software: !!ext && /swiftshader/i.test(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) };`);
  report.assertions.webgl2 = context.webgl2;
  report.assertions.swiftShader = context.software;
  // Verify the artifact's own published stamp, without including its source URL in public evidence.
  const version = await page.eval(`const r = await fetch(new URL('version.json', document.baseURI)); return r.ok ? await r.json() : null;`);
  if (version) report.build = { version: version.version, revision: version.revision ?? version.commit };
  await page.eval('const T=window.tervain;T.__costDraw=T.render.bind(T);T.render=()=>{};await T.world.arrived;T.step=()=>{};');
  await page.cdp('HeapProfiler.startSampling', {samplingInterval:32768,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
  report.renderCost = await page.eval(`const T=window.tervain;const draw=T.__costDraw;
    const R=T.renderer,s=window.__renderCostStates.get(R.getContext());if(!s)throw new Error('Cost counters missing');
    const beforeAuto=R.info.autoReset;R.info.autoReset=false;
    const shadow=R.shadowMap.render;let shadowDraws=0,shadowPasses=0;
    R.shadowMap.render=function(...a){const start=s.draws;shadowPasses++;try{return shadow.apply(this,a);}finally{shadowDraws+=s.draws-start;}};
    const frames=[];try{draw();for(let i=0;i<3;i++){R.info.reset();const uploads=s.uploads,draws=s.draws;shadowDraws=0;shadowPasses=0;draw();frames.push({drawCalls:s.draws-draws,triangles:R.info.render.triangles,lines:R.info.render.lines,points:R.info.render.points,uploadBytes:s.uploads-uploads,shadowDrawCalls:shadowDraws,shadowInvocations:shadowPasses,heapUsedBytes:performance.memory?.usedJSHeapSize??null});}
      let textureBytes=0;for(const levels of s.textures.values())for(const l of levels.values())textureBytes+=l.w*l.h*l.d*l.b;
      const grass=T.world.groundcover?.stats?.()??null;
      return {frames,textureCount:R.info.memory.textures,estimatedTextureStorageBytes:textureBytes,unknownTextureFormats:s.unknownFormats,grass,pixelRatio:R.getPixelRatio(),drawingBuffer:[R.domElement.width,R.domElement.height],scope:'Three complete stationary native renders after asset arrival; all render passes. Texture storage is nominal uncompressed texel storage including observed mip levels, not driver memory; renderbuffers and compressed storage are excluded. Heap usage is occupancy, not allocation count. No hardware frame-time claim.'};
    }finally{R.shadowMap.render=shadow;R.info.autoReset=beforeAuto;}`);
  const allocationResult=await page.cdp('HeapProfiler.stopSampling');
  report.renderCost.sampledAllocationBytes=(allocationResult.result.profile.samples??[]).reduce((sum,s)=>sum+s.size,0);
  report.renderCost.allocationScope='Sampling estimate across warmup plus three renders, including diagnostic overhead; not deterministic allocation counts.';
  report.assertions.renderCostMeasured = report.renderCost.frames.length === 3 && report.renderCost.frames.every(f => f.drawCalls > 0 && f.triangles > 0 && Number.isFinite(f.uploadBytes)) && report.renderCost.textureCount > 0 && report.renderCost.estimatedTextureStorageBytes > 0;
  await page.shot(path.join(out, 'game.png'));
  const { data, info } = await sharp(path.join(out, 'game.png')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let min = 255, max = 0;
  for (const byte of data) { min = Math.min(min, byte); max = Math.max(max, byte); }
  report.assertions.captureDimensions = info.width === 640 && info.height === 360;
  report.assertions.nonBlankCapture = max - min > 32;
  // A never-resolving page promise must reject when this check closes its browser.
  const pending = page.eval('return new Promise(() => {});').then(() => false, error => /connection closed/.test(error.message));
  page.close();
  report.assertions.disconnectSettlesRequest = await pending;
  report.pass = Object.values(report.assertions).every(value => value === true);
  if (!report.pass) throw new Error('Software WebGL assertion failed');
  console.log(JSON.stringify(report));
} catch (error) {
  report.pass = false;
  // Error text and browser logs can contain private URLs and paths; keep public artifacts structural.
  report.failure = 'Software WebGL verification failed';
  console.error(report.failure);
  process.exitCode = 1;
} finally {
  page?.close();
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
