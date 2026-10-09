import * as THREE from 'three';
import type { Collider, Colliders } from '../world/colliders';
import type { Terrain } from '../world/terrain';
import { BUILDINGS, LIGHTHOUSE, PLACES } from '../world/layout';
import { CAMERA_CLEARANCE, cameraColliderEntry } from './cameraObstruction';
import { RIDE_CAMERA } from './riding';

const MAX_RECOIL = 0.04;

function obstacleHeight(c: Collider): number {
  const building = c.id.startsWith('b:') ? BUILDINGS.find((b) => `b:${b.id}` === c.id) : null;
  return c.id === 'lighthouse' ? LIGHTHOUSE.h + 2
    : c.id.startsWith('tree:') ? 20
    : building ? building.h + Math.min(building.w, building.d) * 0.6
    : c.id.startsWith('archive_') ? 3.4 : 5;
}

/**
 * A stable third-person camera. Obstruction shortens the boom immediately but lets it
 * lengthen slowly, so it never oscillates against an edge or fights the input.
 */
export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1400);
  yaw = 0;
  pitch = 0.32;
  /** A little more room for the road and construction around the figure, without automatic zoom or bob. */
  wantDist = 6.2;
  private curDist = 6.2;
  private target = new THREE.Vector3();
  private smoothTarget = new THREE.Vector3();
  private followPivot = new THREE.Vector3();
  private aiming = false;
  get isAiming() { return this.aiming; }
  /** In the saddle the camera rides further back and higher (A71); `rideBlend` eases 0 afoot .. 1 mounted. */
  mounted = false;
  rideBlend = 0;
  /** The boom length and pivot height actually used by the last follow, for checks. */
  lastBoom = 0;
  lastPivotLift = 0;
  private titleAngle = 0;
  private initialized = false;
  private waterSide: 'above' | 'under' | null = null;
  private waterTerrain: Pick<Terrain, 'groundAt'> | null = null;
  private waterColliders: Collider[] = [];
  /** Used to hide the local body only when the boom is forced inside it. */
  get bodyVisible() { return this.manual !== null || this.curDist >= 0.85; }

  /** Teleports, respawns and loads must never inherit the previous pivot or a compressed boom. */
  reset() {
    this.initialized = false;
    this.waterSide = null;
    this.waterTerrain = null;
    this.waterColliders = [];
    this.curDist = this.wantDist;
    this.shakeT = 0;
    this.aiming = false;
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
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

  /** A closer shoulder view leaves the exploration zoom preference intact. */
  setAiming(aiming: boolean) {
    this.aiming = aiming;
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
    const rideTarget = this.mounted ? 1 : 0;
    this.rideBlend = !this.initialized || reducedMotion ? rideTarget
      : this.rideBlend + (rideTarget - this.rideBlend) * (1 - Math.exp(-Math.max(0, dt) * RIDE_CAMERA.rate));
    const lift = RIDE_CAMERA.up * this.rideBlend;
    this.lastPivotLift = heightOffset + lift;
    this.target.set(px, py + heightOffset + lift, pz);
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
    const boomDistance = (this.aiming ? 2.8 : this.wantDist) + RIDE_CAMERA.back * this.rideBlend;
    this.lastBoom = boomDistance;
    const aimOffset = this.aiming ? 0.42 : 0;
    this.followPivot.copy(this.smoothTarget);
    const candidates = colliders.near(px, pz, boomDistance + aimOffset + CAMERA_CLEARANCE + MAX_RECOIL);
    this.waterTerrain = terrain;
    this.waterColliders = candidates;
    if (aimOffset > 0) {
      // At yaw zero the screen's right is -X. Sweep the short shoulder shift before sweeping the boom.
      const offset = new THREE.Vector3(-Math.cos(this.yaw) * aimOffset, 0, Math.sin(this.yaw) * aimOffset);
      const shoulder = this.smoothTarget.clone().add(offset);
      let shoulderFraction = 1;
      for (const c of candidates) {
        const t = cameraColliderEntry(this.smoothTarget, shoulder, c, terrain.groundAt(c.x, c.z), obstacleHeight(c));
        if (t !== null) shoulderFraction = Math.min(shoulderFraction, Math.max(0, t - 0.025 / aimOffset));
      }
      const clearShoulder = (fraction: number) => {
        const x = this.smoothTarget.x + offset.x * fraction, z = this.smoothTarget.z + offset.z * fraction;
        const r = CAMERA_CLEARANCE;
        const floor = Math.max(terrain.groundAt(x,z), terrain.groundAt(x-r,z), terrain.groundAt(x+r,z), terrain.groundAt(x,z-r), terrain.groundAt(x,z+r));
        return this.smoothTarget.y >= floor + r;
      };
      const shoulderSteps = Math.ceil(aimOffset / .06);
      let previousShoulder = 0;
      for (let i = 1; i <= shoulderSteps; i++) {
        const fraction = Math.min(i / shoulderSteps, shoulderFraction);
        if (fraction <= previousShoulder) break;
        if (!clearShoulder(fraction)) {
          let lo = previousShoulder, hi = fraction;
          for (let j = 0; j < 10; j++) {
            const mid = (lo + hi) / 2;
            if (clearShoulder(mid)) lo = mid;
            else hi = mid;
          }
          shoulderFraction = Math.max(0, lo - .025 / aimOffset);
          break;
        }
        previousShoulder = fraction;
      }
      this.followPivot.addScaledVector(offset, shoulderFraction);
    }
    const desired = {
      x: this.followPivot.x + dirX * boomDistance,
      y: this.followPivot.y + dirY * boomDistance,
      z: this.followPivot.z + dirZ * boomDistance,
    };
    let allowed = boomDistance;
    for (const c of candidates) {
      const t = cameraColliderEntry(this.followPivot, desired, c, terrain.groundAt(c.x, c.z), obstacleHeight(c));
      if (t !== null) allowed = Math.min(allowed, Math.max(0.04, t * boomDistance - 0.025));
    }
    // The rendered terrain is piecewise planar. A short spatial march followed by bisection finds bank contact
    // independently of frame rate, rather than stepping over a bank in fourteen widely spaced samples.
    const steps = Math.ceil(boomDistance / 0.12);
    let previous = 0;
    for (let i = 1; i <= steps; i++) {
      const d = boomDistance * i / steps;
      if (d > allowed) break;
      const clear = (distance: number) => {
        const x = this.followPivot.x + dirX * distance;
        const z = this.followPivot.z + dirZ * distance;
        const r = CAMERA_CLEARANCE;
        const floor = Math.max(terrain.groundAt(x,z), terrain.groundAt(x-r,z), terrain.groundAt(x+r,z), terrain.groundAt(x,z-r), terrain.groundAt(x,z+r));
        return this.followPivot.y + dirY * distance >= floor + r;
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
    const cx = this.followPivot.x + dirX * this.curDist;
    let cy = this.followPivot.y + dirY * this.curDist;
    const cz = this.followPivot.z + dirZ * this.curDist;
    cy = Math.max(cy, terrain.groundAt(cx, cz) + 0.45);
    this.camera.position.set(cx, cy, cz);
    if (!reducedMotion && shake > 0 && this.curDist > 1) {
      this.shakeT += dt * 60;
      const kick = Math.min(MAX_RECOIL, shake * 0.12);
      const lateral = Math.sin(this.shakeT * 1.7) * kick;
      const recoil = {
        x: cx + Math.cos(this.yaw) * lateral,
        y: cy + Math.cos(this.shakeT * 2.3) * kick,
        z: cz - Math.sin(this.yaw) * lateral,
      };
      const recoilLength = Math.hypot(recoil.x - cx, recoil.y - cy, recoil.z - cz);
      let share = 1;
      // Recoil is presentation motion, but it still has the camera's near-plane volume.
      // Reuse the one broad-phase query: a clear boom can run alongside a wall less than a pulse away.
      for (const c of candidates) {
        const entry = cameraColliderEntry(this.camera.position, recoil, c, terrain.groundAt(c.x, c.z), obstacleHeight(c));
        if (entry !== null) share = Math.min(share, Math.max(0, entry - 0.001 / Math.max(recoilLength, 0.001)));
      }
      const clearRecoil = (t: number) => {
        const x = cx + (recoil.x - cx) * t, y = cy + (recoil.y - cy) * t, z = cz + (recoil.z - cz) * t;
        const r = CAMERA_CLEARANCE;
        const floor = Math.max(terrain.groundAt(x,z), terrain.groundAt(x-r,z), terrain.groundAt(x+r,z), terrain.groundAt(x,z-r), terrain.groundAt(x,z+r));
        return y >= floor + r;
      };
      // Four samples cover the short, at-most 5.7 cm pulse; bisect the first terrain contact.
      let previous = 0;
      for (let i = 1; i <= 4; i++) {
        const t = share * i / 4;
        if (!clearRecoil(t)) {
          let lo = previous, hi = t;
          for (let j = 0; j < 8; j++) {
            const mid = (lo + hi) / 2;
            if (clearRecoil(mid)) lo = mid;
            else hi = mid;
          }
          share = lo;
          break;
        }
        previous = t;
      }
      this.camera.position.set(cx + (recoil.x - cx) * share, cy + (recoil.y - cy) * share, cz + (recoil.z - cz) * share);
    }
    this.camera.lookAt(this.followPivot);
    const fov = this.aiming ? 48 : 60;
    if (this.camera.fov !== fov) {
      this.camera.fov += (fov - this.camera.fov) * k;
      if (Math.abs(this.camera.fov - fov) < 0.01) this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Keep the lens out of the waterline. Above water it stays a hand's breadth clear of the surface; a swimmer's camera
   * may look up from below it, but then wholly below, never half in.
   */
  clearWater(surfaceAt: (x: number, z: number) => number | null, allowUnder: boolean) {
    if (this.manual || this.mode !== 'follow') { this.waterSide = null; return; }
    const p = this.camera.position;
    const surface = surfaceAt(p.x, p.z);
    if (surface === null || !Number.isFinite(surface)) { this.waterSide = null; return; }
    const clear = 0.28, under = 0.3;
    if (!allowUnder) this.waterSide = 'above';
    else if (this.waterSide === null) this.waterSide = p.y < surface - 0.05 ? 'under' : 'above';
    // follow() restores the nominal boom every frame. Keep the previous side until that boom is wholly across the
    // clearance band, so small waves cannot repeatedly snap the eye above and below water without player input.
    else if (this.waterSide === 'above' && p.y <= surface - under) this.waterSide = 'under';
    else if (this.waterSide === 'under' && p.y >= surface + clear) this.waterSide = 'above';
    let y = this.waterSide === 'under' ? Math.min(p.y, surface - under) : Math.max(p.y, surface + clear);
    // A shallow bed or submerged rock may leave no room for a wholly underwater lens. Its water clearance must not
    // undo follow()'s terrain and collider sweep; keep the eye above the surface until there is room below it.
    if (this.waterSide === 'under' && y < p.y && !this.canLowerForWater(y)) {
      this.waterSide = 'above';
      y = Math.max(p.y, surface + clear);
    }
    if (y === p.y) return;
    p.y = y;
    this.camera.lookAt(this.followPivot);
  }

  private canLowerForWater(y: number): boolean {
    const terrain = this.waterTerrain;
    if (!terrain) return true;
    const p = this.camera.position, r = CAMERA_CLEARANCE;
    const floor = Math.max(terrain.groundAt(p.x,p.z), terrain.groundAt(p.x-r,p.z), terrain.groundAt(p.x+r,p.z), terrain.groundAt(p.x,p.z-r), terrain.groundAt(p.x,p.z+r));
    if (y < floor + r) return false;
    const lowered = { x: p.x, y, z: p.z };
    return this.waterColliders.every(c => cameraColliderEntry(p, lowered, c, terrain.groundAt(c.x, c.z), obstacleHeight(c)) === null);
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
