import { mulberry32 } from '../../world/noise';
import type { V2 } from '../../world/layout';
import type { AnimalDefinition } from './catalog';
import { animalCanTravel, type AnimalGround } from './navigation';
import type { Colliders } from '../../world/colliders';

export type AnimalBehavior = 'idle' | 'graze' | 'walk' | 'flee' | 'call';
export class AnimalMovement {
  x: number;
  z: number;
  yaw: number;
  behavior: AnimalBehavior = 'idle';
  speed = 0;
  elapsed = 0;
  private timer: number;
  private callTimer: number;
  private perception = 0;
  private target: V2 | null = null;
  private random: () => number;
  private startled = false;
  private threat: V2 | null = null;
  private threatTimer = 0;
  constructor(readonly definition: AnimalDefinition, readonly home: V2, private terrain: AnimalGround, private colliders: Pick<Colliders, 'blocked' | 'cast'>, private inspection = false) {
    this.x = home.x; this.z = home.z; this.yaw = definition.yaw;
    let seed = 2166136261;
    for (const char of definition.id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
    this.random = mulberry32(seed >>> 0);
    this.timer = 2 + this.random() * 6;
    this.callTimer = 24 + this.random() * 45;
  }

  /** A nearby arrow or wound produces several seconds of alert flight, without bypassing ground steering. */
  frighten(position: V2) {
    if (this.inspection || this.definition.runSpeed <= 0) return;
    this.threat = { ...position }; this.threatTimer = 5;
    this.startled = true; this.behavior = 'flee'; this.timer = 2.2; this.perception = .5;
    this.target = this.chooseTarget(position);
  }

  /** Returns a call request at the start of a native Call animation, never once per frame. */
  update(dt: number, player: V2, permitCall: boolean): boolean {
    dt = Math.max(0, Math.min(.15, dt));
    this.elapsed += dt; this.timer -= dt; this.callTimer -= dt; this.perception -= dt; this.threatTimer = Math.max(0, this.threatTimer - dt);
    let call = false;
    const distance = Math.hypot(player.x - this.x, player.z - this.z);
    if (!this.inspection && this.perception <= 0) {
      this.perception = .45 + this.random() * .2;
      this.startled = this.threatTimer > 0 || this.definition.alertDistance > 0 && distance < this.definition.alertDistance && !this.colliders.cast(this.x, this.z, player.x, player.z, .05, undefined, undefined, [], true);
      if (this.startled && this.definition.runSpeed > 0) {
        this.behavior = 'flee'; this.timer = 2.2;
        this.target = this.chooseTarget(this.threatTimer > 0 && this.threat ? this.threat : player);
      }
    }
    if (this.timer <= 0 || ((this.behavior === 'walk' || this.behavior === 'flee') && !this.target)) {
      if (this.startled && this.definition.runSpeed > 0) {
        this.behavior = 'flee'; this.timer = 2.2; this.target = this.chooseTarget(this.threatTimer > 0 && this.threat ? this.threat : player);
      } else if (this.callTimer <= 0 && permitCall && distance < 36 && !this.startled) {
        this.behavior = 'call'; this.timer = 2.5; this.target = null;
        this.callTimer = 35 + this.random() * 65;
        call = true;
      } else if (this.definition.walkSpeed > 0 && this.random() < .48) {
        this.behavior = 'walk'; this.target = this.chooseTarget(); this.timer = 6 + this.random() * 5;
      } else {
        this.behavior = this.definition.grazes && this.random() < .7 ? 'graze' : 'idle';
        this.target = null; this.timer = 4 + this.random() * 9;
      }
    }
    this.speed = 0;
    if (this.target && (this.behavior === 'walk' || this.behavior === 'flee')) {
      const dx = this.target.x - this.x, dz = this.target.z - this.z, distance = Math.hypot(dx, dz);
      if (distance < .35) { this.target = null; this.timer = 0; }
      else {
        const desired = Math.atan2(dx, dz), turn = Math.atan2(Math.sin(desired - this.yaw), Math.cos(desired - this.yaw));
        this.yaw += Math.max(-dt * 2.4, Math.min(dt * 2.4, turn));
        const pace = this.behavior === 'flee' ? this.definition.runSpeed : this.definition.walkSpeed;
        // Turn before walking; an animal cannot slide sideways through a turn.
        const speed = pace * Math.max(0, Math.cos(turn));
        const next = { x: this.x + Math.sin(this.yaw) * speed * dt, z: this.z + Math.cos(this.yaw) * speed * dt };
        if (animalCanTravel(this.terrain, this.colliders, this, next, this.definition, !this.inspection)) {
          this.x = next.x; this.z = next.z; this.speed = speed;
        } else { this.target = null; this.timer = 0; this.behavior = 'idle'; }
      }
    } else if (this.definition.domestic && distance < 8 && distance > 1) {
      const desired = Math.atan2(player.x - this.x, player.z - this.z);
      this.yaw += Math.atan2(Math.sin(desired - this.yaw), Math.cos(desired - this.yaw)) * Math.min(1, dt * .8);
    }
    return call;
  }

  private chooseTarget(player?: V2): V2 | null {
    for (let attempt = 0; attempt < 8; attempt++) {
      const angle = player ? Math.atan2(this.x - player.x, this.z - player.z) + (this.random() - .5) * 1.8 : this.random() * Math.PI * 2;
      const length = player ? 4 + this.random() * 5 : 2 + this.random() * Math.min(8, this.definition.wanderRadius);
      const target = { x: this.x + Math.sin(angle) * length, z: this.z + Math.cos(angle) * length };
      const range = this.definition.wanderRadius + (player ? 6 : 0);
      if (Math.hypot(target.x - this.home.x, target.z - this.home.z) > range) continue;
      if (animalCanTravel(this.terrain, this.colliders, this, target, this.definition, !this.inspection)) return target;
    }
    return null;
  }
}
