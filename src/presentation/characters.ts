import * as THREE from 'three';
import type { Accessory, NpcDef } from '../content/npcs';
import { PAL } from './kit';

/**
 * Procedural low-poly people and creatures built from primitives. They are honest
 * placeholders: one shared humanoid rig, distinct silhouettes through costume and proportion.
 */

export type Mode =
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack_light'
  | 'attack_heavy'
  | 'block'
  | 'dodge'
  | 'hurt'
  | 'work'
  | 'sit'
  | 'talk'
  | 'dead'
  | 'telegraph'
  | 'strike';

export interface Pose {
  mode: Mode;
  /** 0..1 speed factor for locomotion. */
  speed: number;
  /** Continuous gait/idle clock. */
  time: number;
  /** 0..1 progress through a timed action (attack, hurt, dodge). */
  t: number;
  /** Extra amplitude multiplier; reduced motion lowers it. */
  amp: number;
}

export interface Rig {
  root: THREE.Group;
  /** Root of the visual body; lowered when sitting and rotated when defeated. */
  body: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  weapon: THREE.Object3D | null;
  shield: THREE.Object3D | null;
  sash: THREE.Mesh | null;
  height: number;
  cur: Record<string, number>;
  materials: THREE.MeshStandardMaterial[];
  hitFlash: number;
  kind: 'humanoid' | 'thornback';
}

const stdCache = new Map<number, THREE.MeshStandardMaterial>();
function mat(color: number, rough = 0.9): THREE.MeshStandardMaterial {
  const key = color * 10 + Math.round(rough * 9);
  let m = stdCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });
    stdCache.set(key, m);
  }
  return m;
}

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = true;
  return me;
}

export interface Look {
  skin: number;
  primary: number;
  secondary: number;
  hair: number;
  height: number;
  girth: number;
  accessory: Accessory | 'none';
  accent?: number;
}

const ANGLE_KEYS = ['legL', 'legR', 'armLx', 'armLz', 'armRx', 'armRz', 'torsoX', 'torsoZ', 'headX', 'headY', 'lower', 'bodyX', 'bodyY'] as const;

