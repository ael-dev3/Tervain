import { describe, expect, it } from 'vitest';
import { cameraColliderEntry } from '../../src/presentation/cameraObstruction';
import { Colliders } from '../../src/world/colliders';
import { CameraRig } from '../../src/presentation/cameraRig';

const flat = { groundAt: () => 0 };

describe('continuous camera clearance', () => {
  it('does not skip a thin wall between the old fourteen march samples', () => {
    const c = new Colliders();
    c.box('thin', 0, -2.5, 3, 0.005);
    const cam = new CameraRig();
    cam.follow(1/60,0,0,0,flat,c,false,0);
    expect(cam.camera.position.z).toBeGreaterThan(-2.16);
  });
  it('finds vertical contact after the boom entered the footprint from above', () => {
    const c = {id:'crate', kind:'box' as const, x:0,z:0,hw:1,hd:1,yaw:0,active:true,minY:0,maxY:1};
    expect(cameraColliderEntry({x:0,y:3,z:0},{x:0,y:0,z:0},c,0,5,0)).toBeCloseTo(2/3);
    expect(cameraColliderEntry({x:-3,y:3,z:0},{x:3,y:3,z:0},c,0,5)).toBeNull();
  });
  it('snaps the first frame and follows horizontal movement without trailing into corners', () => {
    const cam = new CameraRig();
    cam.follow(1/60,5,2,7,flat,new Colliders(),false,0);
    expect(cam.camera.position.x).toBe(5);
    cam.follow(1/60,6,2,7,flat,new Colliders(),false,0);
    expect(cam.camera.position.x).toBe(6);
  });
  it('can retract nearer than the old minimum when a wall is directly behind the player', () => {
    const c = new Colliders(); c.box('wall',0,-0.8,3,0.2);
    const cam = new CameraRig();
    cam.follow(1/60,0,0,0,flat,c,true,0);
    expect(cam.camera.position.z).toBeGreaterThan(-0.3);
    expect(cam.bodyVisible).toBe(false);
  });
  it('resets a compressed boom when respawning, and rejects invalid look input', () => {
    const c = new Colliders(); c.circle('tree:test',0,-2,0.5);
    const cam = new CameraRig();cam.follow(1/60,0,0,0,flat,c,true,0);
    cam.reset();cam.follow(1/60,12,0,0,flat,c,false,0);
    expect(Math.hypot(cam.camera.position.y-1.55,cam.camera.position.z)).toBeCloseTo(6.2);
    cam.applyLook(NaN,Infinity,NaN);
    expect(Number.isFinite(cam.yaw) && Number.isFinite(cam.pitch) && Number.isFinite(cam.wantDist)).toBe(true);
  });
});
