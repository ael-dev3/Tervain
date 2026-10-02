import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Accessory, NpcDef } from '../content/npcs';
import { PAL } from './kit';
import { mulberry32 } from '../world/noise';
import { limb, loft as rigidLoft, type RGB, type Section } from './humanGeo';
import { npcStyle, type WorkGesture } from './npcStyle';
import type { AssetNeed } from './assets/library';
import { Frame } from './human/frame';
import { buildHead, type HairCut, type HeadFit } from './human/head';
import { makeFaceShape, type BeardStyle, type Build, type FaceShape } from './human/headShape';
import { dress, dressHead, sashBand, type Outfit } from './human/dress';
import type { PaintSpec } from './human/paint';
import { buildPersonMesh, placeholderSheet, sheetTexture, Wardrobe } from './human/person';
import { decodeSheetImage, overrideTexture, overrideUrl } from './human/overrides';
import type { SheetLayout } from './human/sheet';
import type { SheetJob, SheetResult } from './human/sheetJob';
import { personMaterial } from './human/sheetMaterial';
import { paintSheetJob, track } from './human/sheetPool';
import { banditOutfit, lookOutfit, npcOutfit, playerOutfit, linear } from './human/outfits';
import { BI, BONES, box, ellipsoid, loft, Mesher, mul3, rigid, tube, type BoneName, type V3 } from './human/skin';
import { poseHeroRig } from './hero/rig';
import type { HeroAnimationController } from './hero/animation';

/** Assets this module wants loaded before the world is built. */
export const NEEDS: AssetNeed[] = [];

/**
 * People and creatures. People are built the way Gothic 3 builds its actors (docs/art/gothic3-reference.md#people): one
 * skeleton per person, a skinned body dressed in layered clothes, a separate sculpted and painted head with eyes, lids,
 * ears, hair and beard, and props (a blade, a scabbard) hung on the bones. Everything is generated in code; nothing is
 * taken from Gothic 3. The Thornback is a rigid creature rig.
 *
 * Each person is one skinned mesh coloured by one texture sheet: a model sheet of the person seen from the front, the
 * sides and the back, with the head large below (human/sheet.ts). The sheet is painted in code; an image dropped into
 * src/assets/people/<id>.png replaces it (human/overrides.ts, docs/art/people-retexture.md).
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
  /** Imported hero locomotion uses controller travel, never clip root motion. */
  grounded?: boolean;
  travel?: number;
  moveSpeed?: number;
  /** Authored, restrained task motion; no gameplay state is inferred from the gesture. */
  workGesture?: WorkGesture;
  /**
   * A resident's idle routine while standing: who they are (seed) and a clock in seconds. Without it a person stands in
   * the plain idle (the player, hostiles). `force` holds one variant (the people tool).
   */
  idle?: { seed: number; clock: number; force?: IdleVariant };
}

/** What a resident does with themselves while standing, chosen in turn by their idle routine (presentation only). */
export const IDLE_VARIANTS = ['rest', 'arms crossed', 'hands on hips', 'hands behind back', 'look around', 'scratch head', 'shift weight'] as const;
export type IdleVariant = (typeof IDLE_VARIANTS)[number];

/** Seconds each idle turn lasts, and how often each variant comes up (rest most often). */
const IDLE_TURN = 7;
const IDLE_ODDS: readonly number[] = [4, 2, 2, 2, 2, 1, 2];

