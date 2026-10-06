import type { NpcDef } from '../content/npcs';

/** Arrival hysteresis keeps a welcome from looping while the player sorts their inventory. */
export class NpcApproachGreeting {
  private armed = true;
  private cooldown = 0;
  private retry = 0;

  constructor(private readonly greeting: NonNullable<NpcDef['approachGreeting']>) {}

  update(dt: number, distance: number, canSpeak: boolean, speak: () => boolean) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.retry = Math.max(0, this.retry - dt);
    if (distance >= this.greeting.leaveRadius) this.armed = true;
    if (!this.armed || this.cooldown > 0 || this.retry > 0 || !canSpeak || distance > this.greeting.radius) return;
    // A voice sprite may still be decoding, or ambience may be disabled. An unheard line never consumes the welcome.
    this.retry = 0.5;
    if (!speak()) return;
    this.armed = false;
    this.cooldown = this.greeting.cooldown;
  }
}
