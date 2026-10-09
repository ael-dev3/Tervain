import * as THREE from 'three';
import { ANCHORS, bySpec, frontOf, BENCH_SEAT_HEIGHT } from '../world/layout';
import type { BuildContext, FrameContext, SceneModule } from './context';
import { createAmbientRig, poseRig, type AmbientStyle, type Look, type Mode, type Rig } from './characters';
import type { AwaitingFigure } from './residentArrivals';

/**
 * Silent residents of the inland hamlet. Their positions follow the relocated buildings and hearth;
 * the landing strand itself has no occupied camp. They carry no quest state.
 */

interface Spec {
  look: Look;
  style: AmbientStyle;
  x: number;
  z: number;
  yaw: number;
  /** Poses to cycle through, with how many seconds each lasts. */
  cycle: [Mode, number][];
  /** Conversation changes the upper body while this resident stays on their seat. */
  seated?: boolean;
  /** Retires indoors after dark. */
  sleeps: boolean;
  /** Radius of the small collider that keeps the player from walking through them. */
  radius: number;
}

const FIRE = ANCHORS.strand_fire!;
const DOOR = frontOf(bySpec('keeper_cottage'), 2.4);
const MENDER = frontOf(bySpec('net_store'), 2.4);

const SPECS: Spec[] = [
  {
    look: { skin: 0xb98866, primary: 0x4a4a3c, secondary: 0x2e2a24, hair: 0x6a6660, height: 1.0, girth: 1.08, accessory: 'pack' },
    style: { id: 'fisher', build: 'man', cut: 'short', beard: 'full', age: 0.62, faceSeed: 12011 },
    x: MENDER.x,
    z: MENDER.z,
    // Mending with his back to the store, looking out over the yard rather than at its door (A69).
    yaw: bySpec('net_store').yaw,
    cycle: [['work', 9], ['idle', 4], ['work', 7]],
    sleeps: true,
    radius: 0.45,
  },
  {
    look: { skin: 0xc79a72, primary: 0x5a4a3a, secondary: 0x6a6a52, hair: 0x3a2a1a, height: 1.0, girth: 0.9, accessory: 'shawl' },
    style: { id: 'fireside', build: 'woman', cut: 'bun', beard: 'none', age: 0.45, faceSeed: 12107 },
    x: FIRE.x + 1.6,
    z: FIRE.z + 1,
    // The backless hearth bench is authored at yaw .4. Face across its narrow
    // axis toward the fire, with the hips above its center rather than behind it.
    yaw: 0.4 + Math.PI,
    cycle: [['sit', 12], ['talk', 4], ['sit', 8]],
    seated: true,
    sleeps: true,
    radius: 0.4,
  },
  {
    look: { skin: 0xb0805c, primary: 0x3e4048, secondary: 0x28262a, hair: 0x8a8880, height: 1.03, girth: 1.0, accessory: 'coat', accent: 0x6a5a3a },
    style: { id: 'keeper', build: 'man', cut: 'short', beard: 'full', age: 0.8, faceSeed: 12203 },
    x: DOOR.x + 2.6,
    z: DOOR.z - 1.2,
    // Beside his door, looking out the way his cottage faces rather than at its corner (A69).
    yaw: bySpec('keeper_cottage').yaw,
    cycle: [['idle', 14], ['talk', 3], ['idle', 9]],
    sleeps: false,
    radius: 0.45,
  },
];

/** Who the hamlet's people are (for the people lineup and the sheet export). */
export const AMBIENT_PEOPLE: readonly { look: Look; style: AmbientStyle }[] = SPECS.map((s) => ({ look: s.look, style: s.style }));

/** Where each of the hamlet's people stands, by their model's role: the residents near the entry point come first (stage 2). */
export const AMBIENT_PLACES: readonly { role: string; x: number; z: number }[] = SPECS.map((s) => ({ role: `ambient:${s.style.id}`, x: s.x, z: s.z }));

interface Resident { rig: Rig; spec: Spec; t: number; arrived: boolean }

