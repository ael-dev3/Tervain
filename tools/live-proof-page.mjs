import fs from 'node:fs';
import {openPage} from './cdp.mjs';
export async function liveProofPage(input,{quality='high',hour=19.3}={}) {
 const url=new URL(input);for(const[k,v]of Object.entries({shot:'1',quality,place:'rillford',settle:'1',hud:'0',hour:String(hour)}))url.searchParams.set(k,v);
 const page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,...(process.env.REPRO_INIT_FILE?{init:fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8')}:{})});
 try{let ready=false;for(let i=0;i<1200;i++){const state=await page.eval('return {play:window.tervain?.mode === "play" && document.title === "READY",failed:window.tervain?.worldBuildFailed===true};');if(state.failed){console.log(JSON.stringify(page.console()));throw new Error('Published world failed to load');}if(state.play){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Published world did not become ready');
 await page.eval('const T=window.tervain;T.render=()=>{};T.step=()=>{};await T.world.arrived;');return page;
 }catch(error){page.close();throw error;}
}
