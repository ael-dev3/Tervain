import * as THREE from 'three';

/** A pointed, feathered wooden arrow. Its local +Z is the direction of flight; the tip is the origin. */
export function createHuntingArrow(): THREE.Group {
  const arrow = new THREE.Group();
  arrow.name = 'Hunting / wooden arrow';
  const wood = new THREE.MeshStandardMaterial({ color: 0x72513a, roughness: .88 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x747471, roughness: .65, metalness: .6 });
  const feather = new THREE.MeshStandardMaterial({ color: 0xcabfa7, roughness: .95, side: THREE.DoubleSide });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .72, 6), wood);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -.385;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.019, .05, 4), steel);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = -.025;
  arrow.add(shaft, tip);
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(.07, .025), feather);
    fin.rotation.set(0, Math.PI / 2, i * Math.PI * 2 / 3);
    fin.position.z = -.64;
    arrow.add(fin);
  }
  arrow.traverse((object) => { if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = true; });
  return arrow;
}

export interface ArrowImpact {
  point: THREE.Vector3;
  /** Optional struck body: keep a lodged arrow attached while the animal moves or falls. */
  parent?: THREE.Object3D;
  /** False lets the struck animal own a bone-bound arrow effect instead of this flight's mesh. */
  lodge?: boolean;
}

export interface ArrowShot {
  readonly id: number;
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  readonly mesh: THREE.Group;
  readonly age: number;
}

/** Return the earliest scenery/animal contact on the entire travelled segment, or null. */
export type ArrowSweep = (from: THREE.Vector3, to: THREE.Vector3, shot: ArrowShot) => ArrowImpact | null;
export const HUNTING_ARROW_GRAVITY = 9.81;

/** Water an arrow can fall into: its surface and current, and what happens as an arrow breaks the surface. */
export interface ArrowWater {
  sample(x: number, z: number): { surface: number; flowX: number; flowZ: number } | null;
  enter(point: THREE.Vector3, speed: number): void;
}
/** In water an arrow loses speed within a few tenths of a second; slower than this it floats up and drifts. */
const ARROW_WATER_DRAG = 9;
const ARROW_FLOAT_SPEED = 1.2;
const ARROW_FLOAT_SECONDS = 30;

/** Presentation-owned flights. Gameplay resolves swept contacts and ammunition separately. */
export class HuntingArrows {
  readonly group = new THREE.Group();
  private readonly flights: { id: number; position: THREE.Vector3; velocity: THREE.Vector3; mesh: THREE.Group; age: number; wet?: boolean }[] = [];
  private readonly lodged: { mesh: THREE.Group; age: number }[] = [];
  private readonly floating: { mesh: THREE.Group; age: number; heading: number }[] = [];
  private nextId = 1;
  private disposed = false;

  constructor(private readonly maxFlights = 12, private readonly maxLodged = 24) {
    this.group.name = 'Hunting / swept arrow flights';
  }

  get activeCount(): number { return this.flights.length; }
  get lodgedCount(): number { return this.lodged.length; }
  get floatingCount(): number { return this.floating.length; }

  launch(origin: THREE.Vector3, direction: THREE.Vector3, speed = 38): ArrowShot | null {
    if (this.disposed || !origin.toArray().every(Number.isFinite) || !direction.toArray().every(Number.isFinite) ||
      direction.lengthSq() < 1e-8 || !Number.isFinite(speed) || speed <= 0) return null;
    while (this.flights.length >= this.maxFlights) this.remove(this.flights.shift()!.mesh);
    const flight = { id: this.nextId++, position: origin.clone(), velocity: direction.clone().normalize().multiplyScalar(speed),
      mesh: createHuntingArrow(), age: 0 };
    flight.mesh.position.copy(origin);
    this.orient(flight.mesh, flight.velocity);
    this.group.add(flight.mesh);
    this.flights.push(flight);
    return flight;
  }

