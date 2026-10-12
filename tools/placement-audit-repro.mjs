#!/usr/bin/env node
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, i, all) => arg.startsWith('--') ? [[arg.slice(2), all[i + 1]]] : []));
const { openPage } = await import(args.driver ? pathToFileURL(path.resolve(args.driver)).href : './cdp.mjs');
const url = new URL(args.url ?? 'http://127.0.0.1:4173/');
for (const [key, value] of Object.entries({ shot:'1', quality:'low', place:'rillford', hud:'0' })) url.searchParams.set(key, value);
let page;
try {
  page = await openPage(url.href, { w:640, h:360, flags:['--use-gl=angle','--use-angle=swiftshader'] });
  for (let i=0;i<400;i++) { if (await page.eval('return window.tervain?.mode === "play";')) break; await page.wait(250); }
  const report = await page.eval(`
    const T=window.tervain, originalWorld=T.world, step=T.step, render=T.render;
    let template;
    originalWorld.scene.traverse(o=>{ if (!template && o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.geometry.getAttribute('position')?.array instanceof Float32Array) template=o; });
    if (!template) throw new Error('No actual-build mesh constructor');
    const Mesh=template.constructor, scene=new originalWorld.scene.constructor();
    const geometry=template.geometry.clone();
    for (const key of Object.keys(geometry.attributes)) geometry.deleteAttribute(key);
    const Attribute=template.geometry.getAttribute('position').constructor;
    geometry.setAttribute('position',new Attribute(new Float32Array([-0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,0.5,-0.5, -0.5,0.5,-0.5, -0.5,-0.5,0.5, 0.5,-0.5,0.5, 0.5,0.5,0.5, -0.5,0.5,0.5]),3));
    geometry.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5]);
    geometry.boundingBox=null; geometry.boundingSphere=null;
    for(let i=0;i<200;i++){ const mesh=new Mesh(geometry); mesh.name='support'; mesh.position.set(i*32,.5,0); scene.add(mesh); }
    const prop=new Mesh(geometry); prop.name='stacked prop'; prop.position.set(-.25,1.5,0); scene.add(prop);
    let raycasts=0; const original=Mesh.prototype.raycast;
    Mesh.prototype.raycast=function(ray,hits){raycasts++;return original.call(this,ray,hits);};
    try {
      T.step=()=>{}; T.render=()=>{};
      T.world={...originalWorld,scene,terrain:{heightAt:()=>0},modules:[],arrived:Promise.resolve()};
      const result=await T.auditPlacement();
      return {revision:result.revision,complete:result.complete,props:result.summary.props,candidates:result.summary.candidates,supportRaycasts:raycasts};
    } finally {
      Mesh.prototype.raycast=original; T.world=originalWorld; T.step=step; T.render=render;
      geometry.dispose(); for(const mesh of scene.children) mesh.material.dispose();
    }
  `);
  const baseline=args.expect==='before';
  report.pass=report.complete && report.props===201 && report.candidates===0 && (baseline ? report.supportRaycasts>1000 : report.supportRaycasts<32);
  fs.writeFileSync(args.out ?? 'placement-repro.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
  if(!report.pass) process.exitCode=1;
} finally {page?.close();}