export function createHumanoid(look: Look, opts: { weapon?: boolean; shield?: boolean; cloak?: boolean; sash?: boolean } = {}): Rig {
  // Each rig owns its materials so a hit flash on one character never tints another.
  stdCache.clear();
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const H = look.height;
  const G = look.girth;
  body.scale.set(G, H, G);
  const skin = mat(look.skin, 0.8);
  const primary = mat(look.primary);
  const secondary = mat(look.secondary);
  const hair = mat(look.hair);
  const dark = mat(0x3a3a3a);
  const materials = [skin, primary, secondary, hair];

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  body.add(hips);
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.13, 0, 0);
    const upper = mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.5, 6), mat(look.secondary === look.primary ? 0x4a4a4a : darken(look.secondary, 0.85)), 0, -0.25, 0);
    const lower = mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.45, 6), mat(darken(look.secondary, 0.7)), 0, -0.7, 0);
    const foot = mesh(new THREE.BoxGeometry(0.12, 0.08, 0.24), dark, 0, -0.93, 0.05);
    leg.add(upper, lower, foot);
    hips.add(leg);
    legs.push(leg);
  }
  const torso = new THREE.Group();
  hips.add(torso);
  const chest = mesh(new THREE.BoxGeometry(0.44, 0.58, 0.26), primary, 0, 0.32, 0);
  const waist = mesh(new THREE.BoxGeometry(0.38, 0.14, 0.24), secondary, 0, 0.02, 0);
  torso.add(chest, waist);

  const head = new THREE.Group();
  head.position.y = 0.72;
  torso.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.15, 8, 6), skin, 0, 0.17, 0));
  head.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 6), skin, 0, 0.02, 0));
  const eyeM = mat(0x1a1a1a);
  for (const sx of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.035, 0.03, 0.02), eyeM, sx * 0.055, 0.19, 0.135));
  head.add(mesh(new THREE.SphereGeometry(0.16, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.19, -0.01));

  const arms: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.27, 0.55, 0);
    const upper = mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.32, 6), primary, 0, -0.16, 0);
    const lower = mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.3, 6), skin, 0, -0.44, 0);
    const hand = mesh(new THREE.SphereGeometry(0.055, 6, 5), skin, 0, -0.62, 0);
    arm.add(upper, lower, hand);
    torso.add(arm);
    arms.push(arm);
  }

  addAccessory(look, torso, hips, head, body);

  let weapon: THREE.Object3D | null = null;
  let shield: THREE.Object3D | null = null;
  if (opts.weapon) {
    const w = new THREE.Group();
    w.add(mesh(new THREE.BoxGeometry(0.05, 0.62, 0.02), mat(0xc8ccd0, 0.35), 0, 0.42, 0));
    w.add(mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), mat(0x6a5a3a), 0, 0.1, 0));
    w.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 5), mat(0x4a3a2a), 0, 0.03, 0));
    w.position.set(0, -0.62, 0.02);
    w.rotation.x = 2.55;
    arms[1]!.add(w);
    weapon = w;
  }
  if (opts.shield) {
    const s = new THREE.Group();
    const disc = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 10), mat(look.accent ?? PAL.templarBlue), 0, 0, 0);
    disc.rotation.x = Math.PI / 2;
    s.add(disc);
    const boss = mesh(new THREE.SphereGeometry(0.07, 6, 5), mat(0xc8c0a0, 0.4), 0, 0, 0.04);
    s.add(boss);
    s.position.set(-0.08, -0.4, 0.14);
    s.rotation.y = 0.25;
    arms[0]!.add(s);
    shield = s;
  }
  let sash: THREE.Mesh | null = null;
  if (opts.sash) {
    sash = mesh(new THREE.BoxGeometry(0.1, 0.72, 0.29), mat(0xffffff), 0.02, 0.32, 0);
    sash.rotation.z = -0.62;
    sash.visible = false;
    torso.add(sash);
  }
  if (opts.cloak) {
    const cloak = mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.95, 8, 1, true, Math.PI * 0.62, Math.PI * 0.76), mat(look.primary), 0, 0.02, -0.13);
    (cloak.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    cloak.rotation.y = Math.PI;
    torso.add(cloak);
  }

  const cur: Record<string, number> = {};
  for (const k of ANGLE_KEYS) cur[k] = 0;
  return {
    root,
    body,
    hips,
    torso,
    head,
    armL: arms[0]!,
    armR: arms[1]!,
    legL: legs[0]!,
    legR: legs[1]!,
    weapon,
    shield,
    sash,
    height: 1.8 * H,
    cur,
    materials,
    hitFlash: 0,
    kind: 'humanoid',
  };
}

