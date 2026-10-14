import type {ShimmerSample} from './shimmer-metric.mjs';
export interface MotionFrame {gray:Uint8Array;white:Uint8Array}
export function rgbFrame(rgb:Uint8Array,width:number,height:number):MotionFrame;
export function walkingFlicker(frames:MotionFrame[],width:number,height:number):{summary:ReturnType<typeof import('./shimmer-metric.mjs').summarizeShimmer>;whitePixelsFlickered:number;whiteFlickerShare:number|null;whiteThreshold:{minimumChannel:number;minimumLuma:number;maximumChannelSpread:number};samples:ShimmerSample[]};
export function changeComponents(before:Uint8Array,after:Uint8Array,width:number,height:number,options?:{threshold?:number;minPixels?:number}):{changedPixels:number;events:{pixels:number;box:number[]}[]};
export function regionMotionCorrelation(frames:Uint8Array[],width:number,height:number,region:[number,number,number,number],options?:{grid?:number;search?:number}):{cellsMoving:number;cells:number;pairs:number;meanCorrelation:number|null;meanAbsCorrelation:number|null;rmsPixelMotionPerFrame:number};