/** The variant a resident's routine is on at a time: deterministic for a seed, changing every turn. */
export function idleVariant(seed: number, clock: number): IdleVariant {
  const turn = Math.floor(clock / IDLE_TURN);
  let h = Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(turn, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = (h ^ (h >>> 13)) >>> 0;
  const total = IDLE_ODDS.reduce((a, b) => a + b, 0);
  let pick = (h % 1000) / 1000 * total;
  for (let i = 0; i < IDLE_ODDS.length; i++) {
    pick -= IDLE_ODDS[i]!;
    if (pick < 0) return IDLE_VARIANTS[i]!;
  }
  return 'rest';
}

/** What a person has in hand: nothing (fists) or a blade. */
export type Grip = 'none' | 'blade';

export interface Rig {
  /** The approved main hero has its own skeleton and distance-aware animation. */
  hero?: HeroAnimationController;
  root: THREE.Group;
  /** Root of the visual body; lowered when sitting and rotated when defeated. */
  body: THREE.Group;
  hips: THREE.Object3D;
  torso: THREE.Object3D;
  head: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  /** Joints that only humanoids have: knees and elbows bend as they move. */
  kneeL?: THREE.Object3D;
  kneeR?: THREE.Object3D;
  elbowL?: THREE.Object3D;
  elbowR?: THREE.Object3D;
  /** The weapon in hand (shown while drawn). */
  weapon: THREE.Object3D | null;
  /** Kept for API stability: nobody carries a shield now. */
  shield: THREE.Object3D | null;
  /** An empty scabbard on the hip, and the hilt that shows in it while the blade is sheathed. */
  scabbard: THREE.Object3D | null;
  sheathed: THREE.Object3D | null;
  grip: Grip;
  sash: THREE.Mesh | null;
  height: number;
  /** Bind height of the hip joint. */
  hipY: number;
  cur: Record<string, number>;
  materials: THREE.MeshStandardMaterial[];
  hitFlash: number;
  kind: 'humanoid' | 'thornback';
  /** Whether the rig currently casts shadows (see setRigShadow). */
  shadowOn?: boolean;
  /** A person's skinned mesh, its sheet and how the sheet was laid out (people only). */
  person?: PersonRigInfo;
}

export interface PersonRigInfo {
  /** The name a replacement sheet is filed under (src/assets/people/<id>.png). */
  id: string;
  mesh: THREE.SkinnedMesh;
  material: THREE.MeshStandardMaterial;
  /** The sheet in use: a placeholder until the painted sheet (or a replacement image) arrives. */
  sheet: THREE.Texture;
  /** Where the sheet came from. */
  source: 'pending' | 'painted' | 'override';
  parts: readonly PaintSpec[];
  /** Resolves once the sheet is applied and the person is shown. */
  ready: Promise<void>;
  /** The sheet's layout and timings once known; with `personBuildOptions.keepSheetData`, its pixels, projection and job. */
  sheetData: { layout?: SheetLayout; result?: SheetResult; job?: SheetJob; vertices: number; triangles: number };
  /** Heights (bind pose, metres) of the joints and features, for guide lines on the sheet's template. */
  guides: { body: { label: string; y: number }[]; head: { label: string; y: number }[] };
  /** What the person was built from (the export tool describes them from it). */
  spec: PersonSpec;
  /** Dress the person in a sheet image (a URL) laid out like theirs; used for replacement sheets and by the people tool. */
  applyImage: (url: string) => Promise<void>;
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

const ANGLE_KEYS = ['legL', 'legR', 'armLx', 'armLy', 'armLz', 'armRx', 'armRy', 'armRz', 'torsoX', 'torsoZ', 'headX', 'headY', 'lower', 'bodyX', 'bodyY', 'kneeL', 'kneeR', 'elbowL', 'elbowR'] as const;

/* ================================================================ people */

export interface PersonSpec {
  build: Build;
  height: number;
  girth: number;
  outfit: Outfit;
  hair: RGB;
  cut: HairCut;
  beard: BeardStyle;
  age: number;
  faceSeed: number;
  /** A week's growth on a beardless man's jaw (0..1). */
  stubble: number;
  weather: number;
  /** What the person carries. A 'blade' starts drawn in hand; 'sheathed' hangs at the hip. */
  weapon?: 'blade' | 'club' | 'sheathed';
  sash?: boolean;
  /** Who this is, for a replacement sheet (src/assets/people/<id>.png). */
  id: string;
  /** Sheet size in pixels (square). */
  sheetSize?: number;
}

export const personBuildOptions = {
  /** Keep each person's projection and painted pixels on the rig (the people tool and the sheet export need them). */
  keepSheetData: false,
  /** Default sheet size (square, pixels). */
  sheetSize: 1024,
  /** Ignore replacement images in src/assets/people (to compare with the painted sheets). */
  ignoreOverrides: false,
};

const IRISES: RGB[] = [
  [0.09, 0.05, 0.022],
  [0.13, 0.075, 0.03],
  [0.16, 0.12, 0.05],
  [0.1, 0.13, 0.15],
  [0.1, 0.12, 0.08],
  [0.06, 0.035, 0.018],
];

const PARENT: Record<BoneName, BoneName | null> = {
  hips: null,
  torso: 'hips',
  head: 'torso',
  armL: 'torso',
  elbowL: 'armL',
  armR: 'torso',
  elbowR: 'armR',
  legL: 'hips',
  kneeL: 'legL',
  legR: 'hips',
  kneeR: 'legR',
};

/** Where the joints and the features are (bind-pose heights), for the guide lines on a sheet's template. */
function personGuides(f: Frame, beltY: number, s: FaceShape, headY: number, headScale: number): PersonRigInfo['guides'] {
  const at = (unitY: number) => headY + (unitY * s.sy + s.cy) * headScale;
  return {
    body: [
      { label: 'ankle', y: f.hipY - f.thigh - f.shin },
      { label: 'knee', y: f.hipY - f.thigh },
      { label: 'hip', y: f.hipY },
      { label: 'belt', y: beltY },
      { label: 'shoulder', y: f.shoulderY },
      { label: 'chin', y: at(-1) },
      { label: 'eyes', y: at(s.eyeY) },
    ],
    head: [
      { label: 'chin', y: at(-1) },
      { label: 'mouth', y: at(s.mouthY) },
      { label: 'nose', y: at(s.noseBaseY) },
      { label: 'eyes', y: at(s.eyeY) },
      { label: 'brows', y: at(s.browY) },
      { label: 'hairline', y: at(s.hairFront) },
    ],
  };
}

/** Build one person: skeleton, skinned body, clothes, head, props. */
export function createPersonRig(p: PersonSpec): Rig {
  const frame = new Frame(p.build, p.height, p.girth);
  const wd = new Wardrobe();
  const fit = dress(frame, p.outfit, wd);
  const shape = makeFaceShape(p.faceSeed, p.build, p.age);
  const o = p.outfit;
  const covered = !!(o.hood || o.hat || o.helmet || o.scarf);
  const J = frame.joints();
  const headFit: HeadFit = buildHead(
    wd,
    { shape, skin: o.skin, hair: p.hair, iris: IRISES[p.faceSeed % IRISES.length]!, cut: p.cut, beard: p.beard, age: p.age, seed: p.faceSeed, covered },
    { origin: J.head, scale: frame.headScale, head: frame.weights('head'), hair: frame.weights('hair'), backZ: (y) => frame.backZ(y) - fit.outerGrow, shoulderY: frame.shoulderY },
  );
  dressHead(frame, o, wd, headFit, fit.outerGrow);

  // Skeleton.
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const bones = {} as Record<BoneName, THREE.Bone>;
  for (const name of BONES) {
    const b = new THREE.Bone();
    b.name = name;
    bones[name] = b;
  }
  for (const name of BONES) {
    const par = PARENT[name];
    const at = J[name];
    const pp: [number, number, number] = par ? J[par] : [0, 0, 0];
    bones[name].position.set(at[0] - pp[0], at[1] - pp[1], at[2] - pp[2]);
    (par ? bones[par] : body).add(bones[name]);
  }
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(BONES.map((n) => bones[n]));

  // One skinned mesh and one sheet for the whole person. The face is painted in the head's own (u, v) and projected
  // into the face panel with everything else.
  const keep = personBuildOptions.keepSheetData;
  const built = buildPersonMesh(wd, {
    size: p.sheetSize ?? personBuildOptions.sheetSize,
    joints: J,
    keep,
    face: {
      shape,
      n: 256,
      paint: {
        skin: o.skin,
        hair: p.hair,
        stubble: p.stubble,
        age: p.age,
        scalp: p.cut === 'bald' ? 'fringe' : 'full',
        beard: p.beard,
        fine: p.build === 'woman',
        weather: p.weather,
        seed: p.faceSeed,
      },
    },
  });
  const material = personMaterial(placeholderSheet());
  const materials: THREE.MeshStandardMaterial[] = [material];
  const sphere = new THREE.Sphere(new THREE.Vector3(0, 0.95 * frame.H, 0), 2.0 * frame.H);
  const addSkinned = (geo: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial) => {
    const mesh = new THREE.SkinnedMesh(geo, mat);
    body.add(mesh);
    mesh.bind(skeleton);
    mesh.boundingSphere = sphere.clone();
    mesh.castShadow = true;
    return mesh;
  };
  const personMesh = addSkinned(built.geometry, material);
  personMesh.name = 'person';
  // Hidden until its sheet arrives (the loading screen waits for every sheet; see sheetsSettled).
  personMesh.visible = false;
  const person: PersonRigInfo = {
    id: p.id,
    mesh: personMesh,
    material,
    sheet: material.map!,
    source: 'pending',
    parts: wd.parts,
    ready: Promise.resolve(),
    sheetData: { vertices: built.vertices, triangles: built.triangles, job: keep ? built.job : undefined },
    guides: personGuides(frame, fit.beltY, shape, J.head[1], frame.headScale),
    spec: p,
    applyImage: () => Promise.resolve(),
  };
  const show = (r: SheetResult, tex: THREE.Texture, source: 'painted' | 'override') => {
    built.apply(r);
    const old = material.map;
    material.map = tex;
    old?.dispose();
    person.sheet = tex;
    person.source = source;
    person.sheetData.layout = r.layout;
    if (keep) person.sheetData.result = r;
    personMesh.visible = true;
  };
  const paint = () => {
    const r = paintSheetJob(built.job);
    const done = (res: SheetResult) => show(res, sheetTexture(res.pixels!, res.layout.width, `sheet:${p.id}`), 'painted');
    if (r instanceof Promise) return r.then(done);
    done(r);
    return Promise.resolve();
  };
  person.applyImage = async (src: string) => {
    // A replacement image: project at its size (no painting) and fill its background gaps from the coverage.
    const { pixels, size } = await decodeSheetImage(src);
    const job = paintSheetJob({ ...built.job, size, skipPaint: true, keep: false });
    const r = job instanceof Promise ? await job : job;
    show(r, overrideTexture(pixels, r.covered, size, `sheet:${p.id}:override`), 'override');
  };
  const url = personBuildOptions.ignoreOverrides ? null : overrideUrl(p.id);
  if (url && typeof document !== 'undefined') {
    person.ready = track(
      person.applyImage(url).catch((err: unknown) => {
        console.warn(`replacement sheet for ${p.id} could not be used; painting it instead`, err);
        return paint();
      }),
    );
  } else {
    person.ready = paint();
  }

  // The sash of local standing, recoloured at runtime.
  let sash: THREE.Mesh | null = null;
  if (p.sash) {
    const sm = new Mesher();
    sashBand(frame, sm, fit.outerGrow);
    const geo = sm.geometry();
    if (geo) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
      materials.push(mat);
      sash = addSkinned(geo, mat);
      sash.visible = false;
    }
  }

  // Props on the bones: a blade or club in the right hand, a scabbard on the left hip.
  const metalM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.6 });
  const leatherM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const woodM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  materials.push(metalM, leatherM, woodM);
  const hs = frame.handScale * frame.H;
  const hand = new THREE.Object3D();
  hand.position.set(0.013 * hs, -frame.fore - 0.058 * hs, 0.012 * hs);
  hand.rotation.x = 1.9;
  bones.elbowR.add(hand);
  let weapon: THREE.Object3D | null = null;
  let scabbard: THREE.Object3D | null = null;
  let sheathed: THREE.Object3D | null = null;
  if (p.weapon === 'club') {
    weapon = clubModel(woodM, leatherM, metalM);
    hand.add(weapon);
  } else if (p.weapon) {
    const blade = swordModel(metalM, leatherM, true);
    hand.add(blade);
    weapon = blade;
    const sc = scabbardModel(leatherM, metalM);
    const t = frame.trunk(fit.beltY);
    sc.position.set(t.w + fit.outerGrow + 0.022, fit.beltY - 0.02 * frame.H - frame.hipY, 0.035);
    sc.rotation.set(0.52, 0, 0.12);
    bones.hips.add(sc);
    scabbard = sc;
    const hilt = swordModel(metalM, leatherM, false);
    hilt.rotation.x = Math.PI;
    hilt.position.y = 0.0;
    sc.add(hilt);
    sheathed = hilt;
  }
  for (const holder of [hand, scabbard]) if (holder) holder.traverse((c) => ((c as THREE.Mesh).isMesh ? ((c as THREE.Mesh).castShadow = true) : null));

  const cur: Record<string, number> = {};
  for (const k of ANGLE_KEYS) cur[k] = 0;
  const rig: Rig = {
    root,
    body,
    hips: bones.hips,
    torso: bones.torso,
    head: bones.head,
    armL: bones.armL,
    armR: bones.armR,
    legL: bones.legL,
    legR: bones.legR,
    kneeL: bones.kneeL,
    kneeR: bones.kneeR,
    elbowL: bones.elbowL,
    elbowR: bones.elbowR,
    weapon,
    shield: null,
    scabbard,
    sheathed,
    grip: 'none',
    sash,
    height: 1.8 * frame.H,
    hipY: frame.hipY,
    cur,
    materials,
    hitFlash: 0,
    kind: 'humanoid',
    person,
  };
  setArmed(rig, p.weapon === 'sheathed' ? 'sheathed' : p.weapon ? 'drawn' : 'none');
  return rig;
}

