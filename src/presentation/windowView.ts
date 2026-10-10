import * as THREE from 'three';
import { fromBuildingLocal, roomHalfSize, type InteriorSpec, type RoomLocator } from '../world/interiors';

/**
 * What a window shows from inside a room (A70). The panes used to be a flat daylight colour; now they look out on the
 * land, sky and weather as they are. A small cube of the world is captured from the middle of the room the camera is
 * in, its near plane past the room's own walls and roof, so the capture sees straight through them to what lies
 * outside; each pane samples it along the line of sight, so the view shifts as the hero moves about the room. It is
 * captured on entering a room and every few seconds while there, never outdoors.
 *
 * Its cost (A77): the capture drew the whole scene six times in one frame, up to 7.8 M triangles, a hitch every three
 * seconds indoors. The trees now come in with their middle models (as in the water's reflection), and after the first
 * capture in a room each refresh redraws one face a frame, so the same work is spread over six frames. The camera stands
 * still for a room, so the faces always meet.
 */
/** The capture's cube face size (px): 96 px read as a blurred blob through a pane near the camera (A75). */
export const WINDOW_VIEW_SIZE = 320;

export class WindowView {
  private readonly target: THREE.WebGLCubeRenderTarget;
  private readonly camera: THREE.CubeCamera;
  private room: InteriorSpec | null = null;
  private age = Infinity;
  /** The face to redraw next while a refresh is spread over frames, or -1 between refreshes. */
  private face = -1;
  /** Lighten what the capture draws (the trees' middle models); returns how to put it back. */
  lighten: (() => () => void) | null = null;

  constructor(private readonly rooms: RoomLocator, private readonly pane: THREE.MeshBasicMaterial, size = WINDOW_VIEW_SIZE, private readonly interval = 3) {
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
    const entered = here !== this.room;
    if (entered) { this.room = here; this.age = Infinity; this.face = -1; }
    if (Number.isFinite(dt) && dt > 0) this.age += dt;
    // The capture already carries the light outside; the pane only tempers it a little.
    if (this.pane.envMap) this.pane.color.setScalar(0.9);
    const whole = this.age >= this.interval && (entered || !this.pane.envMap);
    if (whole || this.face >= 0 || this.age >= this.interval) {
      if (this.age >= this.interval) { this.age = 0; this.face = whole ? -1 : 0; }
      const { at, near } = this.frame(here);
      const faces = this.camera.children as THREE.PerspectiveCamera[];
      for (const face of faces) if (face.near !== near) { face.near = near; face.updateProjectionMatrix(); }
      const oldTarget = renderer.getRenderTarget(), oldShadow = renderer.shadowMap.autoUpdate, oldAutoClear = renderer.autoClear;
      const restore = this.lighten?.() ?? null;
      try {
        renderer.shadowMap.autoUpdate = false;
        renderer.autoClear = true;
        this.camera.position.copy(at);
        this.camera.updateMatrixWorld(true);
        if (this.face < 0) this.camera.update(renderer, scene);
        else {
          // One face of the refresh this frame; the others follow on the next frames.
          renderer.setRenderTarget(this.target, this.face);
          renderer.render(scene, faces[this.face]!);
          this.face = this.face + 1 < faces.length ? this.face + 1 : -1;
        }
      } finally {
        restore?.();
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
