import * as THREE from 'three';
import { ANCHORS } from '../world/layout';
import type { BuildContext, FrameContext, SceneModule } from './context';
import { createHumanoid, poseRig, setRigShadow, type Look, type Mode, type Rig } from './characters';

/**
 * People who live on the coast but are not part of the story: a fisherman mending a net, a woman by the fire, the lighthouse keeper.
 * They carry no state, say nothing and cannot be interacted with; they exist so the first place is inhabited (Ardea is a place with
 * people in it). They are drawn with the same rig as everyone else and hold a pose loop. Presentation only.
 */

interface Spec {
  look: Look;
  x: number;
  z: number;
  yaw: number;
  /** Poses to cycle through, with how many seconds each lasts. */
  cycle: [Mode, number][];
  /** Stays out after dark (asleep). */
  sleeps: boolean;
  /** Radius of the small collider that keeps the player from walking through them. */
  radius: number;
}

const FIRE = ANCHORS.strand_fire!;
const DOOR = ANCHORS.lantern_door!;

const SPECS: Spec[] = [
  { look: { skin: 0xb98866, primary: 0x4a4a3c, secondary: 0x2e2a24, hair: 0x6a6660, height: 1.0, girth: 1.08, accessory: 'pack' }, x: -230.4, z: 47.9, yaw: -2.24, cycle: [['work', 9], ['idle', 4], ['work', 7]], sleeps: true, radius: 0.45 },
  { look: { skin: 0xc79a72, primary: 0x5a4a3a, secondary: 0x6a6a52, hair: 0x3a2a1a, height: 0.94, girth: 0.9, accessory: 'shawl' }, x: FIRE.x + 1.6, z: FIRE.z + 1.5, yaw: -2.5, cycle: [['sit', 12], ['talk', 4], ['sit', 8]], sleeps: true, radius: 0.4 },
  { look: { skin: 0xb0805c, primary: 0x3e4048, secondary: 0x28262a, hair: 0x8a8880, height: 1.03, girth: 1.0, accessory: 'coat', accent: 0x6a5a3a }, x: DOOR.x + 2.6, z: DOOR.z - 1.2, yaw: -1.7, cycle: [['idle', 14], ['talk', 3], ['idle', 9]], sleeps: false, radius: 0.45 },
];

export function buildAmbient(ctx: BuildContext): SceneModule & { counts: { people: number } } {
  const { terrain, colliders } = ctx;
  const group = new THREE.Group();
  group.name = 'ambient';
  const people: { rig: Rig; spec: Spec; t: number }[] = [];
  SPECS.forEach((spec, i) => {
    const rig = createHumanoid(spec.look);
    rig.root.position.set(spec.x, terrain.heightAt(spec.x, spec.z), spec.z);
    rig.root.rotation.y = spec.yaw;
    group.add(rig.root);
    colliders.circle(`ambient:${i}`, spec.x, spec.z, spec.radius);
    people.push({ rig, spec, t: i * 5.3 });
  });
  const cam = new THREE.Vector3();
  return {
    group,
    counts: { people: people.length },
    update(dt: number, f: FrameContext) {
      f.camera.getWorldPosition(cam);
      people.forEach((p, i) => {
        p.t += dt;
        const total = p.spec.cycle.reduce((a, c) => a + c[1], 0);
        let u = p.t % total;
        let mode: Mode = p.spec.cycle[0]![0];
        for (const [m, d] of p.spec.cycle) {
          if (u < d) {
            mode = m;
            break;
          }
          u -= d;
        }
        p.rig.root.visible = !(p.spec.sleeps && f.nightness > 0.75);
        colliders.setActive(`ambient:${i}`, p.rig.root.visible);
        if (!p.rig.root.visible) return;
        const dx = p.rig.root.position.x - cam.x;
        const dz = p.rig.root.position.z - cam.z;
        setRigShadow(p.rig, dx * dx + dz * dz < 55 * 55);
        poseRig(p.rig, { mode, speed: 0, time: f.time + p.t * 0.13, t: u / 3, amp: f.reducedMotion ? 0.35 : 1, workGesture: i === 0 ? 'mending' : 'general' }, dt);
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
