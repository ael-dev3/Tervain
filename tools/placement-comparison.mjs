import assert from 'node:assert/strict';
const key=c=>JSON.stringify([c.label,c.component,c.position]);
function validate(report,kind) {
 assert(report?.complete&&!report.truncated&&report.invalid===0&&report.skipped.length===0,'Incomplete audit');
 assert(report.kind===kind&&report.checks.length>0&&report.summary.checks===report.checks.length&&report.summary[kind==='prop'?'props':'roots']===report.checks.length,'Population count mismatch');
 assert(report.summary.candidates===report.checks.filter(c=>c.candidate).length,'Candidate count mismatch');
 assert(report.checks.every(c=>c.kind===kind&&c.position.length===3&&c.position.every(Number.isFinite)&&Number.isFinite(c.minGap)&&Number.isFinite(c.maxGap)&&c.samples>0),'Invalid check');
 assert.equal(new Set(report.checks.map(key)).size,report.checks.length,'Duplicate check identity');
}
export function summarizePlacementComparison(before,after,roots) {
 validate(before,'prop');validate(after,'prop');assert(before.furnitureReady&&after.furnitureReady,'Furniture not ready');assert.equal(before.clearance,after.clearance);assert.equal(before.maxVertices,after.maxVertices);
 assert(Number.isInteger(roots.expectedRoots)&&roots.expectedRoots>0,'Missing root population');for(const mode of ['before','after']){validate(roots[mode],'root');assert.equal(roots[mode].summary.roots,roots.expectedRoots,'Root population mismatch');}
 const bm=new Map(before.checks.map(c=>[key(c),c])),am=new Map(after.checks.map(c=>[key(c),c]));
 const changes={removed:before.checks.filter(c=>!am.has(key(c))),added:after.checks.filter(c=>!bm.has(key(c))),candidateChanges:after.checks.filter(c=>bm.has(key(c))&&bm.get(key(c)).candidate!==c.candidate).map(c=>({before:bm.get(key(c)),after:c}))};
 const rootsSummary={expectedRoots:roots.expectedRoots,...Object.fromEntries(['before','after'].map(mode=>[mode,{summary:roots[mode].summary,complete:roots[mode].complete,rootsWithProbeGapOverClearance:roots[mode].checks.filter(c=>c.maxGap>roots[mode].clearance).length,partialProbeChecks:roots[mode].checks.filter(c=>c.maxGap>roots[mode].clearance),maxProbeGap:Math.max(...roots[mode].checks.map(c=>c.maxGap))}]))};
 const regions=[{name:'walk-fence',x:-2,z:37.25,radius:10},{name:'run-round',x:-12.3,z:44.8,radius:10}].map(route=>({...route,...Object.fromEntries([['before',before],['after',after]].map(([mode,r])=>{const checks=r.checks.filter(c=>Math.hypot(c.position[0]-route.x,c.position[2]-route.z)<=route.radius);return[mode,{checks:checks.length,candidates:checks.filter(c=>c.candidate).length,candidateChecks:checks.filter(c=>c.candidate)}];}))}));
 return {summary:Object.fromEntries([['before',before],['after',after]].map(([mode,r])=>[mode,Object.fromEntries(Object.entries(r).filter(([k])=>k!=='checks'))])),rootSummary:rootsSummary,changes,regions};
}

/** Keep the review summary small; the companion gzip retains every comparison row. */
export function compactPlacementComparison(report) {
 const check=c=>({label:c.label,component:c.component,position:c.position,minGap:c.minGap,maxGap:c.maxGap,unsupportedFraction:c.unsupportedFraction,samples:c.samples,candidate:c.candidate});
 return{...report,detailFile:'comparison-details.json.gz',changes:{removed:report.changes.removed.length,removedCandidates:report.changes.removed.filter(c=>c.candidate).length,added:report.changes.added.length,candidateChanges:report.changes.candidateChanges.map(c=>({before:check(c.before),after:check(c.after)}))},regions:report.regions.map(r=>({...r,before:{checks:r.before.checks,candidates:r.before.candidates},after:{checks:r.after.checks,candidates:r.after.candidates}}))};
}