function darken(c: number, f: number): number {
  const r = ((c >> 16) & 255) * f;
  const g = ((c >> 8) & 255) * f;
  const b = (c & 255) * f;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function addAccessory(look: Look, torso: THREE.Group, hips: THREE.Group, head: THREE.Group, body: THREE.Group) {
  const sec = mat(look.secondary);
  const pri = mat(look.primary);
  const accent = mat(look.accent ?? look.secondary);
  switch (look.accessory) {
    case 'shawl': {
      const s = mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.42, 8, 1, true), sec, 0, 0.42, 0);
      (s.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      torso.add(s);
      const skirt = mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.5, 8), pri, 0, -0.22, 0);
      hips.add(skirt);
      break;
    }
    case 'robe': {
      const robe = mesh(new THREE.CylinderGeometry(0.24, 0.4, 0.85, 8), pri, 0, -0.42, 0);
      hips.add(robe);
      const belt = mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.06, 8), accent, 0, 0.04, 0);
      hips.add(belt);
      const stole = mesh(new THREE.BoxGeometry(0.12, 0.9, 0.3), sec, 0, 0.1, 0);
      torso.add(stole);
      const hood = mesh(new THREE.CylinderGeometry(0.12, 0.26, 0.16, 8, 1, true), pri, 0, 0.62, -0.04);
      (hood.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      torso.add(hood);
      break;
    }
    case 'helmet': {
      const cap = mesh(new THREE.SphereGeometry(0.17, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0xc8a232, 0.6), 0, 0.2, 0);
      head.add(cap);
      head.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 10), mat(0xa88a2a), 0, 0.2, 0));
      torso.add(mesh(new THREE.BoxGeometry(0.5, 0.1, 0.3), mat(0x5a4632), 0, 0.05, 0));
      break;
    }
    case 'satchel': {
      const bag = mesh(new THREE.BoxGeometry(0.26, 0.24, 0.12), mat(0x6a4a2a), 0.24, -0.1, 0.05);
      hips.add(bag);
      const strap = mesh(new THREE.BoxGeometry(0.06, 0.66, 0.29), mat(0x5a3a22), 0, 0.3, 0);
      strap.rotation.z = 0.6;
      torso.add(strap);
      head.add(mesh(new THREE.SphereGeometry(0.165, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), sec, 0, 0.2, 0));
      break;
    }
    case 'apron': {
      const ap = mesh(new THREE.BoxGeometry(0.34, 0.6, 0.04), mat(0xe8e0c8), 0, -0.05, 0.14);
      hips.add(ap);
      break;
    }
    case 'hat': {
      head.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.025, 10), sec, 0, 0.27, 0));
      head.add(mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.13, 8), sec, 0, 0.33, 0));
      break;
    }
    case 'cloak': {
      const c = mesh(new THREE.CylinderGeometry(0.26, 0.4, 1.0, 8, 1, true), sec, 0, 0.1, -0.02);
      (c.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      torso.add(c);
      break;
    }
    case 'ledger': {
      const book = mesh(new THREE.BoxGeometry(0.22, 0.28, 0.05), mat(0x7a3a2a), 0.18, 0.0, 0.22);
      torso.add(book);
      torso.add(mesh(new THREE.BoxGeometry(0.46, 0.5, 0.1), sec, 0, 0.36, -0.1));
      break;
    }
    case 'coat': {
      const coat = mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.66, 8), pri, 0, -0.28, 0);
      hips.add(coat);
      torso.add(mesh(new THREE.BoxGeometry(0.5, 0.1, 0.3), accent, 0, 0.55, 0));
      break;
    }
    case 'hood': {
      const hood = mesh(new THREE.ConeGeometry(0.2, 0.32, 8), pri, 0, 0.26, -0.02);
      head.add(hood);
      const cape = mesh(new THREE.CylinderGeometry(0.28, 0.4, 0.9, 8, 1, true), pri, 0, 0.12, -0.02);
      (cape.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      torso.add(cape);
      break;
    }
    case 'pack': {
      torso.add(mesh(new THREE.BoxGeometry(0.34, 0.42, 0.18), mat(0x5a4a34), 0, 0.3, -0.22));
      head.add(mesh(new THREE.BoxGeometry(0.32, 0.08, 0.32), sec, 0, 0.3, 0));
      break;
    }
    default:
      break;
  }
  void body;
}

export function createNpcRig(def: NpcDef): Rig {
  return createHumanoid(def.look);
}

export function createPlayerRig(): Rig {
  return createHumanoid(
    { skin: 0xd2a07c, primary: 0x3d6a50, secondary: 0x7a6a50, hair: 0x3a2818, height: 1.0, girth: 1.0, accessory: 'none', accent: PAL.templarBlue },
    { weapon: true, shield: true, cloak: true, sash: true },
  );
}

export function createBanditRig(variant: number): Rig {
  const rig = createHumanoid(
    { skin: 0xb98866, primary: variant ? 0x4a3a34 : 0x3f4a3a, secondary: 0x2a2a2a, hair: 0x2a2018, height: 1.04 + variant * 0.05, girth: 1.08, accessory: 'hood' },
    { weapon: true },
  );
  if (rig.weapon) rig.weapon.scale.set(1.3, 1.0, 1.3);
  return rig;
}

