import type { Colliders } from '../world/colliders';
import type { Interactable } from './interactions';
import { cameraColliderEntry } from './cameraObstruction';

/** Reach, facing and actual visibility must all agree before a world action can be offered. */
export function chooseInteractable(items: readonly Interactable[], player: {x:number;y:number;z:number;yaw:number}, viewYaw: number, terrain: {groundAt(x:number,z:number):number}, colliders: Colliders, dynamicOcclusion?: (from: {x:number;y:number;z:number}, to: {x:number;y:number;z:number}) => boolean): Interactable | null {
  let best: Interactable | null = null;
  let score = Infinity;
  const eye = {x:player.x,y:player.y+1.4,z:player.z};
  for (const it of items) {
    if (!it.enabled()) continue;
    const pos = it.pos();
    const dx = pos.x-player.x;
    const dz = pos.z-player.z;
    const d = Math.hypot(dx,dz);
    const target = {x:pos.x,y:pos.y??terrain.groundAt(pos.x,pos.z)+1,z:pos.z};
    if (Math.hypot(d,target.y-eye.y) > it.r) continue;
    const facing = d < 1.4 ? 1 : (dx*Math.sin(player.yaw)+dz*Math.cos(player.yaw))/(d||1);
    const viewing = (dx*Math.sin(viewYaw)+dz*Math.cos(viewYaw))/(d||1);
    if (facing < 0.05 && viewing < 0.2) continue;
    const blocked = colliders.near(player.x,player.z,d+0.1).some((c) => {
      if (c.id === it.id || it.ignoreColliders?.includes(c.id)) return false;
      const t = cameraColliderEntry(eye,target,c,terrain.groundAt(c.x,c.z),5,0);
      return t !== null && t < 1-1e-5;
    });
    if (blocked || dynamicOcclusion?.(eye, target)) continue;
    const value = d+(it.priority??0)*2;
    if (value < score) {score=value;best=it;}
  }
  return best;
}