/** Show the blade in hand, in its scabbard, or not at all (no scabbard either). */
export function setArmed(rig: Rig, state: 'none' | 'sheathed' | 'drawn') {
  if (rig.weapon) rig.weapon.visible = state === 'drawn';
  if (rig.scabbard) rig.scabbard.visible = state !== 'none';
  if (rig.sheathed) rig.sheathed.visible = state === 'sheathed';
  rig.grip = state === 'drawn' && rig.weapon ? 'blade' : 'none';
}

/* ---------------------------------------------------------------- weapons */

/** A plain arming sword, pitted and rust-flecked: blade up +y from the grip at the origin. `blade` false gives the hilt alone. */
function swordModel(metalM: THREE.Material, leatherM: THREE.Material, blade: boolean): THREE.Group {
  const g = new THREE.Group();
  const metal = new Mesher();
  const leather = new Mesher();
  const w = rigid('hips');
  const steel: RGB = [0.34, 0.34, 0.35];
  const rust: RGB = [0.22, 0.12, 0.06];
  if (blade) {
    const rnd = mulberry32(31);
    const rings = [];
    const n = 12;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const y = 0.085 + k * 0.76;
      const hw = k < 0.86 ? 0.022 - 0.008 * k : 0.0152 * (1 - (k - 0.86) / 0.14) + 0.0008;
      const pit = rnd();
      rings.push({ y, w: hw, f: 0.0042 * (1 - 0.5 * k), b: 0.0042 * (1 - 0.5 * k), p: 1.3, c: pit < 0.4 ? rust : pit < 0.7 ? mul3(steel, 0.8) : steel });
    }
    loft(metal, rings, { sides: 8, wf: w, capBottom: true, capTop: true, shade: (th, _y, c) => (Math.abs(Math.sin(th)) > 0.9 ? mul3(c, 1.25) : c) });
  }
  // Guard, grip wrapped in leather, pommel.
  box(metal, [0, 0.074, 0], [0.095, 0.011, 0.014], [0.24, 0.23, 0.22], w);
  ellipsoid(metal, [0.098, 0.074, 0], [0.013, 0.013, 0.013], [0.26, 0.25, 0.24], w, { ws: 6, hs: 4 });
  ellipsoid(metal, [-0.098, 0.074, 0], [0.013, 0.013, 0.013], [0.26, 0.25, 0.24], w, { ws: 6, hs: 4 });
  const grip = [];
  for (let i = 0; i <= 6; i++) grip.push({ y: -0.058 + i * 0.019, w: 0.0145, f: 0.0125, b: 0.0125, p: 2, c: (i % 2 ? [0.12, 0.08, 0.05] : [0.16, 0.11, 0.07]) as RGB });
  loft(leather, grip, { sides: 8, wf: w });
  ellipsoid(metal, [0, -0.075, 0], [0.021, 0.019, 0.021], [0.28, 0.27, 0.25], w, { ws: 8, hs: 6 });
  for (const [m, mat] of [
    [metal, metalM],
    [leather, leatherM],
  ] as const) {
    const geo = m.geometry();
    if (geo) g.add(new THREE.Mesh(geo, mat));
  }
  return g;
}

