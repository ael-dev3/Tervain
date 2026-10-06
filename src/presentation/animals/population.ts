import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AnimalCallEvent } from '../animalAudio';
import type { FrameContext, Quality, SceneModule } from '../context';
import type { Terrain } from '../../world/terrain';
import type { Colliders } from '../../world/colliders';
import { ANIMALS, type AnimalDefinition, type AnimalInspection } from './catalog';
import { findAnimalHome } from './navigation';
import { AnimalMovement } from './behavior';
import { AnimalRig, releaseAnimalAsset } from './rig';
import type { AnimalHuntRecord, HuntingState } from '../../game/hunting';
import type { AnimalArrowHit } from './hit';
import { AnimalImpactEffects } from './impact';
import { modelAssetUrl } from '../assets/modelUrl';

interface Resident {
  definition: AnimalDefinition;
  movement: AnimalMovement | null;
  rig: AnimalRig | null;
  loading: AbortController | null;
  failed: boolean;
  record: AnimalHuntRecord | null;
}

export const ANIMAL_BUDGETS = {
  low: { resident: 6, active: 4, drawDistance: 60, loadDistance: 90 },
  medium: { resident: 8, active: 6, drawDistance: 78, loadDistance: 110 },
  high: { resident: 10, active: 8, drawDistance: 92, loadDistance: 125 },
} as const;

