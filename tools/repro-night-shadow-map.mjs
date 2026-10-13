/** Isolate a cold night shadow-comparison sampler using the build's own classes.
 * The two fresh renderers differ only in the one-time shadow initialization request.
 * This is a software-rendered correctness check, not a hardware timing benchmark.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { openPage } from './cdp.mjs';

const args=process.argv.slice(2);
const option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const url=new URL(option('--url','https://ael-dev3.github.io/Tervain/'));
url.search=new URLSearchParams({shot:'1',quality:'low',hour:'21.5166666667',settle:'1'}).toString();
const out=option('--out','outputs/night-shadow-map');
fs.mkdirSync(out,{recursive:true});
const init=process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):undefined;
const page=await openPage(url.href,{w:256,h:256,init,requestTimeoutMs:360000});
try{
  const deadline=Date.now()+600000;
  while(await page.eval(`return document.title!=='READY';`)){
    if(Date.now()>deadline)throw new Error('Native build readiness timeout');
    await page.wait(250);
  }
  const rows=await page.eval(`
    const T=window.tervain;T.step=()=>{};T.render=()=>{};
    const tile=T.world.terrainMesh.children.find(m=>m.isMesh);
    const Mesh=tile.constructor,Geometry=tile.geometry.constructor;
    const Attribute=tile.geometry.attributes.position.constructor,Material=tile.material.constructor;
    const Scene=T.world.scene.constructor,Renderer=T.renderer.constructor;
    const Camera=T.cam.camera.constructor,Sky=T.world.sky.constructor,Vector=T.cam.camera.position.constructor;
    const rows=[];
    const policies=[
      {initialized:false,capturePaused:false,globalRequest:false},
      {initialized:true,capturePaused:false,globalRequest:false},
      {initialized:true,capturePaused:true,globalRequest:false},
      {initialized:true,capturePaused:true,globalRequest:true},
    ];
    for(const {initialized,capturePaused,globalRequest} of policies){
      const canvas=document.createElement('canvas'),r=new Renderer({canvas,antialias:false});
      r.setSize(128,128);r.shadowMap.enabled=true;
      const s=new Scene(),sky=new Sky(128),focus=new Vector(0,0,0);
      sky.update(21.5166666667,focus,0,true);
      // Explicitly reproduce both lifecycle policies, even on a fixed build.
      sky.sun.shadow.needsUpdate=initialized;s.add(sky.group);
      r.shadowMap.autoUpdate=!capturePaused;r.shadowMap.needsUpdate=globalRequest;
      let shadowUpdates=0;const update=sky.sun.shadow.updateMatrices.bind(sky.sun.shadow);
      sky.sun.shadow.updateMatrices=(...args)=>{shadowUpdates++;return update(...args);};
      const g=new Geometry();
      g.setAttribute('position',new Attribute(new Float32Array([-6,0,-6,-6,0,6,6,0,-6,6,0,-6,-6,0,6,6,0,6]),3));
      g.computeVertexNormals();const m=new Material({color:0xaaaaaa,roughness:1});
      const floor=new Mesh(g,m);floor.receiveShadow=true;s.add(floor);
      const c=new Camera(60,1,.1,1000);c.position.set(0,3,5);c.lookAt(0,0,0);
      const gl=r.getContext();for(let i=0;i<8&&gl.getError()!==gl.NO_ERROR;i++){}
      try{
        r.render(s,c);
        const errors=[];for(let i=0;i<8;i++){const e=gl.getError();if(e===gl.NO_ERROR)break;errors.push(e);}
        const png=canvas.toDataURL('image/png'),firstShadowUpdates=shadowUpdates;
        if(initialized)for(let i=0;i<60;i++){sky.update(21.5166666667,focus,1/60,true);r.render(s,c);}
        rows.push({initialized,capturePaused,globalRequest,errors,mapExists:sky.sun.shadow.map!==null,
          compareFunction:sky.sun.shadow.map?.depthTexture?.compareFunction??null,
          autoUpdate:sky.sun.shadow.autoUpdate,needsUpdate:sky.sun.shadow.needsUpdate,
          firstShadowUpdates,extraShadowUpdates:shadowUpdates-firstShadowUpdates,png});
      }finally{sky.dispose();g.dispose();m.dispose();r.dispose();}
    }
    return rows;
  `);
  for(const [i,row] of rows.entries()){
    const name=['before.png','after.png','capture-light-only.png','capture-initialized.png'][i];
    fs.writeFileSync(path.join(out,name),Buffer.from(row.png.split(',')[1],'base64'));
    delete row.png;
  }
  const a=await sharp(path.join(out,'before.png')).ensureAlpha().raw().toBuffer();
  const b=await sharp(path.join(out,'after.png')).ensureAlpha().raw().toBuffer();
  let changedPixels=0;
  for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>10)changedPixels++;
  const assertions={baselineInvalidOperation:rows[0].errors.includes(1282),baselineMissingMap:!rows[0].mapExists,
    initializedMap:rows[1].mapExists,initializedDrawHealthy:rows[1].errors.length===0,
    nightUpdatesPaused:!rows[1].autoUpdate&&!rows[1].needsUpdate,
    oneInitialization:rows[1].firstShadowUpdates===1&&rows[1].extraShadowUpdates===0,
    captureNeedsGlobalRequest:rows[2].errors.includes(1282)&&!rows[2].mapExists,
    initializedCaptureHealthy:rows[3].errors.length===0&&rows[3].mapExists,
    captureInitializesOnce:rows[3].firstShadowUpdates===1&&rows[3].extraShadowUpdates===0,
    restoredSurface:changedPixels>10000};
  const receipt={rows,pixels:a.length/4,changedPixels,assertions,pass:Object.values(assertions).every(Boolean)};
  fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2));
  console.log(JSON.stringify(receipt));if(!receipt.pass)process.exitCode=1;
}finally{page.close();}
