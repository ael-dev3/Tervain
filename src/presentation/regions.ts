import * as THREE from 'three';
import { Batch, Ctx } from './buildKit';
import { TILE_M, isBaked, makePaneTexture, makeTexPair, onBakedTextures, type TexKey } from './buildingTextures';

/** The materials a region can draw with. One draw call per material actually used. */
export type MatKey = TexKey | 'vc' | 'metal' | 'leaf' | 'glow' | 'pane' | 'daylight';

export class MaterialSet {
  readonly map = new Map<MatKey, THREE.Material>();
  readonly windowMat: THREE.MeshBasicMaterial;
  readonly lanternMat: THREE.MeshBasicMaterial;
  /** Window panes seen from inside a room (A66): the daylight outside them, dimming to the night. */
  readonly daylightMat: THREE.MeshBasicMaterial;
  private disposables: { dispose(): void }[] = [];
  private readonly textured = new Map<TexKey, THREE.MeshStandardMaterial>();
  private readonly unsubscribe: () => void;

  constructor(readonly size: number) {
    const tex = (key: TexKey, opts: { side?: THREE.Side; rough?: number; normal?: number; metal?: number } = {}) => {
      const pair = makeTexPair(key, size, 8);
      // Baked pairs are shared for the whole session (buildingTextures.ts releases them); generated ones are released here.
      if (!isBaked(key)) this.disposables.push(pair.map, pair.normal);
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: pair.map, normalMap: pair.normal, roughness: opts.rough ?? 0.92, metalness: opts.metal ?? 0, side: opts.side ?? THREE.FrontSide });
      m.normalScale.set(opts.normal ?? 1, opts.normal ?? 1);
      this.map.set(key, m);
      this.textured.set(key, m);
    };
    tex('plaster', { normal: 0.65, rough: 0.98 });
    tex('timber', { normal: 0.8, rough: 0.98 });
    tex('planks', { normal: 0.8, rough: 0.98 });
    tex('stone', { normal: 0.8, rough: 0.98 });
    tex('cobble', { normal: 1.1 });
    tex('tile', { normal: 0.85, rough: 0.95 });
    tex('thatch', { normal: 0.8, rough: 1 });
    tex('slate', { normal: 0.85, rough: 0.96 });
    tex('cloth', { side: THREE.DoubleSide, normal: 0.6, rough: 1 });
    tex('bark', { normal: 1.2, rough: 1 });
    tex('rock', { normal: 0.75, rough: 0.99 });
    tex('bronze', { normal: 0.65, rough: 0.87, metal: 0.6 });
    this.map.set('vc', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 }));
    // Forged, oxidised iron on hinges/hoops should retain broad dark values in hard coastal light.
    this.map.set('metal', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.28 }));
    this.map.set('leaf', new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }));
    const paneTex = makePaneTexture();
    this.disposables.push(paneTex);
    this.windowMat = new THREE.MeshBasicMaterial({ color: 0x3a4650, map: paneTex });
    this.lanternMat = new THREE.MeshBasicMaterial({ color: 0x4a4636 });
    this.map.set('pane', this.windowMat);
    this.map.set('glow', this.lanternMat);
    this.daylightMat = new THREE.MeshBasicMaterial({ color: 0xd2d8dc });
    this.map.set('daylight', this.daylightMat);
    // A set made before the baked surfaces arrived (the title camp) takes them up as soon as they are installed.
    this.unsubscribe = onBakedTextures(() => this.adoptBaked());
  }

  get(key: MatKey): THREE.Material {
    return this.map.get(key)!;
  }

  private adoptBaked() {
    for (const [key, m] of this.textured) {
      const pair = makeTexPair(key, this.size, 8);
      if (m.map === pair.map) continue;
      m.map = pair.map;
      m.normalMap = pair.normal;
      m.needsUpdate = true;
    }
  }

  dispose() {
    this.unsubscribe();
    for (const m of this.map.values()) m.dispose();
    for (const d of this.disposables) d.dispose();
  }
}

/** A spatial chunk of the scenery: separate regions cull independently when far from the camera. */
export class Region {
  readonly batches = new Map<MatKey, Batch>();
  constructor(
    readonly name: string,
    readonly ctx: Ctx,
  ) {}

  get(key: MatKey): Batch {
    let b = this.batches.get(key);
    if (!b) {
      const textured = key in TILE_M;
      b = new Batch(this.ctx, key, textured ? 1 / TILE_M[key as TexKey] : 1);
      if (key === 'glow' || key === 'pane' || key === 'daylight') b.amp = 0;
      this.batches.set(key, b);
    }
    return b;
  }
  get vc() {
    return this.get('vc');
  }
  get plaster() {
    return this.get('plaster');
  }
  get timber() {
    return this.get('timber');
  }
  get planks() {
    return this.get('planks');
  }
  get stone() {
    return this.get('stone');
  }
  get cobble() {
    return this.get('cobble');
  }
  get tile() {
    return this.get('tile');
  }
  get thatch() {
    return this.get('thatch');
  }
  get slate() {
    return this.get('slate');
  }
  get cloth() {
    return this.get('cloth');
  }
  get bark() {
    return this.get('bark');
  }
  get rock() {
    return this.get('rock');
  }
  get metal() {
    return this.get('metal');
  }
  get bronze() {
    return this.get('bronze');
  }
  get leaf() {
    return this.get('leaf');
  }
  get glow() {
    return this.get('glow');
  }
  get pane() {
    return this.get('pane');
  }
  get daylight() {
    return this.get('daylight');
  }

  get tris(): number {
    let t = 0;
    for (const b of this.batches.values()) t += b.tris;
    return t;
  }

  /** One mesh per material used. Static regions freeze their matrices. */
  toGroup(mats: { get(key: MatKey): THREE.Material }, opts: { isStatic?: boolean; shadows?: boolean } = {}): THREE.Group {
    const g = new THREE.Group();
    g.name = this.name;
    for (const [key, b] of this.batches) {
      const geo = b.toGeometry();
      if (!geo) continue;
      const mesh = new THREE.Mesh(geo, mats.get(key));
      mesh.name = `${this.name}:${key}`;
      const emissive = key === 'glow' || key === 'pane' || key === 'daylight';
      mesh.castShadow = (opts.shadows ?? true) && !emissive;
      mesh.receiveShadow = !emissive;
      if (opts.isStatic ?? true) {
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
      }
      mesh.userData.tris = b.tris;
      g.add(mesh);
    }
    return g;
  }
}

export function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry.dispose();
  });
}
