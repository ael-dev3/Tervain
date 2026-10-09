#!/usr/bin/env node
// Diagnostic fixtures only: imports the running game's modules without changing them. Since A70 the same fixtures
// verify the fixes: each check now fails if its defect returns.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openPage } from '../../../../tools/cdp.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const output=path.resolve(root,process.env.AUDIT_OUT??'outputs/bug-audit-2026-10-08.json');
const url=process.env.TERVAIN_URL??'http://127.0.0.1:5173/';
const report={schema:1,revision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  environment:'Native headless Chromium; Vite development modules; isolated temporary browser profile',url,
  scope:'Three module-level diagnostic fixtures. No ordinary rooftop traversal or physical-controller session claimed.',findings:{}};
let page;
try {
  page=await openPage(url,{w:960,h:540,init:String.raw`
    localStorage.setItem('tervain:settings',JSON.stringify({quality:'low',reducedMotion:true}));
    window.__auditFailJpg=true;window.__auditJpgAttempts=0;
    window.__auditNativeFetch=window.fetch.bind(window);
    window.fetch=(...args)=>{
      const value=args[0] instanceof Request?args[0].url:String(args[0]);
      if(value.includes('/textures/buildings/')&&value.endsWith('.jpg')){
        window.__auditJpgAttempts++;
        if(window.__auditFailJpg)return Promise.resolve(new Response('',{status:503,statusText:'Audit transient outage'}));
      }
      return window.__auditNativeFetch(...args);
    };
  `});
  const deadline=Date.now()+120000;
  while(!await page.eval('return !!window.tervain;')){
    assert(Date.now()<deadline,'App bootstrap timed out');await page.wait(100);
  }
  report.findings['TV-B01']=await page.eval(String.raw`
    const THREE=await import('/node_modules/.vite/deps/three.js');
    const {InteriorLight}=await import('/src/presentation/interiorLight.ts');
    const {INTERIORS,roomLocator}=await import('/src/world/interiors.ts');
    const room=INTERIORS[0],rooms=roomLocator(()=>0),b=room.building;
    const indoor=new InteriorLight(rooms),above=new InteriorLight(rooms),outside=new InteriorLight(rooms);
    const y=room.wallTop+20;
    return {fixture:'Real first room footprint with flat zero-height ground; three independent light owners',
      building:b.id,wallTop:room.wallTop,aboveY:y,
      inside:indoor.update(1,new THREE.Vector3(b.x,room.floorTop+1,b.z),0,1),
      aboveRoof:above.update(1,new THREE.Vector3(b.x,y,b.z),0,1),
      outside:outside.update(1,new THREE.Vector3(b.x+100,y,b.z+100),0,1)};
  `);
  assert(report.findings['TV-B01'].inside>0.9);
  assert.equal(report.findings['TV-B01'].aboveRoof,0);
  assert.equal(report.findings['TV-B01'].outside,0);
  console.log('FIXED TV-B01: a camera above the roof is outdoors; inside the room is indoors');

  report.findings['TV-B02']=await page.eval(String.raw`
    const {loadBakedTextures}=await import('/src/presentation/bakedTextures.ts');
    const {DOWNLOAD_POLICY}=await import('/src/presentation/assets/download.ts');
    const first=await loadBakedTextures('low'),expectedAttempts=24*DOWNLOAD_POLICY.attempts;
    // Promise.all may reject one pair before its sibling has exhausted its own retries.
    const deadline=performance.now()+10000;
    while(window.__auditJpgAttempts<expectedAttempts){
      if(performance.now()>deadline)throw Error('Controlled download retries did not settle');
      await new Promise(resolve=>setTimeout(resolve,25));
    }
    const attemptsBefore=window.__auditJpgAttempts;
    window.__auditFailJpg=false;
    const restored=await window.__auditNativeFetch('/textures/buildings/bark-albedo.jpg');
    const restoredBytes=(await restored.arrayBuffer()).byteLength;
    const retrySame=await loadBakedTextures('low'),retryOther=await loadBakedTextures('high');
    return {fixture:'All building JPEG requests return 503 until manifest download/first decode finish; then original fetch is available',
      first,expectedAttempts,attemptsBefore,restoredStatus:restored.status,restoredBytes,retrySame,retryOther,attemptsAfter:window.__auditJpgAttempts};
  `);
  const texture=report.findings['TV-B02'];
  assert.equal(texture.first,0);assert.equal(texture.attemptsBefore,texture.expectedAttempts);
  assert.equal(texture.restoredStatus,200);assert(texture.restoredBytes>0);
  assert(texture.retrySame>0);assert(texture.retryOther>0);
  assert(texture.attemptsAfter>texture.attemptsBefore);
  console.log('FIXED TV-B02: surfaces load once downloads are restored');

  report.findings['TV-B03']=await page.eval(String.raw`
    const {Input}=await import('/src/platform/input.ts');
    const {defaultSettings}=await import('/src/platform/settings.ts');
    const original=Object.getOwnPropertyDescriptor(navigator,'getGamepads');
    let axes=[0,0,0,1];
    const pad=()=>({connected:true,id:'Audit standard controller',index:0,mapping:'standard',timestamp:0,axes,
      buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))});
    const input=new Input(document.createElement('canvas'),()=>defaultSettings());
    try {
      Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad()]});
      input.poll(1/60);
      const vertical={device:input.device,connected:input.gamepadConnected,ry:input.padAxes.ry,jumpHint:input.label('jump',code=>code)};
      axes=[0,0,1,0];input.poll(1/60);
      const horizontal={device:input.device,jumpHint:input.label('jump',code=>code)};
      return {fixture:'Standard-gamepad polling fixture, not a hardware-controller test',vertical,horizontal};
    } finally {
      if(original)Object.defineProperty(navigator,'getGamepads',original);else delete navigator.getGamepads;
    }
  `);
  const pad=report.findings['TV-B03'];
  assert.equal(pad.vertical.connected,true);assert(Math.abs(pad.vertical.ry-1)<1e-12);
  assert.equal(pad.vertical.device,'gamepad');assert.equal(pad.vertical.jumpHint,'LB');
  assert.equal(pad.horizontal.device,'gamepad');assert.equal(pad.horizontal.jumpHint,'LB');
  console.log('FIXED TV-B03: vertical-only controller use switches to controller hints');
  report.result='All three reported defects are fixed at this revision (A70)';
} catch(error) {
  report.error=String(error.stack??error);process.exitCode=1;console.error(report.error);
} finally {
  const logs=page?.console()??[];
  report.consoleSummary={controlledSurfaceWarnings:logs.filter(line=>line.includes('[surfaces]')).length,
    errors:logs.filter(line=>/^\[(error|exception)\]/.test(line))};
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  page?.close();console.log('Evidence:',output);
}
