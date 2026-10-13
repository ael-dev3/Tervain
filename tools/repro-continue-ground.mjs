/** Native save → page reload → actual Continue-button regression probe.
 * Run with --url <build URL>; --seed-url optionally creates a genuine older-build save.
 * Software rendering verifies placement, not hardware frame timing. REPRO_INIT_FILE
 * may supply sandbox transport setup; the game and its placement code are untouched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
const url = arg('--url', 'https://ael-dev3.github.io/Tervain/');
const seedURL = arg('--seed-url', url);
const quality = arg('--quality', 'low');
const x = Number(arg('--x', '-7')), z = Number(arg('--z', '45'));
const feetOffset = Number(arg('--feet-offset', '0'));
const buriedCargo = args.includes('--buried-cargo');
const hour = Number(arg('--hour', '21.516666666666666'));
const out = arg('--out', 'outputs/continue-ground');
if (![x, z, feetOffset, hour].every(Number.isFinite) || !['low', 'medium', 'high'].includes(quality)) throw new Error('Invalid probe options');
fs.mkdirSync(out, { recursive: true });
const init = process.env.REPRO_INIT_FILE ? fs.readFileSync(process.env.REPRO_INIT_FILE, 'utf8') : undefined;
const start = new URL(seedURL);
start.search = new URLSearchParams({ shot: '1', quality, motion: '1', hour: String(hour), settle: '1' }).toString();
const page = await openPage(start.href, { w: 640, h: 360, init, headed: args.includes('--headed'), requestTimeoutMs: 360000 });
async function ready(mode, title) {
  const deadline = Date.now() + 600000;
  while (Date.now() < deadline) {
    const r = await page.eval('return {mode:window.tervain?.mode,title:document.title,failed:window.tervain?.worldBuildFailed};');
    if (r.failed) throw new Error('World construction failed');
    if (r.mode === mode && (!title || r.title === title)) return;
    await page.wait(250);
  }
  throw new Error(`Timed out waiting for ${mode}`);
}
try {
  await ready('play', 'READY');
  const saved = await page.eval(`
    const T=window.tervain;
    T.step=()=>{}; T.render=()=>{};
    T.player.setPosition(${x},${z},0,T.world.terrain);
    T.settings.quality=${JSON.stringify(quality)}; T.settings.reducedMotion=false;
    T.game.state.clock=1440+${hour}*60;
    localStorage.setItem('tervain:settings',JSON.stringify(T.settings));
    const result=T.saveTo('slot-1'); if(!result.ok)throw new Error('Native save failed');
    if(${feetOffset}!==0){
      T.game.state.player.y+=${feetOffset};
      if(${buriedCargo}){
        T.game.state.physicalObjects=T.game.state.physicalObjects.filter(p=>p.id!=='camp_crate_0');
        T.game.state.physicalObjects.push({id:'camp_crate_0',position:{x:T.player.x,y:T.game.state.player.y-.285,z:T.player.z},rotation:{x:0,y:0,z:0,w:1}});
      }
      if(!T.saves.save('slot-1',T.game.state).ok)throw new Error('Synthetic-height save failed');
    }
    const envelope=localStorage.getItem('tervain:save:slot-1:cur');
    return {build:document.querySelector('.menu-build')?.textContent,
      player:{...T.game.state.player},ground:T.world.terrain.groundAt(T.player.x,T.player.z),
      storage:{'tervain:save:slot-1:cur':envelope,'tervain:settings':localStorage.getItem('tervain:settings')}};
  `);
  // Different origins are intentional for an older-build seed. Transfer only the
  // generated save and settings, never arbitrary existing browser storage.
  await page.cdp('Page.navigate', { url }); await ready('title');
  await page.eval(`for(const [k,v] of Object.entries(${JSON.stringify(saved.storage)}))localStorage.setItem(k,v);`);
  await page.cdp('Page.navigate', { url }); await ready('title');
  await page.eval(`const T=window.tervain,place=T.placePlayerForEntry.bind(T);window.__entryTrace=[];
    T.placePlayerForEntry=(...args)=>{const result=place(...args);window.__entryTrace.push({y:T.player.y,rootY:T.player.rig.root.position.y,ground:T.world.terrain.groundAt(T.player.x,T.player.z)});return result;};
    const b=[...document.querySelectorAll('.menu-list button')].find(b=>b.textContent.trim()==='Continue');
    if(!b||b.disabled)throw new Error('Continue unavailable'); b.click();`);
  await ready('play');
  const result = await page.eval(`
    const T=window.tervain, step=T.step.bind(T),render=T.render.bind(T); T.step=()=>{}; T.render=()=>{};
    const sample=()=>{
      const p=T.player,c=T.cam.camera,g=T.world.terrain;
      return {player:{x:p.x,y:p.y,z:p.z},ground:g.groundAt(p.x,p.z),
        root:p.rig.root.position.toArray(),camera:c.position.toArray(),
        cameraGround:g.groundAt(c.position.x,c.position.z),pitch:T.cam.pitch,
        mode:T.mode,swimming:p.swimming};
    };
    const rows=[sample()]; for(let i=0;i<60;i++){step(1/60);rows.push(sample());}
    T.render=render;try{T.present(1);}finally{T.render=()=>{};}
    const gl=T.renderer.getContext();
    const programs=T.renderer.info.programs??[];
    const shaderFailures=programs.filter(p=>!gl.getProgramParameter(p.program,gl.LINK_STATUS))
      .map(p=>({name:p.name,log:(gl.getProgramInfoLog(p.program)??'').slice(0,2000)}));
    const errors=[];for(let i=0;i<8;i++){const e=gl.getError();if(e===gl.NO_ERROR)break;errors.push(e);}
    const c=T.cam.camera,e=c.matrixWorld.elements;
    const renderedCamera=[e[12],e[13],e[14]];
    return {build:document.querySelector('.menu-build')?.textContent,entries:window.__entryTrace,rows,
      rendering:{programs:programs.length,shaderFailures,errors,contextLost:gl.isContextLost(),
        maxVaryingVectors:gl.getParameter(gl.MAX_VARYING_VECTORS),
        terrainVisible:T.world.terrainMesh.visible,
        camera:renderedCamera,cameraGround:T.world.terrain.groundAt(e[12],e[14])}};
  `);
  await page.shot(path.join(out, 'continued.png'));
  const assertions = {
    placementAboveTerrain: result.entries.length>0 && result.entries.every(r=>Number.isFinite(r.y)&&r.y>=r.ground-1e-4&&r.rootY>=r.ground-1e-4),
    playerAboveTerrain: result.rows.every(r => Number.isFinite(r.player.y) && r.player.y >= r.ground - 1e-4),
    heroAboveTerrain: result.rows.every(r => Number.isFinite(r.root[1]) && r.root[1] >= r.ground - 1e-4),
    cameraAboveGround: result.rows.every(r => Number.isFinite(r.camera[1]) && r.camera[1] >= r.cameraGround + .1),
    playing: result.rows.every(r => r.mode === 'play'),
    shaderProgramsLinked: result.rendering.programs>0 && result.rendering.shaderFailures.length===0,
    graphicsHealthy: !result.rendering.contextLost && result.rendering.errors.length===0,
    renderedCameraAboveGround: result.rendering.camera.every(Number.isFinite)
      && result.rendering.camera[1]>=result.rendering.cameraGround+.1,
  };
  const receipt = { source: 'Native compiled-build save/reload/Continue', seedBuild: saved.build,
    savedPlayer: saved.player, savedGround: saved.ground, syntheticFeetOffset: feetOffset, buriedCargo,
    quality, assertions, ...result, pass: Object.values(assertions).every(Boolean) };
  fs.writeFileSync(path.join(out, 'receipt.json'), JSON.stringify(receipt, null, 2));
  console.log(JSON.stringify({ seedBuild: receipt.seedBuild, build: result.build, assertions, first: result.rows[0], last: result.rows.at(-1), pass: receipt.pass }));
  if (!receipt.pass) process.exitCode = 1;
} finally { page.close(); }
