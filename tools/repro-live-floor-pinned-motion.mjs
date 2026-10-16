import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((v, i, a) => v.startsWith('--') ? [[v.slice(2), a[i + 1]]] : []));
const out = args.out ?? 'floor-pinned-motion-proof';
fs.mkdirSync(out, { recursive: true });
fs.rmSync(path.join(out, 'report.json'), { force: true });
const file = 'src/presentation/foliage/foliageWind.ts';
const sources = {
  before: execFileSync('git', ['show', 'ee6c8d344:' + file], { encoding: 'utf8' }),
  after: args['candidate-ref'] ? execFileSync('git', ['show', args['candidate-ref'] + ':' + file], { encoding: 'utf8' }) : fs.readFileSync(file, 'utf8'),
};
const blocks = Object.fromEntries(Object.entries(sources).map(([mode, source]) => {
  const block = source.match(/\.replace\('#include <begin_vertex>', `([\s\S]*?)`\);/);
  if (!block) throw Error('Floor vertex patch missing');
  return [mode, block[1].replace(/^#include <begin_vertex>\n/, '')];
}));
const cache = fs.mkdtempSync(path.join(tmpdir(), 'floor-pinned-motion-'));
const server = await createServer({ configFile: false, logLevel: 'error', cacheDir: cache, optimizeDeps: { noDiscovery: true }, server: { host: '127.0.0.1', port: 0, cors: true, hmr: false, ws: false }, plugins: [{
  name: 'floor-pinned-motion',
  resolveId(id) { if (id === '/@floor-pinned-env') return '\0' + id; },
  load(id) { if (id === '\0/@floor-pinned-env') return "export * as THREE from 'three';"; },
}] });
let page;
try {
  await server.listen();
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  const url = new URL(args.url ?? 'https://ael-dev3.github.io/Tervain/');
  url.searchParams.set('motion', '1');
  page = await liveProofPage(url.href, { quality: 'low', hour: 11 });
  const report = await page.eval(`
    const { THREE } = await import(${JSON.stringify(origin)} + '/@floor-pinned-env');
    const T = window.tervain, blocks = ${JSON.stringify(blocks)};
    const ground = T.world.terrain.heightAt(-180, 12);
    T.player.setPosition(-180, 12, 0, T.world.terrain);
    T.cam.camera.position.set(-176, ground + 2.4, 8);
    T.cam.camera.lookAt(-180, ground + .3, 12); T.cam.camera.updateMatrixWorld(true);
    T.world.update(0, T.game.state, T.player.group.position, T.settings, 11, T.cam.camera, false);
    T.lastFrameDt = 0; T.renderWorld(); T.renderWorld(); T.renderWorld();
    const meshes = [];
    T.world.scene.traverse(mesh => { if (mesh.isInstancedMesh && mesh.name.startsWith('forest_floor_') && !mesh.name.startsWith('forest_floor_log') && mesh.count > 0) meshes.push({ mesh, material: mesh.material }); });
    if (!meshes.length) { const inventory=[]; T.world.scene.traverse(m=>{if(m.name.includes('forest_floor'))inventory.push({name:m.name,count:m.count});}); throw Error('Native floor controls not loaded: '+JSON.stringify(inventory)); }
    const hash = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value))))).map(v => v.toString(16).padStart(2, '0')).join('');
    const geometryHash = () => hash(meshes.map(({ mesh }) => ({ name: mesh.name, p: Array.from(mesh.geometry.getAttribute('position').array), index: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : null, matrices: Array.from(mesh.instanceMatrix.array), count: mesh.count })));
    const beforeGeometry = await geometryHash(), oldTarget = T.renderer.getRenderTarget(), rows = [], images = {}, cost = {}, created = [];
    try {
      for (const { mesh, material } of meshes) {
        const template = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader, uniforms: THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms) };
        material.onBeforeCompile.call(material, template, T.renderer);
        if (!template.vertexShader.includes(blocks.before)) throw Error('Published floor patch differs');
        const p = mesh.geometry.getAttribute('position'), N = p.count, g = new THREE.InstancedBufferGeometry();
        for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) if (!attribute.isInstancedBufferAttribute) g.setAttribute(name, attribute);
        const matrix = new THREE.Matrix4(); mesh.getMatrixAt(0, matrix);
        g.setAttribute('instanceMatrix', new THREE.InstancedBufferAttribute(new Float32Array(matrix.elements), 16));
        g.setAttribute('aDistanceCoverage', new THREE.InstancedBufferAttribute(new Float32Array([0, 1]), 2)); g.instanceCount = 1;
        const rt = new THREE.WebGLRenderTarget(N, 1, { type: THREE.FloatType, depthBuffer: false }), scene = new THREE.Scene(), camera = new THREE.Camera();
        const row = { name: mesh.name, nativeInstances: mesh.count, vertices: N, scale: Math.sqrt(matrix.elements[0] ** 2 + matrix.elements[1] ** 2 + matrix.elements[2] ** 2), modes: {} };
        row.pinnedVertices = Array.from({ length: N }, (_, i) => p.getY(i) * row.scale <= .02).filter(Boolean).length;
        try {
          for (const mode of ['before', 'after']) {
            let vertexShader = template.vertexShader.replace(blocks.before, blocks[mode]);
            vertexShader = vertexShader.replace('vec3 tvFoliageOffset(vec3 p, vec3 o, float leaf, float s) {', 'vec3 tvFoliageOffset(vec3 p, vec3 o, float leaf, float s) { tvProofWind += 1.0;');
            vertexShader = vertexShader.replace('vec4 tvTr = texture2D(tTrample, tvUV);', 'tvProofTrample += 1.0; vec4 tvTr = texture2D(tTrample, tvUV);');
            vertexShader = 'varying vec2 vProof; float tvProofWind; float tvProofTrample;' + String.fromCharCode(10) + vertexShader;
            vertexShader = vertexShader.replace('void main() {', 'void main() { tvProofWind = 0.0; tvProofTrample = 0.0;');
            vertexShader = vertexShader.replace(/}\\s*$/, 'vProof=vec2(tvProofWind,tvProofTrample); gl_Position=vec4((float(gl_VertexID)+.5)/' + N + '.0*2.0-1.0,0.,0.,1.); gl_PointSize=1.; }');
            const mat = new THREE.ShaderMaterial({ vertexShader, fragmentShader: 'varying vec2 vProof; void main(){gl_FragColor=vec4(vProof,0.,1.);}', uniforms: template.uniforms, defines: { ...material.defines, USE_INSTANCING: '' }, depthTest: false, depthWrite: false, blending: THREE.NoBlending });
            const points = new THREE.Points(g, mat); points.frustumCulled = false; scene.add(points);
            const read = () => { T.renderer.setRenderTarget(rt); T.renderer.render(scene, camera); const values = new Float32Array(N * 4); T.renderer.readRenderTargetPixels(rt, 0, 0, N, 1, values); if (Array.from({ length: N }, (_, i) => values[i * 4 + 3]).some(a => a !== 1)) throw Error('Incomplete point capture'); return Array.from(values); };
            const counters = read();
            mat.fragmentShader = 'varying vec3 vViewPosition; void main(){gl_FragColor=vec4(-vViewPosition,1.);}'; mat.needsUpdate = true;
            const poses = read();
            if (poses.some(v => !Number.isFinite(v))) throw Error('Nonfinite position');
            let maximumMotion = 0; for (let i = 0; i < N; i++) { const rest = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(matrix); maximumMotion = Math.max(maximumMotion, Math.hypot(poses[i*4]-rest.x, poses[i*4+1]-rest.y, poses[i*4+2]-rest.z)); }
            row.modes[mode] = { maximumMotion, windCalls: counters.filter((_, i) => i % 4 === 0).reduce((a, b) => a + b, 0), trampleFetches: counters.filter((_, i) => i % 4 === 1).reduce((a, b) => a + b, 0), poseSha256: await hash(poses) };
            scene.remove(points); mat.dispose();
          }
        } finally { rt.dispose(); /* attributes are shared with native geometry */ g.dispose(); }
        rows.push(row);
      }
      T.renderer.setRenderTarget(oldTarget);
      if (${args.images !== '0'}) {
        T.lastFrameDt = 0; T.renderWorld(); T.renderWorld(); T.renderWorld();
        for (const mode of ['before', 'after']) {
          for (const row of meshes) {
            const mat = row.material.clone(), hook = row.material.onBeforeCompile, key = row.material.customProgramCacheKey;
            mat.onBeforeCompile = function(shader, renderer) { hook.call(this, shader, renderer); if (!shader.vertexShader.includes(blocks.before)) throw Error('Native capture patch missing'); shader.vertexShader = shader.vertexShader.replace(blocks.before, blocks[mode]); };
            mat.customProgramCacheKey = function() { return key.call(this) + '|pinned-motion-proof-' + mode; };
            row.mesh.material = mat; created.push(mat);
          }
          T.renderer.info.reset(); T.grade.render(T.world.scene, T.cam.camera, 0);
          cost[mode] = { drawCalls: T.renderer.info.render.calls, triangles: T.renderer.info.render.triangles };
          images[mode] = T.renderer.domElement.toDataURL('image/png');
        }
      }
    } finally { T.renderer.setRenderTarget(oldTarget); for (const row of meshes) row.mesh.material = row.material; for (const mat of created) mat.dispose(); }
    return { build: await fetch(new URL('version.json', document.baseURI)).then(r => r.json()), focus: [-180, ground, 12], rows, images, cost, beforeGeometry, afterGeometry: await geometryHash() };
  `);
  for (const [name, data] of Object.entries(report.images)) fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(data.split(',')[1], 'base64'));
  delete report.images;
  if (args.images !== '0') {
    const pixels = await Promise.all(['before', 'after'].map(mode => sharp(path.join(out, mode + '.png')).raw().toBuffer()));
    report.changedChannels = pixels[0].reduce((n, v, i) => n + Number(v !== pixels[1][i]), 0);
  }
  report.sourceSha256 = Object.fromEntries(Object.entries(sources).map(([mode, source]) => [mode, createHash('sha256').update(source).digest('hex')]));
  report.scope = 'Published native forest-floor geometry and first visible instance per batch, with actual wind/trample uniforms. Counter instrumentation counts logical GLSL wind-function entries and trample lookups; it does not measure GPU instructions, physical traffic, timings or hardware FPS. Uninstrumented position captures and full-scene native post captures must match. Both use the published wind helper; only the floor vertex patch is varied.';
  report.pass = report.rows.some(r => r.pinnedVertices > 0) && report.rows.some(r => r.modes.before.maximumMotion > .001) && report.rows.every(r => r.modes.before.windCalls === r.vertices && r.modes.after.windCalls === r.vertices - r.pinnedVertices && r.modes.before.poseSha256 === r.modes.after.poseSha256) && report.beforeGeometry === report.afterGeometry && (args.images === '0' || report.changedChannels === 0 && JSON.stringify(report.cost.before) === JSON.stringify(report.cost.after));
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  if (!report.pass) process.exitCode = 1;
} finally { page?.close(); await server.close(); fs.rmSync(cache, { recursive: true, force: true }); }
