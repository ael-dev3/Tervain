export interface GrassPhaseControls { hour:number; cloudTime:number|null;wind:{time:number;direction:number[];scroll:number[]};sway:number;gradeTime:number }
export function normalizeGrassPhaseControls(input:unknown,defaults:{hour:number;cloudTime?:number|null}):GrassPhaseControls;
export function readGrassPhaseControls(host:unknown,hour?:number):GrassPhaseControls;
export function applyGrassPhaseControls(host:unknown,controls:GrassPhaseControls):void;
