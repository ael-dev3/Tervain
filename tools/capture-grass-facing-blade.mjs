#!/usr/bin/env node
/** Isolate one actual grass blade to check a source-derived facing transition. Product materials stay unchanged. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, values) => arg.startsWith('--') ? [[arg.slice(2), values[i + 1]]] : []));
const { openPage } = args.driver ? await import(pathToFileURL(path.resolve(args.driver)).href) : await import('./cdp.mjs');
const out = args.out ?? 'grass-facing-blade-proof';
fs.mkdirSync(out, { recursive: true });
const url = new URL(args.url ?? 'http://127.0.0.1:4173/');
for (const [key, value] of Object.entries({ shot: '1', place: 'rillford', quality: 'high', settle: '1', hud: '0' })) url.searchParams.set(key, value);

async function pixels(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let foregroundPixels = 0;
  for (let i = 0; i < data.length; i += 3) if (Math.max(data[i], data[i + 1], data[i + 2]) > 8) foregroundPixels++;
  return { data, info, foregroundPixels };
}
async function difference(before, after) {
  const a = await pixels(before), b = await pixels(after);
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw new Error('Capture dimensions changed');
  let changedPixels = 0, maxChannelDelta = 0;
  for (let i = 0; i < a.data.length; i += 3) {
    let delta = 0;
    for (let c = 0; c < 3; c++) delta = Math.max(delta, Math.abs(a.data[i + c] - b.data[i + c]));
    if (delta > 8) changedPixels++;
    maxChannelDelta = Math.max(maxChannelDelta, delta);
  }
  return { changedPixels, maxChannelDelta, foregroundBefore: a.foregroundPixels, foregroundAfter: b.foregroundPixels };
}

let page;
try {
  page = await openPage(url.href, { w: 640, h: 360, requestTimeoutMs: 240000 });
  let ready = false;
  for (let i = 0; i < 800; i++) {
    if (await page.eval('return window.tervain?.mode === "play";')) { ready = true; break; }
    await page.wait(250);
  }
  if (!ready) throw new Error('Game not ready');
  const fixture = await page.eval(`
    const T = window.tervain; T.render = () => {}; T.step = () => {};
    const R = T.renderer, W = T.world, camera = T.cam.camera;
    R.setRenderTarget(null); R.render(W.scene, camera);
    let target;
    W.groundcover.group.traverse(mesh => { if (!target && mesh.isMesh && mesh.geometry.instanceCount > 0 && mesh.parent.name === 'grass-near') target = mesh; });
    if (!target || !T.grade?.enabled) throw new Error('Native High grass/postprocessing unavailable');
    const source = R.info.programs.map(program => R.getContext().getShaderSource(program.vertexShader)).find(text => text?.includes('vec2 gAcrossH ='));
    if (!source) throw new Error('Compiled grass source unavailable');
    const declaration = name => { const match = source.match(new RegExp('(float|vec2) ' + name + ' = [^;]+;')); if (!match) throw new Error('Grass declaration unavailable: ' + name); return match[0]; };
    const hash = source.match(new RegExp('float gHash[(][^}]+}'))?.[0];
    if (!hash) throw new Error('Native grass hash unavailable');
    const declarations = ['gSeed', 'gR1', 'gR2', 'gFrac', 'gAng', 'gRad', 'gRoot', 'gRootW', 'gGround', 'gFace'].map(declaration).join('');
    const geo = target.geometry, index = geo.index, position = geo.getAttribute('position');
    if (!index) throw new Error('Indexed native blade unavailable');
    const blade = position.getX(index.getX(0));
    let prefix = 0;
    while (prefix + 2 < index.count && [0, 1, 2].every(offset => position.getX(index.getX(prefix + offset)) === blade)) prefix += 3;
    if (!prefix) throw new Error('Native blade prefix empty');
    const uniforms = R.properties.get(target.material).uniforms;
    if (!uniforms?.uClump) throw new Error('Native grass uniforms unavailable');
    const values = { aBase: Array.from(geo.getAttribute('aBase').array.slice(0, 4)), aShape: Array.from(geo.getAttribute('aShape').array.slice(0, 4)), aSlope: Array.from(geo.getAttribute('aSlope').array.slice(0, 4)), uClump: uniforms.uClump.value.toArray() };
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) throw new Error('WebGL2 unavailable');
    let data;
    try {
      const vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER), program = gl.createProgram(), buffer = gl.createBuffer(), vao = gl.createVertexArray();
      gl.shaderSource(vs, '#version 300 es' + String.fromCharCode(10) + 'precision highp float;uniform vec4 aBase,aShape,aSlope,uClump;uniform float blade;out vec4 data;' + hash + 'void main(){float gBlade=blade;' + declarations + 'data=vec4(gRootW.x,gGround,gRootW.y,gFace);gl_Position=vec4(0.,0.,0.,1.);}');
      gl.shaderSource(fs, '#version 300 es' + String.fromCharCode(10) + 'precision highp float;out vec4 color;void main(){color=vec4(1.);}');
      for (const shader of [vs, fs]) { gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader)); gl.attachShader(program, shader); }
      gl.transformFeedbackVaryings(program, ['data'], gl.INTERLEAVED_ATTRIBS); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program); for (const [name, value] of Object.entries(values)) gl.uniform4fv(gl.getUniformLocation(program, name), value); gl.uniform1f(gl.getUniformLocation(program, 'blade'), blade);
      gl.bindVertexArray(vao); gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, buffer); gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 16, gl.STREAM_READ); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer);
      gl.enable(gl.RASTERIZER_DISCARD); gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, 1); gl.endTransformFeedback();
      const output = new Float32Array(4); gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, output);
      if (gl.getError() !== gl.NO_ERROR || !Array.from(output).every(Number.isFinite)) throw new Error('Invalid native root/face output');
      data = Array.from(output);
    } finally { gl.getExtension('WEBGL_lose_context')?.loseContext(); }
    const scene = new W.scene.constructor(); scene.background = null; scene.fog = W.scene.fog;
    W.scene.traverse(object => { if (object.isLight) { const light = object.clone(); light.castShadow = false; scene.add(light); if (light.target) { light.target.position.copy(object.target.position); scene.add(light.target); } } });
    const mesh = target.clone(); mesh.geometry = geo.clone(); mesh.geometry.instanceCount = 1; mesh.geometry.setDrawRange(0, prefix); mesh.onBeforeRender = () => {}; mesh.onAfterRender = () => {}; mesh.receiveShadow = false; mesh.castShadow = false; scene.add(mesh);
    const original = target.material, continuous = original.clone(), hook = original.onBeforeCompile, term = 'sign(dot(gAcross.xz, gSideEye) + 1e-4)';
    continuous.onBeforeCompile = function(shader, renderer) {
      hook.call(this, shader, renderer);
      if (!shader.vertexShader.includes(term)) throw new Error('Facing expression changed; review continuous control');
      const argument = '(dot(gAcross.xz, gSideEye) + 1e-4)';
      shader.vertexShader = shader.vertexShader.replace(term, '(' + argument + '/sqrt(' + argument + '*' + argument + '+.03*.03))');
    };
    continuous.customProgramCacheKey = () => original.customProgramCacheKey() + '-diagnostic-continuous';
    camera.fov = 18; camera.updateProjectionMatrix();
    const samples = new Set(), render = R.render;
    R.render = function(current, view) { if (current === scene) samples.add(R.getContext().getParameter(R.getContext().SAMPLES)); return render.call(this, current, view); };
    window.__grassFacingBlade = { T, R, scene, mesh, original, continuous, camera, root: data[0], ground: data[1], z: data[2], face: data[3], samples };
    return { root: data[0], ground: data[1], z: data[2], face: data[3], blade, triangles: prefix / 3, instances: 1, diagnosticFovDegrees: 18, requestedSamples: T.grade.target.samples, supportedSamples: R.getContext().getParameter(R.getContext().MAX_SAMPLES), sourceFacing: declaration('gFace') };
  `);
  const report = { schema: 1, fixture, routes: [], qualityPass: null, scope: 'One actual native grass blade and shader, cloned world lights without shadow attenuation, High postprocessing/MSAA, a magnified diagnostic camera, frozen wind/clock. Continuous material is capture-only and changes coverage; not a full-scene shimmer result or a product fix.' };
  for (const mode of ['native', 'continuous']) for (const stage of ['crossing', 'away']) {
    const files = [];
    let repeatsIdentical = true;
    for (const direction of [-1, 1]) {
      const render = `const f=window.__grassFacingBlade, angle=f.face+Math.asin(.0001)+${stage === 'away' ? '.2' : '0'}+${direction}*.00001;f.camera.position.set(f.root+Math.cos(angle)*1.6-.0001,f.ground+.7,f.z+Math.sin(angle)*1.6);f.camera.lookAt(f.root,f.ground+.15,f.z);f.camera.updateMatrixWorld();f.mesh.material=${mode === 'continuous'}?f.continuous:f.original;f.T.grade.render(f.scene,f.camera,0);`;
      await page.eval(render);
      const file = path.join(out, `${mode}-${stage}-${direction < 0 ? 'before' : 'after'}.png`);
      await page.shot(file); files.push(file);
      await page.eval(render);
      const repeated = await sharp(await page.image()).removeAlpha().raw().toBuffer();
      repeatsIdentical &&= (await pixels(file)).data.equals(repeated);
    }
    report.routes.push({ mode, stage, cameraDeltaRadians: .00002, repeatsIdentical, ...await difference(files[0], files[1]) });
  }
  report.actualSamples = await page.eval('return Array.from(window.__grassFacingBlade.samples);');
  report.build = await page.eval('return fetch(new URL("version.json", document.baseURI)).then(r => r.json());');
  const crossing = report.routes.find(row => row.mode === 'native' && row.stage === 'crossing');
  const controls = report.routes.filter(row => row !== crossing);
  report.reproductionPass = report.routes.every(row => row.repeatsIdentical) && report.actualSamples.length === 1 && report.actualSamples[0] === Math.min(fixture.requestedSamples, fixture.supportedSamples) && crossing.changedPixels > 4 * Math.max(...controls.map(row => row.changedPixels)) + 1 && crossing.foregroundBefore > 0 && crossing.foregroundAfter > 0;
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.reproductionPass) process.exitCode = 1;
} finally { page?.close(); }