export function createThornback(): Rig {
  stdCache.clear();
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hide = mat(0x6a5a48);
  const hide2 = mat(0x4f4536);
  const spine = mat(0xc9bb95, 0.6);
  const hips = new THREE.Group();
  hips.position.y = 0.8;
  body.add(hips);
  const torso = new THREE.Group();
  hips.add(torso);
  const trunk = mesh(new THREE.IcosahedronGeometry(0.75, 1), hide, 0, 0, 0);
  trunk.scale.set(1.05, 0.85, 1.6);
  torso.add(trunk);
  // Spines along the back, embedded in the hide so they read as attached.
  for (let i = 0; i < 7; i++) {
    const z = -0.9 + i * 0.3;
    const h = 0.32 + Math.sin(i * 0.9) * 0.16;
    const sp = mesh(new THREE.ConeGeometry(0.075, h, 5), spine, 0, 0.55 - Math.abs(z) * 0.12, z);
    sp.rotation.x = -0.25;
    torso.add(sp);
  }
  const head = new THREE.Group();
  head.position.set(0, 0.05, 1.15);
  torso.add(head);
  head.add(mesh(new THREE.IcosahedronGeometry(0.42, 1), hide2, 0, 0, 0.12));
  head.add(mesh(new THREE.ConeGeometry(0.2, 0.55, 6), hide2, 0, -0.08, 0.55));
  for (const sx of [-1, 1]) {
    const tusk = mesh(new THREE.ConeGeometry(0.06, 0.34, 5), spine, sx * 0.17, -0.2, 0.62);
    tusk.rotation.x = -1.0;
    head.add(tusk);
    head.add(mesh(new THREE.SphereGeometry(0.05, 5, 4), mat(0xd9b43a, 0.4), sx * 0.24, 0.12, 0.42));
  }
  const legs: THREE.Group[] = [];
  for (const [sx, sz] of [[-1, 0.7], [1, 0.7], [-1, -0.7], [1, -0.7]] as const) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.5, -0.1, sz);
    leg.add(mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.7, 6), hide2, 0, -0.35, 0));
    leg.add(mesh(new THREE.BoxGeometry(0.2, 0.08, 0.28), mat(0x2a2a2a), 0, -0.72, 0.05));
    hips.add(leg);
    legs.push(leg);
  }
  const cur: Record<string, number> = {};
  for (const k of ANGLE_KEYS) cur[k] = 0;
  return {
    root,
    body,
    hips,
    torso,
    head,
    armL: legs[0]!,
    armR: legs[1]!,
    legL: legs[2]!,
    legR: legs[3]!,
    weapon: null,
    shield: null,
    sash: null,
    height: 1.4,
    cur,
    materials: [hide, hide2],
    hitFlash: 0,
    kind: 'thornback',
  };
}

const lerpA = (cur: number, target: number, k: number) => cur + (target - cur) * k;
const TAU = Math.PI * 2;

