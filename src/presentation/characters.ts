import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Accessory, NpcDef } from '../content/npcs';
import { PAL } from './kit';
import { mulberry32 } from '../world/noise';
import { makeTexPair } from './buildingTextures';
import { beardGeometry, bootGeometry, drape, handGeometry, hairGeometry, headGeometry, hex, limb, loft, weather, type RGB, type Section } from './humanGeo';
import type { AssetNeed } from './assets/library';

/** Assets this module wants loaded before the world is built. */
export const NEEDS: AssetNeed[] = [];

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
  /** Joints that only humanoids have: knees and elbows bend as they move. */
  kneeL?: THREE.Group;
  kneeR?: THREE.Group;
  elbowL?: THREE.Group;
  elbowR?: THREE.Group;
  weapon: THREE.Object3D | null;
  shield: THREE.Object3D | null;
  sash: THREE.Mesh | null;
  height: number;
  cur: Record<string, number>;
  materials: THREE.MeshStandardMaterial[];
  hitFlash: number;
  kind: 'humanoid' | 'thornback';
  /** Whether the rig currently casts shadows (see setRigShadow). */
  shadowOn?: boolean;
}

/** Kept for API stability: rigs own their materials now, so there is nothing to clear. */
const stdCache = { clear() {} };

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

const ANGLE_KEYS = ['legL', 'legR', 'armLx', 'armLz', 'armRx', 'armRz', 'torsoX', 'torsoZ', 'headX', 'headY', 'lower', 'bodyX', 'bodyY', 'kneeL', 'kneeR', 'elbowL', 'elbowR'] as const;

/** A stable small integer from a look, so the same NPC always gets the same face, hair and build details. */
function lookSeed(look: Look): number {
  let h = 2166136261;
  for (const v of [look.skin, look.primary, look.secondary, look.hair, Math.round(look.height * 100), Math.round(look.girth * 100)]) {
    h = Math.imul(h ^ (v | 0), 16777619);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

let clothNormal: THREE.Texture | null = null;
function clothNormalMap(): THREE.Texture {
  if (!clothNormal) {
    const t = makeTexPair('cloth', 128, 4).normal.clone();
    t.repeat.set(5, 9);
    t.needsUpdate = true;
    clothNormal = t;
  }
  return clothNormal;
}

function vcMat(rough: number, o: { cloth?: boolean; metal?: number; side?: THREE.Side } = {}): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: o.metal ?? 0, side: o.side ?? THREE.FrontSide });
  if (o.cloth) {
    m.normalMap = clothNormalMap();
    m.normalScale.set(0.9, 0.9);
  }
  return m;
}

function put(geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0, shadow = true): THREE.Mesh {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = shadow;
  parent.add(me);
  return me;
}

/** Muted, worn colour from a hex: pulled toward grey-brown and darkened, so nobody wears a fresh dye. */
function worn(h: number, k = 0.8): RGB {
  const c = hex(h);
  const l = (c[0] + c[1] + c[2]) / 3;
  return [(c[0] * 0.72 + l * 0.28) * k, (c[1] * 0.72 + l * 0.28) * k * 0.98, (c[2] * 0.72 + l * 0.28) * k * 0.94];
}

