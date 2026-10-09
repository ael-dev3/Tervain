import RAPIER from '@dimforge/rapier3d-compat';
import type { Collider as WorldCollider, Colliders } from './colliders';
import { ARCHIVE_ROOM, BUILDINGS, DECKS, HAMLET_PROPS } from './layout';
import { PLAYER_BODY_HEIGHT, PLAYER_BODY_RADIUS } from './playerPlacement';
import type { Terrain } from './terrain';
import type { PhysicalObjectPose } from '../game/types';
import { RockSurfaces, ROCK_CLIMB_ANGLE, ROCK_STEP_HEIGHT } from './rockContacts';
import type { PhysicalWoodGeometry } from './physicsGeometry';
import type { WaterSample } from './water/waterWorld';

export interface Vec3 { x: number; y: number; z: number }
export interface ProjectileContact {
  point: Vec3;
  distance: number;
  /** Present only when the closest contact is a canonical tree's finite wood collider. */
  treeId?: string;
}
export interface PropSpec {
  id: string; name: string; kind: 'barrel' | 'crate'; x: number; z: number;
  width: number; height: number; depth: number; yaw: number; mass: number;
}
/** These replace the same stationary work supplies, rather than adding copies over them. */
export const PHYSICAL_PROPS: readonly PropSpec[] = [
  ...HAMLET_PROPS.barrels.map((p, i) => ({ ...p, id: `camp_barrel_${i}`, name: 'Empty trade barrel', kind: 'barrel' as const, width: .76 * (i ? .9 : 1), height: i ? .9 : 1, depth: .76 * (i ? .9 : 1), yaw: .1 * i, mass: 18 })),
  ...HAMLET_PROPS.crates.map((p, i) => ({ ...p, id: `camp_crate_${i}`, name: 'Wooden supply crate', kind: 'crate' as const, width: i ? .66 : .86, height: i ? .47 : .57, depth: i ? .52 : .62, yaw: i ? -.2 : .3, mass: 12 })),
  ...[[-16.5, 2.4], [16.4, 21], [-136.5, 31.5], [88, -13], [-14.4, -3]].map(([x, z], i) => ({ id: `loose_barrel_${i}`, name: 'Empty wooden barrel', kind: 'barrel' as const, x: x!, z: z!, width: .76, height: 1, depth: .76, yaw: .17 * i, mass: 18 })),
];
export interface PropPose extends PhysicalObjectPose { sleeping: boolean }
interface Prop { spec: PropSpec; body: RAPIER.RigidBody; collider: RAPIER.Collider; previous: PropPose; wet: number }

/** The water a floating body needs to know about: where it stands and how it moves (WaterWorld provides it). */
export interface WaterField {
  sample(x: number, z: number): WaterSample | null;
  /** Changes when inland surfaces are re-solved, so floating bodies at rest wake to a new level. */
  readonly revision: number;
}

/** A body meeting the water hard enough to throw spray. Energy is 0..1 (a dropped crate .. a thrown barrel). */
export interface WaterSplash { id: string; x: number; y: number; z: number; energy: number }

/**
 * How far under a floating body rides at rest. Loose cargo is light for carrying and throwing, but a sealed barrel and a
 * plank crate both sit well down in the water, so their buoyancy is taken from this line, not from their gameplay mass.
 */
export const FLOAT_LINE: Readonly<Record<PropSpec['kind'], number>> = { barrel: 0.42, crate: 0.55 };
/** Water's drag on a floating body, per second of relative speed, as a share of its mass. */
const WATER_DRAG = 2.4;
const GRAVITY = 17;
export interface PhysicalActor { id: string; x: number; y: number; z: number; radius: number; height: number; active: boolean }
interface ActorContact { body: RAPIER.RigidBody; collider: RAPIER.Collider; from: Vec3; target: Vec3; active: boolean }
let initialization: Promise<void> | undefined;
export function initializePhysics() { return initialization ??= RAPIER.init(); }
const STEP = 1 / 60;
const CAPSULE_CENTER = PLAYER_BODY_HEIGHT / 2;
const capsulePosition = (p: Vec3): Vec3 => ({ x: p.x, y: p.y + CAPSULE_CENTER, z: p.z });
const yawRotation = (a: number) => ({ x: 0, y: Math.sin(a / 2), z: 0, w: Math.cos(a / 2) });
const rotateVector = (v: Vec3, q: { x: number; y: number; z: number; w: number }): Vec3 => {
  const tx = 2 * (q.y * v.z - q.z * v.y), ty = 2 * (q.z * v.x - q.x * v.z), tz = 2 * (q.x * v.y - q.y * v.x);
  return { x: v.x + q.w * tx + q.y * tz - q.z * ty, y: v.y + q.w * ty + q.z * tx - q.x * tz,
    z: v.z + q.w * tz + q.x * ty - q.y * tx };
};