function poseResident(p: Resident, dt: number, reducedMotion: boolean) {
  const total = p.spec.cycle.reduce((a, c) => a + c[1], 0);
  let u = p.t % total;
  let mode: Mode = p.spec.cycle[0]![0];
  for (const [m, d] of p.spec.cycle) {
    if (u < d) { mode = m; break; }
    u -= d;
  }
  poseRig(p.rig, {
    mode,
    seated: p.spec.seated,
    seatHeight: p.spec.seated ? BENCH_SEAT_HEIGHT : undefined,
    speed: 0,
    // A single actor clock preserves gesture phase through pauses and mode changes.
    time: p.t,
    t: u / 3,
    amp: reducedMotion ? 0.35 : 1,
    workGesture: p.spec.style.id === 'fisher' ? 'mending' : 'general',
    idle: reducedMotion ? undefined : { seed: p.spec.style.faceSeed, clock: p.t },
  }, dt);
}

export function buildAmbient(ctx: BuildContext): SceneModule & { counts: { people: number }; awaiting: AwaitingFigure[] } {
  const { terrain, colliders } = ctx;
  const group = new THREE.Group();
  group.name = 'ambient';
  const people: Resident[] = [];
  const awaiting: AwaitingFigure[] = [];
  SPECS.forEach((spec, i) => {
    const role = `ambient:${spec.style.id}`, height = spec.look.height * (spec.style.build === 'woman' ? 0.94 : 1);
    // A model still on its way leaves a stand-in with nothing to draw and no body to bump into (stage 2).
    const arrived = !ctx.npcAssets || ctx.npcAssets.has(role);
    const rig = !ctx.npcAssets ? createAmbientRig(spec.look, spec.style) : arrived ? ctx.npcAssets.create(role, height) : ctx.npcAssets.standIn(role, height);
    const ground = terrain.groundAt(spec.x, spec.z);
    rig.root.position.set(spec.x, ground, spec.z);
    rig.root.rotation.y = spec.yaw;
    group.add(rig.root);
    // Real finite bodies leave air above their heads clear for a raised camera.
    const seatedLowering = spec.seated ? 0.48 * rig.hipY / 0.95 : 0;
    colliders.circle(`ambient:${i}`, spec.x, spec.z, spec.radius, true,
      { minY: ground - 0.04, maxY: ground + rig.height - seatedLowering + 0.1 });
    if (!arrived) colliders.setActive(`ambient:${i}`, false, false);
    const p: Resident = { rig, spec, t: i * 5.3, arrived };
    // The first rendered frame already has its authored posture, without a bind-pose flash.
    poseResident(p, 1, ctx.settings?.reducedMotion ?? false);
    people.push(p);
    if (!arrived) awaiting.push({
      role,
      position: () => p.rig.root.position,
      adopt(catalog) {
        const next = catalog.create(role, height), old = p.rig;
        next.root.position.copy(old.root.position);
        next.root.rotation.copy(old.root.rotation);
        next.root.visible = old.root.visible;
        group.add(next.root);
        group.remove(old.root);
        p.rig = next;
        p.arrived = true;
        poseResident(p, 1, ctx.settings?.reducedMotion ?? false);
      },
    });
  });
  return {
    group,
    counts: { people: people.length },
    awaiting,
    update(dt: number, f: FrameContext) {
      if (f.wildlifeActive === false || !Number.isFinite(dt) || dt <= 0) return;
      // A resumed tab must not skip entire activities. Ordinary frame partitions
      // still consume the same elapsed time, with bounded steps through gesture transitions.
      const elapsed = Math.min(dt, 0.25);
      people.forEach((p, i) => {
        p.rig.root.visible = !(p.spec.sleeps && f.nightness > 0.75);
        // A person going to bed is no wall for routes: no navigation rebuild at dusk and dawn (A70).
        colliders.setActive(`ambient:${i}`, p.rig.root.visible && p.arrived, false);
        if (!p.rig.root.visible) { p.t += elapsed; return; }
        // The shadow camera culls actual rig bounds, never a separate distance cutoff.
        let remaining = elapsed;
        while (remaining > 1e-8) {
          const step = Math.min(remaining, 1 / 30);
          p.t += step;
          poseResident(p, step, f.reducedMotion);
          remaining -= step;
        }
      });
    },
    stats: () => ({ people: people.length }),
    dispose() {
      for (const p of people) p.rig.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
    },
  };
}