export function createHumanoid(look: Look, opts: { weapon?: boolean; shield?: boolean; cloak?: boolean; sash?: boolean } = {}): Rig {
  // Each rig owns its materials so a hit flash on one character never tints another.
  stdCache.clear();
  const seed = lookSeed(look);
  const rnd = mulberry32(seed);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const H = look.height;
  const G = look.girth;
  body.scale.set(G, H, G);

  const skinM = vcMat(0.7);
  const clothM = vcMat(0.96, { cloth: true, side: THREE.DoubleSide });
  const leatherM = vcMat(0.72);
  const hairM = vcMat(0.8);
  const metalM = vcMat(0.45, { metal: 0.55 });
  const materials = [skinM, clothM, leatherM, hairM, metalM];

  const skin = worn(look.skin, 0.78);
  const pri = worn(look.primary, 0.78);
  const sec = worn(look.secondary, 0.72);
  const acc = worn(look.accent ?? look.secondary, 0.8);
  const leather = mix3(worn(0x5a4230, 0.7), sec, 0.15);
  const hairC = worn(look.hair, 0.85);
  const womanish = look.accessory === 'shawl' || look.accessory === 'apron';
  const beard = !womanish && (seed % 5 < 2 || look.accessory === 'helmet' || look.accessory === 'pack');
  const hairStyle: 'short' | 'long' | 'tied' | 'bald' = womanish ? (seed % 2 ? 'long' : 'tied') : seed % 9 === 0 ? 'bald' : seed % 3 === 0 ? 'tied' : 'short';
  const longSleeve = look.accessory !== 'apron' && look.accessory !== 'shawl';
  const trousers = mix3(sec, [0.1, 0.09, 0.08], 0.25);

  const hips = new THREE.Group();
  hips.position.y = 0.95;
  body.add(hips);

  // Legs: thigh and shin in trousers, boots. Each leg has a knee that bends.
  const legs: THREE.Group[] = [];
  const knees: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.115, 0, 0);
    const thigh = limb(0.098, 0.068, 0.47, { bulge: 0.1, at: 0.25, top: trousers, bottom: mul3(trousers, 0.92), seed: seed + sx, dirt: 0.12 });
    weather(thigh, seed + 3 * sx, 0.1, -0.47, 0);
    put(thigh, clothM, leg);
    const knee = new THREE.Group();
    knee.position.y = -0.46;
    const shin = limb(0.068, 0.054, 0.45, { bulge: 0.14, at: 0.2, top: mul3(trousers, 0.92), bottom: mul3(trousers, 0.78), seed: seed + 5 + sx, dirt: 0.3 });
    weather(shin, seed + 7 * sx, 0.3, -0.45, 0);
    put(shin, clothM, knee);
    put(bootGeometry(leather, seed + sx), leatherM, knee, 0, -0.31, 0.0);
    leg.add(knee);
    hips.add(leg);
    legs.push(leg);
    knees.push(knee);
  }

  const torso = new THREE.Group();
  hips.add(torso);
  // Tunic: a loft from below the hip to the collar, wide in the shoulders, flared at the hem.
  const hemY = look.accessory === 'coat' || look.accessory === 'robe' ? -0.3 : -0.2;
  const tunicSecs: Section[] = [
    { y: hemY, rx: 0.225, rz: 0.165, color: mul3(pri, 0.62) },
    { y: -0.05, rx: 0.195, rz: 0.145, color: mul3(pri, 0.8) },
    { y: 0.1, rx: 0.16, rz: 0.125, color: pri },
    { y: 0.26, rx: 0.19, rz: 0.15, color: pri },
    { y: 0.4, rx: 0.2, rz: 0.15, color: mul3(pri, 1.02) },
    { y: 0.5, rx: 0.205, rz: 0.13, color: mul3(pri, 1.04) },
    { y: 0.565, rx: 0.16, rz: 0.1, color: pri },
    { y: 0.62, rx: 0.09, rz: 0.075, color: pri },
    { y: 0.65, rx: 0.062, rz: 0.062, color: mul3(pri, 0.9) },
  ];
  const tunic = loft(tunicSecs, 14, { wobble: 0.025, seed, capBottom: false, capTop: false });
  weather(tunic, seed + 11, 0.32, hemY, 0.6);
  put(tunic, clothM, torso);
  // Belt and buckle.
  const belt = loft(
    [
      { y: 0.04, rx: 0.176, rz: 0.124, color: mul3(leather, 0.9) },
      { y: 0.105, rx: 0.176, rz: 0.124, color: leather },
    ],
    14,
    { seed, capTop: true, capBottom: true },
  );
  belt.deleteAttribute('uv');
  put(belt, leatherM, torso);
  put(flat(new THREE.BoxGeometry(0.035, 0.04, 0.012).translate(0.02, 0.07, 0.127), 0.4), metalM, torso);
  // Neck.
  const neck = loft(
    [
      { y: 0.6, rx: 0.052, rz: 0.05, color: mul3(skin, 0.95) },
      { y: 0.72, rx: 0.045, rz: 0.045, color: skin },
    ],
    8,
    { seed, capBottom: false, capTop: false },
  );
  neck.deleteAttribute('uv');
  put(neck, skinM, torso);

  // Head.
  const head = new THREE.Group();
  head.position.y = 0.72;
  torso.add(head);
  put(headGeometry(skin, { seed, beard, age: (seed % 7) / 7 }), skinM, head);
  const eyeM = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.3 });
  for (const sx of [-1, 1]) {
    const eye = put(new THREE.SphereGeometry(0.0115, 7, 5), eyeM, head, sx * 0.031, 0.152, 0.086, false);
    eye.scale.set(1.05, 0.75, 0.6);
    const ear = put(flatC(new THREE.SphereGeometry(0.02, 6, 5), mul3(skin, 0.92)), skinM, head, sx * 0.076, 0.11, -0.006);
    ear.scale.set(0.5, 1.3, 0.9);
  }
  const hair = hairGeometry(hairC, { seed, style: hairStyle });
  if (hair) put(hair, hairM, head);
  if (beard) put(beardGeometry(mul3(hairC, 0.9), seed + 2, seed % 4 === 0), hairM, head);

  // Arms: sleeve, elbow, forearm, hand. The elbow bends.
  const arms: THREE.Group[] = [];
  const elbows: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(sx * 0.2, 0.55, 0);
    put(limb(0.055, 0.043, 0.3, { bulge: 0.15, at: 0.3, top: pri, bottom: mul3(pri, 0.9), seed: seed + 9 + sx, dirt: 0.15 }), clothM, arm);
    put(flatC(new THREE.SphereGeometry(0.062, 8, 6).translate(0, 0.005, 0), pri), clothM, arm);
    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    const fore = longSleeve
      ? limb(0.043, 0.033, 0.27, { bulge: 0.08, at: 0.3, top: mul3(pri, 0.9), bottom: mul3(pri, 0.7), seed: seed + 13 + sx, dirt: 0.25 })
      : limb(0.042, 0.032, 0.27, { bulge: 0.08, at: 0.3, top: skin, bottom: mul3(skin, 0.93), seed: seed + 13 + sx, dirt: 0.05 });
    put(fore, longSleeve ? clothM : skinM, elbow);
    if (longSleeve) put(handGeometry(skin, seed + sx).translate(0, -0.27, 0), skinM, elbow);
    else put(handGeometry(skin, seed + sx).translate(0, -0.27, 0), skinM, elbow);
    // Wrist wrap.
    put(limb(0.036, 0.034, 0.03, { top: leather, bottom: leather, bulge: 0, seed }).translate(0, -0.24, 0), leatherM, elbow);
    arm.add(elbow);
    torso.add(arm);
    arms.push(arm);
    elbows.push(elbow);
  }

  addAccessory(look, torso, hips, head, { clothM, leatherM, metalM, skinM, pri, sec, acc, leather, seed, rnd });

  let weapon: THREE.Object3D | null = null;
  let shield: THREE.Object3D | null = null;
  if (opts.weapon) {
    const w = new THREE.Group();
    const steel: RGB = [0.5, 0.52, 0.55];
    // A well-used blade: dark, pitted, nicked along one edge; a plain guard; a leather-bound grip.
    const bladeGeo = loft(
      [
        { y: 0.1, rx: 0.026, rz: 0.006, color: mul3(steel, 0.8) },
        { y: 0.4, rx: 0.024, rz: 0.006, color: steel },
        { y: 0.68, rx: 0.02, rz: 0.005, color: mul3(steel, 1.1) },
        { y: 0.76, rx: 0.004, rz: 0.003, color: steel },
      ],
      4,
      { seed, capBottom: true, capTop: true },
    );
    bladeGeo.deleteAttribute('uv');
    put(bladeGeo, metalM, w);
    put(new THREE.BoxGeometry(0.19, 0.03, 0.04).translate(0, 0.09, 0), leatherM, w);
    put(limb(0.022, 0.02, 0.15, { top: leather, bottom: mul3(leather, 0.8), bulge: 0, seed }).translate(0, 0.08, 0), leatherM, w);
    put(new THREE.SphereGeometry(0.026, 6, 5).translate(0, -0.08, 0), metalM, w);
    for (const g of w.children) {
      const gg = (g as THREE.Mesh).geometry;
      if (!gg.attributes.color) gg.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(gg.attributes.position!.count * 3).fill(0.32), 3));
    }
    w.position.set(0, -0.29, 0.025);
    w.rotation.x = 2.5;
    elbows[1]!.add(w);
    weapon = w;
  }
  if (opts.shield) {
    const s = new THREE.Group();
    const wood: RGB = mix3(worn(look.accent ?? PAL.templarBlue, 0.6), [0.16, 0.12, 0.09], 0.35);
    const disc = flatC(new THREE.CylinderGeometry(0.3, 0.3, 0.045, 22).rotateX(Math.PI / 2), wood);
    const dpos = disc.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dpos.count; i++) dpos.setZ(i, dpos.getZ(i) + (Math.hypot(dpos.getX(i), dpos.getY(i)) < 0.1 ? 0.02 : 0));
    put(disc, leatherM, s);
    // Planks show as darker seams across the face.
    for (const dx of [-0.1, 0.1]) put(flatC(new THREE.BoxGeometry(0.012, 0.58, 0.02).translate(dx, 0, 0.026), mul3(wood, 0.55)), leatherM, s);
    const boss = put(new THREE.SphereGeometry(0.075, 8, 6), metalM, s, 0, 0, 0.045);
    flat(boss.geometry, 0.36);
    const rim = put(new THREE.TorusGeometry(0.295, 0.014, 5, 24), metalM, s, 0, 0, 0.01);
    flat(rim.geometry, 0.3);
    s.position.set(-0.08, -0.3, 0.12);
    s.rotation.y = 0.25;
    elbows[0]!.add(s);
    shield = s;
  }
  let sash: THREE.Mesh | null = null;
  if (opts.sash) {
    sash = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }));
    sash.position.set(0.02, 0.32, 0);
    sash.rotation.z = -0.62;
    sash.visible = false;
    torso.add(sash);
  }
  if (opts.cloak) {
    const cl = mul3(pri, 0.9);
    const cloak = cloakGeometry(cl, seed);
    put(cloak, clothM, torso);
  }

  mergeRigMeshes(root);
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
    kneeL: knees[0],
    kneeR: knees[1],
    elbowL: elbows[0],
    elbowR: elbows[1],
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

