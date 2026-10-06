import * as THREE from 'three';
import { ANIMAL_IDS, ANIMAL_MODEL_IDS, ANIMAL_SPECIES, isHuntableAnimalId, type AnimalId, type AnimalHuntRecord, type HuntingState } from '../../../game/hunting';
import type { Collider } from '../../../world/colliders';
import type { AnimalDefinition } from '../catalog';
import { AnimalCorpse, type CorpseBody } from './corpse';
import { AnimalArrowSurface, type AnimalArrowHit } from './hit';
import { AnimalImpactEffects } from './impact';

export interface HuntingAnimal extends CorpseBody { definition: AnimalDefinition; yaw: number }
interface Resident { id: AnimalId; animal: HuntingAnimal; corpse: AnimalCorpse; surface: AnimalArrowSurface | null; record: AnimalHuntRecord | null }
type Ground = ConstructorParameters<typeof AnimalImpactEffects>[0] & { normalAt(x: number, z: number, out: [number, number, number]): unknown };

/** Durable hunting identities adapt to the nineteen existing controllers and independently cloned skins. */
export class AnimalHunting {
  readonly group: THREE.Group;
  private residents: Resident[];
  private effects: AnimalImpactEffects;
  private running = true;
  private disposed = false;
  private sphere = new THREE.Sphere();
  private center = new THREE.Vector3();
  private closest = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private point = new THREE.Vector3();
  private scanCursor = 0;
  private reduced = false;
  constructor(animals: readonly HuntingAnimal[], private terrain: Ground,
    private frighten: (animal: HuntingAnimal, position: { x: number; z: number }) => void,
    private restore: (animal: HuntingAnimal) => void) {
    this.effects = new AnimalImpactEffects(terrain); this.group = this.effects.group;
    this.residents = animals.flatMap(animal => {
      const id = ANIMAL_IDS.find(id => ANIMAL_MODEL_IDS[id] === animal.definition.id);
      return id ? [{ id, animal, corpse: new AnimalCorpse(animal, animal.definition.species === 'deer'), surface: null, record: null }] : [];
    });
  }

  syncHunting(records: HuntingState, restore = false) {
    if (this.disposed) return;
    for (const resident of this.residents) {
      const record = isHuntableAnimalId(resident.id) ? records[resident.id] ?? null : null, previous = resident.record;
      const changed = record?.status !== previous?.status || record?.atClock !== previous?.atClock
        || record?.position.x !== previous?.position.x || record?.position.y !== previous?.position.y || record?.position.z !== previous?.position.z || record?.yaw !== previous?.yaw;
      if (!changed && !restore) continue;
      const { animal, corpse, id } = resident;
      const moved = !!record && !!previous && (record.position.x !== previous.position.x || record.position.z !== previous.position.z || record.yaw !== previous.yaw);
      if (restore || !record && previous || corpse.isDead && (record?.status === 'injured' || moved)) {
        this.effects.clearCarcass(id); corpse.reset(); this.restore(animal);
      }
      resident.record = record ? { ...record, position: { ...record.position } } : null;
      animal.root.visible = record?.status !== 'skinned';
      if (!record) continue;
      animal.root.position.copy(record.position); animal.yaw = record.yaw;
      if (restore || moved) animal.root.rotation.set(0, record.yaw, 0);
      if (record.status === 'injured') {
        this.frighten(animal, { x: record.position.x - Math.sin(record.yaw) * 2, z: record.position.z - Math.cos(record.yaw) * 2 });
      } else if (record.status === 'dead') {
        corpse.begin(animal.definition.id, restore || !this.running);
        corpse.update(0, this.terrain, record.position, record.yaw, 0);
        this.effects.carcass(id, record.position, animal.size.x * .5);
      } else this.effects.releaseRig(id);
    }
  }

  isDead(animal: HuntingAnimal) { return this.resident(animal)?.record?.status === 'dead'; }
  isVisible(animal: HuntingAnimal) { return this.resident(animal)?.record?.status !== 'skinned'; }
  corpseContact(animal: HuntingAnimal): Collider | null {
    const resident = this.resident(animal);
    if (resident?.record?.status !== 'dead') return null;
    const bounds = resident.corpse.bounds;
    if (bounds) return { id: `animal:${animal.definition.id}`, kind: 'box', x: (bounds.min.x + bounds.max.x) / 2, z: (bounds.min.z + bounds.max.z) / 2,
      hw: (bounds.max.x - bounds.min.x) / 2 + .02, hd: (bounds.max.z - bounds.min.z) / 2 + .02, yaw: 0, active: true, minY: bounds.min.y, maxY: bounds.max.y };
    return { id: `animal:${animal.definition.id}`, kind: 'circle', x: animal.root.position.x, z: animal.root.position.z,
      r: Math.hypot(animal.size.x, animal.size.y, animal.size.z) / 2, active: true, minY: this.terrain.heightAt(animal.root.position.x, animal.root.position.z),
      maxY: animal.root.position.y + animal.size.y };
  }

  update(dt: number, reducedMotion: boolean) {
    if (!this.running || this.disposed) return;
    this.effects.setReduced(this.reduced || reducedMotion); this.effects.update(dt);
    // One shared budget even when a restored save contains fourteen carcasses.
    let budget = 2048;
    for (let offset = 0; offset < this.residents.length; offset++) {
      const resident = this.residents[(this.scanCursor + offset) % this.residents.length]!;
      if (resident.record?.status !== 'dead') continue;
      budget -= resident.corpse.update(dt, this.terrain, resident.record.position, resident.record.yaw, Math.min(1024, budget));
      const chest = resident.animal.scene.getObjectByName('chest');
      if (chest && resident.corpse.ready) this.effects.moveCarcass(resident.id, chest.getWorldPosition(this.point));
    }
    this.scanCursor = (this.scanCursor + 1) % Math.max(1, this.residents.length);
  }

