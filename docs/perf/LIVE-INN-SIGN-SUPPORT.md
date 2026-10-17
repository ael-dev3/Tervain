# Scoped live inn-sign support observations

Published 0.0.18 · 421d34b, low preset, village at noon. This is a **baseline diagnostic snapshot**, not a before/after visual fix or full-scene placement PASS.

[Native context image](proofs/placement-support-index/live-sign/context.png) · [raw scoped receipt](proofs/placement-support-index/live-sign/report.json)

The sign board/chain meshes (`inn-sign-inn:metal`, `:planks`, `:vc`) produce 94 component checks, 16 directional vertical-support candidates, zero invalid components and no skipped target geometry. `complete` describes that scoped scan only. Population adapters are omitted; existing rendered scene support geometry is retained. An anchored connection graph is not tested.

Candidate gaps include hanging links, iron trim and painted details outside the board's vertical footprint. These cannot be called floating objects merely because a downward ray misses a support. The inn bracket is present in the published source and visible in the context; the older missing-bracket report is not reproduced for this sign. Other signs/props remain open.

The broad live prop scan did not return within its request deadline, both before and with deferred indexing. No whole-scene speedup or coverage PASS is claimed. #482's work reduction is established by its isolated production-module fixture with identical result hashes.

## Reproduce the scoped query

Load the published build with `?shot=1&quality=low&place=rillford&settle=1&hud=0&hour=11`, wait for play/READY, then execute the following through the browser/CDP. It temporarily freezes simulation/rendering and restores names, adapters and callbacks afterward. Keep the returned scope warning with any exported receipt.

```js
const report = await (async () => {
const originalStep = window.tervain.step, originalRender = window.tervain.render;
try {
const T=window.tervain;T.step=()=>{};T.render=()=>{};await T.world.arrived;
 const restored=[],adapters=[],targets=[];const omitted=/water|terrain|sky|grass|foliage|leaves|floor shadows|cloud|dust|shadow$|sun|moon/i;
 T.world.scene.traverse(o=>{if(!o.isMesh)return;let sign=/inn-sign/i.test(o.name);for(let p=o.parent;p&&!sign;p=p.parent)sign=p.name==='Sign / inn';if(sign){targets.push(o.name);return;}const name=o.name;restored.push([o,name]);o.name=(omitted.test(name)&&!/terrain/i.test(name)?'foliage support / ':'terrain support / ')+name;});
 for(const {module} of T.world.modules)if(module.placementAuditTargets){adapters.push([module,module.placementAuditTargets]);module.placementAuditTargets=()=>[];}
 try {const r=await T.auditPlacement({kind:'prop',maxChecks:5000});return {...r,scope:'Inn sign board/chains only; rendered scene support geometry retained, population adapters omitted; directional vertical gaps are candidates, not an anchored-support certification.',targetMeshes:targets};}finally{for(const [o,name]of restored)o.name=name;for(const [m,fn]of adapters)m.placementAuditTargets=fn;}
} finally {
  window.tervain.step = originalStep;
  window.tervain.render = originalRender;
}
})();
console.log(report);
```

The native image uses the same frozen scene after restoring labels, with the camera at (6, 4, 35), looking at (1.9, 2.6, 32.45). No production placement, geometry or styling was changed.