function flatC(g: THREE.BufferGeometry, c: RGB): THREE.BufferGeometry {
  const n = g.attributes.position!.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c[0];
    a[i * 3 + 1] = c[1];
    a[i * 3 + 2] = c[2];
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3));
  return g;
}

const mix3 = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul3 = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

/** A cloak from the shoulders down the back, open at the front, with a ragged hem and a weight of folds. */
function cloakGeometry(color: RGB, seed: number): THREE.BufferGeometry {
  const secs: Section[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    secs.push({ y: -0.6 + t * 1.22, rx: 0.2 + (1 - t) * 0.12, rz: 0.15 + (1 - t) * 0.13, cz: -0.02 - (1 - t) * 0.035, color: mul3(color, 0.6 + 0.4 * t) });
  }
  return loft(secs, 16, { wobble: 0.09, seed, capBottom: false, capTop: false, open: true, arc: [Math.PI * 0.86, Math.PI * 2.14] });
}

interface AccCtx {
  clothM: THREE.Material;
  leatherM: THREE.Material;
  metalM: THREE.Material;
  skinM: THREE.Material;
  pri: RGB;
  sec: RGB;
  acc: RGB;
  leather: RGB;
  seed: number;
  rnd: () => number;
}

const flat = (g: THREE.BufferGeometry, v: number) => flatC(g, [v, v, v]);

