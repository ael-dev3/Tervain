import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, transformWithOxc } from 'vite';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';

const args = Object.fromEntries(process.argv.slice(2).flatMap((v, i, a) => v.startsWith('--') ? [[v.slice(2), a[i + 1]]] : []));
const out = args.out ?? 'crown-endpoint-proof', file = 'src/presentation/cameraCrowns.ts';
fs.mkdirSync(out, { recursive: true }); fs.rmSync(path.join(out, 'report.json'), { force: true });
const sources = { before: execFileSync('git', ['show', '421d34b:' + file], { encoding: 'utf8' }), after: args['candidate-ref'] ? execFileSync('git', ['show', args['candidate-ref'] + ':' + file], { encoding: 'utf8' }) : fs.readFileSync(file, 'utf8') };
const rigSource = execFileSync('git', ['show', '421d34b:src/presentation/cameraRig.ts'], { encoding: 'utf8' });
const modules = {};
for (const mode of ['before', 'after']) {
  modules['crowns-' + mode] = (await transformWithOxc(sources[mode], file)).code;
  const rig = rigSource.replaceAll("from './cameraCrowns'", "from '/@crown-endpoint-crowns-" + mode + "'")
    .replace(/from '(\.\.?\/[^']+)'/g, (_, p) => "from '" + path.posix.resolve('/src/presentation', p) + "'");
  modules['rig-' + mode] = (await transformWithOxc(rig, 'cameraRig.ts')).code;
}
const cache = fs.mkdtempSync(path.join(tmpdir(), 'crown-endpoint-'));
const server = await createServer({ configFile: false, logLevel: 'error', cacheDir: cache, optimizeDeps: { noDiscovery: true }, server: { host: '127.0.0.1', port: 0, cors: true, hmr: false, ws: false }, plugins: [{ name: 'crown-endpoint', resolveId(id) { if (id.startsWith('/@crown-endpoint-')) return '\0' + id; }, load(id) { if (id === '\0/@crown-endpoint-env') return "export * as THREE from 'three';"; if (id.startsWith('\0/@crown-endpoint-')) return modules[id.slice('\0/@crown-endpoint-'.length)]; } }] });
let page;
try {
  await server.listen(); const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  page = await liveProofPage(args.url ?? 'https://ael-dev3.github.io/Tervain/', { quality: 'low', hour: 11 });
  const report = await page.eval(`
    const {THREE}=await import(${JSON.stringify(origin)}+'/@crown-endpoint-env'),models={},rigs={};for(const mode of ['before','after']){models[mode]=await import(${JSON.stringify(origin)}+'/@crown-endpoint-crowns-'+mode);rigs[mode]=await import(${JSON.stringify(origin)}+'/@crown-endpoint-rig-'+mode);}
    const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,terrain=T.world.terrain,colliders=T.world.colliders,crowns=F.crownsNear(0,0,2000).map(c=>({...c}));if(!crowns.length)throw Error('No native crown fixtures');
    const inside=(c,p)=>p.y>=c.floor&&((p.x-c.x)**2+(p.z-c.z)**2)/(c.h*.75)**2+(p.y-c.y)**2/(c.v*.75)**2<1;
    const end=(p,d,b)=>({x:p.x+d.x*b,y:p.y+d.y*b,z:p.z+d.z*b});
    const callback=T.cam.crowns;if(typeof callback!=='function')throw Error('Native camera crown callback missing');
    const settle=(cam,p,yaw,pitch,boom)=>{cam.manual=null;cam.mode='follow';cam.mounted=false;cam.wantDist=boom;cam.reset();cam.yaw=yaw;cam.pitch=pitch;cam.crowns=callback;for(let i=0;i<180;i++)cam.follow(1/60,p.x,p.y-1.55,p.z,terrain,colliders,true,0);return cam.camera.position.toArray();};
    const fixtures=[];let scanned=0,nativeTested=0;
    search:for(const c of crowns)for(let a=0;a<16;a++)for(const pitch of [.2,.32,.45,.6,.75,.9,1.05,1.2])for(let n=0;n<60;n++){
      const angle=a*Math.PI/8,r=c.h*.75+.1+n*.1,x=c.x+Math.sin(angle)*r,z=c.z+Math.cos(angle)*r,p={x,y:terrain.groundAt(x,z)+1.55,z},d={x:-Math.sin(angle)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(angle)*Math.cos(pitch)},boom=6.2;scanned++;
      if(inside(c,p))continue;const nearby=callback(p.x,p.z,boom),allowed=models.before.crownBoom(p,d,boom,nearby);if(!inside(c,end(p,d,allowed)))continue;
      nativeTested++;const native=settle(T.cam,p,angle,pitch,boom);if(!inside(c,{x:native[0],y:native[1],z:native[2]}))continue;
      fixtures.push({c,p,yaw:angle,pitch,boom,allowed,native});if(fixtures.length>=8)break search;
    }
    if(!fixtures.length)throw Error('No settled native camera endpoint penetration found');
    const rows={};for(const mode of ['before','after']){const cam=new rigs[mode].CameraRig(),positions=[];let penetrations=0,maxNativeDifference=0;for(const f of fixtures){const position=settle(cam,f.p,f.yaw,f.pitch,f.boom);positions.push(position);if(inside(f.c,{x:position[0],y:position[1],z:position[2]}))penetrations++;if(mode==='before')maxNativeDifference=Math.max(maxNativeDifference,Math.hypot(...position.map((v,i)=>v-f.native[i])));}rows[mode]={penetrations,positions,maxNativeDifference};}
    const controls=[];for(const mode of ['before','after']){const p={x:0,y:1.55,z:0},d={x:0,y:0,z:1};controls.push({mode,empty:models[mode].crownBoom(p,d,6.2,[]),belowFloor:models[mode].crownBoom(p,d,6.2,[{x:0,y:7,z:3,h:5,v:3.5,floor:2.6}]),pivotInside:models[mode].crownBoom({x:0,y:7,z:3},d,6.2,[{x:0,y:7,z:3,h:5,v:3.5,floor:2.6}])});}
    const images={},cost={};if(${args.images!=='0'})for(const mode of ['before','after']){const f=fixtures[0],cam=new rigs[mode].CameraRig();T.player.setPosition(f.p.x,f.p.z,f.yaw,terrain,f.p.y-1.55);settle(cam,f.p,f.yaw,f.pitch,f.boom);T.cam.camera.position.copy(cam.camera.position);T.cam.camera.quaternion.copy(cam.camera.quaternion);T.cam.camera.updateMatrixWorld(true);T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();cost[mode]={drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};images[mode]=T.renderer.domElement.toDataURL('image/png');}
    return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),nativeCrownCount:crowns.length,scanned,nativeTested,fixtures,rows,controls,images,cost};
  `);
  for (const [mode, data] of Object.entries(report.images)) fs.writeFileSync(path.join(out, mode + '.png'), Buffer.from(data.split(',')[1], 'base64'));
  delete report.images;
  if (args.images !== '0') { const pixels = await Promise.all(['before', 'after'].map(mode => sharp(path.join(out, mode + '.png')).raw().toBuffer())); report.changedChannels = pixels[0].reduce((n, v, i) => n + Number(v !== pixels[1][i]), 0); }
  report.sourceSha256 = Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, createHash('sha256').update(v).digest('hex')]));
  report.rigSourceSha256 = createHash('sha256').update(rigSource).digest('hex');
  report.scope = 'Published native crown geometry, terrain, colliders and follow-camera crown callback; grounded pivot/yaw/pitch search, default 6.2 m boom. Each fixture is settled for 180 follow updates. Original CameraRig source is shared, only its crownBoom module changes. Before poses must match the actual published camera. Controlled static inspections, not a recorded player route, all-tree coverage or hardware timing.';
  report.pass = report.rows.before.penetrations === report.fixtures.length && report.rows.before.maxNativeDifference < 1e-6 && report.rows.after.penetrations === 0 && report.controls.every(c => c.empty === 6.2 && c.belowFloor === 6.2 && c.pivotInside === 6.2);
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report)); if (!report.pass) process.exitCode = 1;
} finally { page?.close(); await server.close(); fs.rmSync(cache, { recursive: true, force: true }); }
