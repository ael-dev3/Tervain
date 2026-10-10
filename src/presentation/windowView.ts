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
 * still for a room, so the faces always meet. Since A78 the first capture in a room is spread the same way.
 */
/**
 * The capture's cube face size (px) by quality: 96 px read as a blurred blob through a pane near the camera (A75), and
 * so did 320 px on a 1080p screen, a pane showing about 140 of its pixels across 400 (A79). Each refresh draws one face
 * a frame, so a larger face costs fill, not draw calls.
 */
export const WINDOW_VIEW_SIZE = { high: 1024, medium: 640, low: 320 } as const;

export class WindowView {
  private readonly target: THREE.WebGLCubeRenderTarget;
  private readonly camera: THREE.CubeCamera;
  private room: InteriorSpec | null = null;
  private age = Infinity;
  /** The face to redraw next while a refresh is spread over frames, or -1 between refreshes. */
  private face = -1;
  /** Lighten what the capture draws (the trees' middle models); returns how to put it back. */
  lighten: (() => () => void) | null = null;

  /**
   * Only rooms whose windows are painted panes take a capture (A79): the houses' windows are real openings now, through
   * which the world itself is seen; the shrine hall's are still panes.
   */
  painted: (room: InteriorSpec) => boolean = () => true;

  constructor(private readonly rooms: RoomLocator, private readonly pane: THREE.MeshBasicMaterial, size: number = WINDOW_VIEW_SIZE.high, private readonly interval = 3) {
    // Mipmapped, so a pane seen small or at a slant does not sparkle (the mips are rebuilt as each face is drawn).
    this.target = new THREE.WebGLCubeRenderTarget(size, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
    this.target.texture.anisotropy = 8;
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
    const within = enabled ? this.rooms.within(camera.x, camera.y, camera.z) : null;
    const here = within && this.painted(within) ? within : null;
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
    // Every capture, the first in a room included, draws one face a frame (A78): drawn at once on entering a room it cost
    // a 1,200-draw, 16 M-triangle frame (39 ms of CPU) in the doorway. Until its six faces are done the panes keep the
    // view they had, or their flat daylight before the first capture of all.
    if (this.age >= this.interval && this.face < 0) { this.age = 0; this.face = 0; }
    if (this.face >= 0) {
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
        // The cube's mipmaps are rebuilt once, after its last face, not after every one (A80 audit).
        this.target.texture.generateMipmaps = this.face === faces.length - 1;
        renderer.setRenderTarget(this.target, this.face);
        renderer.render(scene, faces[this.face]!);
        this.face = this.face + 1 < faces.length ? this.face + 1 : -1;
      } finally {
        restore?.();
        renderer.shadowMap.autoUpdate = oldShadow;
        renderer.autoClear = oldAutoClear;
        renderer.setRenderTarget(oldTarget);
      }
      if (this.face < 0 && this.pane.envMap !== this.target.texture) {
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
