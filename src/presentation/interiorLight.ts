import * as THREE from 'three';
import { fromBuildingLocal, hearthOf, roomHalfSize, type InteriorSpec, type RoomLocator } from '../world/interiors';

/**
 * Light inside the rooms (A66). The sky's fill (its image light and the hemisphere) knows nothing of walls and roofs, so
 * a room would be lit as brightly as the open valley. While the camera is in a room that fill eases down, and a warm
 * light glows from the room's hearth (or hangs from its beams where it has none). One light serves every room, so the
 * number of lights in the scene, and with it every material's shader, never changes.
 */
export class InteriorLight {
  readonly light = new THREE.PointLight(0xffa25a, 0, 10, 1.4);
  private indoor = 0;
  private room: InteriorSpec | null = null;
  private readonly glows = new Map<InteriorSpec, THREE.Vector3>();

  constructor(private readonly rooms: RoomLocator) {
    this.light.name = 'Interior light';
    this.light.castShadow = false;
  }

  /** How far the camera is into a room, 0 outside .. 1 within (eased). */
  get indoors(): number { return this.indoor; }

  /** Where a room's warm light comes from: just before its hearth's fire, or under its middle beam. */
  glowOf(room: InteriorSpec): THREE.Vector3 {
    let glow = this.glows.get(room);
    if (!glow) {
      const b = room.building, base = this.rooms.base(room), hearth = hearthOf(room), fire = hearth?.before(0.45);
      const local = fire ? { x: fire.x, y: room.floorTop + 0.55, z: fire.z } : { x: 0, y: room.wallTop - 0.6, z: -roomHalfSize(room).hd * 0.2 };
      const p = fromBuildingLocal(b, local.x, local.z);
      glow = new THREE.Vector3(p.x, base + local.y, p.z);
      this.glows.set(room, glow);
    }
    return glow;
  }

  /** Follow the camera in and out of rooms; returns how far indoors it is. */
  update(dt: number, camera: THREE.Vector3, night: number, time: number): number {
    // A camera above the roof is outdoors, though it stands over the room's floor (A70).
    const here = this.rooms.within(camera.x, camera.y, camera.z);
    if (here) this.room = here;
    this.indoor += ((here ? 1 : 0) - this.indoor) * (1 - Math.exp(-Math.max(0, dt) * 3));
    if (this.indoor < 1e-3 && !here) this.indoor = 0;
    if (this.room) this.light.position.copy(this.glowOf(this.room));
    // A fire's slow unsteadiness: two incommensurate waves, never a strobe.
    const flame = 0.9 + 0.06 * Math.sin(time * 7.3) + 0.04 * Math.sin(time * 12.9 + 1.7);
    this.light.intensity = this.indoor * (2.2 + 4.5 * night) * flame;
    return this.indoor;
  }
}
