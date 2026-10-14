/** Native leaf-only control for shader/post/MSAA comparisons. No production shader replacement. */
export function treeEdgeCaptureProgram({frames=24,degrees=4,x=-40,z=0,hour=12}={}) {
  if(!Number.isInteger(frames)||frames<3||frames>120||![degrees,x,z,hour].every(Number.isFinite)||Math.abs(degrees)>15)throw Error('Invalid leaf capture route');
  return `const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest')?.module;
if(!F?.group)throw Error('Native forest missing');
const keep=new Set();F.group.traverse(o=>keep.add(o));
const hidden=new Map(),hideOthers=()=>T.world.scene.traverse(o=>{
 if((o.isMesh||o.isPoints||o.isLine)&&(!keep.has(o)||/:wood$/.test(o.name))){if(!hidden.has(o))hidden.set(o,o.visible);o.visible=false;}
});
const camera=T.cam.camera.clone(),x=${x},z=${z},h=T.world.terrain.heightAt(x,z),focus=T.player.group.position.clone().set(x,h,z);
camera.position.set(x+3,h+1.7,z+4);camera.lookAt(x-10,h+4,z);camera.updateMatrixWorld();
const base=camera.quaternion.clone(),R=T.renderer,nativeRender=R.render,samples=new Set(),captures=[];
const oldShadowAuto=R.shadowMap.autoUpdate,oldShadowNeeds=R.shadowMap.needsUpdate;let warmed=false;
R.render=function(scene,cam){if(scene===T.world.scene&&cam===camera)samples.add(R.getContext().getParameter(R.getContext().SAMPLES));return nativeRender.call(this,scene,cam);};
try {
 for(const route of ['stationary','pan'])for(let i=0;i<(route==='stationary'?3:${frames});i++){
  camera.quaternion.copy(base);if(route==='pan')camera.rotateY(${degrees}*Math.PI/180*i/(${frames}-1));camera.updateMatrixWorld();
  T.world.update(0,T.game.state,focus,T.settings,${hour},camera,false);
  // Updates may create/show new grass tiles or spray: exclude them after every update, too.
  hideOthers();
  R.toneMappingExposure=1.22;if(T.worldLook){T.grade.setLook(T.worldLook);T.worldLook=null;}
  T.grade.setLook({night:T.world.sky.state.nightness});
  const info=R.info,auto=info.autoReset;info.autoReset=false;info.reset();
  try{if(warmed)R.shadowMap.needsUpdate=false;T.grade.render(T.world.scene,camera,0,T.world.waterRenderInputs(T.settings));
   if(!warmed){warmed=true;R.shadowMap.autoUpdate=false;}
   const gl=R.getContext();captures.push({route,i,png:R.domElement.toDataURL('image/png').split(',')[1],drawCalls:info.render.calls,triangles:info.render.triangles,glError:gl.getError(),contextLost:gl.isContextLost()});
  }finally{info.autoReset=auto;}
 }
 return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),size:[R.domElement.width,R.domElement.height],requestedSamples:T.grade.target.samples,postEnabled:T.grade.enabled,shadows:'frozen after first capture',maxSamples:R.getContext().getParameter(R.getContext().MAX_SAMPLES),observedSamples:[...samples],captures};
}finally{R.shadowMap.autoUpdate=oldShadowAuto;R.shadowMap.needsUpdate=oldShadowNeeds;R.render=nativeRender;for(const[o,visible]of hidden)o.visible=visible;}`;
}
