#!/usr/bin/env node
/** Near-repeat observations in encoded video, not a measurement of engine frame times. */
import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const input=process.argv[2],output=process.argv[3];if(!input||!output)throw Error('Usage: node tools/analyze-video-cadence.mjs video.mp4 report.json [start=24] [duration=6]');
const start=Number(process.argv[4]??24),duration=Number(process.argv[5]??6),threshold=.2;
if(!Number.isFinite(start)||start<0||!Number.isFinite(duration)||duration<=0||duration>60)throw Error('Invalid analysis interval');
const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-read_intervals',`${Math.max(0,start-1)}%${start+duration+1}`,'-show_entries','stream=width,height,avg_frame_rate:format=start_time:frame=best_effort_timestamp_time','-of','json',input],{encoding:'utf8',timeout:30000,maxBuffer:32*1024*1024});if(probe.status!==0)throw Error('Video probe failed');
const meta=JSON.parse(probe.stdout),source=meta.streams[0],origin=Number(meta.format.start_time??0),times=meta.frames.map(f=>Number(f.best_effort_timestamp_time)-origin).filter(t=>t>=start-1e-6&&t<start+duration-1e-6);
if(times.length<2||times.some((t,i)=>!Number.isFinite(t)||i&&t<=times[i-1]))throw Error('Invalid ordered source timestamps');
const w=480,h=Math.round(source.height/source.width*w),crop={x:30,y:Math.round(h/9),width:420,height:Math.round(h*205/270)};
const decoded=spawnSync('ffmpeg',['-v','error','-ss',String(start),'-i',input,'-t',String(duration),'-vf',`scale=${w}:${h},crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}:exact=1,format=gray`,'-fps_mode','passthrough','-f','rawvideo','pipe:1'],{timeout:60000,maxBuffer:128*1024*1024});if(decoded.status!==0)throw Error('Video decode failed');
const bytes=crop.width*crop.height,count=decoded.stdout.length/bytes;if(!Number.isInteger(count)||count!==times.length)throw Error('Decoded frames do not match source timestamps: '+count+' decoded / '+times.length+' probed');
const bins=Array.from({length:Math.ceil(duration/2)},(_,i)=>({start:start+i*2,end:Math.min(start+duration,start+(i+1)*2),pairs:0,nearRepeatPairs:0,maxConsecutiveNearRepeats:0}));
let run=0;const rows=[];
for(let i=1;i<count;i++){let sum=0;for(let p=0;p<bytes;p++)sum+=Math.abs(decoded.stdout[i*bytes+p]-decoded.stdout[(i-1)*bytes+p]);const mad=sum/bytes,repeat=mad<threshold;run=repeat?run+1:0;const bin=bins[Math.min(bins.length-1,Math.floor((times[i]-start+1e-7)/2))];bin.pairs++;if(repeat)bin.nearRepeatPairs++;bin.maxConsecutiveNearRepeats=Math.max(bin.maxConsecutiveNearRepeats,run);rows.push({time:times[i],meanAbsoluteLumaChange:mad,nearRepeat:repeat});}
const report={scope:'Encoded-video scene-region near-repeat observations. Camera speed, scene content and recording/encoding can affect the metric; not engine frame times, hardware FPS or stall attribution.',nativeSize:[source.width,source.height],sourceAverageFrameRate:source.avg_frame_rate,analysisSize:[w,h],analysisCrop:crop,threshold,start,duration,decodedFrames:count,bins,rows};fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({decodedFrames:count,bins}));
