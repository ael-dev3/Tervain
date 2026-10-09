import * as THREE from 'three';
import { fromBuildingLocal, roomHalfSize, type InteriorSpec, type RoomLocator } from '../world/interiors';

/**
 * What a window shows from inside a room (A70). The panes used to be a flat daylight colour; now they look out on the
 * land, sky and weather as they are. A small cube of the world is captured from the middle of the room the camera is
 * in, its near plane past the room's own walls and roof, so the capture sees straight through them to what lies
 * outside; each pane samples it along the line of sight, so the view shifts as the hero moves about the room. It is
 * captured on entering a room and every few seconds while there, never outdoors.
 */
export class WindowView {
  private readonly target: THREE.WebGLCubeRenderTarget;
  private readonly camera: THREE.CubeCamera;
  private room: InteriorSpec | null = null;
  private age = Infinity;

  constructor(private readonly rooms: RoomLocator, private readonly pane: THREE.MeshBasicMaterial, size = 96, private readonly interval = 3) {
    this.target = new THREE.WebGLCubeRenderTarget(size, { generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.target.texture.mapping = THREE.CubeRefractionMapping;
    this.camera = new THREE.CubeCamera(0.5, 900, this.target);
  }

  /** Where the capture stands for a room, and how near it may see (just past the walls and roof). */
  private frame(room: InteriorSpec): { at: THREE.Vector3; near: number } {
    const b = room.building, { hw, hd } = roomHalfSize(room), centre = fromBuildingLocal(b, 0, 0);
    const base = this.rooms.base(room), eye = base + room.floorTop + 1.5;
    const roof = base + room.wallTop + Math.max(1.6, Math.min(hw, hd) * 0.9) - eye;
    return { at: new THREE.Vector3(centre.x, eye, centre.z), near: Math.max(hw + room.wall, hd + room.wall, roof) + 0.35 };
  }

  /** Follow the camera; capture the outside of the room it is in when due. Returns whether a view is shown. */
  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Vector3, dt: number, enabled: boolean): boolean {
    const here = enabled ? this.rooms.within(camera.x, camera.y, camera.z) : null;
    if (!here) {
      // The panes face into the rooms, so outdoors the last view is never seen; keeping it spares a shader rebuild.
      this.room = null; this.age = Infinity;
      return false;
    }
    if (here !== this.room) { this.room = here; this.age = Infinity; }
    if (Number.isFinite(dt) && dt > 0) this.age += dt;
    // The capture already carries the light outside; the pane only tempers it a little.
    if (this.pane.envMap) this.pane.color.setScalar(0.9);
    if (this.age >= this.interval) {
      this.age = 0;
      const { at, near } = this.frame(here);
      for (const face of this.camera.children as THREE.PerspectiveCamera[]) { face.near = near; face.updateProjectionMatrix(); }
      const oldTarget = renderer.getRenderTarget(), oldShadow = renderer.shadowMap.autoUpdate, oldAutoClear = renderer.autoClear;
      try {
        renderer.shadowMap.autoUpdate = false;
        renderer.autoClear = true;
        this.camera.position.copy(at);
        this.camera.updateMatrixWorld(true);
        this.camera.update(renderer, scene);
      } finally {
        renderer.shadowMap.autoUpdate = oldShadow;
        renderer.autoClear = oldAutoClear;
        renderer.setRenderTarget(oldTarget);
      }
      if (this.pane.envMap !== this.target.texture) {
        this.pane.envMap = this.target.texture;
        this.pane.combine = THREE.MultiplyOperation;
        this.pane.reflectivity = 1;
        this.pane.refractionRatio = 0.995;
        this.pane.needsUpdate = true;
        this.pane.color.setScalar(0.9);
      }
    }
    return true;
  }

  dispose() { this.target.dispose(); }
}