/** A knotted club with a few nails in its head (the Gothic games' crudest weapon). */
function clubModel(woodM: THREE.Material, leatherM: THREE.Material, metalM: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const wood = new Mesher();
  const leather = new Mesher();
  const metal = new Mesher();
  const w = rigid('hips');
  const pts: V3[] = [];
  const radii: number[] = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    pts.push([Math.sin(k * 3) * 0.008, -0.09 + k * 0.82, Math.cos(k * 2.4) * 0.006]);
    radii.push(0.018 + 0.03 * k * k);
  }
  tube(wood, pts, radii, pts.map((_, i) => mul3([0.22, 0.15, 0.09], 0.8 + 0.2 * Math.sin(i * 1.7))), { sides: 9, wf: w, capStart: true, capEnd: true, up: [0, 0, 1] });
  for (const [y, a] of [
    [0.45, 0.4],
    [0.58, 2.2],
    [0.66, 4.1],
  ] as const) ellipsoid(wood, [Math.cos(a) * 0.035, y, Math.sin(a) * 0.035], [0.018, 0.022, 0.018], [0.18, 0.12, 0.07], w, { ws: 6, hs: 4 });
  for (let i = 0; i < 7; i++) {
    const a = i * 2.39;
    const y = 0.55 + (i % 3) * 0.06;
    const r = 0.018 + 0.03 * ((y + 0.09) / 0.82) ** 2;
    box(metal, [Math.cos(a) * (r + 0.008), y, Math.sin(a) * (r + 0.008)], [0.006, 0.003, 0.003], [0.2, 0.18, 0.16], w, [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]]);
  }
  const grip = [];
  for (let i = 0; i <= 5; i++) grip.push({ y: -0.07 + i * 0.026, w: 0.021, f: 0.021, b: 0.021, p: 2, c: (i % 2 ? [0.12, 0.08, 0.05] : [0.15, 0.1, 0.06]) as RGB });
  loft(leather, grip, { sides: 8, wf: w });
  for (const [m, mat] of [
    [wood, woodM],
    [leather, leatherM],
    [metal, metalM],
  ] as const) {
    const geo = m.geometry();
    if (geo) g.add(new THREE.Mesh(geo, mat));
  }
  return g;
}