export function animalModelUrl(file: string, base = import.meta.env.BASE_URL, page = document.baseURI,
  modelBase = typeof __MODEL_ASSET_BASE__ === 'undefined' ? '' : __MODEL_ASSET_BASE__) {
  return modelAssetUrl(file.replace(/^models\//, ''), base, page, modelBase);
}

/** Two bounded downloads, verified GLB headers, and no network services or credentials in the game. */
async function loadAnimal(definition: AnimalDefinition, signal: AbortSignal): Promise<GLTF> {
  if (!definition.file) throw new Error(`${definition.id} has no supplied asset.`);
  const url = animalModelUrl(definition.file);
  const response = await fetch(url, { signal });
  if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error(`${definition.id} model download failed (HTTP ${response.status}).`);
  const bytes = await response.arrayBuffer();
  if (signal.aborted) throw new DOMException('Animal load cancelled', 'AbortError');
  const header = bytes.byteLength >= 12 ? new DataView(bytes) : null;
  if (!header || header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== bytes.byteLength) throw new Error(`${definition.id} is not a complete GLB 2 file.`);
  return new GLTFLoader().parseAsync(bytes, new URL('.', url).href);
}

/** Live wandering is cosmetic; injury, corpse poses and harvesting follow durable domain records. */
export class AnimalPopulation implements SceneModule {
  readonly group = new THREE.Group();
  private residents: Resident[];
  private running = false;
  private disposed = false;
  private pending = new Set<Promise<void>>();
  private calls: AnimalCallEvent[] = [];
  private callCooldown = 0;
  private active = 0;
  private visible = 0;
  private errors: string[] = [];
  private frustum = new THREE.Frustum();
  private projection = new THREE.Matrix4();
  private sphere = new THREE.Sphere();
  private selectionTimer = 0;
  private desired = new Set<string>();
  private loader: (definition: AnimalDefinition, signal: AbortSignal) => Promise<Pick<GLTF, 'scene' | 'animations'>>;
  private effects: AnimalImpactEffects;
  private reducedMotion = false;

  constructor(private terrain: Terrain, colliders: Colliders, private quality: Quality, readonly inspection: AnimalInspection | null = null,
    loader: (definition: AnimalDefinition, signal: AbortSignal) => Promise<Pick<GLTF, 'scene' | 'animations'>> = loadAnimal) {
    this.group.name = 'owner animal models';
    this.loader = loader;
    this.effects = new AnimalImpactEffects(terrain); this.group.add(this.effects.group);
    this.residents = ANIMALS.map((definition, index) => {
      const inspected = this.isInspected(definition.id);
      const anchor = inspected && inspection?.kind === 'lineup' ? { x: -53 + (index % 6) * 4.5, z: 54 } : definition.home;
      const home = definition.file ? findAnimalHome(terrain, colliders, definition, anchor, !inspected) : null;
      if (!home && definition.file) this.errors.push(`${definition.id}: no clear habitat patch`);
      return { definition, movement: home ? new AnimalMovement(definition, home, terrain, colliders, inspected) : null, rig: null, loading: null, failed: !home && !!definition.file, record: null };
    });
  }

  /** Called after state transitions and before the first frame of a restored world. */
  syncHunting(records: HuntingState, restore = false) {
    if (this.disposed) return;
    for (const resident of this.residents) {
      const record = records[resident.definition.id] ?? null, previous = resident.record;
      const poseChanged = !!record && !!previous && (record.position.x !== previous.position.x || record.position.z !== previous.position.z || record.yaw !== previous.yaw);
      const revived = !!previous && previous.status !== 'injured' && record?.status === 'injured';
      if (restore || revived || poseChanged && previous?.status !== 'injured') {
        this.effects.clearCarcass(resident.definition.id);
        this.effects.releaseRig(resident.definition.id);
        if (resident.rig?.isDead && (record?.status !== 'dead' || poseChanged)) { resident.rig.dispose(); resident.rig = null; }
      }
      if (!record && (previous || restore)) {
        this.effects.clearCarcass(resident.definition.id);
        if (resident.rig?.isDead) { this.effects.releaseRig(resident.definition.id); resident.rig.dispose(); resident.rig = null; }
        if (resident.movement) {
          resident.movement.x = resident.movement.home.x; resident.movement.z = resident.movement.home.z;
          resident.movement.yaw = resident.definition.yaw; resident.movement.speed = 0;
        }
      }
      resident.record = record;
      if (!record || !resident.movement) continue;
      if (record.status === 'injured') {
        if (!previous || restore || revived || poseChanged || record.atClock !== previous.atClock) {
          resident.movement.x = record.position.x; resident.movement.z = record.position.z; resident.movement.yaw = record.yaw;
          resident.movement.frighten({ x: record.position.x - Math.sin(record.yaw) * 2, z: record.position.z - Math.cos(record.yaw) * 2 });
        }
        continue;
      }
      resident.movement.x = record.position.x; resident.movement.z = record.position.z; resident.movement.yaw = record.yaw; resident.movement.speed = 0;
      this.effects.carcass(resident.definition.id, record.position, resident.definition.radius);
      if (record.status === 'skinned') {
        resident.loading?.abort(); this.effects.releaseRig(resident.definition.id); resident.rig?.dispose(); resident.rig = null;
        this.desired.delete(resident.definition.id);
      } else resident.rig?.beginDeath(this.terrain, record.position.x, record.position.z, record.yaw, !this.running || restore);
    }
    this.calls = this.calls.filter((call) => this.residents.find((resident) => resident.definition.id === call.id)?.record?.status !== 'dead'
      && this.residents.find((resident) => resident.definition.id === call.id)?.record?.status !== 'skinned');
  }

  traceArrow(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): AnimalArrowHit | null {
    if (this.disposed || !this.running) return null;
    let nearest: AnimalArrowHit | null = null;
    for (const resident of this.residents) {
      if (!resident.rig || !resident.movement || resident.record?.status === 'skinned') continue;
      resident.rig.root.updateMatrixWorld(true);
      const hit = resident.rig.arrowSurface.trace(origin, direction, nearest?.distance ?? maxDistance);
      if (!hit || hit.distance > maxDistance) continue;
      const { movement } = resident;
      nearest = { ...hit, zone: resident.record?.status === 'dead' ? null : hit.zone, id: resident.definition.id,
        position: { x: movement.x, y: this.terrain.heightAt(movement.x, movement.z), z: movement.z }, yaw: movement.yaw };
    }
    return nearest;
  }

  showArrowImpact(hit: AnimalArrowHit, direction: THREE.Vector3) {
    if (!this.running || this.disposed) return;
    const resident = this.residents.find((resident) => resident.definition.id === hit.id);
    if (!resident?.rig) return;
    this.effects.impact(resident.rig, hit, direction, this.reducedMotion);
  }

  alertShot(position: { x: number; z: number }, radius = 18) {
    if (!this.running || this.disposed) return;
    for (const resident of this.residents) {
      if (!resident.movement || resident.record?.status === 'dead' || resident.record?.status === 'skinned') continue;
      if (Math.hypot(resident.movement.x - position.x, resident.movement.z - position.z) <= radius) resident.movement.frighten(position);
    }
  }

  /** A carcass remains interactable when its mesh has been evicted from the bounded resident set. */
  nearestCarcass(player: { x: number; z: number }, maxDistance = 2.8) {
    let nearest: { id: AnimalDefinition['id']; species: AnimalDefinition['species']; position: { x: number; y: number; z: number }; yaw: number; distance: number } | null = null;
    for (const resident of this.residents) {
      const record = resident.record;
      if (!resident.definition.file || record?.status !== 'dead') continue;
      const distance = Math.hypot(record.position.x - player.x, record.position.z - player.z);
      if (distance > maxDistance || nearest && distance >= nearest.distance) continue;
      nearest = { id: resident.definition.id, species: resident.definition.species, position: { ...record.position }, yaw: record.yaw, distance };
    }
    return nearest;
  }

  /** A knife target at the collapsed chest, with a close stance on the player's side of that body. */
  skinningFrame(id: AnimalDefinition['id'], player: { x: number; z: number }) {
    const resident = this.residents.find((candidate) => candidate.definition.id === id);
    if (!resident?.rig?.isDead || resident.record?.status !== 'dead') return null;
    const chest = resident.rig.asset.scene.getObjectByName('Chest');
    if (!chest) return null;
    resident.rig.root.updateMatrixWorld(true);
    const target = chest.getWorldPosition(new THREE.Vector3());
    const direction = new THREE.Vector2(player.x - target.x, player.z - target.z);
    if (direction.lengthSq() < .01) direction.set(Math.cos(resident.record.yaw), -Math.sin(resident.record.yaw));
    direction.normalize();
    const reach = Math.max(.55, resident.definition.width * .5 + .35);
    const x = target.x + direction.x * reach, z = target.z + direction.y * reach;
    return { target: { x: target.x, y: target.y, z: target.z }, stance: { x, y: this.terrain.heightAt(x, z), z },
      yaw: Math.atan2(target.x - x, target.z - z), ready: resident.rig.collapseComplete };
  }

  setRunning(value: boolean) {
    this.running = value && !this.disposed;
    if (!this.running) { this.calls.length = 0; this.active = 0; }
  }

  setReduceEffects(value: boolean) { this.effects.setReduced(value); }

  private isInspected(id: string) {
    if (!this.inspection) return false;
    if (this.inspection.kind === 'individual') return id === this.inspection.id;
    return ANIMALS.slice(this.inspection.page * 6, this.inspection.page * 6 + 6).some((definition) => definition.id === id);
  }

  /** Developer captures wait for their chosen model; a normal landing downloads no distant animals. */
  async preloadInspection() {
    if (!this.inspection || this.disposed) return;
    const wanted = this.residents.filter((resident) => this.isInspected(resident.definition.id));
    this.desired = new Set(wanted.map((resident) => resident.definition.id));
    for (let start = 0; start < wanted.length; start += 2) {
      await Promise.all(wanted.slice(start, start + 2).map((resident) => this.request(resident)));
    }
  }

  /** Inspection camera coordinates are exposed only when the developer selected this query. */
  inspectionFrame() {
    if (!this.inspection) return null;
    const subjects = this.residents.filter((resident) => this.isInspected(resident.definition.id) && resident.movement);
    const one = subjects[0]?.movement;
    if (!one) return null;
    const x = subjects.reduce((sum, subject) => sum + subject.movement!.x, 0) / subjects.length;
    const z = subjects.reduce((sum, subject) => sum + subject.movement!.z, 0) / subjects.length;
    const y = this.terrain.heightAt(x, z);
    const lineup = this.inspection.kind === 'lineup';
    return { x, y, z, distance: lineup ? 24 : Math.max(3, subjects[0]!.definition.length * 2.7) };
  }

  update(dt: number, frame: FrameContext) {
    if (!this.running || this.disposed) return;
    this.reducedMotion = frame.reducedMotion; this.effects.update(Math.max(0, Math.min(.15, dt)));
    const budget = ANIMAL_BUDGETS[this.quality];
    this.callCooldown = Math.max(0, this.callCooldown - dt);
    this.selectionTimer -= dt;
    const sorted = this.residents.filter((resident) => resident.movement && resident.definition.file && !resident.failed && resident.record?.status !== 'skinned' && (!this.inspection || this.isInspected(resident.definition.id)))
      .map((resident) => ({ resident, distance: Math.hypot(resident.movement!.x - frame.focus.x, resident.movement!.z - frame.focus.z) }))
      .filter((entry) => this.inspection || entry.distance <= budget.loadDistance)
      .sort((a, b) => a.distance - b.distance);
    if (this.selectionTimer <= 0) {
      this.selectionTimer = .5;
      this.desired = new Set(sorted.slice(0, budget.resident).map(({ resident }) => resident.definition.id));
      for (const resident of this.residents) if (!this.desired.has(resident.definition.id)) {
        resident.loading?.abort();
        this.effects.releaseRig(resident.definition.id); resident.rig?.dispose(); resident.rig = null;
      }
    }
    for (const { resident } of sorted) {
      if (this.pending.size >= 2) break;
      if (this.desired.has(resident.definition.id) && !resident.rig && !resident.loading) void this.request(resident);
    }
    frame.camera.updateMatrixWorld();
    this.projection.multiplyMatrices(frame.camera.projectionMatrix, frame.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projection);
    this.active = 0; this.visible = 0;
    for (const resident of this.residents) if (resident.rig) resident.rig.root.visible = false;
    for (const { resident, distance } of sorted) {
      const rig = resident.rig, movement = resident.movement!;
      if (!rig || distance > budget.drawDistance && !this.inspection) continue;
      this.sphere.center.set(movement.x, this.terrain.heightAt(movement.x, movement.z) + rig.height / 2, movement.z);
      this.sphere.radius = Math.max(resident.definition.length, rig.height) * .7;
      if (!this.inspection && !this.frustum.intersectsSphere(this.sphere)) continue;
      rig.root.visible = true; this.visible++;
      if (resident.record?.status === 'dead') {
        const { position, yaw } = resident.record;
        rig.updateDeath(dt, this.terrain, position.x, position.z, yaw);
        if (rig.collapseComplete) {
          const chest = rig.asset.scene.getObjectByName('Chest');
          if (chest) this.effects.moveCarcass(resident.definition.id, chest.getWorldPosition(new THREE.Vector3()));
        }
        continue;
      }
      // Review pages contain at most six animals and may animate all six; shipped presets retain their cap.
      if (this.active >= (this.inspection ? 6 : budget.active)) continue;
      this.active++;
      const call = this.inspection ? false : movement.update(dt, frame.focus, this.callCooldown === 0);
      if (call) {
        this.callCooldown = 9;
        this.calls.push({ id: resident.definition.id, species: resident.definition.species, position: { x: movement.x, y: this.terrain.heightAt(movement.x, movement.z) + rig.height * .65, z: movement.z }, gain: resident.definition.domestic ? .6 : .85, variant: Math.floor(movement.elapsed / 45) % 2 });
      }
      rig.animate(dt, movement.behavior, movement.speed, frame.reducedMotion, this.inspection?.clip ?? null);
      rig.ground(this.terrain, movement.x, movement.z, movement.yaw);
    }
  }

  drainCalls(): AnimalCallEvent[] { const calls = this.calls; this.calls = []; return calls; }

  private request(resident: Resident): Promise<void> {
    if (!resident.definition.file || resident.failed || !resident.movement || resident.rig || resident.loading || resident.record?.status === 'skinned' || this.disposed) return Promise.resolve();
    const controller = new AbortController(); resident.loading = controller;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 60_000);
    const pending = this.loader(resident.definition, controller.signal).then((asset) => {
      if (this.disposed || controller.signal.aborted || !this.desired.has(resident.definition.id) || resident.record?.status === 'skinned') { releaseAnimalAsset(asset.scene); return; }
      let rig: AnimalRig;
      try { rig = new AnimalRig(resident.definition, asset); }
      catch (error) { releaseAnimalAsset(asset.scene); throw error; }
      resident.rig = rig;
      if (resident.record?.status === 'dead') {
        rig.beginDeath(this.terrain, resident.record.position.x, resident.record.position.z, resident.record.yaw, true);
        const chest = rig.asset.scene.getObjectByName('Chest');
        if (chest) this.effects.moveCarcass(resident.definition.id, chest.getWorldPosition(new THREE.Vector3()));
      }
      else rig.ground(this.terrain, resident.movement!.x, resident.movement!.z, resident.movement!.yaw);
      rig.root.visible = false; this.group.add(rig.root);
    }).catch((error: unknown) => {
      if (this.disposed || controller.signal.aborted && !timedOut) return;
      resident.failed = true;
      const message = error instanceof Error ? error.message : String(error);
      this.errors.push(message); console.warn('Animal asset unavailable:', message);
    }).finally(() => {
      clearTimeout(timeout); resident.loading = null; this.pending.delete(pending);
    });
    this.pending.add(pending);
    return pending;
  }

  stats() {
    return { catalog: ANIMALS.length, available: ANIMALS.filter((definition) => definition.file).length, unavailable: ANIMALS.filter((definition) => !definition.file).length,
      loaded: this.residents.filter((resident) => resident.rig).length, loading: this.pending.size, active: this.active, visible: this.visible,
      triangles: this.residents.reduce((count, resident) => count + (resident.rig?.triangles ?? 0), 0), errors: this.errors.length,
      injured: this.residents.filter((resident) => resident.record?.status === 'injured').length,
      carcasses: this.residents.filter((resident) => resident.record?.status === 'dead').length,
      skinned: this.residents.filter((resident) => resident.record?.status === 'skinned').length, ...this.effects.stats() };
  }

  get diagnostics() {
    return this.residents.map((resident) => ({ id: resident.definition.id, species: resident.definition.species,
      status: !resident.definition.file ? 'source missing' : resident.failed ? 'unavailable' : resident.rig ? 'ready' : resident.loading ? 'loading' : 'distant',
      position: resident.movement ? { x: resident.movement.x, y: this.terrain.heightAt(resident.movement.x, resident.movement.z), z: resident.movement.z } : null,
      clip: resident.rig?.activeClip ?? null, joints: resident.rig?.joints ?? 0, triangles: resident.rig?.triangles ?? 0, behavior: resident.movement?.behavior ?? null,
      visible: resident.rig?.root.visible ?? false, hunting: resident.record?.status ?? 'alive' }));
  }

  get failures() { return [...this.errors]; }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.setRunning(false);
    for (const resident of this.residents) { resident.loading?.abort(); this.effects.releaseRig(resident.definition.id); resident.rig?.dispose(); resident.rig = null; }
    this.effects.dispose();
    this.calls.length = 0; this.desired.clear(); this.group.clear();
  }
}
