#!/usr/bin/env node
/** Explicit, bounded animal SFX generation. Credentials are read only from the environment. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const planPath=path.join(root,'tools/world-audio/animals.json');
const out=path.join(root,'assets/audio/source/animals');
const plan=JSON.parse(fs.readFileSync(planPath,'utf8'));
const key=process.env.ELEVENLABS_API_KEY;
const dry=process.argv.includes('--dry-run');
const limitIndex=process.argv.indexOf('--max-credits');
const cap=limitIndex<0?3000:Number(process.argv[limitIndex+1]);
if(!Number.isFinite(cap)||cap<=0)throw Error('A positive credit cap is required.');
const pending=plan.assets.filter(s=>!fs.existsSync(path.join(out,`${s.id}.mp3`)));
const estimate=pending.reduce((n,s)=>n+40*s.seconds,0);
console.log(JSON.stringify({takes:pending.length,seconds:pending.reduce((n,s)=>n+s.seconds,0),conservativeCredits:estimate,cap}));
if(dry)process.exit(0);
if(!key)throw Error('ELEVENLABS_API_KEY is required.');
if(estimate>cap)throw Error('Planned requests exceed the credit cap.');
const base='https://api.elevenlabs.io';
async function subscription(){
 const r=await fetch(`${base}/v1/user/subscription`,{headers:{'xi-api-key':key},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(`Subscription preflight failed (${r.status}); no generation started.`);
 const v=await r.json();
 if(!Number.isFinite(v.character_count)||!Number.isFinite(v.character_limit))throw Error('Available credit balance is unknown.');
 return v;
}
const initial=await subscription();
if(initial.status!=='active'||initial.character_limit-initial.character_count<estimate)throw Error('Insufficient active subscription credits.');
fs.mkdirSync(out,{recursive:true});
let committedEstimate=0;
for(const s of pending){
 if(!/^(tiger|lion|bear|wolf|cat|dog|boar|deer)-[12]$/.test(s.id)||s.model!=='eleven_text_to_sound_v2'||s.seconds<0.5||s.seconds>30)throw Error('Invalid animal request.');
 const before=await subscription();
 const spent=Math.max(0,before.character_count-initial.character_count);
 if(Math.max(spent,committedEstimate)+40*s.seconds>cap||before.character_limit-before.character_count<40*s.seconds)throw Error('Credit cap or available balance reached.');
 const r=await fetch(`${base}/v1/sound-generation?output_format=${s.format}`,{method:'POST',headers:{'xi-api-key':key,'content-type':'application/json'},body:JSON.stringify({text:s.prompt,duration_seconds:s.seconds,prompt_influence:0.55,model_id:s.model}),signal:AbortSignal.timeout(120000)});
 // Do not retry an unknown billed outcome or print account response bodies.
 if(!r.ok)throw Error(`Animal generation failed (${s.id}, HTTP ${r.status}); no automatic retry.`);
 if(!(r.headers.get('content-type')??'').startsWith('audio/'))throw Error(`Unexpected non-audio response for ${s.id}.`);
 const bytes=Buffer.from(await r.arrayBuffer());
 if(bytes.length<1000)throw Error(`Truncated audio response for ${s.id}.`);
 fs.writeFileSync(path.join(out,`${s.id}.mp3`),bytes,{flag:'wx'});
 s.generated=new Date().toISOString().slice(0,10);
 s.sourceSha256=crypto.createHash('sha256').update(bytes).digest('hex');
 fs.writeFileSync(planPath,JSON.stringify(plan,null,2)+'\n');
 committedEstimate+=40*s.seconds;
 console.log(`Generated ${s.id}: ${bytes.length} bytes`);
}
const final=await subscription();
console.log(JSON.stringify({generated:pending.length,creditsSpent:Math.max(0,final.character_count-initial.character_count)}));