function addAccessory(look: Look, torso: THREE.Group, hips: THREE.Group, head: THREE.Group, c: AccCtx) {
  const { clothM, leatherM, metalM, pri, sec, acc, leather, seed } = c;
  switch (look.accessory) {
    case 'shawl': {
      const s = drape(
        [
          { y: 0.3, rx: 0.27, rz: 0.19, color: mul3(sec, 0.7) },
          { y: 0.46, rx: 0.26, rz: 0.17, color: sec },
          { y: 0.6, rx: 0.16, rz: 0.11, color: mul3(sec, 0.9) },
        ],
        16,
        seed + 1,
        0.08,
      );
      put(s, clothM, torso);
      put(drape([{ y: -0.66, rx: 0.32, rz: 0.24, color: mul3(pri, 0.55) }, { y: -0.3, rx: 0.24, rz: 0.19, color: mul3(pri, 0.75) }, { y: 0.0, rx: 0.19, rz: 0.14, color: pri }], 16, seed + 2, 0.1), clothM, hips);
      break;
    }
    case 'robe': {
      put(drape([{ y: -0.82, rx: 0.34, rz: 0.27, color: mul3(pri, 0.6) }, { y: -0.4, rx: 0.26, rz: 0.2, color: mul3(pri, 0.82) }, { y: 0.0, rx: 0.2, rz: 0.15, color: pri }], 18, seed + 1, 0.1), clothM, hips);
      put(loft([{ y: 0.03, rx: 0.196, rz: 0.147, color: acc }, { y: 0.08, rx: 0.196, rz: 0.147, color: acc }], 14, { seed }), leatherM, torso);
      put(flatC(new THREE.BoxGeometry(0.11, 1.0, 0.31).translate(0, 0.1, 0), mul3(sec, 0.9)), clothM, torso);
      put(drape([{ y: 0.5, rx: 0.19, rz: 0.15, color: mul3(pri, 0.85) }, { y: 0.62, rx: 0.13, rz: 0.11, color: pri }, { y: 0.74, rx: 0.09, rz: 0.09, color: mul3(pri, 0.8) }], 12, seed + 3, 0.05), clothM, torso);
      break;
    }
    case 'helmet': {
      const dome = loft(
        [
          { y: 0.16, rx: 0.098, rz: 0.108, cz: -0.004, color: [0.34, 0.33, 0.3] },
          { y: 0.21, rx: 0.088, rz: 0.098, cz: -0.004, color: [0.4, 0.39, 0.36] },
          { y: 0.265, rx: 0.05, rz: 0.06, cz: -0.004, color: [0.44, 0.43, 0.4] },
          { y: 0.29, rx: 0.008, rz: 0.01, cz: -0.004, color: [0.42, 0.4, 0.36] },
        ],
        12,
        { wobble: 0.02, seed, capBottom: false },
      );
      dome.deleteAttribute('uv');
      put(dome, metalM, head);
      put(flat(new THREE.BoxGeometry(0.016, 0.07, 0.012).translate(0, 0.16, 0.098), 0.4), metalM, head);
      put(loft([{ y: 0.06, rx: 0.27, rz: 0.17, color: mul3(leather, 0.8) }, { y: 0.12, rx: 0.25, rz: 0.16, color: leather }], 12, { seed }), leatherM, torso);
      break;
    }
    case 'satchel': {
      const bag = new THREE.BoxGeometry(0.24, 0.22, 0.1).translate(0.22, -0.1, 0.06);
      put(flat(bag, 0.24), leatherM, hips);
      const strap = loft([{ y: 0.03, rx: 0.045, rz: 0.008, cz: 0.132, color: leather }, { y: 0.62, rx: 0.045, rz: 0.008, cz: 0.12, color: leather }], 4, { seed });
      strap.deleteAttribute('uv');
      const sm = put(strap, leatherM, torso);
      sm.rotation.z = 0.6;
      put(drape([{ y: 0.15, rx: 0.1, rz: 0.11, cz: -0.004, color: sec }, { y: 0.21, rx: 0.088, rz: 0.098, cz: -0.004, color: mul3(sec, 0.9) }, { y: 0.265, rx: 0.05, rz: 0.06, cz: -0.004, color: mul3(sec, 0.85) }], 12, seed + 4, 0.02), clothM, head);
      break;
    }
    case 'apron': {
      const ap = drape([{ y: -0.45, rx: 0.16, rz: 0.11, cz: 0.13, color: [0.5, 0.46, 0.38] }, { y: -0.1, rx: 0.15, rz: 0.1, cz: 0.132, color: [0.58, 0.54, 0.44] }, { y: 0.3, rx: 0.12, rz: 0.09, cz: 0.14, color: [0.6, 0.56, 0.46] }], 12, seed + 5, 0.05);
      // Only the front half.
      const pa = ap.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pa.count; i++) if (pa.getZ(i) < 0.09) pa.setZ(i, 0.09);
      weather(ap, seed + 6, 0.35, -0.45, 0.3);
      put(ap, clothM, hips);
      break;
    }
    case 'hat': {
      const brim = loft([{ y: 0.235, rx: 0.2, rz: 0.2, color: mul3(sec, 0.8) }, { y: 0.245, rx: 0.19, rz: 0.19, color: sec }, { y: 0.252, rx: 0.1, rz: 0.1, color: mul3(sec, 0.9) }], 14, { wobble: 0.09, seed, capBottom: true, capTop: false });
      brim.deleteAttribute('uv');
      put(brim, leatherM, head);
      const crown = loft([{ y: 0.25, rx: 0.098, rz: 0.104, color: sec }, { y: 0.3, rx: 0.088, rz: 0.094, color: mul3(sec, 1.05) }, { y: 0.335, rx: 0.07, rz: 0.076, color: mul3(sec, 0.95) }], 12, { wobble: 0.04, seed, capBottom: false });
      crown.deleteAttribute('uv');
      put(crown, leatherM, head);
      break;
    }
    case 'cloak': {
      put(cloakGeometry(sec, seed + 3), clothM, torso);
      break;
    }
    case 'ledger': {
      put(flat(new THREE.BoxGeometry(0.2, 0.26, 0.05).translate(0.17, 0.02, 0.2), 0.16), leatherM, torso);
      put(cloakGeometry(mul3(sec, 0.9), seed + 7), clothM, torso);
      break;
    }
    case 'coat': {
      put(drape([{ y: -0.62, rx: 0.3, rz: 0.22, color: mul3(pri, 0.6) }, { y: -0.3, rx: 0.24, rz: 0.19, color: mul3(pri, 0.82) }, { y: 0.02, rx: 0.2, rz: 0.15, color: pri }], 16, seed + 1, 0.09), clothM, hips);
      put(drape([{ y: 0.5, rx: 0.235, rz: 0.13, color: acc }, { y: 0.62, rx: 0.15, rz: 0.1, color: mul3(acc, 0.9) }], 14, seed + 8, 0.02), clothM, torso);
      break;
    }
    case 'hood': {
      const hood = drape([{ y: 0.12, rx: 0.115, rz: 0.125, cz: -0.006, color: mul3(pri, 0.85) }, { y: 0.22, rx: 0.1, rz: 0.11, cz: -0.006, color: pri }, { y: 0.31, rx: 0.045, rz: 0.06, cz: -0.02, color: mul3(pri, 0.9) }], 14, seed + 2, 0.02);
      put(hood, clothM, head);
      put(cloakGeometry(pri, seed + 9), clothM, torso);
      break;
    }
    case 'pack': {
      put(flat(new THREE.BoxGeometry(0.3, 0.38, 0.16).translate(0, 0.28, -0.2), 0.2), leatherM, torso);
      put(flat(new THREE.CylinderGeometry(0.055, 0.055, 0.34, 8).rotateZ(Math.PI / 2).translate(0, 0.52, -0.22), 0.28), clothM, torso);
      put(drape([{ y: 0.15, rx: 0.1, rz: 0.11, cz: -0.004, color: sec }, { y: 0.23, rx: 0.09, rz: 0.1, cz: -0.004, color: mul3(sec, 0.92) }, { y: 0.28, rx: 0.06, rz: 0.07, cz: -0.004, color: mul3(sec, 0.85) }], 12, seed + 4, 0.02), clothM, head);
      break;
    }
    default:
      break;
  }
}