/** Set pose targets from a mode and ease the rig toward them. dt is seconds. */
export function poseRig(rig: Rig, p: Pose, dt: number) {
  const a: Record<string, number> = {};
  for (const k of ANGLE_KEYS) a[k] = 0;
  const amp = p.amp;
  const sw = Math.sin(p.time * TAU);
  const breathe = Math.sin(p.time * 1.6) * 0.012;
  const speed = p.speed;
  let fast = 12;

  if (rig.kind === 'thornback') {
    poseCreature(rig, p, a);
  } else {
    switch (p.mode) {
      case 'idle':
        a.armLx = 0.05 + breathe * 3;
        a.armRx = 0.05 - breathe * 3;
        a.armLz = 0.1;
        a.armRz = -0.1;
        a.headY = Math.sin(p.time * 0.4) * 0.15 * amp;
        a.torsoX = breathe;
        break;
      case 'walk':
      case 'run': {
        const run = p.mode === 'run' ? 1 : 0;
        const swing = (0.55 + run * 0.35) * speed * amp;
        a.legL = sw * swing;
        a.legR = -sw * swing;
        a.armLx = -sw * swing * 0.8;
        a.armRx = sw * swing * 0.8;
        a.torsoX = 0.08 + run * 0.16;
        a.torsoZ = sw * 0.03 * amp;
        a.lower = -Math.abs(sw) * 0.04 * amp;
        fast = 14;
        break;
      }
      case 'attack_light': {
        // windup 0-0.35, strike 0.35-0.6, recovery
        const t = p.t;
        const wind = t < 0.35 ? t / 0.35 : 1;
        const strike = t >= 0.35 && t < 0.6 ? (t - 0.35) / 0.25 : t >= 0.6 ? 1 : 0;
        const recover = t >= 0.6 ? (t - 0.6) / 0.4 : 0;
        a.armRx = -2.4 * wind + 3.3 * strike - 0.9 * recover;
        a.armRz = -0.35;
        a.torsoX = 0.15 + 0.2 * strike - 0.12 * wind * (1 - strike);
        a.bodyY = -0.5 * wind * (1 - strike) + 0.7 * strike * (1 - recover);
        a.armLx = 0.5;
        a.legL = 0.4 * strike;
        a.legR = -0.3 * strike;
        fast = 26;
        break;
      }
      case 'attack_heavy': {
        const t = p.t;
        const wind = t < 0.5 ? t / 0.5 : 1;
        const strike = t >= 0.5 && t < 0.68 ? (t - 0.5) / 0.18 : t >= 0.68 ? 1 : 0;
        const recover = t >= 0.68 ? (t - 0.68) / 0.32 : 0;
        a.armRx = -3.0 * wind + 4.0 * strike - 0.9 * recover;
        a.armLx = -1.6 * wind + 1.4 * strike;
        a.torsoX = -0.25 * wind * (1 - strike) + 0.4 * strike * (1 - recover);
        a.lower = -0.1 * strike;
        a.legL = 0.5 * strike;
        a.legR = -0.4 * strike;
        fast = 24;
        break;
      }
      case 'block':
        a.armLx = -1.45;
        a.armLz = 0.25;
        a.armRx = -0.5;
        a.torsoX = 0.12;
        a.lower = -0.06;
        a.legL = 0.25;
        a.legR = -0.2;
        break;
      case 'dodge': {
        const t = p.t;
        a.torsoX = 0.7 * Math.sin(t * Math.PI);
        a.lower = -0.32 * Math.sin(t * Math.PI);
        a.legL = 0.8;
        a.legR = -0.6;
        a.armLx = -0.8;
        a.armRx = -0.8;
        a.headX = 0.3;
        fast = 26;
        break;
      }
      case 'hurt': {
        const t = p.t;
        a.torsoX = -0.4 * Math.sin(t * Math.PI);
        a.headX = -0.4 * Math.sin(t * Math.PI);
        a.armLx = -0.6;
        a.armRx = -0.6;
        fast = 26;
        break;
      }
      case 'telegraph': {
        // A visible wind-up so a hostile's attack can be read before it lands.
        const t = p.t;
        a.armRx = -2.7 * Math.min(1, t * 1.4);
        a.torsoX = -0.3 * Math.min(1, t * 1.4);
        a.bodyY = -0.4;
        fast = 14;
        break;
      }
      case 'strike': {
        const t = p.t;
        a.armRx = -2.7 + 4.4 * Math.min(1, t * 3);
        a.torsoX = 0.4 * Math.min(1, t * 3);
        a.legL = 0.5;
        a.legR = -0.4;
        fast = 26;
        break;
      }
      case 'work': {
        const s = Math.sin(p.time * 5.2);
        a.armRx = -1.2 - 1.3 * Math.max(0, s);
        a.armLx = -0.9;
        a.torsoX = 0.25 + 0.2 * (1 - Math.max(0, s));
        a.legL = 0.2;
        a.legR = -0.2;
        fast = 18;
        break;
      }
      case 'sit':
        a.legL = -1.55;
        a.legR = -1.55;
        a.armLx = -0.6;
        a.armRx = -0.5;
        a.lower = -0.48;
        a.torsoX = 0.05;
        break;
      case 'talk': {
        a.armRx = -0.9 + Math.sin(p.time * 2.2) * 0.35;
        a.armRz = -0.4;
        a.armLx = 0.1;
        a.headX = Math.sin(p.time * 1.7) * 0.1;
        a.headY = Math.sin(p.time * 0.9) * 0.18;
        break;
      }
      case 'dead':
        a.bodyX = -1.5;
        a.lower = -0.75;
        a.armLx = -0.3;
        a.armRx = -0.2;
        break;
    }
  }

  const k = 1 - Math.exp(-dt * fast);
  for (const key of ANGLE_KEYS) rig.cur[key] = lerpA(rig.cur[key]!, a[key]!, k);
  const c = rig.cur as Record<(typeof ANGLE_KEYS)[number], number>;
  if (rig.kind === 'humanoid') {
    rig.legL.rotation.x = c.legL;
    rig.legR.rotation.x = c.legR;
    rig.armL.rotation.set(c.armLx, 0, c.armLz);
    rig.armR.rotation.set(c.armRx, 0, c.armRz);
    rig.torso.rotation.set(c.torsoX, c.bodyY * 0.6, c.torsoZ);
    rig.head.rotation.set(c.headX, c.headY, 0);
    rig.hips.position.y = 0.95 + c.lower;
    rig.body.rotation.x = c.bodyX;
    rig.body.position.y = c.bodyX !== 0 ? 0.22 * Math.abs(c.bodyX) / 1.5 : 0;
  }
  // Hit flash tints materials briefly.
  if (rig.hitFlash > 0) {
    rig.hitFlash = Math.max(0, rig.hitFlash - dt * 4);
  }
  void breathe;
}