/** Real rigid-body contacts; gameplay terrain/controller remains the authored source of standing heights. */
export class RealmPhysics {
  readonly world = new RAPIER.World({ x: 0, y: -17, z: 0 });
  readonly props: Prop[] = [];
  private propHandles = new Set<number>();
  private rockHandles = new Set<number>();
  private woodHandles = new Map<number, string>();
  private rockSurfaces = new RockSurfaces();
  private rocks: { collider: RAPIER.Collider; source: WorldCollider }[] = [];
  private fixed: { source: WorldCollider; collider: RAPIER.Collider }[] = [];
  private actors = new Map<string, ActorContact>();
  private footShape = new RAPIER.Ball(PLAYER_BODY_RADIUS);
  private character: RAPIER.RigidBody;
  private characterCollider: RAPIER.Collider;
  private controller: RAPIER.KinematicCharacterController;
  private accumulated = 0;
  private playerStart: Vec3 = { x: 0, y: -100, z: 0 };
  private held: Prop | null = null;
  private holdTarget: Vec3 = { x: 0, y: 0, z: 0 };
  private steps = 0;
  private alive = true;
  private initial: PropPose[] = [];
  private queriesDirty = false;
  private projectileQueryDirty = new Set<RAPIER.Collider>();
  private water: WaterField | null = null;
  private waterRevision = -1;
  private splashes: WaterSplash[] = [];