export function createNpcRig(def: NpcDef): Rig {
  return createHumanoid(def.look);
}

export function createPlayerRig(): Rig {
  return createHumanoid(
    { skin: 0xd2a07c, primary: 0x4d5a44, secondary: 0x6a5a44, hair: 0x3a2818, height: 1.0, girth: 1.0, accessory: 'none', accent: PAL.templarBlue },
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
  const seed = 4242;
  const rnd = mulberry32(seed);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hideM = vcMat(0.92, { cloth: false });
  const boneM = vcMat(0.6);
  const hideC: RGB = [0.13, 0.1, 0.075];
  const hide2C: RGB = [0.09, 0.075, 0.06];
  const boneC: RGB = [0.62, 0.55, 0.42];
  const hips = new THREE.Group();
  hips.position.y = 0.8;
  body.add(hips);
  const torso = new THREE.Group();
  hips.add(torso);
  // Trunk: a barrel lofted along its length, heavy at the shoulders, tapering to the haunch, lying along +z.
  const trunkSecs: Section[] = [];
  const len = 2.1;
  const steps = 9;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const rx = 0.58 * Math.sin(Math.PI * (0.12 + t * 0.78)) + 0.12;
    const rz = 0.5 * Math.sin(Math.PI * (0.1 + t * 0.8)) + 0.1;
    trunkSecs.push({ y: -len / 2 + t * len, rx: rx * (t > 0.6 ? 1.1 : 1), rz, color: mul3(hideC, 0.8 + 0.5 * rnd()) });
  }
  const trunk = loft(trunkSecs, 14, { wobble: 0.09, seed, capBottom: true, capTop: true });
  trunk.rotateX(Math.PI / 2);
  trunk.deleteAttribute('uv');
  put(trunk, hideM, torso);
  // Spines along the back, set into the hide and leaning back.
  for (let i = 0; i < 9; i++) {
    const z = -0.85 + i * 0.22;
    const h = 0.3 + Math.sin(i * 0.85) * 0.16 + rnd() * 0.06;
    const sp = flatC(new THREE.ConeGeometry(0.07, h, 5).translate(0, h / 2, 0), boneC);
    const m = put(sp, boneM, torso, (rnd() - 0.5) * 0.14, 0.42 - Math.abs(z) * 0.1, z);
    m.rotation.x = -0.35;
  }
  const head = new THREE.Group();
  head.position.set(0, 0.05, 1.15);
  torso.add(head);
  // Skull and snout: a lofted wedge, a heavy jaw, tusks and small yellow eyes.
  const snoutSecs: Section[] = [
    { y: -0.25, rx: 0.3, rz: 0.27, color: hide2C },
    { y: 0.0, rx: 0.28, rz: 0.26, color: hide2C },
    { y: 0.3, rx: 0.2, rz: 0.19, color: mul3(hide2C, 1.1) },
    { y: 0.55, rx: 0.12, rz: 0.11, color: mul3(hide2C, 1.2) },
    { y: 0.66, rx: 0.06, rz: 0.055, color: mul3(hide2C, 1.3) },
  ];
  const snout = loft(snoutSecs, 10, { wobble: 0.06, seed: seed + 1, capBottom: true, capTop: true });
  snout.rotateX(Math.PI / 2);
  snout.deleteAttribute('uv');
  put(snout, hideM, head, 0, -0.04, 0.2);
  for (const sx of [-1, 1]) {
    const tusk = put(flatC(new THREE.ConeGeometry(0.05, 0.36, 5).translate(0, 0.18, 0), boneC), boneM, head, sx * 0.16, -0.16, 0.66);
    tusk.rotation.x = -1.05;
    tusk.rotation.z = -sx * 0.25;
    const eye = put(flatC(new THREE.SphereGeometry(0.034, 6, 5), [0.8, 0.62, 0.12]), hideM, head, sx * 0.2, 0.1, 0.45);
    void eye;
  }
  // Legs: thick thighs tapering to splayed, clawed feet.
  const legs: THREE.Group[] = [];
  for (const [sx, sz] of [[-1, 0.72], [1, 0.72], [-1, -0.7], [1, -0.7]] as const) {
    const leg = new THREE.Group();
    leg.position.set(sx * 0.48, -0.1, sz);
    put(limb(0.17, 0.08, 0.72, { bulge: 0.25, at: 0.25, top: hideC, bottom: mul3(hideC, 0.7), seed: seed + Math.round(sx * 3 + sz * 5), dirt: 0.2 }), hideM, leg, 0, 0, 0);
    for (let k = -1; k <= 1; k++) {
      const claw = put(flatC(new THREE.ConeGeometry(0.03, 0.14, 4).translate(0, 0.07, 0), boneC), boneM, leg, k * 0.06, -0.72, 0.07);
      claw.rotation.x = 1.4;
    }
    put(flatC(new THREE.SphereGeometry(0.1, 7, 5).translate(0, -0.72, 0.04), mul3(hideC, 0.6)), hideM, leg);
    hips.add(leg);
    legs.push(leg);
  }
  const cur: Record<string, number> = {};
  for (const k of ANGLE_KEYS) cur[k] = 0;
  mergeRigMeshes(root);
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
    materials: [hideM, boneM],
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
  const cw = Math.cos(p.time * TAU);
  a.kneeL = 0.08;
  a.kneeR = 0.08;
  a.elbowL = -0.22;
  a.elbowR = -0.22;
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
        a.headX = 0.07;
        a.torsoX = 0.06 + breathe;
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
        a.kneeL = 0.12 + swing * 1.1 * Math.max(0, -cw);
        a.kneeR = 0.12 + swing * 1.1 * Math.max(0, cw);
        a.elbowL = -0.24 - swing * 0.9 * Math.max(0, sw);
        a.elbowR = -0.24 - swing * 0.9 * Math.max(0, -sw);
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
        a.elbowR = -1.3 * wind * (1 - strike) - 0.1;
        a.kneeL = 0.3 + 0.3 * wind;
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
        a.elbowR = -1.5 * wind * (1 - strike) - 0.1;
        a.elbowL = -1.0 * wind * (1 - strike) - 0.1;
        a.kneeL = 0.4 + 0.3 * wind;
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
        a.elbowL = -1.1;
        a.elbowR = -0.7;
        a.kneeL = 0.35;
        a.kneeR = 0.3;
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
        a.kneeL = 0.7;
        a.kneeR = 0.5;
        fast = 26;
        break;
      }
      case 'hurt': {
        const t = p.t;
        a.torsoX = -0.4 * Math.sin(t * Math.PI);
        a.headX = -0.4 * Math.sin(t * Math.PI);
        a.armLx = -0.6;
        a.armRx = -0.6;
        a.elbowL = -0.7;
        a.elbowR = -0.7;
        a.kneeL = 0.4;
        a.kneeR = 0.4;
        fast = 26;
        break;
      }
      case 'telegraph': {
        // A visible wind-up so a hostile's attack can be read before it lands.
        const t = p.t;
        a.armRx = -2.7 * Math.min(1, t * 1.4);
        a.elbowR = -1.3 * Math.min(1, t * 1.4);
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
        a.elbowR = -0.8 - 0.7 * Math.max(0, s);
        a.elbowL = -0.9;
        a.kneeL = 0.3;
        a.kneeR = 0.25;
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
        a.kneeL = 1.5;
        a.kneeR = 1.5;
        a.elbowL = -0.8;
        a.elbowR = -0.7;
        break;
      case 'talk': {
        a.armRx = -0.9 + Math.sin(p.time * 2.2) * 0.35;
        a.armRz = -0.4;
        a.elbowR = -0.9 - Math.sin(p.time * 2.2) * 0.3;
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
        a.kneeL = 0.7;
        a.kneeR = 0.4;
        a.elbowL = -0.5;
        a.elbowR = -0.3;
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
    if (rig.kneeL) rig.kneeL.rotation.x = c.kneeL;
    if (rig.kneeR) rig.kneeR.rotation.x = c.kneeR;
    if (rig.elbowL) rig.elbowL.rotation.x = c.elbowL;
    if (rig.elbowR) rig.elbowR.rotation.x = c.elbowR;
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

/** Give every geometry the same attribute set (position, normal, colour, uv), non-indexed, so parts can be merged. */
function uniformAttrs(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g.clone();
  const n = out.attributes.position!.count;
  if (!out.attributes.normal) out.computeVertexNormals();
  if (!out.attributes.color) out.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  if (!out.attributes.uv) out.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  for (const k of Object.keys(out.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color' && k !== 'uv') out.deleteAttribute(k);
  return out;
}

/** Merge the parts of each joint that share a material into one mesh: a person is a couple of dozen draws, not forty. */
export function mergeRigMeshes(root: THREE.Object3D) {
  const groups: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) groups.push(o);
  });
  for (const g of groups) {
    const byMat = new Map<THREE.Material, THREE.Mesh[]>();
    for (const c of g.children) {
      const m = c as THREE.Mesh;
      if (!m.isMesh || m.children.length) continue;
      const mat = m.material as THREE.Material;
      const arr = byMat.get(mat) ?? [];
      arr.push(m);
      byMat.set(mat, arr);
    }
    for (const [mat, meshes] of byMat) {
      if (meshes.length < 2) continue;
      const geos = meshes.map((m) => {
        m.updateMatrix();
        const gg = uniformAttrs(m.geometry);
        gg.applyMatrix4(m.matrix);
        return gg;
      });
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      for (const m of meshes) {
        g.remove(m);
        m.geometry.dispose();
      }
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      g.add(mesh);
    }
  }
}

/** Shadows only matter close up: far people stop casting so the shadow pass does not pay for them. */
export function setRigShadow(rig: Rig, cast: boolean) {
  if (rig.shadowOn === cast) return;
  rig.shadowOn = cast;
  rig.root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = cast;
  });
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