function poseCreature(rig: Rig, p: Pose, a: Record<string, number>) {
  const sw = Math.sin(p.time * TAU);
  const sp = p.speed;
  switch (p.mode) {
    case 'walk':
    case 'run':
      a.legL = sw * 0.7 * sp;
      a.legR = -sw * 0.7 * sp;
      a.armLx = -sw * 0.7 * sp;
      a.armRx = sw * 0.7 * sp;
      a.torsoX = 0.03 + (p.mode === 'run' ? 0.08 : 0);
      break;
    case 'telegraph':
      // Rears back and paws the ground before a charge.
      a.torsoX = -0.25 * Math.min(1, p.t * 1.6);
      a.headX = 0.4;
      a.armLx = -0.9 * Math.min(1, p.t * 1.6) * Math.sin(p.time * 14);
      a.lower = -0.12;
      break;
    case 'strike':
      a.torsoX = 0.3;
      a.headX = -0.5;
      a.legL = 0.9;
      a.legR = -0.9;
      a.armLx = -0.9;
      a.armRx = 0.9;
      break;
    case 'hurt':
      a.torsoX = -0.3 * Math.sin(p.t * Math.PI);
      a.headX = -0.4;
      break;
    case 'dead':
      a.bodyX = 0;
      a.lower = -0.5;
      a.torsoX = 0.2;
      break;
    default:
      a.headX = 0.2 + Math.sin(p.time * 1.1) * 0.08;
      a.torsoX = Math.sin(p.time * 1.6) * 0.015;
  }
  // The creature's rig writes onto its own joints directly.
  const c = rig.cur;
  const setLeg = (leg: THREE.Group, v: number) => {
    leg.rotation.x = v;
  };
  // Apply immediately (creature poses are coarse).
  const k = 0.35;
  for (const key of ANGLE_KEYS) c[key] = lerpA(c[key]!, a[key]!, k);
  setLeg(rig.armL, c.armLx!);
  setLeg(rig.armR, c.armRx!);
  setLeg(rig.legL, c.legL!);
  setLeg(rig.legR, c.legR!);
  rig.torso.rotation.x = c.torsoX!;
  rig.head.rotation.x = c.headX!;
  rig.hips.position.y = 0.8 + c.lower!;
}

/** Tint the rig briefly when hit (called every frame with the flash amount). */
export function applyFlash(rig: Rig, amount: number) {
  const e = amount > 0 ? 0.9 * amount : 0;
  for (const m of rig.materials) {
    m.emissive.setRGB(e, e * 0.3, e * 0.25);
  }
}

export function setSash(rig: Rig, color: number | null) {
  if (!rig.sash) return;
  rig.sash.visible = color !== null;
  if (color !== null) (rig.sash.material as THREE.MeshStandardMaterial).color.setHex(color);
}
