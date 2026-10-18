import fs from 'node:fs';
import {openPage} from './cdp.mjs';
export async function liveProofPage(input,{quality='high',hour=19.3,headed=false,w=640,h=360,dpr=1}={}) {
 const url=new URL(input);for(const[k,v]of Object.entries({shot:'1',quality,place:'rillford',settle:'1',hud:'0',hour:String(hour)}))url.searchParams.set(k,v);
 if(!Number.isFinite(dpr)||dpr<=0||dpr>4)throw new Error('Invalid device pixel ratio');
 const page=await openPage(url.href,{w:Math.min(w,640),h:Math.min(h,360),dpr:1,requestTimeoutMs:600000,headed,...(process.env.REPRO_INIT_FILE?{init:fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8')}:{})});
 try{let ready=false;for(let i=0;i<1200;i++){const state=await page.eval('return {play:window.tervain?.mode === "play" && document.title === "READY",failed:window.tervain?.worldBuildFailed===true};');if(state.failed){console.log(JSON.stringify(page.console()));throw new Error('Published world failed to load');}if(state.play){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Published world did not become ready');
 await page.eval('const T=window.tervain;T.render=()=>{};T.step=()=>{};await T.world.arrived;');
 // Resize only after the game loop is frozen: loading frames at Retina density waste software-renderer work.
 if(w!==640||h!==360||dpr!==1){await page.cdp('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:dpr,mobile:false});await page.eval("window.dispatchEvent(new Event('resize'));await new Promise(requestAnimationFrame);return null;");}
 return page;
 }catch(error){page.close();throw error;}
}
