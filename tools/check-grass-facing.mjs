#!/usr/bin/env node
/** Source-derived WebGL diagnostic: measure camera-facing basis continuity without changing game shaders. */
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';
const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, values) => arg.startsWith('--') ? [[arg.slice(2), values[i + 1]]] : []));
const out = args.out ?? 'grass-facing-proof';
fs.mkdirSync(out, { recursive: true });
const url = new URL(args.url ?? 'http://127.0.0.1:4173/');
for (const [key, value] of Object.entries({ shot: '1', place: 'rillford', quality: 'high', settle: '1', hud: '0' })) url.searchParams.set(key, value);
let page;
try {
  page = await openPage(url.href, { w: 640, h: 360, requestTimeoutMs: 240000 });
  let ready = false;
  for (let i = 0; i < 800; i++) {
    if (await page.eval('return window.tervain?.mode === "play";')) { ready = true; break; }
    await page.wait(250);
  }
  if (!ready) throw new Error('Game not ready');
  const report = await page.eval(`
    const T = window.tervain; T.render = () => {}; T.step = () => {};
    const renderer = T.renderer, native = renderer.getContext();
    renderer.setRenderTarget(null); renderer.render(T.world.scene, T.cam.camera);
    const source = renderer.info.programs.map(program => native.getShaderSource(program.vertexShader)).find(text => text?.includes('vec2 gAcrossH ='));
    if (!source) throw new Error('Native grass vertex shader unavailable');
    const expression = source.match(/vec2 gAcrossH = [^;]+;/)?.[0];
    if (!expression) throw new Error('Grass facing expression unavailable');
    const sign = 'sign(dot(gAcross.xz, gSideEye) + 1e-4)';
    if (!expression.includes(sign)) throw new Error('Facing expression changed; review the diagnostic control');
    const smooth = expression.replace(sign, '((dot(gAcross.xz, gSideEye) + 1e-4) / sqrt((dot(gAcross.xz, gSideEye) + 1e-4) * (dot(gAcross.xz, gSideEye) + 1e-4) + .03 * .03))');
    // Isolated diagnostic context: all code under test is extracted from the actual compiled grass shader.
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) throw new Error('WebGL2 unavailable');
    const resources = [], programs = [], vao = gl.createVertexArray(), buffer = gl.createBuffer(), result = new Float32Array(2);
    gl.bindVertexArray(vao); gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, buffer); gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, 8, gl.STREAM_READ); gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffer);
    const shader = (type, text) => { const object = gl.createShader(type); resources.push(object); gl.shaderSource(object, text); gl.compileShader(object); if (!gl.getShaderParameter(object, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(object)); return object; };
    const program = code => {
      const object = gl.createProgram(); programs.push(object);
      gl.attachShader(object, shader(gl.VERTEX_SHADER, '#version 300 es' + String.fromCharCode(10) + 'precision highp float;uniform float face;uniform float angle;out vec2 basis;void main(){vec3 gAcross=vec3(cos(face),0.,sin(face));vec2 gEyeH=vec2(cos(angle),sin(angle));vec2 gSideEye=vec2(-gEyeH.y,gEyeH.x);' + code + 'basis=gAcrossH;gl_Position=vec4(0.,0.,0.,1.);}'));
      gl.attachShader(object, shader(gl.FRAGMENT_SHADER, '#version 300 es' + String.fromCharCode(10) + 'precision highp float;out vec4 color;void main(){color=vec4(1.);}'));
      gl.transformFeedbackVaryings(object, ['basis'], gl.INTERLEAVED_ATTRIBS); gl.linkProgram(object);
      if (!gl.getProgramParameter(object, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(object));
      return { object, face: gl.getUniformLocation(object, 'face'), angle: gl.getUniformLocation(object, 'angle') };
    };
    const evaluate = (p, face, angle) => {
      gl.useProgram(p.object); gl.uniform1f(p.face, face); gl.uniform1f(p.angle, angle); gl.enable(gl.RASTERIZER_DISCARD); gl.beginTransformFeedback(gl.POINTS); gl.drawArrays(gl.POINTS, 0, 1); gl.endTransformFeedback(); gl.disable(gl.RASTERIZER_DISCARD); gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, result);
      if (gl.getError() !== gl.NO_ERROR || !Array.from(result).every(Number.isFinite)) throw new Error('Invalid transform-feedback result');
      return Array.from(result);
    };
    const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const rows = [], epsilon = .00001;
    try {
      const original = program(expression), continuous = program(smooth);
      for (const face of [0, .7, 1.8, 2.9]) {
        const crossing = face + Math.asin(.0001);
        const before = evaluate(original, face, crossing - epsilon), after = evaluate(original, face, crossing + epsilon);
        const awayBefore = evaluate(original, face, crossing + .2 - epsilon), awayAfter = evaluate(original, face, crossing + .2 + epsilon);
        const smoothBefore = evaluate(continuous, face, crossing - epsilon), smoothAfter = evaluate(continuous, face, crossing + epsilon);
        rows.push({ face, cameraDeltaRadians: epsilon * 2, before, after, basisJump: distance(before, after), awayJump: distance(awayBefore, awayAfter), continuousControlJump: distance(smoothBefore, smoothAfter) });
      }
    } finally {
      for (const object of programs) gl.deleteProgram(object); for (const object of resources) gl.deleteShader(object); gl.deleteBuffer(buffer); gl.deleteVertexArray(vao); gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
    return { schema: 1, expression, rows, reproductionPass: rows.every(row => row.basisJump > .8 && row.awayJump < .001 && row.continuousControlJump < .001), qualityPass: null, scope: 'Actual compiled shader expression evaluated through WebGL transform feedback. Continuous control is diagnostic only; not a product shader change, a full-scene video result, or proof this causes the reported shimmer.' };
  `);
  report.build = await page.eval('return fetch(new URL("version.json", document.baseURI)).then(r => r.json());');
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.reproductionPass) process.exitCode = 1;
} finally {
  page?.close();
}
