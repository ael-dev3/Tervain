import * as THREE from 'three';

export type ExplorerAction = 'interact' | 'inspect' | 'journal' | 'save' | 'reset' | 'map' | 'fly';

export interface ExplorerState {
  /** Camera eye coordinates, in metres. */
  position: [number, number, number];
  yaw: number;
  pitch: number;
  fly: boolean;
}

interface Surface {
  mesh: THREE.Mesh;
  bounds: THREE.Box3;
  normalMatrix: THREE.Matrix3;
}

interface GroundHit {
  height: number;
}

interface SweepHit {
  distance: number;
  normal: THREE.Vector3;
}

const EYE_HEIGHT = 1.65;
const BODY_RADIUS = 0.28;
const MAX_STEP = 0.35;
const MAX_SLOPE_COS = Math.cos(50 * Math.PI / 180);
const GRAVITY = 18;
const TERMINAL_SPEED = 35;
const CELL_SIZE = 16;
const EPSILON = 0.015;
const LOOK_SPEED = 0.0025;
const PITCH_LIMIT = Math.PI / 2 - 0.02;
const DOWN = new THREE.Vector3(0, -1, 0);

const MOVEMENT_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'Space', 'KeyQ',
]);

const ACTION_KEYS: Readonly<Record<string, ExplorerAction>> = {
  KeyE: 'interact',
  Tab: 'inspect',
  KeyJ: 'journal',
  KeyP: 'save',
  KeyR: 'reset',
  KeyM: 'map',
};

/**
 * New TypeScript exploration physics, not a reproduction of Gothic 3's native
 * movement/PhysX implementation. Static triangle raycasts approximate a body;
 * stairs, slope limits, gravity and sprint speed are local browser choices.
 * There is no native jump, animation, dynamic-body collision or capsule solver.
 */
export class ExplorerController {
  speed = 4.3;

  private enabled = true;
  private flying = false;
  private supported = false;
  private fallbackFloor: number | null = null;
  private verticalSpeed = 0;
  private yaw = 0;
  private pitch = 0;
  private spawn: [number, number, number];
  private spawnYaw = 0;
  private disposed = false;
  private dragging = false;
  private dragged = false;
  private dragDistance = 0;
  private pointerId: number | null = null;
  private pointerX = 0;
  private pointerY = 0;
  private readonly keys = new Set<string>();
  private readonly cells = new Map<string, Surface[]>();
  private readonly wideSurfaces: Surface[] = [];
  private readonly surfacesByMesh = new Map<THREE.Object3D, Surface>();
  private readonly candidateSet = new Set<Surface>();
  private readonly candidates: THREE.Object3D[] = [];
  private readonly intersections: THREE.Intersection[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly rayOrigin = new THREE.Vector3();
  private readonly rayDirection = new THREE.Vector3();
  private readonly normal = new THREE.Vector3();
  private readonly movement = new THREE.Vector3();
  private readonly slide = new THREE.Vector3();
  private readonly instanceMatrix = new THREE.Matrix4();
  private readonly combinedMatrix = new THREE.Matrix4();
  private readonly instanceNormalMatrix = new THREE.Matrix3();
  private readonly originalTabIndex: string | null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly canvas: HTMLCanvasElement,
    private readonly onAction: (action: ExplorerAction) => void,
  ) {
    this.originalTabIndex = this.canvas.getAttribute('tabindex');
    if (this.originalTabIndex === null) this.canvas.tabIndex = 0;
    this.camera.rotation.order = 'YXZ';
    this.yaw = this.camera.rotation.y;
    this.pitch = THREE.MathUtils.clamp(this.camera.rotation.x, -PITCH_LIMIT, PITCH_LIMIT);
    this.spawn = [this.position.x, this.position.y, this.position.z];
    this.spawnYaw = this.yaw;
    this.applyLook();

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('focusin', this.onFocusIn);
    window.addEventListener('blur', this.onBlur);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('click', this.onCanvasClick);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  get active(): boolean {
    return this.enabled;
  }

  set active(value: boolean) {
    this.enabled = value && !this.disposed;
    if (!this.enabled) {
      this.clearInput();
      this.unlockPointer();
    }
  }

  get fly(): boolean {
    return this.flying;
  }

  set fly(value: boolean) {
    if (this.flying === value) return;
    this.flying = value;
    this.verticalSpeed = 0;
    this.supported = false;
  }

  /** Live camera eye position. Changing it directly bypasses placement checks. */
  get position(): THREE.Vector3 {
    return this.camera.position;
  }

  get grounded(): boolean {
    return !this.flying && this.supported;
  }

  /** True only while the explicit no-ground fallback is available in walk mode. */
  get groundFallback(): boolean {
    return !this.flying && this.fallbackFloor !== null;
  }

  /** Rebuild the static collision index after world geometry/transforms change. */
  setWorld(objects: THREE.Object3D[], spawn: [number, number, number], yaw = 0): void {
    this.cells.clear();
    this.wideSurfaces.length = 0;
    this.surfacesByMesh.clear();
    const seen = new Set<THREE.Object3D>();

    for (const root of objects) {
      root.updateWorldMatrix(true, true);
      root.traverse((object) => {
        if (seen.has(object)) return;
        seen.add(object);
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh || !mesh.geometry.getAttribute('position')) return;
        const bounds = new THREE.Box3().setFromObject(mesh);
        if (bounds.isEmpty() || !Number.isFinite(bounds.min.x + bounds.max.x + bounds.min.y + bounds.max.y + bounds.min.z + bounds.max.z)) return;
        const surface: Surface = {
          mesh,
          bounds,
          normalMatrix: new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld),
        };
        this.surfacesByMesh.set(mesh, surface);
        const minX = Math.floor(bounds.min.x / CELL_SIZE);
        const maxX = Math.floor(bounds.max.x / CELL_SIZE);
        const minZ = Math.floor(bounds.min.z / CELL_SIZE);
        const maxZ = Math.floor(bounds.max.z / CELL_SIZE);
        // Very large terrain meshes stay in one list instead of thousands of cells.
        if ((maxX - minX + 1) * (maxZ - minZ + 1) > 256) {
          this.wideSurfaces.push(surface);
          return;
        }
        for (let x = minX; x <= maxX; x++) {
          for (let z = minZ; z <= maxZ; z++) {
            const key = `${x},${z}`;
            const cell = this.cells.get(key);
            if (cell) cell.push(surface);
            else this.cells.set(key, [surface]);
          }
        }
      });
    }