/** A leather scabbard with an iron locket and chape; its mouth at the origin, hanging down -y. */
function scabbardModel(leatherM: THREE.Material, metalM: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const leather = new Mesher();
  const metal = new Mesher();
  const w = rigid('hips');
  const rings = [];
  for (let i = 0; i <= 8; i++) {
    const k = i / 8;
    rings.push({ y: -0.78 + k * 0.78, w: 0.021 + 0.011 * k, f: 0.009 + 0.003 * k, b: 0.009 + 0.003 * k, p: 1.8, c: mul3([0.16, 0.11, 0.07], 0.85 + 0.15 * k) as RGB });
  }
  loft(leather, rings, { sides: 10, wf: w, capBottom: true });
  loft(metal, [0, 1].map((i) => ({ y: -0.05 + i * 0.045, w: 0.035, f: 0.015, b: 0.015, p: 1.8, c: [0.22, 0.21, 0.2] as RGB })), { sides: 10, wf: w, lipTop: 0.002 });
  loft(metal, [0, 1].map((i) => ({ y: -0.8 + i * 0.07, w: 0.023, f: 0.011, b: 0.011, p: 1.8, c: [0.2, 0.19, 0.18] as RGB })), { sides: 10, wf: w, capBottom: true });
  // The frog: a loop of strap up to the belt.
  box(leather, [0, 0.03, 0], [0.018, 0.035, 0.016], [0.12, 0.08, 0.05], w);
  for (const [m, mat] of [
    [leather, leatherM],
    [metal, metalM],
  ] as const) {
    const geo = m.geometry();
    if (geo) g.add(new THREE.Mesh(geo, mat));
  }
  return g;
}

/* ---------------------------------------------------------------- who is who */

export function createNpcRig(def: NpcDef): Rig {
  const st = npcStyle(def.id);
  return createPersonRig({
    build: st.build,
    height: def.look.height,
    girth: def.look.girth,
    outfit: npcOutfit(def.id, def.look, st.faceSeed),
    hair: linear(def.look.hair),
    cut: st.hair,
    beard: st.beard,
    age: st.age,
    faceSeed: st.faceSeed,
    stubble: st.build === 'man' && st.beard === 'none' ? 0.5 : st.build === 'man' ? 0.3 : 0,
    weather: def.faction === 'marcher' || def.faction === 'traveler' ? 0.8 : 0.45,
    weapon: def.id === 'shrine_warden' ? 'sheathed' : undefined,
    id: def.id,
  });
}

/** The wanderer's look (a proposal): a Gothic hero's plain start, unarmed. */
export const PLAYER_LOOK: Look = { skin: 0xd2a07c, primary: 0x4d5a44, secondary: 0x6a5a44, hair: 0x3a2818, height: 1.0, girth: 1.0, accessory: 'none', accent: PAL.templarBlue };

export function createPlayerRig(): Rig {
  const rig = createPersonRig({
    build: 'man',
    height: PLAYER_LOOK.height,
    girth: PLAYER_LOOK.girth,
    outfit: playerOutfit(PLAYER_LOOK),
    hair: linear(PLAYER_LOOK.hair),
    cut: 'short',
    beard: 'short',
    age: 0.3,
    faceSeed: 4127,
    stubble: 0.5,
    weather: 0.6,
    // The blade exists on the rig but stays hidden until the wanderer finds one (see setArmed).
    weapon: 'sheathed',
    sash: true,
    id: 'player',
  });
  setArmed(rig, 'none');
  return rig;
}

export function createBanditRig(variant: number): Rig {
  const look: Look = { skin: 0xb98866, primary: variant ? 0x4a3a34 : 0x3f4a3a, secondary: 0x2a2a2a, hair: 0x2a2018, height: 1.04 + variant * 0.05, girth: 1.08, accessory: 'hood' };
  return createPersonRig({
    build: 'man',
    height: look.height,
    girth: look.girth,
    outfit: banditOutfit(look, variant),
    hair: linear(look.hair),
    cut: 'short',
    beard: variant ? 'full' : 'short',
    age: 0.35 + variant * 0.2,
    faceSeed: 6007 + variant * 131,
    stubble: 0.8,
    weather: 0.9,
    weapon: variant ? 'club' : 'blade',
    id: variant ? 'bandit_b' : 'bandit_a',
  });
}

export interface AmbientStyle {
  /** Who this is, for a replacement sheet. */
  id: string;
  build: Build;
  cut: HairCut;
  beard: BeardStyle;
  age: number;
  faceSeed: number;
}

/** People who live on the coast but are not part of the story, dressed from their look's accessory. */
export function createAmbientRig(look: Look, style: AmbientStyle): Rig {
  return createPersonRig({
    build: style.build,
    height: look.height,
    girth: look.girth,
    outfit: lookOutfit(look, style.faceSeed, style.build === 'woman'),
    hair: linear(look.hair),
    cut: style.cut,
    beard: style.beard,
    age: style.age,
    faceSeed: style.faceSeed,
    stubble: style.build === 'man' ? 0.5 : 0,
    weather: 0.8,
    id: style.id,
  });
}

/* ================================================================ the Thornback */

function vcMat(rough: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0 });
}

