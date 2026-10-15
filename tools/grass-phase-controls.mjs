/** Validate before touching the scene; old captures omitted the hour and cloud phase. */
export function normalizeGrassPhaseControls(input,defaults) {
 const phase={hour:input?.hour===undefined?defaults.hour:input.hour,cloudTime:input?.cloudTime??input?.skyTime??defaults.cloudTime??null,
  wind:{time:input?.wind?.time,direction:input?.wind?.direction,scroll:input?.wind?.scroll},sway:input?.sway,gradeTime:input?.gradeTime};
 const vector=v=>Array.isArray(v)&&v.length===4&&v.every(Number.isFinite);
 if(!Number.isFinite(phase.hour)||phase.hour<0||phase.hour>24||phase.cloudTime!==null&&!Number.isFinite(phase.cloudTime)
  ||!Number.isFinite(phase.wind.time)||!vector(phase.wind.direction)||!vector(phase.wind.scroll)||!Number.isFinite(phase.sway)||!Number.isFinite(phase.gradeTime))throw new Error('Invalid grass phase controls');
 return{...phase,wind:{...phase.wind,direction:phase.wind.direction.slice(),scroll:phase.wind.scroll.slice()}};
}
export function readGrassPhaseControls(T,hour) {
 const u=T.world.foliage.wind.uniforms;
 return{hour:hour??(T.game.state.clock%1440)/60,cloudTime:T.world.sky.cloudTime??null,
  wind:{time:u.uGrassTime.value,direction:u.uWindDir.value.toArray(),scroll:u.uGustScroll.value.toArray()},sway:T.world.sway.uTime.value,gradeTime:T.grade.time};
}
/** Receives validated controls. The real SkyRig clock is cloudTime, not an unused time property. */
export function applyGrassPhaseControls(T,phase) {
 const u=T.world.foliage.wind.uniforms;u.uGrassTime.value=phase.wind.time;u.uWindDir.value.fromArray(phase.wind.direction);u.uGustScroll.value.fromArray(phase.wind.scroll);
 T.world.sway.uTime.value=phase.sway;T.grade.time=phase.gradeTime;
 if(phase.cloudTime!==null)T.world.sky.cloudTime=phase.cloudTime;
 T.world.sky.update(phase.hour,T.player.group.position,0,false);T.grade.setLook({night:T.world.sky.state.nightness});
}
