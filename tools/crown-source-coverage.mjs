/** Keep every registered tree in selected-source-LOD coverage, including missing wood/leaf models. */
export function canopySourceTargets(roots, native, families, lod, cutoutSampler) {
  const nativeLod=native.every(t=>t.lod===lod),missing=[];
  const targets=roots.map(root=>{
    const family=families.get(root.label),wood=family.find(m=>m.name.endsWith(':'+lod+':wood')),leaf=family.find(m=>m.name.endsWith(':'+lod+':foliage'));
    if(!wood)missing.push({label:root.label,lod,leavesPresent:!!leaf});
    const metadata=nativeLod?native.find(t=>t.label===root.label):undefined;
    const prefix=(wood??leaf)?.name.split(':')[0]??root.kind??'unknown';
    const species=metadata?.species??root.species??(prefix==='solitary-pine'?'pine':prefix);
    return{...root,...metadata,lod,species,kind:prefix,wood:wood?.geometry??null,leaves:leaf?.geometry??null,cutout:leaf?cutoutSampler(leaf.material):null,cutoutRequired:(leaf?.material?.alphaTest??0)>0};
  });
  return{targets,missing};
}

/** Measurement completeness is separate from candidate/visual quality. Missing source LODs never pass coverage. */
export function crownCoverageComplete(report) {
  return Number.isInteger(report.expectedTrees)&&report.expectedTrees>0&&report.missing.length===0
    &&report.levels.length===3&&report.levels.every((l,i)=>l.lod===i&&l.complete&&l.expectedTrees===report.expectedTrees&&l.coveredTrees===report.expectedTrees&&l.summary.trees===report.expectedTrees)
    &&report.transitionSamples===report.expectedTrees*14;
}