  /** Small analytic ballistic segments keep collision reliable even during a long frame. */
  update(dt: number, sweep: ArrowSweep, onImpact?: (shot: ArrowShot, impact: ArrowImpact) => void, water?: ArrowWater): void {
    if (this.disposed || !Number.isFinite(dt) || dt <= 0) return;
    this.drift(dt, water);
    for (let i = this.lodged.length - 1; i >= 0; i--) {
      const lodged = this.lodged[i]!;
      lodged.age += dt;
      if (lodged.age >= 25) { this.remove(lodged.mesh); this.lodged.splice(i, 1); }
    }
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const shot = this.flights[i]!;
      let remaining = Math.min(dt, Math.max(0, 7 - shot.age));
      let hit = false;
      while (remaining > 1e-8) {
        const step = Math.min(remaining, 1 / 120);
        const from = shot.position.clone();
        const to = from.clone().addScaledVector(shot.velocity, step);
        const gravity = shot.wet ? HUNTING_ARROW_GRAVITY * 0.25 : HUNTING_ARROW_GRAVITY;
        to.y -= .5 * gravity * step * step;
        // Breaking the surface: a splash, and from then on the water's drag.
        if (water && !shot.wet) {
          const w = water.sample(to.x, to.z);
          if (w && from.y >= w.surface && to.y < w.surface) {
            shot.wet = true;
            const t = (from.y - w.surface) / Math.max(1e-6, from.y - to.y);
            water.enter(from.clone().lerp(to, t), shot.velocity.length());
          }
        }
        const impact = sweep(from, to, shot);
        shot.age += step;
        shot.velocity.y -= gravity * step;
        if (shot.wet) shot.velocity.multiplyScalar(Math.exp(-ARROW_WATER_DRAG * step));
        if (impact) {
          shot.position.copy(impact.point);
          shot.mesh.position.copy(impact.point);
          this.orient(shot.mesh, shot.velocity);
          if (impact.lodge !== false) {
            if (impact.parent) { impact.parent.updateWorldMatrix(true, false); impact.parent.attach(shot.mesh); }
            this.lodged.push({ mesh: shot.mesh, age: 0 });
            while (this.lodged.length > this.maxLodged) this.remove(this.lodged.shift()!.mesh);
          }
          hit = true;
          onImpact?.(shot, impact);
          if (impact.lodge === false) this.remove(shot.mesh);
          break;
        }
        shot.position.copy(to);
        remaining -= step;
        if (shot.wet && shot.velocity.length() < ARROW_FLOAT_SPEED) {
          // Spent in the water: wood floats, so it rises and lies on the surface.
          shot.mesh.position.copy(shot.position);
          this.floating.push({ mesh: shot.mesh, age: 0, heading: Math.atan2(shot.velocity.x, shot.velocity.z) });
          while (this.floating.length > this.maxLodged) this.remove(this.floating.shift()!.mesh);
          hit = true;
          break;
        }
      }
      if (hit) this.flights.splice(i, 1);
      else if (shot.age >= 7) { this.remove(shot.mesh); this.flights.splice(i, 1); }
      else { shot.mesh.position.copy(shot.position); this.orient(shot.mesh, shot.velocity); }
    }
  }

  clear(): void {
    for (const shot of this.flights) this.remove(shot.mesh);
    for (const shot of this.lodged) this.remove(shot.mesh);
    for (const shot of this.floating) this.remove(shot.mesh);
    this.flights.length = this.lodged.length = this.floating.length = 0;
  }

  /** Floating arrows rise to the surface, lie flat along their last heading and drift with the current. */
  private drift(dt: number, water?: ArrowWater) {
    for (let i = this.floating.length - 1; i >= 0; i--) {
      const f = this.floating[i]!;
      f.age += dt;
      if (f.age >= ARROW_FLOAT_SECONDS) { this.remove(f.mesh); this.floating.splice(i, 1); continue; }
      const p = f.mesh.position, w = water?.sample(p.x, p.z);
      if (!w) continue;
      const rise = 1 - Math.exp(-dt * 3);
      p.y += (w.surface + 0.005 - p.y) * rise;
      p.x += w.flowX * dt; p.z += w.flowZ * dt;
      // Tip first along the heading, level on the water.
      f.mesh.quaternion.setFromEuler(new THREE.Euler(0, f.heading, 0));
    }
  }

  dispose(): void { this.clear(); this.disposed = true; this.group.removeFromParent(); }

  private orient(mesh: THREE.Object3D, velocity: THREE.Vector3): void {
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), velocity.clone().normalize());
  }

  private remove(mesh: THREE.Object3D): void {
    mesh.removeFromParent();
    const geometry = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    mesh.traverse((object) => {
      const part = object as THREE.Mesh;
      if (!part.isMesh) return;
      geometry.add(part.geometry);
      for (const material of Array.isArray(part.material) ? part.material : [part.material]) materials.add(material);
    });
    for (const item of geometry) item.dispose();
    for (const item of materials) item.dispose();
  }
}
