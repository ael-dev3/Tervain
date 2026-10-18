import fs from 'node:fs';
import assert from 'node:assert/strict';
const file=process.argv[2];if(!file)throw Error('Supply report.json');
const r=JSON.parse(fs.readFileSync(file,'utf8'));
assert.equal(r.build.version,'0.0.27');assert.ok(r.build.revision.startsWith('163ee68'));
assert.equal(r.instrumentationChangedChannels,0);assert.equal(r.profile.postEnabled,true);
assert.equal(r.profile.postSamples,4);assert.deepEqual(r.profile.drawingBuffer,[2160,1350]);
assert.equal(r.route.frames,61);assert.equal(r.route.startFrame,0);assert.equal(r.route.stationary,false);
assert.equal(r.route.x,6);assert.equal(r.route.z,26);assert.equal(r.route.metres,2.6);
const b=r.reports.baseline;assert.equal(b.samples.length,61);
for(const [i,s] of b.samples.entries()){
 assert.equal(s.frame,i);assert.ok(s.grassObservations>100000);
 for(const k of ['strictWhite','bright180','temporalEligible','changesOver20'])assert.ok(Number.isInteger(s[k])&&s[k]>=0);
 assert.ok(Number.isFinite(s.maxLuminance)&&s.maxLuminance>=0&&s.maxLuminance<=255);
 assert.ok(s.strictWhite<=s.bright180&&s.bright180<=s.grassObservations);
 assert.ok(s.changesOver20<=s.temporalEligible);
}
for(const k of ['grassObservations','strictWhite','bright180','temporalEligible','changesOver20'])assert.equal(b[k],b.samples.reduce((n,s)=>n+s[k],0));
assert.equal(b.maxLuminance,Math.max(...b.samples.map(s=>s.maxLuminance)));
console.log('Collection checks passed; this is not a game-quality or hardware gate.');
