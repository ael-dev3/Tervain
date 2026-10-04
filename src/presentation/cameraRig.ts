import * as THREE from 'three';
import type { Colliders } from '../world/colliders';
import type { Terrain } from '../world/terrain';
import { BUILDINGS, LIGHTHOUSE, PLACES } from '../world/layout';
import { CAMERA_CLEARANCE, cameraColliderEntry } from './cameraObstruction';

/**
 * A stable third-person camera. Obstruction shortens the boom immediately but lets it
 * lengthen slowly, so it never oscillates against an edge or fights the input.
 */
export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1400);
  yaw = 0;
  pitch = 0.32;
  wantDist = 5.4;
  private curDist = 5.4;
  private target = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();
  private titleAngle = 0;
  private initialized = false;
  /** Used to hide the local body only when the boom is forced inside it. */
  get bodyVisible() { return this.manual !== null || this.curDist >= 0.85; }

  /** Teleports, respawns and loads must never inherit the previous pivot or a compressed boom. */
  reset() {
    this.initialized = false;
    this.curDist = this.wantDist;
    this.shakeT = 0;
  }
  mode: 'follow' | 'title' | 'bench' = 'follow';
  benchPath: { p: THREE.Vector3; look: THREE.Vector3 }[] = [];
  benchT = 0;
  private shakeT = 0;
  /** Developer aid (tools/shot.mjs `cam=`): a fixed camera position and target that overrides following. */
  manual: { p: THREE.Vector3; look: THREE.Vector3 } | null = null;

  setAspect(a: number) {
    this.camera.aspect = a;
    this.camera.updateProjectionMatrix();
  }

  lookAtYaw(yaw: number) {
    if (Number.isFinite(yaw)) this.yaw = yaw;
  }

  applyLook(dyaw: number, dpitch: number, zoom: number) {
    if (Number.isFinite(dyaw)) this.yaw = Math.atan2(Math.sin(this.yaw + dyaw), Math.cos(this.yaw + dyaw));
    // Let players look up at the lighthouse and tree crowns instead of stopping only nine degrees above level.
    // The same swept boom clearance still keeps low camera angles outside terrain and scenery.
    if (Number.isFinite(dpitch)) this.pitch = Math.max(-0.65, Math.min(1.25, this.pitch + dpitch));
    if (Number.isFinite(zoom) && zoom !== 0) this.wantDist = Math.max(2.6, Math.min(9, this.wantDist + zoom * 0.004));
  }

  follow(dt: number, px: number, py: number, pz: number, terrain: Pick<Terrain, 'groundAt'>, colliders: Colliders, reducedMotion: boolean, shake: number, heightOffset = 1.55) {
    if (this.manual) {
      this.camera.position.copy(this.manual.p);
      this.camera.lookAt(this.manual.look);
      return;
    }
    this.target.set(px, py + heightOffset, pz);
    const k = reducedMotion ? 1 : 1 - Math.exp(-Math.max(0, dt) * 18);
    if (!this.initialized || this.smoothTarget.distanceToSquared(this.target) > 100) {
      this.smoothTarget.copy(this.target);
      this.initialized = true;
    } else {
      // Horizontal pivot lag pulled the camera through walls on corners and made steering feel floaty.
      this.smoothTarget.x = px;
      this.smoothTarget.z = pz;
      this.smoothTarget.y += (this.target.y - this.smoothTarget.y) * k;
    }

    const cp = Math.cos(this.pitch);
    const dirX = -Math.sin(this.yaw) * cp;
    const dirY = Math.sin(this.pitch);
    const dirZ = -Math.cos(this.yaw) * cp;
    const desired = {
      x: this.smoothTarget.x + dirX * this.wantDist,
      y: this.smoothTarget.y + dirY * this.wantDist,
      z: this.smoothTarget.z + dirZ * this.wantDist,
    };
    let allowed = this.wantDist;
    const candidates = colliders.near(px, pz, this.wantDist + CAMERA_CLEARANCE);
    for (const c of candidates) {
      const building = c.id.startsWith('b:') ? BUILDINGS.find((b) => `b:${b.id}` === c.id) : null;
      const height = c.id === 'lighthouse' ? LIGHTHOUSE.h + 2
        : c.id.startsWith('tree:') ? 20
        : building ? building.h + Math.min(building.w, building.d) * 0.6
        : c.id.startsWith('archive_') ? 3.4 : 5;
      const t = cameraColliderEntry(this.smoothTarget, desired, c, terrain.groundAt(c.x, c.z), height);
      if (t !== null) allowed = Math.min(allowed, Math.max(0.04, t * this.wantDist - 0.025));
    }
    // The rendered terrain is piecewise planar. A short spatial march followed by bisection finds bank contact
    // independently of frame rate, rather than stepping over a bank in fourteen widely spaced samples.
    const steps = Math.ceil(this.wantDist / 0.12);
    let previous = 0;
    for (let i = 1; i <= steps; i++) {
      const d = this.wantDist * i / steps;
      if (d > allowed) break;
      const clear = (distance: number) => {
        const x = this.smoothTarget.x + dirX * distance;
        const z = this.smoothTarget.z + dirZ * distance;
        const r = CAMERA_CLEARANCE;
        const floor = Math.max(terrain.groundAt(x,z), terrain.groundAt(x-r,z), terrain.groundAt(x+r,z), terrain.groundAt(x,z-r), terrain.groundAt(x,z+r));
        return this.smoothTarget.y + dirY * distance >= floor + r;
      };
      if (!clear(d)) {
        let lo = previous;
        let hi = d;
        for (let j = 0; j < 12; j++) {
          const mid = (lo + hi) / 2;
          if (clear(mid)) lo = mid;
          else hi = mid;
        }
        allowed = Math.min(allowed, Math.max(0.04, lo - 0.025));
        break;
      }
      previous = d;
    }
    // Shorten instantly; lengthen slowly.
    if (allowed < this.curDist) this.curDist = allowed;
    else this.curDist += (allowed - this.curDist) * (1 - Math.exp(-dt * 1.6));
    const cx = this.smoothTarget.x + dirX * this.curDist;
    let cy = this.smoothTarget.y + dirY * this.curDist;
    const cz = this.smoothTarget.z + dirZ * this.curDist;
    cy = Math.max(cy, terrain.groundAt(cx, cz) + 0.45);
    this.camera.position.set(cx, cy, cz);
    if (!reducedMotion && shake > 0 && this.curDist > 1) {
      this.shakeT += dt * 60;
      const kick = Math.min(0.04, shake * 0.12);
      const lateral = Math.sin(this.shakeT * 1.7) * kick;
      this.camera.position.x += Math.cos(this.yaw) * lateral;
      this.camera.position.z -= Math.sin(this.yaw) * lateral;
      this.camera.position.y += Math.cos(this.shakeT * 2.3) * kick;
    }
    this.camera.lookAt(this.smoothTarget);
  }

  /**
   * The title view: a slow drift above the Grey Strand, looking along the beach to the lighthouse on Lantern Point with the sea
   * to the right. Static under reduced motion.
   */
  title(dt: number, terrain: Terrain, reducedMotion: boolean) {
    if (!reducedMotion) this.titleAngle += dt * 0.05;
    const t = this.titleAngle;
    const x = -262 + Math.sin(t * 0.9) * 7;
    const z = 2 + Math.cos(t * 0.7) * 5;
    const y = terrain.heightAt(x, z) + 4.6 + Math.sin(t * 0.6) * 0.7;
    this.camera.position.set(x, y, z);
    const lx = -322 + Math.sin(t * 0.5) * 5;
    const lz = 98;
    this.camera.lookAt(lx, terrain.heightAt(-322, 98) + 11 + Math.sin(t * 0.8) * 1.2, lz);
    this.smoothTarget.set(-290, terrain.heightAt(-290, 50), 50);
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