  constructor(terrain: Terrain, colliders: Colliders, specs: readonly PropSpec[] = PHYSICAL_PROPS, wood: readonly PhysicalWoodGeometry[] = []) {
    // Exact original triangle diagonal, including the seabed. Visual subdivision does not change these planes.
    const w = terrain.nx + 1, h = terrain.nz + 1;
    const vertices = new Float32Array(w * h * 3), indices = new Uint32Array(terrain.nx * terrain.nz * 6);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 3;
      vertices[k] = terrain.vertexX(i); vertices[k + 1] = terrain.vertexHeight(i, j); vertices[k + 2] = terrain.vertexZ(j);
    }
    let k = 0;
    for (let j = 0; j < terrain.nz; j++) for (let i = 0; i < terrain.nx; i++) {
      const a = j * w + i, b = a + 1, c = a + w, d = c + 1;
      for (const v of [a, c, b, b, c, d]) indices[k++] = v;
    }
    this.world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices).setFriction(.85));
    const exactWood = new Set(wood.map(tree => tree.id));
    for (const source of colliders.all) {
      if (exactWood.has(source.id)) continue;
      if (source.rockMesh) {
        const collider = this.world.createCollider(RAPIER.ColliderDesc.trimesh(source.rockMesh.positions, source.rockMesh.indices)
          .setFriction(.9).setEnabled(source.active));
        this.fixed.push({ source, collider }); this.rocks.push({ source, collider }); this.rockHandles.add(collider.handle);
        continue;
      }
      const base = terrain.heightAt(source.x, source.z);
      const building = source.id.startsWith('b:') ? BUILDINGS.find(b => `b:${b.id}` === source.id) : undefined;
      const fallbackHeight = building ? building.h + Math.min(building.w, building.d) * .65 + .5
        : source.id.startsWith('ambient:') ? 2.1 : 4;
      const low = source.minY ?? base - .4, high = source.maxY ?? base + fallbackHeight;
      if (high <= low) continue;
      const desc = source.kind === 'box'
        ? RAPIER.ColliderDesc.cuboid(source.hw, (high - low) / 2, source.hd).setRotation(yawRotation(source.yaw))
        : RAPIER.ColliderDesc.cylinder((high - low) / 2, source.r);
      const collider = this.world.createCollider(desc.setTranslation(source.x, (low + high) / 2, source.z).setFriction(.8).setEnabled(source.active));
      this.fixed.push({ source, collider });
    }
    // Medium stones have finite contact geometry without becoming new NPC/navigation fences.
    const installedRocks = new Set(this.rocks.map(rock => rock.source.id));
    for (const mesh of colliders.rockMeshes) {
      if (installedRocks.has(mesh.id)) continue;
      const source: WorldCollider = { id: mesh.id, kind: 'circle', x: (mesh.bounds.minX + mesh.bounds.maxX) / 2,
        z: (mesh.bounds.minZ + mesh.bounds.maxZ) / 2, r: 0, active: true, rockMesh: mesh };
      const collider = this.world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.positions, mesh.indices).setFriction(.9));
      this.fixed.push({ source, collider }); this.rocks.push({ source, collider }); this.rockHandles.add(collider.handle);
    }
    this.rockSurfaces.register(this.rocks.flatMap(rock => rock.source.rockMesh ? [rock.source.rockMesh] : []));
    for (const tree of wood) {
      const positions = Float32Array.from(tree.positions, value => value * tree.scale);
      const collider = this.world.createCollider(RAPIER.ColliderDesc.trimesh(positions, tree.indices)
        .setTranslation(tree.translation.x, tree.translation.y, tree.translation.z)
        .setRotation(yawRotation(tree.yaw)).setFriction(.8));
      this.woodHandles.set(collider.handle, tree.id);
    }
    // These standing planes already exist in Terrain and in the rendered mesh; rigid cargo needs the same support.
    const slab = (x: number, z: number, halfX: number, halfZ: number, bottom: number, top: number, yaw = 0) =>
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(halfX, (top - bottom) / 2, halfZ)
        .setTranslation(x, (bottom + top) / 2, z).setRotation(yawRotation(yaw)).setFriction(.8));
    for (const deck of DECKS) slab(deck.x, deck.z, deck.hx, deck.hz, deck.y - .09, deck.y, deck.yaw);
    const archive = BUILDINGS.find(b => b.kind === 'archive')!;
    const archiveBase = terrain.heightAt(archive.x, archive.z), wall = ARCHIVE_ROOM.wallThickness;
    slab(archive.x, archive.z, archive.w / 2 - wall + .08, archive.d / 2 - wall + .08,
      archiveBase + ARCHIVE_ROOM.floorBase, archiveBase + ARCHIVE_ROOM.floorTop, archive.yaw);
    const localSlab = (localZ: number, halfX: number, halfZ: number, bottom: number, top: number) =>
      slab(archive.x + Math.sin(archive.yaw) * localZ, archive.z + Math.cos(archive.yaw) * localZ,
        halfX, halfZ, archiveBase + bottom, archiveBase + top, archive.yaw);
    localSlab(archive.d / 2 + .08, ARCHIVE_ROOM.doorHalfWidth + .1, .475, -.08, ARCHIVE_ROOM.floorTop);
    localSlab(-archive.d / 2, ARCHIVE_ROOM.shutterHalfWidth, wall, ARCHIVE_ROOM.wallBase, ARCHIVE_ROOM.shutterBottom);
    for (const spec of specs) {
      const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spec.x, terrain.groundAt(spec.x, spec.z) + spec.height / 2 + .025, spec.z)
        .setRotation(yawRotation(spec.yaw)).setLinearDamping(.12).setAngularDamping(.35).setCcdEnabled(true));
      const desc = spec.kind === 'barrel' ? RAPIER.ColliderDesc.cylinder(spec.height / 2, spec.width / 2)
        : RAPIER.ColliderDesc.cuboid(spec.width / 2, spec.height / 2, spec.depth / 2);
      const collider = this.world.createCollider(desc.setMass(spec.mass).setFriction(.72).setRestitution(.08), body);
      const prop = { spec, body, collider, previous: this.poseOf(spec.id, body), wet: 0 };
      this.props.push(prop); this.propHandles.add(collider.handle);
    }
    this.character = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, -100, 0));
    this.characterCollider = this.world.createCollider(RAPIER.ColliderDesc.capsule(CAPSULE_CENTER - PLAYER_BODY_RADIUS, PLAYER_BODY_RADIUS).setFriction(.25), this.character);
    this.controller = this.world.createCharacterController(.012);
    this.controller.setApplyImpulsesToDynamicBodies(true); this.controller.setCharacterMass(80);
    this.controller.enableAutostep(.8, .25, true);
    this.controller.setSlideEnabled(true);
    this.controller.setMaxSlopeClimbAngle(ROCK_CLIMB_ANGLE);
    this.controller.setMinSlopeSlideAngle(ROCK_CLIMB_ANGLE);
    this.world.timestep = STEP;
    this.world.step(); // Populate scene queries before the first interaction, without a catch-up clock.
    this.initial = this.snapshot();
  }

  /** dt is the frame the hero is about to move through: the controller turns his displacement into pushes on cargo over
   *  that time, so a barrel is shoved alike at 30, 60 or 144 Hz (A70). */
  beginCharacter(p: Vec3, dt = STEP) {
    this.playerStart = { ...p };
    this.world.timestep = Number.isFinite(dt) && dt > 0 ? Math.min(.05, dt) : STEP;
    this.character.setTranslation(capsulePosition(p), false);
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  /** Living people can deflect loose cargo without adding a second player-movement obstacle. */
  syncActors(people: readonly PhysicalActor[]) {
    const retained = new Set<string>();
    for (const person of people) {
      retained.add(person.id);
      let actor = this.actors.get(person.id);
      const target = { x: person.x, y: person.y + person.height / 2, z: person.z };
      if (!actor) {
        const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(target.x, target.y, target.z));
        const collider = this.world.createCollider(RAPIER.ColliderDesc.capsule(Math.max(0, person.height / 2 - person.radius), person.radius), body);
        actor = { body, collider, from: { ...target }, target, active: person.active };
        this.actors.set(person.id, actor);
      }
      const previous = actor.body.translation();
      // Restoring or respawning a person is placement, not a high-speed sweep through every intervening loose object.
      if (person.active && (!actor.active || Math.hypot(target.x - previous.x, target.y - previous.y, target.z - previous.z) > 2)) {
        actor.body.setTranslation(target, false);
      }
      actor.from = { ...actor.body.translation() };
      actor.target = target; actor.active = person.active;
      actor.body.setEnabled(person.active);
    }
    for (const [id, actor] of this.actors) if (!retained.has(id)) { actor.active = false; actor.body.setEnabled(false); }
    this.world.propagateModifiedBodyPositionsToColliders();
  }

  /** Movable objects and source-exact rock triangles enter this query. Architecture/tree footprints are swept canonically. */
  move(x: number, y: number, z: number, dx: number, dz: number, grounded: boolean): Vec3 {
    this.character.setTranslation(capsulePosition({ x, y, z }), false);
    this.world.propagateModifiedBodyPositionsToColliders();
    // A tiny frame can miss Rapier's edge autostep window. Try only a source-supported low ledge,
    // sweep the raised capsule across it, and check overhead clearance before applying any lift.
    // This is independent of frame travel and cannot invent footholds on a tall/vertical face.
    if (grounded) {
      const support = this.rockSurfaces.supportAt(x + dx, z + dz, y, ROCK_STEP_HEIGHT);
      if (support !== null && support > y + .001 && support <= y + ROCK_STEP_HEIGHT + 1e-6) {
        const lifted = support + .015;
        const ceiling = this.ceilingAt(x, z, PLAYER_BODY_RADIUS, y + PLAYER_BODY_HEIGHT, lifted + PLAYER_BODY_HEIGHT);
        const hit = this.castContacts(this.characterCollider.shape, capsulePosition({ x, y: lifted, z }), { x: dx, y: 0, z: dz }, 1);
        if (ceiling === null && !hit) return { x: x + dx, y: support, z: z + dz };
      }
    }
    // After save restoration the broad phase retains its previous bounds until World.step. Direct sweeps cover that frame.
    if (this.queriesDirty) {
      const hit = this.castContacts(this.characterCollider.shape, capsulePosition({ x, y, z }), { x: dx, y: 0, z: dz }, 1);
      if (!hit) return { x: x + dx, y, z: z + dz };
      const prop = this.contactSupport(x + dx, z + dz, y)?.height ?? -Infinity;
      const rock = this.rockSurfaces.supportAt(x + dx, z + dz, y, ROCK_STEP_HEIGHT) ?? -Infinity;
      const reachable = Math.max(prop, rock);
      const support = grounded && Number.isFinite(reachable) ? reachable : null;
      if (support !== null && support >= y && support <= y + .8) {
        const clearance = this.castContacts(this.characterCollider.shape, capsulePosition({ x: x + dx, y: support + .012, z: z + dz }),
          { x: 0, y: 0, z: 0 }, 0);
        if (!clearance) return { x: x + dx, y: support, z: z + dz };
      }
      const fraction = Math.max(0, Math.min(1, hit.hit.time_of_impact - .012 / Math.max(.001, Math.hypot(dx, dz))));
      return { x: x + dx * fraction, y, z: z + dz * fraction };
    }
    const nearRock = this.rocks.some(rock => rock.source.active && rock.source.rockMesh &&
      x + dx + PLAYER_BODY_RADIUS >= rock.source.rockMesh.bounds.minX && x + dx - PLAYER_BODY_RADIUS <= rock.source.rockMesh.bounds.maxX &&
      z + dz + PLAYER_BODY_RADIUS >= rock.source.rockMesh.bounds.minZ && z + dz - PLAYER_BODY_RADIUS <= rock.source.rockMesh.bounds.maxZ);
    if (grounded) this.controller.enableAutostep(nearRock ? ROCK_STEP_HEIGHT : .8, .25, true); else this.controller.disableAutostep();
    this.controller.computeColliderMovement(this.characterCollider, { x: dx, y: 0, z: dz }, undefined, undefined, c => this.propHandles.has(c.handle) || this.rockHandles.has(c.handle));
    const d = this.controller.computedMovement();
    return { x: x + d.x, y: y + d.y, z: z + d.z };
  }

  /** Direct narrow-phase casts use each body's current pose, including immediately restored saved positions. */
  private castContacts(shape: RAPIER.Shape, position: Vec3, velocity: Vec3, maxToi: number,
    accept: (normal: Vec3, witness: Vec3, collider: RAPIER.Collider) => boolean = () => true, includeRocks = true) {
    let nearest: { contact: { collider: RAPIER.Collider }; hit: RAPIER.ShapeCastHit; normal: Vec3; witness: Vec3 } | null = null;
    for (const contact of [...this.props, ...(includeRocks ? this.rocks : [])]) {
      if (!contact.collider.isEnabled()) continue;
      if ('source' in contact && contact.source.rockMesh) {
        const bounds = contact.source.rockMesh.bounds;
        if (position.x + Math.max(0, velocity.x * maxToi) + PLAYER_BODY_RADIUS < bounds.minX ||
          position.x + Math.min(0, velocity.x * maxToi) - PLAYER_BODY_RADIUS > bounds.maxX ||
          position.z + Math.max(0, velocity.z * maxToi) + PLAYER_BODY_RADIUS < bounds.minZ ||
          position.z + Math.min(0, velocity.z * maxToi) - PLAYER_BODY_RADIUS > bounds.maxZ) continue;
      }
      const hit = contact.collider.castShape({ x: 0, y: 0, z: 0 }, shape, position, yawRotation(0), velocity, 0, maxToi, true);
      if (!hit) continue;
      const rotation = contact.collider.rotation(), center = contact.collider.translation();
      const normal = rotateVector(hit.normal1, rotation), localWitness = rotateVector(hit.witness1, rotation);
      const witness = { x: center.x + localWitness.x, y: center.y + localWitness.y, z: center.z + localWitness.z };
      if (!accept(normal, witness, contact.collider) || nearest && nearest.hit.time_of_impact <= hit.time_of_impact) continue;
      nearest = { contact, hit, normal, witness };
    }
    return nearest;
  }

  private contactSupport(x: number, z: number, feetY: number): { height: number; collider: RAPIER.Collider } | null {
    const top = feetY + .8;
    // The bottom hemisphere is the same radius/shape as the capsule, including partial-foot edge contacts.
    const hit = this.castContacts(this.footShape, { x, y: top + PLAYER_BODY_RADIUS, z }, { x: 0, y: -1, z: 0 }, 120,
      (normal, witness, collider) => !this.rockHandles.has(collider.handle) && normal.y > .45 && witness.y <= top + .001, false);
    return hit ? { height: top - hit.hit.time_of_impact, collider: hit.contact.collider } : null;
  }

  supportAt(x: number, z: number, feetY: number): number | null {
    const prop = this.contactSupport(x, z, feetY)?.height ?? -Infinity;
    const rock = this.rockSurfaces.supportAt(x, z, feetY) ?? -Infinity;
    const height = Math.max(prop, rock);
    return Number.isFinite(height) ? height : null;
  }

  surfaceAt(x: number, z: number, feetY: number): 'deck' | 'stone' | null {
    const rock = this.rockSurfaces.supportAt(x, z, feetY);
    if (rock !== null && Math.abs(rock - feetY) < .08) return 'stone';
    const support = this.contactSupport(x, z, feetY);
    return support && Math.abs(support.height - feetY) < .08 ? 'deck' : null;
  }

  ceilingAt(x: number, z: number, r: number, from: number, to: number): number | null {
    if (to <= from) return null;
    const shape = Math.abs(r - PLAYER_BODY_RADIUS) < 1e-6 ? this.footShape : new RAPIER.Ball(r);
    const hit = this.castContacts(shape, { x, y: from - r, z }, { x: 0, y: 1, z: 0 }, to - from, normal => normal.y < -.45);
    return hit ? from + hit.hit.time_of_impact : null;
  }

  /** Loose cargo can obstruct an otherwise valid item/NPC interaction line. */
  occludedByProp(from: Vec3, to: Vec3): boolean {
    const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
    const distance = Math.hypot(delta.x, delta.y, delta.z);
    if (distance < .02) return false;
    const ray = new RAPIER.Ray(from, { x: delta.x / distance, y: delta.y / distance, z: delta.z / distance });
    return this.props.some(prop => prop.collider.castRay(ray, distance - .01, true) >= 0);
  }

  /** Exact finite 3D contacts for an arrow segment, including visible wood, terrain and loose cargo. */
  traceProjectile(from: Vec3, to: Vec3): ProjectileContact | null {
    if (!this.alive || ![from.x, from.y, from.z, to.x, to.y, to.z].every(Number.isFinite)) return null;
    const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z };
    const length = Math.hypot(delta.x, delta.y, delta.z);
    if (length < 1e-8) return null;
    for (const fixed of this.fixed) if (fixed.collider.isEnabled() !== fixed.source.active) {
      fixed.collider.setEnabled(fixed.source.active);
      this.projectileQueryDirty.add(fixed.collider);
    }
    const direction = { x: delta.x / length, y: delta.y / length, z: delta.z / length };
    const ray = new RAPIER.Ray(from, direction);
    const actorHandles = new Set([...this.actors.values()].map(actor => actor.collider.handle));
    // Wildlife capsules support movement. Arrow contacts come from the posed animal triangles.
    const animalHandles = new Set([
      ...[...this.actors.entries()].filter(([id]) => /^animal:\d+$/.test(id)).map(([, actor]) => actor.collider.handle),
      ...this.fixed.filter(fixed => /^animal:\d+$/.test(fixed.source.id)).map(fixed => fixed.collider.handle),
    ]);
    const hit = this.world.castRay(ray, length, true, undefined, undefined, undefined, this.character,
      collider => collider.isEnabled() && !this.propHandles.has(collider.handle) && !actorHandles.has(collider.handle) && !animalHandles.has(collider.handle));
    let distance = hit?.timeOfImpact ?? Infinity;
    let treeId = hit ? this.woodHandles.get(hit.collider.handle) : undefined;
    // Direct casts see restored/moved cargo and freshly enabled doors before the broad phase's next step.
    const direct = (collider: RAPIER.Collider) => {
      if (!collider.isEnabled() || animalHandles.has(collider.handle)) return;
      const value = collider.castRay(ray, length, true);
      if (value >= 0 && value <= length && value <= distance) {
        distance = value;
        // A closer (or coincident) cargo/actor/changed-scenery contact replaces the wood attribution too.
        treeId = this.woodHandles.get(collider.handle);
      }
    };
    for (const prop of this.props) direct(prop.collider);
    for (const actor of this.actors.values()) if (actor.active) direct(actor.collider);
    for (const collider of this.projectileQueryDirty) direct(collider);
    return Number.isFinite(distance) ? { distance, ...(treeId === undefined ? {} : { treeId }), point: {
      x: from.x + direction.x * distance, y: from.y + direction.y * distance, z: from.z + direction.z * distance,
    } } : null;
  }

  private poseOf(id: string, body: RAPIER.RigidBody): PropPose {
    return { id, position: { ...body.translation() }, rotation: { ...body.rotation() }, sleeping: body.isSleeping() };
  }

  /** Keep the hand-to-object connection in open space, and sweep the whole body toward the spring target. */
  private heldTarget(player: Vec3, prop: Prop): Vec3 | null {
    const origin = { x: player.x, y: player.y + 1.3, z: player.z }, from = prop.body.translation();
    const sight = { x: from.x - origin.x, y: from.y - origin.y, z: from.z - origin.z };
    const distance = Math.hypot(sight.x, sight.y, sight.z);
    if (distance > .02) {
      const obstruction = this.world.castRay(new RAPIER.Ray(origin, { x: sight.x / distance, y: sight.y / distance, z: sight.z / distance }),
        distance - .02, true, undefined, undefined, prop.collider, this.character);
      if (obstruction) return null;
    }
    const delta = { x: this.holdTarget.x - from.x, y: this.holdTarget.y - from.y, z: this.holdTarget.z - from.z };
    const travel = Math.hypot(delta.x, delta.y, delta.z);
    if (travel < 1e-6) return this.holdTarget;
    const hit = this.world.castShape(from, prop.body.rotation(), delta, prop.collider.shape, .025, 1, false,
      undefined, undefined, prop.collider, this.character);
    if (!hit) return this.holdTarget;
    const fraction = Math.max(0, Math.min(1, hit.time_of_impact - .01 / travel));
    return { x: from.x + delta.x * fraction, y: from.y + delta.y * fraction, z: from.z + delta.z * fraction };
  }

  /** Let loose bodies float: buoyancy, drag and current from the realm's water. Null leaves everything dry. */
  setWater(field: WaterField | null) {
    this.water = field;
    this.waterRevision = -1;
    // Buoyancy is a standing force: release it from anything that was afloat, or it would keep lifting on dry land.
    for (const p of this.props) {
      if (p.wet > 0 && p !== this.held) { p.body.resetForces(true); p.body.resetTorques(true); }
      p.wet = 0;
    }
  }

  /** Splashes since the last call, oldest first. */
  drainSplashes(): WaterSplash[] {
    const out = this.splashes;
    this.splashes = [];
    return out;
  }

  /**
   * Buoyancy as eight point forces, one per octant of the body, each lifting by the share of its slab under the surface
   * and dragged toward the water's own motion there. A body tilted in the water rights itself, rides the swell and
   * drifts with the current or the surf without any special case for either.
   */
  private float(prop: Prop, field: WaterField, wake: boolean) {
    const { body, spec } = prop;
    const centre = body.translation();
    const here = field.sample(centre.x, centre.z);
    const reach = Math.hypot(spec.width, spec.height, spec.depth) / 2;
    if (!here || centre.y - reach > here.surface + 0.05) {
      if (prop.wet > 0) { body.resetForces(false); body.resetTorques(false); }
      prop.wet = 0;
      return;
    }
    if (body.isSleeping() && !wake) return;
    body.resetForces(true); body.resetTorques(true);
    const q = body.rotation(), v = body.linvel(), w = body.angvel();
    const lift = spec.mass * GRAVITY / FLOAT_LINE[spec.kind] / 8, drag = spec.mass * WATER_DRAG / 8;
    // Each sample stands for a slab half the body's height; how much of it is under water sets its share of lift.
    const slab = spec.height / 2;
    let wet = 0;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      const r = rotateVector({ x: sx * spec.width / 4, y: sy * spec.height / 4, z: sz * spec.depth / 4 }, q);
      const px = centre.x + r.x, py = centre.y + r.y, pz = centre.z + r.z;
      const water = field.sample(px, pz);
      if (!water) continue;
      const under = Math.max(0, Math.min(1, (water.surface - py) / slab + 0.5));
      if (under <= 0) continue;
      wet += under / 8;
      const vx = v.x + w.y * r.z - w.z * r.y, vy = v.y + w.z * r.x - w.x * r.z, vz = v.z + w.x * r.y - w.y * r.x;
      const d = drag * under;
      body.addForceAtPoint({ x: (water.flowX - vx) * d, y: lift * under - vy * d * 1.5, z: (water.flowZ - vz) * d }, { x: px, y: py, z: pz }, true);
    }
    // Meeting the water at speed throws spray; settling into it does not.
    if (prop.wet < 0.02 && wet > 0.04 && v.y < -1.6) {
      this.splashes.push({ id: spec.id, x: centre.x, y: here.surface, z: centre.z, energy: Math.min(1, -v.y * spec.mass / 160) });
      if (this.splashes.length > 32) this.splashes.shift();
    }
    prop.wet = wet;
  }

  /** How much of each loose body is under water (0 dry .. 1 sunk), for tests and the developer panel. */
  wetness(): Record<string, number> {
    return Object.fromEntries(this.props.map((p) => [p.spec.id, +p.wet.toFixed(3)]));
  }

  /** Fixed-step simulation, capped time accumulation and pose interpolation; paused time is never accrued. */
  step(dt: number, player: Vec3, yaw: number, pitch: number) {
    if (!Number.isFinite(dt) || dt <= 0 || !this.alive) return;
    for (const f of this.fixed) if (f.collider.isEnabled() !== f.source.active) {
      f.collider.setEnabled(f.source.active);
      this.projectileQueryDirty.add(f.collider);
    }
    this.world.timestep = STEP;
    this.accumulated = Math.min(.1, this.accumulated + Math.min(.05, dt));
    const count = Math.floor((this.accumulated + 1e-9) / STEP);
    this.character.setTranslation(capsulePosition(this.playerStart), false);
    this.holdTarget = { x: player.x + Math.sin(yaw) * 1.85, y: player.y + 1.3 - Math.sin(pitch) * .65, z: player.z + Math.cos(yaw) * 1.85 };
    for (let i = 0; i < count; i++) {
      const t = (i + 1) / count;
      this.character.setNextKinematicTranslation(capsulePosition({ x: this.playerStart.x + (player.x - this.playerStart.x) * t,
        y: this.playerStart.y + (player.y - this.playerStart.y) * t, z: this.playerStart.z + (player.z - this.playerStart.z) * t }));
      for (const actor of this.actors.values()) if (actor.active) actor.body.setNextKinematicTranslation({
        x: actor.from.x + (actor.target.x - actor.from.x) * t,
        y: actor.from.y + (actor.target.y - actor.from.y) * t,
        z: actor.from.z + (actor.target.z - actor.from.z) * t,
      });
      for (const p of this.props) p.previous = this.poseOf(p.spec.id, p.body);
      if (this.water) {
        // A re-solved stream may have risen around a barrel at rest; wake what stands in water once.
        const wake = this.water.revision !== this.waterRevision;
        this.waterRevision = this.water.revision;
        for (const p of this.props) if (p !== this.held) this.float(p, this.water, wake);
        if (this.held) this.held.wet = 0;
      }
      if (this.held) {
        const p = this.held.body.translation(), v = this.held.body.linvel(), m = this.held.spec.mass;
        const d = Math.hypot(p.x - player.x, p.y - player.y, p.z - player.z);
        this.held.body.resetForces(true);
        const target = d <= 4.5 ? this.heldTarget(player, this.held) : null;
        if (!target) this.release();
        else {
          const force = (delta: number, velocity: number) => Math.max(-90 * m, Math.min(90 * m, (delta * 65 - velocity * 15) * m));
          this.held.body.addForce({ x: force(target.x - p.x, v.x), y: force(target.y - p.y, v.y) + m * 17,
            z: force(target.z - p.z, v.z) }, true);
        }
      }
      this.world.step(); this.queriesDirty = false; this.projectileQueryDirty.clear(); this.steps++; this.accumulated -= STEP;
    }
  }

  get holding() { return this.held?.spec.name ?? null; }
  candidate(player: Vec3, yaw: number): PropSpec | null {
    const origin = { x: player.x, y: player.y + 1.3, z: player.z };
    let best: Prop | null = null, score = Infinity;
    for (const p of this.props) {
      const v = p.body.translation(), dx = v.x - origin.x, dz = v.z - origin.z, distance = Math.hypot(dx, v.y - origin.y, dz);
      if (distance > 2.8 || Math.abs(v.y - origin.y) > 1.8) continue;
      const ahead = (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / Math.max(.01, Math.hypot(dx, dz));
      if (ahead < .35) continue;
      const ray = new RAPIER.Ray(origin, { x: dx / distance, y: (v.y - origin.y) / distance, z: dz / distance });
      const targetHit = p.collider.castRay(ray, distance + .1, true);
      if (targetHit < 0) continue;
      const staticHit = this.world.castRay(ray, distance + .1, true, undefined, undefined, undefined, this.character,
        c => !this.propHandles.has(c.handle));
      if (staticHit && staticHit.timeOfImpact < targetHit) continue;
      if (this.props.some(other => other !== p && other.collider.castRay(ray, targetHit, true) >= 0)) continue;
      const rank = distance + (1 - ahead) * 1.3;
      if (rank < score) { score = rank; best = p; }
    }
    return best?.spec ?? null;
  }

  grab(id: string): boolean {
    if (this.held) return false;
    const p = this.props.find(p => p.spec.id === id);
    if (!p) return false;
    p.body.wakeUp(); this.held = p; return true;
  }
  release() { this.held?.body.resetForces(true); this.held = null; }
  throw(yaw: number, pitch: number) {
    const p = this.held;
    if (!p) return;
    this.release();
    p.body.applyImpulse({ x: Math.sin(yaw) * p.spec.mass * 6.5, y: (1.8 - Math.sin(pitch) * 3) * p.spec.mass, z: Math.cos(yaw) * p.spec.mass * 6.5 }, true);
    p.body.applyTorqueImpulse({ x: p.spec.mass * .12, y: p.spec.mass * .07, z: p.spec.mass * .06 }, true);
  }
  poses(interpolate = true): PropPose[] {
    const alpha = interpolate ? Math.max(0, Math.min(1, this.accumulated / STEP)) : 1;
    return this.props.map(p => {
      const now = this.poseOf(p.spec.id, p.body);
      // Shortest-path normalized quaternion blend also smooths tumbling at high display refresh rates.
      const a = p.previous.rotation, b = now.rotation;
      const sign = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w < 0 ? -1 : 1;
      const q = { x: a.x + (sign * b.x - a.x) * alpha, y: a.y + (sign * b.y - a.y) * alpha,
        z: a.z + (sign * b.z - a.z) * alpha, w: a.w + (sign * b.w - a.w) * alpha };
      const norm = Math.hypot(q.x, q.y, q.z, q.w) || 1;
      q.x /= norm; q.y /= norm; q.z /= norm; q.w /= norm;
      return { ...now, position: { x: p.previous.position.x + (now.position.x - p.previous.position.x) * alpha,
        y: p.previous.position.y + (now.position.y - p.previous.position.y) * alpha, z: p.previous.position.z + (now.position.z - p.previous.position.z) * alpha }, rotation: q };
    });
  }
  snapshot() { return this.poses(false); }
  /** Where each prop is and how fast it moves, for impact sounds. A sleeping body is still. */
  motions() {
    return this.props.map(p => {
      const at = p.body.translation(), v = p.body.isSleeping() ? { x: 0, y: 0, z: 0 } : p.body.linvel();
      return { id: p.spec.id, kind: p.spec.kind, x: at.x, y: at.y, z: at.z, vx: v.x, vy: v.y, vz: v.z, held: this.held === p, wet: p.wet };
    });
  }
  reset() { this.restore(this.initial); this.accumulated = 0; }
  restore(poses: readonly PhysicalObjectPose[]) {
    this.release();
    for (const pose of poses) {
      if (![pose.position.x, pose.position.y, pose.position.z, pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w].every(Number.isFinite)) continue;
      const norm = Math.hypot(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
      if (norm < 1e-6) continue;
      const p = this.props.find(p => p.spec.id === pose.id);
      if (!p) continue;
      p.body.resetForces(true); p.body.resetTorques(true);
      p.body.setTranslation(pose.position, true);
      p.body.setRotation({ x: pose.rotation.x / norm, y: pose.rotation.y / norm, z: pose.rotation.z / norm, w: pose.rotation.w / norm }, true);
      p.body.setLinvel({ x: 0, y: 0, z: 0 }, true); p.body.setAngvel({ x: 0, y: 0, z: 0 }, true); p.previous = this.poseOf(p.spec.id, p.body);
      p.wet = 0;
    }
    this.world.propagateModifiedBodyPositionsToColliders();
    this.queriesDirty = true;
  }
  stats() { return { engine: 'Rapier', hz: 60, bodies: this.props.length, actors: [...this.actors.values()].filter(p => p.active).length,
    awake: this.props.filter(p => !p.body.isSleeping()).length, held: this.held?.spec.id ?? null, steps: this.steps,
    rockMeshes: this.rocks.length }; }
  dispose() { if (!this.alive) return; this.alive = false; this.release(); this.woodHandles.clear(); this.world.free(); }
}