  traceArrow(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): AnimalArrowHit | null {
    if (this.disposed || !this.running || !Number.isFinite(maxDistance) || maxDistance <= 0 || direction.lengthSq() < 1e-12) return null;
    let nearest: AnimalArrowHit | null = null;
    this.direction.copy(direction).normalize();
    for (const resident of this.residents) {
      if (!isHuntableAnimalId(resident.id) || resident.record?.status === 'skinned') continue;
      const { animal } = resident;
      animal.root.updateMatrixWorld(true); animal.skeletons.forEach(skeleton => skeleton.update());
      animal.bounds.getBoundingSphere(this.sphere); this.sphere.radius = this.sphere.radius * 1.8 + .04; this.sphere.applyMatrix4(animal.root.matrixWorld);
      const along = this.center.copy(this.sphere.center).sub(origin).dot(this.direction);
      this.closest.copy(origin).addScaledVector(this.direction, THREE.MathUtils.clamp(along, 0, nearest?.distance ?? maxDistance));
      if (this.closest.distanceToSquared(this.sphere.center) > this.sphere.radius ** 2) continue;
      // Acceleration data is only allocated for models actually reached by an arrow ray.
      resident.surface ??= new AnimalArrowSurface({ id: resident.id, species: animal.definition.species }, animal.scene);
      const hit = resident.surface.trace(origin, this.direction, nearest?.distance ?? maxDistance);
      if (hit) nearest = { ...hit, id: resident.id, zone: resident.record?.status === 'dead' ? null : hit.zone,
        position: { x: animal.root.position.x, y: animal.root.position.y, z: animal.root.position.z }, yaw: animal.yaw };
    }
    return nearest;
  }

  showArrowImpact(hit: AnimalArrowHit, direction: THREE.Vector3) {
    if (!this.running || this.disposed) return;
    const resident = this.residents.find(resident => resident.id === hit.id);
    if (resident && isHuntableAnimalId(hit.id) && resident.record?.status !== 'skinned') this.effects.impact(resident.animal, hit, direction);
  }
  alertShot(position: { x: number; z: number }, radius = 18) {
    if (!this.running || this.disposed) return;
    for (const resident of this.residents) if (isHuntableAnimalId(resident.id) && (!resident.record || resident.record.status === 'injured')
      && Math.hypot(resident.animal.root.position.x - position.x, resident.animal.root.position.z - position.z) <= radius) this.frighten(resident.animal, position);
  }
  nearestCarcass(player: { x: number; z: number }, maxDistance = 2.8) {
    if (this.disposed) return null;
    let nearest: { id: AnimalId; species: typeof ANIMAL_SPECIES[AnimalId]; position: { x: number; y: number; z: number }; yaw: number; distance: number } | null = null;
    for (const resident of this.residents) {
      const record = resident.record;
      if (record?.status !== 'dead') continue;
      const distance = Math.hypot(record.position.x - player.x, record.position.z - player.z);
      if (distance <= maxDistance && (!nearest || distance < nearest.distance)) nearest = { id: resident.id, species: ANIMAL_SPECIES[resident.id], position: { ...record.position }, yaw: record.yaw, distance };
    }
    return nearest;
  }
  skinningFrame(id: AnimalId, player: { x: number; z: number }) {
    const resident = this.residents.find(resident => resident.id === id);
    if (this.disposed || resident?.record?.status !== 'dead') return null;
    const { animal, corpse } = resident, chest = animal.scene.getObjectByName('chest');
    if (!chest) return null;
    animal.root.updateMatrixWorld(true); chest.getWorldPosition(this.point);
    const target = { x: this.point.x, y: this.point.y, z: this.point.z };
    this.direction.set(player.x - target.x, 0, player.z - target.z);
    if (this.direction.lengthSq() < .01) this.direction.set(Math.cos(animal.yaw), 0, -Math.sin(animal.yaw));
    this.direction.normalize();
    let reach = Math.max(.55, animal.size.x * .5 + .35);
    // Put the knife stance outside the actual collapsed body/antler footprint, on the player's side.
    if (corpse.bounds) {
      const b = corpse.bounds;
      const exitX = Math.abs(this.direction.x) > 1e-5 ? ((this.direction.x > 0 ? b.max.x + .38 : b.min.x - .38) - target.x) / this.direction.x : Infinity;
      const exitZ = Math.abs(this.direction.z) > 1e-5 ? ((this.direction.z > 0 ? b.max.z + .38 : b.min.z - .38) - target.z) / this.direction.z : Infinity;
      reach = Math.max(reach, Math.min(exitX, exitZ) + .01);
    }
    const x = target.x + this.direction.x * reach, z = target.z + this.direction.z * reach;
    return { target, stance: { x, y: this.terrain.heightAt(x, z), z }, yaw: Math.atan2(target.x - x, target.z - z), ready: corpse.ready };
  }
  setRunning(value: boolean) { this.running = value && !this.disposed; }
  setReduceEffects(value: boolean) { this.reduced = value; this.effects.setReduced(value); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.effects.dispose(); this.residents.length = 0;
  }
  private resident(animal: HuntingAnimal) { return this.residents.find(resident => resident.animal === animal); }
}
