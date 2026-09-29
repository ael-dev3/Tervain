import * as THREE from 'three';
import type { Colliders } from '../world/colliders';
import type { Terrain } from '../world/terrain';
import { PLACES } from '../world/layout';

/**
 * A stable third-person camera. Obstruction shortens the boom immediately but lets it
 * lengthen slowly, so it never oscillates against an edge or fights the input.
 */
export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.25, 1400);
  yaw = 0;
  pitch = 0.32;
  wantDist = 5.4;
  private curDist = 5.4;
  private target = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();
  private titleAngle = 0;
  mode: 'follow' | 'title' | 'bench' = 'follow';
  benchPath: { p: THREE.Vector3; look: THREE.Vector3 }[] = [];
  benchT = 0;
  private shakeT = 0;

  setAspect(a: number) {
    this.camera.aspect = a;
    this.camera.updateProjectionMatrix();
  }

  lookAtYaw(yaw: number) {
    this.yaw = yaw;
  }

  applyLook(dyaw: number, dpitch: number, zoom: number) {
    this.yaw += dyaw;
    this.pitch = Math.max(-0.15, Math.min(1.25, this.pitch + dpitch));
    if (zoom !== 0) this.wantDist = Math.max(2.6, Math.min(9, this.wantDist + zoom * 0.004));
  }

  follow(dt: number, px: number, py: number, pz: number, terrain: Terrain, colliders: Colliders, reducedMotion: boolean, shake: number, heightOffset = 1.55) {
    this.target.set(px, py + heightOffset, pz);
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 14);
    this.smoothTarget.lerp(this.target, this.smoothTarget.distanceToSquared(this.target) > 400 ? 1 : k);

    // Boom direction from yaw/pitch (camera sits behind the view direction).
    const cp = Math.cos(this.pitch);
    const dirX = -Math.sin(this.yaw) * cp;
    const dirY = Math.sin(this.pitch);
    const dirZ = -Math.cos(this.yaw) * cp;

    let allowed = this.wantDist;
    // March along the boom; stop before terrain or a collider.
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const d = (this.wantDist * i) / steps;
      const x = this.smoothTarget.x + dirX * d;
      const y = this.smoothTarget.y + dirY * d;
      const z = this.smoothTarget.z + dirZ * d;
      const ground = terrain.groundAt(x, z);
      if (y < ground + 0.35) {
        allowed = Math.max(0.9, d - 0.5);
        break;
      }
      if (colliders.near(x, z, 1.4).some((c) => {
        if (c.kind === 'circle') return c.id.startsWith('tree:') ? false : Math.hypot(x - c.x, z - c.z) < c.r + 0.7 && y < ground + 5;
        return this.inBox(c, x, z) && y < ground + 6;
      })) {
        allowed = Math.max(0.9, d - 0.6);
        break;
      }
    }
    // Shorten instantly; lengthen slowly.
    if (allowed < this.curDist) this.curDist = allowed;
    else this.curDist += (allowed - this.curDist) * (1 - Math.exp(-dt * 1.6));
    const cx = this.smoothTarget.x + dirX * this.curDist;
    let cy = this.smoothTarget.y + dirY * this.curDist;
    const cz = this.smoothTarget.z + dirZ * this.curDist;
    cy = Math.max(cy, terrain.groundAt(cx, cz) + 0.45);
    this.camera.position.set(cx, cy, cz);
    if (!reducedMotion && shake > 0) {
      this.shakeT += dt * 60;
      this.camera.position.x += Math.sin(this.shakeT * 1.7) * shake * 0.12;
      this.camera.position.y += Math.cos(this.shakeT * 2.3) * shake * 0.1;
    }
    this.camera.lookAt(this.smoothTarget);
  }

  private inBox(c: { x: number; z: number; hw: number; hd: number; yaw: number }, x: number, z: number) {
    const dx = x - c.x;
    const dz = z - c.z;
    const lx = dx * Math.cos(c.yaw) - dz * Math.sin(c.yaw);
    const lz = dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw);
    return Math.abs(lx) < c.hw + 0.75 && Math.abs(lz) < c.hd + 0.75;
  }

  /** Slow orbit above the spring overlook for the title screen; static under reduced motion. */
  title(dt: number, terrain: Terrain, reducedMotion: boolean) {
    if (!reducedMotion) this.titleAngle += dt * 0.035;
    const cx = -14;
    const cz = -86;
    const a = 2.35 + Math.sin(this.titleAngle) * 0.5;
    const r = 34;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const y = terrain.heightAt(x, z) + 10 + Math.sin(this.titleAngle * 0.7) * 1.5;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(cx, terrain.heightAt(cx, cz) + 2.5, cz);
    this.smoothTarget.set(cx, terrain.heightAt(cx, cz), cz);
    void PLACES;
  }

  /** A fixed camera route for repeatable frame-time measurements. */
  bench(dt: number) {
    const path = this.benchPath;
    if (path.length < 2) return true;
    this.benchT += dt / 6; // seconds per segment
    const seg = Math.floor(this.benchT);
    if (seg >= path.length - 1) return true;
    const t = this.benchT - seg;
    const a = path[seg]!;
    const b = path[seg + 1]!;
    const s = t * t * (3 - 2 * t);
    this.camera.position.lerpVectors(a.p, b.p, s);
    const look = new THREE.Vector3().lerpVectors(a.look, b.look, s);
    this.camera.lookAt(look);
    this.smoothTarget.copy(look);
    return false;
  }
}