function put(geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Mesh {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = true;
  parent.add(me);
  return me;
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

export function createThornback(): Rig {
  const seed = 4242;
  const rnd = mulberry32(seed);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const hideM = vcMat(0.92);
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
  const trunk = rigidLoft(trunkSecs, 14, { wobble: 0.09, seed, capBottom: true, capTop: true });
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
  const snout = rigidLoft(snoutSecs, 10, { wobble: 0.06, seed: seed + 1, capBottom: true, capTop: true });
  snout.rotateX(Math.PI / 2);
  snout.deleteAttribute('uv');
  put(snout, hideM, head, 0, -0.04, 0.2);
  for (const sx of [-1, 1]) {
    const tusk = put(flatC(new THREE.ConeGeometry(0.05, 0.36, 5).translate(0, 0.18, 0), boneC), boneM, head, sx * 0.16, -0.16, 0.66);
    tusk.rotation.x = -1.05;
    tusk.rotation.z = -sx * 0.25;
    put(flatC(new THREE.SphereGeometry(0.034, 6, 5), [0.8, 0.62, 0.12]), hideM, head, sx * 0.2, 0.1, 0.45);
  }
  // Legs: thick thighs tapering to splayed, clawed feet.
  const legs: THREE.Group[] = [];
  for (const [sx, sz] of [
    [-1, 0.72],
    [1, 0.72],
    [-1, -0.7],
    [1, -0.7],
  ] as const) {
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
    scabbard: null,
    sheathed: null,
    grip: 'none',
    sash: null,
    height: 1.4,
    hipY: 0.8,
    cur,
    materials: [hideM, boneM],
    hitFlash: 0,
    kind: 'thornback',
  };
}

/* ================================================================ posing */

const lerpA = (cur: number, target: number, k: number) => cur + (target - cur) * k;
const TAU = Math.PI * 2;

/**
 * Set pose targets from a mode and ease the rig toward them. dt is seconds. The right arm (-x) holds the weapon; the
 * attack and guard poses depend on whether it holds a blade or fights with fists.
 */
export function poseRig(rig: Rig, p: Pose, dt: number) {
  if (poseHeroRig(rig, p, dt)) return;
  const a: Record<string, number> = {};
  for (const k of ANGLE_KEYS) a[k] = 0;
  const amp = p.amp;
  const sw = Math.sin(p.time * TAU);
  const cw = Math.cos(p.time * TAU);
  const blade = rig.grip === 'blade';
  a.kneeL = 0.06;
  a.kneeR = 0.06;
  a.elbowL = -0.18;
  a.elbowR = -0.18;
  const breathe = Math.sin(p.time * 1.6) * 0.012;
  const speed = p.speed;
  let fast = 12;

  if (rig.kind === 'thornback') {
    poseCreature(rig, p, a);
  } else {
    switch (p.mode) {
      case 'idle': {
        // Arms hang a little away from the body (+z lifts the left arm outward, -z the right).
        a.armLx = 0.04 + breathe * 3;
        a.armRx = 0.04 - breathe * 3;
        a.armLz = 0.11;
        a.armRz = -0.11;
        a.headY = Math.sin(p.time * 0.4) * 0.15 * amp;
        a.headX = 0.05;
        a.torsoX = 0.04 + breathe;
        if (blade) {
          // Blade held low and forward, ready.
          a.armRx = -0.28;
          a.armRz = 0.12;
          a.elbowR = -0.55;
        } else if (p.idle) {
          // A resident's routine: something to do with themselves while they stand, as the Gothic games' people fold
          // their arms, look about or scratch their heads (proposal; presentation only).
          const c = p.idle.clock;
          const v = p.idle.force ?? idleVariant(p.idle.seed, c);
          idlePose(a, v, c, amp);
          fast = 3.2;
        }
        break;
      }
      case 'walk':
      case 'run': {
        const run = p.mode === 'run' ? 1 : 0;
        const swing = (0.55 + run * 0.35) * speed * amp;
        a.legL = sw * swing;
        a.legR = -sw * swing;
        a.armLx = -sw * swing * 0.8;
        a.armRx = sw * swing * 0.8;
        a.armLz = 0.1;
        a.armRz = -0.1;
        a.torsoX = 0.06 + run * 0.14;
        a.torsoZ = sw * 0.03 * amp;
        a.lower = -Math.abs(sw) * 0.035 * amp;
        a.kneeL = 0.1 + swing * 1.1 * Math.max(0, -cw);
        a.kneeR = 0.1 + swing * 1.1 * Math.max(0, cw);
        a.elbowL = -0.24 - swing * 0.9 * Math.max(0, sw);
        a.elbowR = -0.24 - swing * 0.9 * Math.max(0, -sw);
        if (blade) {
          a.armRx = -0.25 + sw * swing * 0.3;
          a.armRz = 0.12;
          a.elbowR = -0.6;
        }
        fast = 14;
        break;
      }
      case 'attack_light': {
        // wind-up 0-0.35, strike 0.35-0.6, recovery
        const t = p.t;
        const wind = t < 0.35 ? t / 0.35 : 1;
        const strike = t >= 0.35 && t < 0.6 ? (t - 0.35) / 0.25 : t >= 0.6 ? 1 : 0;
        const recover = t >= 0.6 ? (t - 0.6) / 0.4 : 0;
        if (blade) {
          // A forehand cut: up and back over the right shoulder, down across the body.
          a.armRx = -2.4 * wind + 3.2 * strike - 0.8 * recover;
          a.armRz = -0.3 * wind * (1 - strike) + 0.45 * strike * (1 - recover);
          a.torsoX = 0.12 + 0.2 * strike - 0.1 * wind * (1 - strike);
          a.bodyY = -0.5 * wind * (1 - strike) + 0.65 * strike * (1 - recover);
          a.armLx = 0.35;
          a.elbowR = -1.2 * wind * (1 - strike) - 0.1;
        } else {
          // A jab: the fist drawn to the chin, driven straight out, pulled back.
          const out = strike * (1 - recover);
          a.armRx = 0.15 * wind * (1 - strike) - 1.45 * out;
          a.armRz = 0.12 * out;
          a.elbowR = -2.1 * (1 - out) * Math.min(1, wind * 2) - 0.12;
          a.armLx = -0.85;
          a.armLz = -0.2;
          a.elbowL = -1.9;
          a.torsoX = 0.1 + 0.12 * out;
          a.bodyY = -0.3 * wind * (1 - strike) + 0.42 * out;
        }
        a.legL = 0.35 * strike * (1 - recover * 0.5);
        a.legR = -0.25 * strike * (1 - recover * 0.5);
        a.kneeL = 0.3 + 0.3 * wind;
        fast = 26;
        break;
      }
      case 'attack_heavy': {
        const t = p.t;
        const wind = t < 0.5 ? t / 0.5 : 1;
        const strike = t >= 0.5 && t < 0.68 ? (t - 0.5) / 0.18 : t >= 0.68 ? 1 : 0;
        const recover = t >= 0.68 ? (t - 0.68) / 0.32 : 0;
        if (blade) {
          // Overhead, both hands on the hilt.
          a.armRx = -3.0 * wind + 4.0 * strike - 0.9 * recover;
          a.armLx = -2.6 * wind + 3.2 * strike - 0.4 * recover;
          a.armLz = -0.3 * wind;
          a.torsoX = -0.25 * wind * (1 - strike) + 0.4 * strike * (1 - recover);
          a.elbowR = -1.5 * wind * (1 - strike) - 0.1;
          a.elbowL = -1.2 * wind * (1 - strike) - 0.2;
        } else {
          // A swinging hook from out wide, the whole body turning into it.
          const out = strike * (1 - recover);
          a.armRx = 0.35 * wind * (1 - strike) - 1.3 * out;
          a.armRz = -0.7 * wind * (1 - strike) + 0.55 * out;
          a.elbowR = -1.6 * (1 - out * 0.5) - 0.1;
          a.armLx = -0.8;
          a.armLz = -0.2;
          a.elbowL = -1.9;
          a.bodyY = -0.7 * wind * (1 - strike) + 0.85 * out;
          a.torsoX = 0.05 + 0.2 * out;
        }
        a.lower = -0.1 * strike;
        a.legL = 0.5 * strike;
        a.legR = -0.4 * strike;
        a.kneeL = 0.4 + 0.3 * wind;
        fast = 24;
        break;
      }
      case 'block':
        if (blade) {
          // The blade raised across the body, the other fist behind it.
          a.armRx = -1.2;
          a.armRz = 0.4;
          a.elbowR = -1.25;
          a.armLx = -0.55;
          a.elbowL = -1.4;
        } else {
          // Forearms up before the face.
          a.armLx = -0.95;
          a.armRx = -0.95;
          a.armLz = -0.3;
          a.armRz = 0.3;
          a.elbowL = -2.0;
          a.elbowR = -2.0;
          a.headX = 0.12;
        }
        a.torsoX = 0.12;
        a.lower = -0.06;
        a.legL = 0.25;
        a.legR = -0.2;
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
        const t = Math.min(1, p.t * 1.4);
        a.armRx = -2.7 * t;
        a.armRz = -0.25 * t;
        a.elbowR = -1.3 * t;
        a.torsoX = -0.3 * t;
        a.bodyY = -0.4;
        a.armLx = -0.5 * t;
        fast = 14;
        break;
      }
      case 'strike': {
        const t = Math.min(1, p.t * 3);
        a.armRx = -2.7 + 4.2 * t;
        a.armRz = 0.4 * t;
        a.torsoX = 0.4 * t;
        a.bodyY = 0.5 * t;
        a.legL = 0.5;
        a.legR = -0.4;
        fast = 26;
        break;
      }
      case 'work': {
        const s = Math.sin(p.time * 2.3);
        const reach = Math.max(0, s);
        switch (p.workGesture ?? 'general') {
          case 'mending':
            a.armRx = -0.68 - 0.08 * s;
            a.armLx = -0.72 + 0.06 * s;
            a.elbowR = -0.74 - 0.06 * reach;
            a.elbowL = -0.72 + 0.05 * reach;
            a.headX = 0.08 + 0.04 * reach;
            a.torsoX = 0.02;
            break;
          case 'measuring':
            a.armRx = -0.82 - 0.14 * reach;
            a.armLx = -0.4 - 0.08 * s;
            a.elbowR = -0.52;
            a.elbowL = -0.58;
            a.headX = 0.1 + 0.08 * reach;
            a.torsoX = 0.08 + 0.04 * reach;
            break;
          case 'ledger':
          case 'writing':
            a.armRx = -0.72 - 0.035 * s;
            a.armLx = -0.68 + 0.025 * s;
            a.elbowR = -0.78 - (p.workGesture === 'writing' ? 0.06 * reach : 0);
            a.elbowL = -0.72;
            a.headX = 0.09 + 0.05 * reach;
            a.torsoX = 0.04;
            break;
          case 'stonework':
            a.armRx = -0.72 - 0.34 * reach;
            a.armLx = -0.5;
            a.elbowR = -0.68 - 0.16 * reach;
            a.elbowL = -0.72;
            a.headX = 0.06;
            a.torsoX = 0.12 + 0.08 * reach;
            a.kneeL = 0.16;
            a.kneeR = 0.14;
            break;
          case 'baking':
            a.armRx = -0.58 - 0.12 * reach;
            a.armLx = -0.58 - 0.1 * (1 - reach);
            a.elbowR = -0.58;
            a.elbowL = -0.58;
            a.torsoX = 0.03;
            break;
          case 'guard':
            a.armLx = -0.18;
            a.armRx = -0.12;
            a.armLz = 0.08;
            a.armRz = -0.08;
            a.headY = Math.sin(p.time * 0.36) * 0.12;
            a.torsoX = 0.025;
            break;
          case 'general':
            a.armRx = -0.78 - 0.32 * reach;
            a.armLx = -0.62;
            a.elbowR = -0.66 - 0.18 * reach;
            a.elbowL = -0.7;
            a.torsoX = 0.12 + 0.06 * (1 - reach);
            a.legL = 0.1;
            a.legR = -0.08;
            break;
        }
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
        if (p.workGesture === 'writing') {
          const s = Math.sin(p.time * 2.1);
          a.armLx = -0.48 + 0.02 * s;
          a.armRx = -0.64 - 0.04 * s;
          a.elbowL = -0.58;
          a.elbowR = -0.78;
          a.headX = 0.08 + 0.04 * Math.max(0, s);
        }
        break;
      case 'talk': {
        a.armRx = -0.9 + Math.sin(p.time * 2.2) * 0.35;
        a.armRz = 0.4;
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
    const scale = rig.hipY / 0.95;
    rig.legL.rotation.x = c.legL;
    rig.legR.rotation.x = c.legR;
    // y turns the arm about its own length (the forearm folds across the body, not forward).
    rig.armL.rotation.set(c.armLx, c.armLy, c.armLz);
    rig.armR.rotation.set(c.armRx, c.armRy, c.armRz);
    rig.torso.rotation.set(c.torsoX, c.bodyY * 0.6, c.torsoZ);
    rig.head.rotation.set(c.headX, c.headY, 0);
    if (rig.kneeL) rig.kneeL.rotation.x = c.kneeL;
    if (rig.kneeR) rig.kneeR.rotation.x = c.kneeR;
    if (rig.elbowL) rig.elbowL.rotation.x = c.elbowL;
    if (rig.elbowR) rig.elbowR.rotation.x = c.elbowR;
    rig.hips.position.y = rig.hipY + c.lower * scale;
    rig.body.rotation.x = c.bodyX;
    rig.body.position.y = c.bodyX !== 0 ? (0.22 * scale * Math.abs(c.bodyX)) / 1.5 : 0;
  }
  // Hit flash tints materials briefly.
  if (rig.hitFlash > 0) {
    rig.hitFlash = Math.max(0, rig.hitFlash - dt * 4);
  }
}

/** Targets for one idle variant (on top of the plain idle already in `a`). */
function idlePose(a: Record<string, number>, v: IdleVariant, clock: number, amp: number) {
  switch (v) {
    case 'rest':
      break;
    case 'arms crossed':
      // Upper arms close to the body, turned in, forearms folded across the chest, the right over the left.
      a.armLx = -0.22;
      a.armRx = -0.3;
      a.armLy = -1.2;
      a.armRy = 1.2;
      a.armLz = -0.06;
      a.armRz = 0.06;
      a.elbowL = -1.55;
      a.elbowR = -1.72;
      a.headX = 0.02;
      break;
    case 'hands on hips':
      a.armLz = 0.52;
      a.armRz = -0.52;
      a.armLx = 0.18;
      a.armRx = 0.18;
      a.elbowL = -1.25;
      a.elbowR = -1.25;
      a.torsoX = 0.01;
      a.headX = -0.03;
      break;
    case 'hands behind back':
      a.armLx = 0.42;
      a.armRx = 0.42;
      a.armLz = -0.04;
      a.armRz = 0.04;
      a.elbowL = -0.85;
      a.elbowR = -0.85;
      a.headX = 0.02;
      break;
    case 'look around':
      // A slow look from one side to the other, the shoulders following a little.
      a.headY = Math.sin(clock * 0.55) * 0.75 * amp;
      a.bodyY = Math.sin(clock * 0.55 - 0.6) * 0.18 * amp;
      a.headX = -0.04;
      break;
    case 'scratch head':
      a.armRx = -2.45;
      a.armRz = -0.4;
      a.elbowR = -2.15 + 0.07 * Math.sin(clock * 13) * amp;
      a.headX = 0.12;
      a.headY = -0.12;
      break;
    case 'shift weight':
      // Weight on the right leg, the left knee easy, the hips dropped a touch to that side.
      a.legL = -0.07;
      a.kneeL = 0.3;
      a.legR = 0.03;
      a.lower = -0.012;
      a.torsoZ = 0.045;
      a.armLz = 0.15;
      break;
  }
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
  // The creature's rig writes onto its own joints directly (creature poses are coarse).
  const c = rig.cur;
  const k = 0.35;
  for (const key of ANGLE_KEYS) c[key] = lerpA(c[key]!, a[key]!, k);
  rig.armL.rotation.x = c.armLx!;
  rig.armR.rotation.x = c.armRx!;
  rig.legL.rotation.x = c.legL!;
  rig.legR.rotation.x = c.legR!;
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

/** Merge the parts of each joint that share a material into one mesh (the creature's rigid parts). */
export function mergeRigMeshes(root: THREE.Object3D) {
  const groups: THREE.Object3D[] = [];
  root.traverse((o) => {
    if (!(o as THREE.Mesh).isMesh) groups.push(o);
  });
  for (const g of groups) {
    const byMat = new Map<THREE.Material, THREE.Mesh[]>();
    for (const c of g.children) {
      const m = c as THREE.Mesh;
      if (!m.isMesh || m.children.length || (m as THREE.SkinnedMesh).isSkinnedMesh) continue;
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

export { BI };