    this.spawn = [...spawn];
    this.spawnYaw = Number.isFinite(yaw) ? yaw : 0;
    this.fly = false;
    this.reset();
  }

  reset(): void {
    this.fly = false;
    this.teleport(this.spawn, this.spawnYaw, 0);
  }

  teleport(position: [number, number, number], yaw = this.yaw, pitch = this.pitch): void {
    if (!position.every(Number.isFinite)) return;
    this.position.set(...position);
    if (Number.isFinite(yaw)) this.yaw = yaw;
    if (Number.isFinite(pitch)) this.pitch = THREE.MathUtils.clamp(pitch, -PITCH_LIMIT, PITCH_LIMIT);
    this.verticalSpeed = 0;
    this.supported = false;
    this.fallbackFloor = null;
    this.clearInput();
    this.applyLook();
    if (this.flying) return;

    // A placement may be above a hill: use an actual downward intersection.
    const ground = this.findGround(this.position.x, this.position.z, this.position.y + EPSILON, 256);
    if (ground) {
      this.position.y = ground.height + EYE_HEIGHT;
      this.supported = true;
    } else {
      // Only missing walkable geometry enables this explicitly reported floor.
      this.fallbackFloor = this.position.y - EYE_HEIGHT;
      this.supported = true;
    }
  }

  getState(): ExplorerState {
    return {
      position: [this.position.x, this.position.y, this.position.z],
      yaw: this.yaw,
      pitch: this.pitch,
      fly: this.flying,
    };
  }

  update(dt: number): void {
    if (!this.enabled || this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    // Bound tab-resume/frame spikes; short substeps limit thin-wall tunnelling.
    const elapsed = Math.min(dt, 0.1);
    const steps = Math.ceil(elapsed / (1 / 60));
    const step = elapsed / steps;
    const forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'))
      - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const right = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight'))
      - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const speed = Math.max(0, Number.isFinite(this.speed) ? this.speed : 4.3) * (sprint ? 1.8 : 1);

    for (let i = 0; i < steps; i++) {
      this.movement.set(
        Math.cos(this.yaw) * right - Math.sin(this.yaw) * forward,
        0,
        -Math.sin(this.yaw) * right - Math.cos(this.yaw) * forward,
      );
      if (this.flying) {
        this.movement.set(
          Math.cos(this.yaw) * right - Math.sin(this.yaw) * Math.cos(this.pitch) * forward,
          Math.sin(this.pitch) * forward + Number(this.keys.has('Space')) - Number(this.keys.has('KeyQ')),
          -Math.sin(this.yaw) * right - Math.cos(this.yaw) * Math.cos(this.pitch) * forward,
        );
        if (this.movement.lengthSq() > 0) this.movement.normalize().multiplyScalar(speed * step);
        this.moveWithWalls(this.movement, true);
        this.supported = false;
      } else {
        if (this.movement.lengthSq() > 0) this.movement.normalize().multiplyScalar(speed * step);
        this.moveWithWalls(this.movement, false);
        this.settleOnGround(step);
      }
    }
    this.camera.updateMatrixWorld();
  }

  destroy(): void {
    if (this.disposed) return;
    this.active = false;
    this.disposed = true;
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('focusin', this.onFocusIn);
    window.removeEventListener('blur', this.onBlur);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('click', this.onCanvasClick);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    if (this.originalTabIndex === null && this.canvas.getAttribute('tabindex') === '0') this.canvas.removeAttribute('tabindex');
    this.cells.clear();
    this.wideSurfaces.length = 0;
    this.surfacesByMesh.clear();
    this.candidateSet.clear();
    this.candidates.length = 0;
    this.intersections.length = 0;
  }

  private collectCandidates(minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number): THREE.Object3D[] {
    this.candidateSet.clear();
    this.candidates.length = 0;
    const add = (surface: Surface): void => {
      if (this.candidateSet.has(surface)) return;
      this.candidateSet.add(surface);
      const b = surface.bounds;
      if (b.max.x < minX || b.min.x > maxX || b.max.y < minY || b.min.y > maxY || b.max.z < minZ || b.min.z > maxZ) return;
      this.candidates.push(surface.mesh);
    };
    for (const surface of this.wideSurfaces) add(surface);
    for (let x = Math.floor(minX / CELL_SIZE); x <= Math.floor(maxX / CELL_SIZE); x++) {
      for (let z = Math.floor(minZ / CELL_SIZE); z <= Math.floor(maxZ / CELL_SIZE); z++) {
        const cell = this.cells.get(`${x},${z}`);
        if (cell) for (const surface of cell) add(surface);
      }
    }
    return this.candidates;
  }

  private hitNormal(hit: THREE.Intersection): THREE.Vector3 {
    this.normal.copy(hit.face?.normal ?? DOWN);
    const mesh = hit.object as THREE.InstancedMesh;
    if (mesh.isInstancedMesh && hit.instanceId !== undefined) {
      mesh.getMatrixAt(hit.instanceId, this.instanceMatrix);
      this.combinedMatrix.multiplyMatrices(mesh.matrixWorld, this.instanceMatrix);
      this.instanceNormalMatrix.getNormalMatrix(this.combinedMatrix);
      this.normal.applyMatrix3(this.instanceNormalMatrix).normalize();
    } else {
      const surface = this.surfacesByMesh.get(hit.object);
      if (surface) this.normal.applyMatrix3(surface.normalMatrix).normalize();
    }
    return this.normal;
  }

  private findGround(x: number, z: number, top: number, distance: number): GroundHit | null {
    const objects = this.collectCandidates(x - EPSILON, x + EPSILON, top - distance, top + EPSILON, z - EPSILON, z + EPSILON);
    if (objects.length === 0) return null;
    this.rayOrigin.set(x, top, z);
    this.raycaster.set(this.rayOrigin, DOWN);
    this.raycaster.near = 0;
    this.raycaster.far = distance;
    this.intersections.length = 0;
    this.raycaster.intersectObjects(objects, false, this.intersections);
    for (const hit of this.intersections) {
      // Absolute normal permits support on two-sided imported ground surfaces.
      if (hit.face && Math.abs(this.hitNormal(hit).y) >= MAX_SLOPE_COS) return { height: hit.point.y };
    }
    return null;
  }

  private settleOnGround(dt: number): void {
    const feet = this.position.y - EYE_HEIGHT;
    if (this.fallbackFloor !== null) {
      const realGround = this.findGround(this.position.x, this.position.z, feet + MAX_STEP + EPSILON, 256);
      if (realGround) this.fallbackFloor = null;
    }
    const travel = Math.max(0, -this.verticalSpeed * dt) + GRAVITY * dt * dt;
    const hit = this.findGround(this.position.x, this.position.z, feet + MAX_STEP + EPSILON, MAX_STEP + Math.max(1, travel + EPSILON));
    const floor = hit?.height ?? this.fallbackFloor;

    if (floor !== null && this.supported && floor <= feet + MAX_STEP + EPSILON && floor >= feet - MAX_STEP) {
      this.position.y = floor + EYE_HEIGHT;
      this.verticalSpeed = 0;
      return;
    }

    this.supported = false;
    this.verticalSpeed = Math.max(-TERMINAL_SPEED, this.verticalSpeed - GRAVITY * dt);
    const nextFeet = feet + this.verticalSpeed * dt;
    if (floor !== null && floor >= nextFeet - EPSILON && floor <= feet + MAX_STEP + EPSILON) {
      this.position.y = floor + EYE_HEIGHT;
      this.verticalSpeed = 0;
      this.supported = true;
    } else {
      this.position.y = nextFeet + EYE_HEIGHT;
    }
  }

  private moveWithWalls(displacement: THREE.Vector3, flying: boolean): void {
    if (displacement.lengthSq() === 0) return;
    const hit = this.sweep(displacement, flying);
    if (!hit) {
      this.position.add(displacement);
      return;
    }
    const length = displacement.length();
    const fraction = THREE.MathUtils.clamp((hit.distance - BODY_RADIUS - EPSILON) / length, 0, 1);
    this.position.addScaledVector(displacement, fraction);
    this.slide.copy(displacement).multiplyScalar(1 - fraction);
    if (!flying) hit.normal.y = 0;
    hit.normal.normalize();
    this.slide.addScaledVector(hit.normal, -this.slide.dot(hit.normal));
    if (this.slide.lengthSq() < 1e-10) return;
    const slideHit = this.sweep(this.slide, flying);
    if (slideHit) {
      const slideFraction = THREE.MathUtils.clamp((slideHit.distance - BODY_RADIUS - EPSILON) / this.slide.length(), 0, 1);
      this.position.addScaledVector(this.slide, slideFraction);
    } else {
      this.position.add(this.slide);
    }
  }

  private sweep(displacement: THREE.Vector3, flying: boolean): SweepHit | null {
    const length = displacement.length();
    if (length <= 0) return null;
    const feet = this.position.y - EYE_HEIGHT;
    const margin = BODY_RADIUS + EPSILON;
    const objects = this.collectCandidates(
      Math.min(this.position.x, this.position.x + displacement.x) - margin,
      Math.max(this.position.x, this.position.x + displacement.x) + margin,
      Math.min(feet, feet + displacement.y) - margin,
      Math.max(this.position.y, this.position.y + displacement.y) + margin,
      Math.min(this.position.z, this.position.z + displacement.z) - margin,
      Math.max(this.position.z, this.position.z + displacement.z) + margin,
    );
    if (objects.length === 0) return null;
    this.rayDirection.copy(displacement).divideScalar(length);
    this.raycaster.near = 0;
    this.raycaster.far = length + margin;
    let closest: SweepHit | null = null;
    const lateralX = -this.rayDirection.z * BODY_RADIUS * 0.85;
    const lateralZ = this.rayDirection.x * BODY_RADIUS * 0.85;
    // Rays above the permitted step height allow small stairs, but block walls.
    const heights = flying ? [EPSILON, EYE_HEIGHT * 0.55, EYE_HEIGHT] : [MAX_STEP + EPSILON, EYE_HEIGHT * 0.55, EYE_HEIGHT];
    for (const height of heights) {
      for (const lateral of [-1, 0, 1]) {
        this.rayOrigin.set(this.position.x + lateralX * lateral, feet + height, this.position.z + lateralZ * lateral);
        this.raycaster.set(this.rayOrigin, this.rayDirection);
        this.intersections.length = 0;
        this.raycaster.intersectObjects(objects, false, this.intersections);
        for (const hit of this.intersections) {
          if (!hit.face) continue;
          const normal = this.hitNormal(hit);
          if (!flying && Math.abs(normal.y) >= MAX_SLOPE_COS) continue;
          if (!closest || hit.distance < closest.distance) closest = { distance: hit.distance, normal: normal.clone() };
          break;
        }
      }
    }
    return closest;
  }

  private applyLook(): void {
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.updateMatrixWorld();
  }

  private isFormTarget(target: EventTarget | null): boolean {
    return target instanceof Element && !!target.closest('input, textarea, select, button, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
  }

  private clearInput(): void {
    this.keys.clear();
    this.dragging = false;
    if (this.pointerId !== null) {
      if (this.canvas.hasPointerCapture(this.pointerId)) this.canvas.releasePointerCapture(this.pointerId);
      this.pointerId = null;
    }
  }

  private unlockPointer(): void {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
      this.clearInput();
      this.unlockPointer();
      return;
    }
    if (!this.enabled || this.disposed || this.isFormTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (MOVEMENT_KEYS.has(event.code)) {
      this.keys.add(event.code);
      event.preventDefault();
      return;
    }
    if (event.code === 'KeyF') {
      event.preventDefault();
      if (!event.repeat) {
        this.fly = !this.fly;
        this.onAction('fly');
      }
      return;
    }
    const action = ACTION_KEYS[event.code];
    if (action) {
      event.preventDefault();
      if (!event.repeat) this.onAction(action);
    }
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled || this.disposed || (event.button !== 0 && event.button !== 2)) return;
    this.dragging = true;
    this.dragged = false;
    this.dragDistance = 0;
    this.pointerId = event.pointerId;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.canvas.setPointerCapture(event.pointerId);
    this.canvas.focus({ preventScroll: true });
    event.preventDefault();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.clearInputPointer();
  };

  private clearInputPointer(): void {
    this.dragging = false;
    if (this.pointerId !== null) {
      if (this.canvas.hasPointerCapture(this.pointerId)) this.canvas.releasePointerCapture(this.pointerId);
      this.pointerId = null;
    }
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.enabled || this.disposed) return;
    if (document.pointerLockElement !== this.canvas) return;
    this.rotateLook(event.movementX, event.movementY);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled || this.disposed || document.pointerLockElement === this.canvas) return;
    if (!this.dragging || event.pointerId !== this.pointerId || event.buttons === 0) return;
    const dx = event.clientX - this.pointerX;
    const dy = event.clientY - this.pointerY;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;
    this.dragDistance += Math.hypot(dx, dy);
    if (this.dragDistance > 4) this.dragged = true;
    this.rotateLook(dx, dy);
  };

  private rotateLook(dx: number, dy: number): void {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    this.yaw -= dx * LOOK_SPEED;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * LOOK_SPEED, -PITCH_LIMIT, PITCH_LIMIT);
    this.applyLook();
  }

  private readonly onCanvasClick = (event: MouseEvent): void => {
    if (!this.enabled || this.disposed || this.dragged || event.button !== 0 || document.pointerLockElement === this.canvas) return;
    // Pointer lock is optional: denial/unsupported browsers retain drag look.
    try {
      if (typeof this.canvas.requestPointerLock === 'function') {
        Promise.resolve(this.canvas.requestPointerLock()).catch(() => undefined);
      }
    } catch {
      // Drag look is already available from the same pointer gesture.
    }
  };

  private readonly onPointerLockChange = (): void => {
    this.clearInputPointer();
    if (document.pointerLockElement !== this.canvas) this.keys.clear();
  };

  private readonly onContextMenu = (event: MouseEvent): void => {
    if (this.enabled) event.preventDefault();
  };

  private readonly onBlur = (): void => {
    this.clearInput();
    this.unlockPointer();
  };

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) this.onBlur();
  };

  private readonly onFocusIn = (event: FocusEvent): void => {
    if (this.isFormTarget(event.target)) this.onBlur();
  };
}
