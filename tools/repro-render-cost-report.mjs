#!/usr/bin/env node
import fs from 'node:fs';
const [beforePath,afterPath]=process.argv.slice(2);
if(!beforePath||!afterPath)throw new Error('Use saved before and after software-WebGL reports');
const before=JSON.parse(fs.readFileSync(beforePath,'utf8')),after=JSON.parse(fs.readFileSync(afterPath,'utf8'));
const cost=after.renderCost;
const assertions={beforeDidNotReportCost:before.pass===true&&!before.renderCost,afterSmokePasses:after.pass===true,threeNativeFrames:cost?.frames?.length===3,drawsAndTriangles:cost?.frames?.every(f=>Number.isInteger(f.drawCalls)&&f.drawCalls>0&&f.triangles>0),uploadBytes:cost?.frames?.every(f=>Number.isFinite(f.uploadBytes)&&f.uploadBytes>=0),textureStorage:cost?.estimatedTextureStorageBytes>0,grass:cost?.grass?.grassInstances>0,allocationSample:Number.isFinite(cost?.sampledAllocationBytes)};
console.log(JSON.stringify({assertions,pass:Object.values(assertions).every(v=>v===true)}));if(!Object.values(assertions).every(v=>v===true))process.exitCode=1;
