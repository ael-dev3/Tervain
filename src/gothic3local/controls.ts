import * as THREE from 'three';

/**
 * First-person controls: mouse look with pointer lock (or by dragging), WASD to move, Shift to run. Fly mode moves
 * freely (Space up, C down); walk mode keeps the eye above the ground the world reports.
 */
export class FirstPersonControls {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = 0;
  fly = true;
  speed = 6;
  eye = 1.75;
  private vy = 0;
  private readonly keys = new Set<string>();
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  enabled = true;
  groundBelow: (x: number, y: number, z: number) => number | null = () => null;

  constructor(camera: THREE.PerspectiveCamera, element: HTMLElement) {
    this.camera = camera;
    addEventListener('keydown', (e) => {
      if (!this.enabled || (e.target as HTMLElement | null)?.closest('input, select, textarea')) return;
      this.keys.add(e.code);
      if (e.code === 'KeyF') this.fly = !this.fly;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    element.addEventListener('click', () => {
      if (this.enabled && document.pointerLockElement !== element) void element.requestPointerLock?.();
    });
    element.addEventListener('mousedown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    addEventListener('mouseup', () => (this.dragging = false));
    addEventListener('mousemove', (e) => {
      if (!this.enabled) return;
      if (document.pointerLockElement === element) this.look(e.movementX, e.movementY);
      else if (this.dragging) {
        this.look(e.clientX - this.lastX, e.clientY - this.lastY);
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });
  }

  private look(dx: number, dy: number): void {
    this.yaw -= dx * 0.0022;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0022, -1.5, 1.5);
  }

  update(dt: number): void {
    const run = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? (this.fly ? 6 : 2.2) : 1;
    const v = this.speed * run * dt;
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.add(forward);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.sub(forward);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.add(right);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(v);
    const p = this.camera.position;
    if (this.fly) {
      if (this.fly && this.pitch !== 0 && (this.keys.has('KeyW') || this.keys.has('KeyS'))) {
        const s = this.keys.has('KeyW') ? 1 : -1;
        move.y += Math.sin(this.pitch) * v * s;
      }
      if (this.keys.has('Space')) move.y += v;
      if (this.keys.has('KeyC') || this.keys.has('ControlLeft')) move.y -= v;
      p.add(move);
    } else {
      p.x += move.x;
      p.z += move.z;
      const ground = this.groundBelow(p.x, p.y - this.eye + 0.8, p.z);
      this.vy -= 18 * dt;
      p.y += this.vy * dt;
      if (ground !== null && p.y - this.eye <= ground) {
        p.y = ground + this.eye;
        this.vy = this.keys.has('Space') ? 5.5 : 0;
      }
    }
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
