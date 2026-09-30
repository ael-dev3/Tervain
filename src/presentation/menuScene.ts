import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createWindCloth } from './menuWind';
import { makeFoldedSilkGeometry, makeSilkBoltGeometry } from './menuTradeGoods';

type Cloth = ReturnType<typeof createWindCloth>;
type ClothPrint = { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture };

function seeded(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * Original native-geometry desert silk market used only by title/pause presentation.
 * The camera is steady. Merchant silk, one grounded faction standard, palm leaves, lamp flames
 * and a small dust volume share a clock that freezes in reduced-motion mode.
 * The owner-approved Hegemony master is printed into the cloth's own UV texture.
 */
export class MenuScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 160);
  readonly stats = { triangles: 0, meshes: 0, clothPanels: 0, palmFronds: 0, dustPoints: 56 };
  private readonly centerRig = new THREE.Group();
  private sandSurface!: THREE.Mesh;
  private readonly pavingSupports: { x: number; z: number; width: number; depth: number; top: number; angle: number }[] = [];
  private readonly buckets = new Map<THREE.Object3D, Map<THREE.Material, THREE.BufferGeometry[]>>();
  private readonly materials = new Set<THREE.Material>();
  private readonly textures = new Set<THREE.Texture>();
  private readonly cloths: Cloth[] = [];
  private readonly prints: ClothPrint[] = [];
  private readonly palmLeaves: { mesh: THREE.Mesh; rest: Float32Array; weights: THREE.BufferAttribute; phases: THREE.BufferAttribute }[] = [];
  private readonly flames: { mesh: THREE.Mesh; light: THREE.PointLight; phase: number }[] = [];
  private readonly dust: THREE.Points;
  private readonly dustSeeds: { x: number; y: number; z: number; phase: number; speed: number }[] = [];
  private readonly random = seeded(0x7e4a19);
  private emblemImage: HTMLImageElement | null = null;
  private time = 0;
  private disposed = false;

  constructor() {
    this.scene.name = 'Tervain_Hegemony_Desert_Silk_Market';
    this.scene.fog = new THREE.FogExp2(0xa68465, 0.011);
    this.camera.position.set(0, 5.4, 19);
    this.camera.lookAt(0, 5.4, 0);
    this.scene.add(this.centerRig);
    this.centerRig.name = 'Merchant_Silk_Display';

    this.buildLightAndSky();
    const stoneMap = this.surfaceTexture('stone');
    const sandMap = this.surfaceTexture('sand');
    const woodMap = this.surfaceTexture('wood');
    const stone = this.material({ color: 0xe0b884, map: stoneMap, roughness: 1 });
    const wornStone = this.material({ color: 0xaf8458, map: stoneMap, roughness: 1 });
    const lightStone = this.material({ color: 0xf3d1a0, map: stoneMap, roughness: 1 });
    const sandstoneShade = this.material({ color: 0x956f56, map: stoneMap, roughness: 1 });
    const wood = this.material({ color: 0x67412a, map: woodMap, roughness: 0.98 });
    const darkWood = this.material({ color: 0x30251e, map: woodMap, roughness: 1 });
    const gold = this.material({ color: 0xb38948, roughness: 0.55, metalness: 0.48 });
    const iron = this.material({ color: 0x2b3034, roughness: 0.72, metalness: 0.55 });
    const terracotta = this.material({ color: 0xa45132, roughness: 1 });
    const paleClay = this.material({ color: 0xc98652, roughness: 1 });
    const glazed = this.material({ color: 0x356968, roughness: 0.5, metalness: 0.08 });
    const wicker = this.material({ color: 0x977043, roughness: 1 });
    const shadow = this.material({ color: 0x252c31, roughness: 1 });
    const dome = this.material({ color: 0x557475, map: stoneMap, roughness: 0.83 });
    const rope = this.material({ color: 0xad956c, roughness: 1 });

    this.buildGround(sandMap);
    this.buildArchitecture(stone, wornStone, lightStone, sandstoneShade, shadow, dome, gold);
    this.buildSilkDisplay(wood, iron, rope);
    this.buildMarket(-1, wood, darkWood, gold, rope, wicker, terracotta, paleClay, glazed);
    this.buildMarket(1, wood, darkWood, gold, rope, wicker, terracotta, paleClay, glazed);
    this.buildHegemonyPost(wood, iron, rope, wornStone);
    this.buildPalm(-10.0, -4.5, 10.8, -0.8, wood, wicker);
    this.buildPalm(10.0, -4.5, 11.2, 0.6, wood, wicker);
    this.buildPalm(-20, -13, 11.3, 0.4, wood, wicker);
    this.buildPalm(19, -15, 12.1, -0.5, wood, wicker);
    this.buildPalm(26, -24, 9.8, -0.4, wood, wicker);
    this.buildLantern(-4.25, 4.65, 3.2, wood, iron, gold, false);
    this.buildLantern(4.6, 4.9, 3.9, wood, iron, gold);
    this.buildLantern(-10.2, 3.3, 1.7, wood, iron, gold);
    this.dust = this.buildDust();
    this.scene.add(this.dust);
    this.flushStatic();
    this.scene.updateMatrixWorld(true);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        this.stats.meshes++;
        this.stats.triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3;
      }
    });
    this.stats.clothPanels = this.cloths.length;
    this.loadEmblem();
  }

  /** A fixed camera keeps action targets stable. Very narrow screens compress only the central rig's width. */
  resize(width: number, height: number) {
    const aspect = Math.max(0.1, width / Math.max(1, height));
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    // 355×711 retains ~75% viewport-width cloth, with the background visible at both sides.
    this.centerRig.scale.x = Math.min(1, Math.max(0.25, aspect / 0.64));
  }

  update(dt: number, reducedMotion: boolean) {
    if (this.disposed || reducedMotion) return;
    this.time += Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.05)) : 0;
    for (const cloth of this.cloths) cloth.update(this.time, 1);
    for (const crown of this.palmLeaves) {
      const position = crown.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        const k = i * 3, weight = crown.weights.getX(i), phase = crown.phases.getX(i);
        const flex = Math.sin(this.time * 0.47 + phase - weight * 0.85) * weight;
        position.setXYZ(i, crown.rest[k]!, crown.rest[k + 1]! + flex * 0.065, crown.rest[k + 2]! + flex * 0.018);
      }
      position.needsUpdate = true;
      crown.mesh.geometry.computeVertexNormals();
    }
    for (const flame of this.flames) {
      const breath = Math.sin(this.time * 3.1 + flame.phase) * 0.08 + Math.sin(this.time * 4.7 + flame.phase) * 0.035;
      flame.mesh.scale.set(1 - breath * 0.25, 1 + breath, 1 - breath * 0.25);
      flame.mesh.rotation.z = Math.sin(this.time * 1.7 + flame.phase) * 0.065;
      flame.light.intensity = 9.5 + breath * 8;
    }
    const position = this.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.dustSeeds.length; i++) {
      const p = this.dustSeeds[i]!;
      position.setXYZ(i, p.x + Math.sin(this.time * 0.09 + p.phase) * 0.8, (p.y + this.time * p.speed) % 10.5, p.z + Math.cos(this.time * 0.07 + p.phase) * 0.25);
    }
    position.needsUpdate = true;
  }

  /** Idempotent, including textures changed by the asynchronous emblem upload. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.emblemImage) {
      this.emblemImage.onload = null;
      this.emblemImage.onerror = null;
      this.emblemImage.src = '';
      this.emblemImage = null;
    }
    const geometries = new Set<THREE.BufferGeometry>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) geometries.add(object.geometry);
      if (object instanceof THREE.Light) object.dispose();
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const texture of this.textures) texture.dispose();
    this.materials.clear();
    this.textures.clear();
    this.scene.clear();
    this.cloths.length = this.palmLeaves.length = this.flames.length = this.prints.length = this.dustSeeds.length = 0;
  }

  private material(parameters: THREE.MeshStandardMaterialParameters) {
    const material = new THREE.MeshStandardMaterial(parameters);
    this.materials.add(material);
    return material;
  }

  private texture(canvas: HTMLCanvasElement, repeat = false) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    if (repeat) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 3);
    }
    texture.anisotropy = 2;
    this.textures.add(texture);
    return texture;
  }

  private surfaceTexture(kind: 'stone' | 'sand' | 'wood') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d')!;
    const r = seeded(kind === 'stone' ? 731 : kind === 'wood' ? 218 : 917);
    c.fillStyle = kind === 'wood' ? '#b69a75' : '#d4c3a6';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 680; i++) {
      const value = Math.floor(90 + r() * 120);
      c.fillStyle = `rgba(${value},${value - 6},${value - 18},${0.045 + r() * 0.07})`;
      c.fillRect(r() * 256, r() * 256, 1 + r() * 7, kind === 'wood' ? 6 + r() * 32 : 1 + r() * 5);
    }
    if (kind === 'stone') {
      c.lineWidth = 2;
      c.strokeStyle = 'rgba(79,62,42,.15)';
      for (let row = 0; row < 4; row++) {
        c.beginPath(); c.moveTo(0, row * 64 + 1); c.lineTo(256, row * 64 + 1); c.stroke();
        for (let column = 0; column < 4; column++) {
          const x = column * 80 + (row % 2) * 40;
          c.beginPath(); c.moveTo(x, row * 64); c.lineTo(x, row * 64 + 64); c.stroke();
        }
      }
    }
    if (kind === 'wood') {
      c.lineWidth = 1.5;
      c.strokeStyle = 'rgba(67,36,20,.19)';
      for (let x = 6; x < 256; x += 12) {
        c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 8, 70, x - 7, 174, x + 2, 256); c.stroke();
      }
    }
    return this.texture(canvas, true);
  }

  private clothMaterial(color: string, emblem = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 1024;
    const c = canvas.getContext('2d')!;
    c.fillStyle = color; c.fillRect(0, 0, 512, 1024);
    const folds = c.createLinearGradient(0, 0, 512, 0);
    folds.addColorStop(0, 'rgba(4,2,8,.45)');
    folds.addColorStop(0.18, 'rgba(255,224,177,.12)');
    folds.addColorStop(0.34, 'rgba(7,2,13,.19)');
    folds.addColorStop(0.68, 'rgba(255,233,194,.10)');
    folds.addColorStop(1, 'rgba(5,2,10,.46)');
    c.fillStyle = folds; c.fillRect(0, 0, 512, 1024);
    c.strokeStyle = 'rgba(247,223,188,.075)'; c.lineWidth = 1;
    for (let y = 3; y < 1024; y += 8) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); }
    c.strokeStyle = 'rgba(11,4,16,.12)';
    for (let x = 3; x < 512; x += 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 1024); c.stroke(); }
    // Merchant yardage has simple selvedges; ceremonial gold is reserved for the one standard.
    c.strokeStyle = emblem ? '#ae884b' : 'rgba(218,178,130,.32)'; c.lineWidth = emblem ? 11 : 5;
    c.strokeRect(17, 17, 478, 990);
    c.setLineDash([7, 9]); c.strokeStyle = 'rgba(209,183,143,.48)'; c.lineWidth = 2;
    c.strokeRect(7, 7, 498, 1010); c.setLineDash([]);
    if (emblem) {
      c.strokeStyle = '#dec18a'; c.lineWidth = 2; c.strokeRect(28, 28, 456, 968);
      c.strokeStyle = '#c6a168'; c.lineWidth = 4;
      for (let x = 47; x < 480; x += 46) {
        for (const y of [52, 969]) {
          c.beginPath(); c.moveTo(x, y - 10); c.lineTo(x + 14, y); c.lineTo(x, y + 10); c.lineTo(x - 14, y); c.closePath(); c.stroke();
        }
      }
    }
    const texture = this.texture(canvas);
    if (emblem) this.prints.push({ canvas, texture });
    return this.material({ map: texture, color: 0xffffff, roughness: emblem ? 0.87 : 0.74, side: THREE.DoubleSide });
  }

  private loadEmblem() {
    const image = new Image();
    this.emblemImage = image;
    image.onload = () => {
      if (this.disposed) return;
      for (const print of this.prints) {
        const c = print.canvas.getContext('2d')!;
        const width = 374;
        const height = width * image.naturalHeight / Math.max(1, image.naturalWidth);
        const top = (1024 - height) * 0.45;
        c.save();
        c.globalAlpha = 0.96;
        c.drawImage(image, (512 - width) / 2, top, width, height);
        c.restore();
        print.texture.needsUpdate = true;
      }
      image.onload = image.onerror = null;
      this.emblemImage = null;
    };
    image.onerror = () => { image.onload = image.onerror = null; };
    image.src = `${import.meta.env.BASE_URL}assets/menu/hegemony-emblem.png`;
  }

  private addCloth(width: number, height: number, material: THREE.Material, x: number, y: number, z: number, phase: number, parent: THREE.Object3D = this.scene, rx = 0, ry = 0, rz = 0, central = false, hemDepth = 0) {
    const cloth = createWindCloth(width, height, material, { segmentsX: central ? 20 : 12, segmentsY: central ? 32 : 18, phase, amplitude: central ? 0.23 : Math.min(0.22, width * 0.065), hemDepth });
    cloth.mesh.position.set(x, y, z);
    cloth.mesh.rotation.set(rx, ry, rz);
    cloth.mesh.castShadow = !central;
    cloth.mesh.receiveShadow = true;
    cloth.mesh.name = central ? 'Merchant_Central_Woven_Silk' : 'Merchant_Market_Silk';
    cloth.update(0, 1);
    this.cloths.push(cloth);
    parent.add(cloth.mesh);
    return cloth;
  }

  private staticPart(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, parent: THREE.Object3D = this.scene) {
    const baked = geometry.index ? geometry.toNonIndexed() : geometry;
    if (baked !== geometry) geometry.dispose();
    baked.applyMatrix4(new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz)));
    let group = this.buckets.get(parent);
    if (!group) this.buckets.set(parent, group = new Map());
    let parts = group.get(material);
    if (!parts) group.set(material, parts = []);
    parts.push(baked);
  }

  private box(x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, parent: THREE.Object3D = this.scene, ry = 0) {
    this.staticPart(new THREE.BoxGeometry(w, h, d), material, x, y, z, 0, ry, 0, 1, 1, 1, parent);
  }

  private cylinder(x: number, y: number, z: number, top: number, bottom: number, height: number, material: THREE.Material, parent: THREE.Object3D = this.scene, segments = 10) {
    this.staticPart(new THREE.CylinderGeometry(top, bottom, height, segments), material, x, y, z, 0, 0, 0, 1, 1, 1, parent);
  }

  private rod(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, parent: THREE.Object3D = this.scene) {
    const direction = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radius, radius * 1.08, direction.length(), 6);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), direction.normalize()));
    const mid = a.clone().add(b).multiplyScalar(0.5);
    this.staticPart(geometry, material, mid.x, mid.y, mid.z, 0, 0, 0, 1, 1, 1, parent);
  }

  private hangingRope(points: THREE.Vector3[], material: THREE.Material, radius = 0.035) {
    this.staticPart(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, radius, 5, false), material, 0, 0, 0);
  }

  private flushStatic() {
    for (const [parent, materials] of this.buckets) {
      for (const [material, parts] of materials) {
        const geometry = mergeGeometries(parts, false);
        for (const part of parts) part.dispose();
        if (!geometry) throw new Error('Menu geometry attributes did not match');
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.name = 'Batched_Desert_Market_Geometry';
        parent.add(mesh);
      }
    }
    this.buckets.clear();
  }

  private buildLightAndSky() {
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { upper: { value: new THREE.Color(0x3c626e) }, horizon: { value: new THREE.Color(0xe2bb8d) } },
      vertexShader: 'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'uniform vec3 upper;uniform vec3 horizon;varying vec3 vDirection;void main(){float h=clamp(normalize(vDirection).y*.95+.05,0.,1.);gl_FragColor=vec4(mix(horizon,upper,pow(h,.55)),1.);}',
    });
    this.materials.add(skyMaterial);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 24, 12), skyMaterial);
    sky.name = 'Desert_Dusk_Sky';
    this.scene.add(sky);
    const ambient = new THREE.HemisphereLight(0xbfdde1, 0x805132, 1.25);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffd29a, 3.25);
    sun.position.set(-14, 19, 17);
    sun.target.position.set(0, 3.5, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -12;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 70;
    sun.shadow.normalBias = 0.055;
    sun.shadow.bias = -0.00018;
    this.scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight(0x72a3bd, 1.2);
    rim.position.set(13, 11, -13);
    this.scene.add(rim);
  }

  private buildGround(map: THREE.Texture) {
    const geometry = new THREE.PlaneGeometry(110, 100, 36, 28);
    geometry.rotateX(-Math.PI / 2);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      position.setY(i, -0.09 + Math.sin(x * 0.23 + z * 0.13) * 0.075 + Math.sin(z * 0.31) * 0.035);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, this.material({ color: 0xc7a16d, map, roughness: 1 }));
    mesh.receiveShadow = true;
    mesh.name = 'Sandstone_Courtyard_Sand';
    this.scene.add(mesh);
    this.sandSurface = mesh;
    mesh.updateMatrixWorld(true);
    const paving = this.material({ color: 0xb89669, roughness: 1 });
    for (let row = 0; row < 4; row++) {
      for (let column = 0; column < 7; column++) {
        const x = (column - 3) * 1.75 + (row % 2) * 0.15;
        const z = 2.5 + row * 1.52;
        const y = 0.045 + this.random() * 0.025, width = 1.6 - this.random() * 0.13, angle = (this.random() - 0.5) * 0.06;
        this.box(x, y, z, width, 0.13, 1.32, paving, this.scene, angle);
        this.pavingSupports.push({ x, z, width, depth: 1.32, top: y + 0.065, angle });
      }
    }
  }

  /** Construction-only ground support uses the rendered sand triangles and actual paving footprints. */
  private groundHeight(x: number, z: number, radius: number) {
    const ray = new THREE.Raycaster(V(x, 20, z), V(0, -1, 0), 0, 25);
    let height = -Infinity;
    for (let i = 0; i < 9; i++) {
      const angle = (i - 1) * Math.PI / 4, distance = i === 0 ? 0 : radius;
      const px = x + Math.cos(angle) * distance, pz = z + Math.sin(angle) * distance;
      ray.ray.origin.set(px, 20, pz);
      height = Math.max(height, ray.intersectObject(this.sandSurface)[0]?.point.y ?? -0.09);
      for (const paver of this.pavingSupports) {
        const dx = px - paver.x, dz = pz - paver.z, c = Math.cos(paver.angle), s = Math.sin(paver.angle);
        if (Math.abs(c * dx - s * dz) <= paver.width / 2 && Math.abs(s * dx + c * dz) <= paver.depth / 2) height = Math.max(height, paver.top);
      }
    }
    return height;
  }

  private arch(width: number, height: number) {
    const radius = width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-radius, 0); shape.lineTo(radius, 0); shape.lineTo(radius, height - radius);
    shape.absarc(0, height - radius, radius, 0, Math.PI, false);
    shape.closePath();
    return new THREE.ShapeGeometry(shape, 10);
  }

  private buildArchitecture(stone: THREE.Material, worn: THREE.Material, light: THREE.Material, shade: THREE.Material, shadow: THREE.Material, dome: THREE.Material, gold: THREE.Material) {
    // Solid plaster masses and deeply framed arched insets, with oversized irregular parapets.
    for (const side of [-1, 1]) {
      const x = side * 10.6, z = -9.8, h = side < 0 ? 8.3 : 9.5;
      this.box(x, h / 2, z, 11.3, h, 3.2, stone);
      this.box(x, h + 0.12, z, 11.9, 0.38, 3.7, light);
      this.box(x, 0.26, z + 1.8, 12.1, 0.55, 1.1, worn);
      for (let i = 0; i < 9; i++) this.box(x - 5.4 + i * 1.36, h + 0.53 + (i % 3) * 0.05, z, 0.64, 0.66, 3.55, i % 3 ? stone : worn);
      for (const dx of [-4.3, -0.9, 2.55]) {
        const ax = x + dx, az = z + 1.64;
        this.staticPart(this.arch(2.05, 3.75), shadow, ax, 1.8, az);
        this.box(ax - 1.23, 3.2, az + 0.08, 0.36, 3.3, 0.3, light);
        this.box(ax + 1.23, 3.2, az + 0.08, 0.36, 3.3, 0.3, light);
        for (let i = 0; i < 9; i++) {
          const angle = Math.PI * i / 8;
          this.staticPart(new THREE.BoxGeometry(0.43, 0.37, 0.34), i % 2 ? stone : light, ax + Math.cos(angle) * 1.18, 4.45 + Math.sin(angle) * 1.18, az + 0.11, 0, 0, angle - Math.PI / 2);
        }
        this.box(ax, 1.8, az + 0.08, 2.65, 0.3, 0.55, worn);
      }
      for (let i = 0; i < 7; i++) this.box(x, 0.83 + i * 1.01, z + 1.635, 11.35, 0.065, 0.09, shade);
    }
    this.cylinder(-14.2, 8.6, -13.5, 2.55, 2.6, 3.5, stone);
    this.staticPart(new THREE.SphereGeometry(2.62, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dome, -14.2, 10.35, -13.5);
    this.cylinder(12.8, 10, -14.1, 3.05, 3.1, 3.9, stone);
    this.staticPart(new THREE.SphereGeometry(3.15, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), dome, 12.8, 11.95, -14.1);
    this.rod(V(-14.2, 12.9, -13.5), V(-14.2, 13.8, -13.5), 0.075, gold);
    this.rod(V(12.8, 15.0, -14.1), V(12.8, 16.05, -14.1), 0.085, gold);
    for (const [x, h, z] of [[-23, 11.5, -22], [23.5, 13.6, -27]] as const) {
      this.box(x, h / 2, z, 3.8, h, 3.8, worn);
      this.box(x, h + 0.3, z, 4.3, 0.5, 4.3, light);
      this.staticPart(new THREE.SphereGeometry(2.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), dome, x, h + 0.55, z);
    }
    // Far silhouettes are purpose-built cones/dunes, not mountains from the playable coastal scene.
    const mountain = this.material({ color: 0x9a877e, flatShading: true, roughness: 1 });
    const mountainLight = this.material({ color: 0xba9b79, flatShading: true, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const h = 10 + this.random() * 10;
      this.staticPart(new THREE.ConeGeometry(9 + this.random() * 6, h, 5), i % 2 ? mountain : mountainLight, -55 + i * 14, h * 0.38 - 1.5, -53 - (i % 3) * 5, 0, i * 0.61, 0, 1.5, 1, 0.76);
    }
    const dune = this.material({ color: 0xc6a077, roughness: 1 });
    for (const x of [-35, 0, 36]) this.staticPart(new THREE.SphereGeometry(19, 16, 8), dune, x, -2.8, -37, 0, 0, 0, 1.4, 0.24, 1);
  }

  private buildSilkDisplay(wood: THREE.Material, iron: THREE.Material, rope: THREE.Material) {
    const rig = this.centerRig;
    const cloth = this.clothMaterial('#59352d');
    this.addCloth(5.4, 10.6, cloth, 0, 5.5, 0.12, 0.6, rig, 0, 0, 0, true);
    for (const side of [-1, 1]) {
      const x = side * 2.98;
      this.cylinder(x, 5.65, -0.11, 0.12, 0.19, 11.25, wood, rig);
      this.cylinder(x, 0.2, -0.11, 0.22, 0.25, 0.3, iron, rig);
      this.cylinder(x, 10.95, -0.11, 0.2, 0.2, 0.16, iron, rig);
      for (const y of [0.65, 9.8, 10.55]) this.cylinder(x, y, -0.11, 0.21, 0.21, 0.16, iron, rig);
    }
    this.rod(V(-3.1, 10.95, -0.08), V(3.1, 10.95, -0.08), 0.13, wood, rig);
    for (let i = 0; i < 7; i++) {
      const x = -2.5 + i * 0.83;
      this.staticPart(new THREE.TorusGeometry(0.16, 0.025, 5, 10), rope, x, 10.91, 0.04, 0, Math.PI / 2, 0, 1, 1, 1, rig);
      this.rod(V(x, 10.8, 0.12), V(x, 10.91, 0.12), 0.018, rope, rig);
    }
    this.rod(V(-2.98, 10.5, -0.11), V(-2.75, 10.75, 0.12), 0.027, rope, rig);
    this.rod(V(2.98, 10.5, -0.11), V(2.75, 10.75, 0.12), 0.027, rope, rig);
  }

  private buildHegemonyPost(wood: THREE.Material, iron: THREE.Material, rope: THREE.Material, stone: THREE.Material) {
    const post = new THREE.Group();
    post.name = 'Hegemony_Banner_Post'; post.position.set(-4.25, 0, 3.2);
    this.scene.add(post);
    this.box(0, 0.02, 0, 0.6, 0.28, 0.58, stone, post);
    this.cylinder(0, 4.4, 0, 0.105, 0.15, 8.6, wood, post);
    for (const y of [0.28, 7.95, 8.35]) this.cylinder(0, y, 0, 0.16, 0.16, 0.12, iron, post);
    this.rod(V(-1.84, 8.2, 0.02), V(0.12, 8.2, 0.02), 0.07, wood, post);
    this.rod(V(-0.78, 8.2, 0.02), V(0, 7.53, 0), 0.045, iron, post);
    // Match the 512×1024 print canvas so the approved emblem keeps its resting aspect.
    const banner = this.addCloth(1.55, 3.1, this.clothMaterial('#351445', true), -0.9, 6.6, 0.12, 5.2, post, 0, 0, 0, false, 0.25);
    banner.mesh.name = 'Hegemony_Post_Banner_Silk';
    for (const x of [-1.6, -0.9, -0.2]) {
      this.staticPart(new THREE.TorusGeometry(0.1, 0.018, 5, 10), rope, x, 8.2, 0.04, 0, Math.PI / 2, 0, 1, 1, 1, post);
      this.rod(V(x, 8.15, 0.12), V(x, 8.2, 0.12), 0.015, rope, post);
    }
  }

  private buildMarket(side: number, wood: THREE.Material, darkWood: THREE.Material, gold: THREE.Material, rope: THREE.Material, wicker: THREE.Material, terracotta: THREE.Material, paleClay: THREE.Material, glazed: THREE.Material) {
    const x = side * 7.6;
    // Unmarked dyed merchant cloth provides shade; it does not repeat the faction standard.
    const canopy = this.clothMaterial(side < 0 ? '#91713f' : '#456562');
    const rearCanopy = this.clothMaterial(side < 0 ? '#b29162' : '#854939');
    const frontSilk = this.addCloth(6.3, 4.8, canopy, x, 7.3, 1.1, side < 0 ? 1.4 : 2.6, this.scene, -0.95, side * -0.13, side * 0.025);
    const rearSilk = this.addCloth(5.7, 4.4, rearCanopy, side * 12.2, 8.7, -3, side < 0 ? 3.7 : 4.8, this.scene, -1.03, side * -0.2, -side * 0.025);
    const pinnedCorner = (cloth: Cloth, dx: number, halfHeight: number) => V(dx, halfHeight, 0).applyEuler(cloth.mesh.rotation).add(cloth.mesh.position);
    const rearA = pinnedCorner(rearSilk, -2.85, 2.2), rearB = pinnedCorner(rearSilk, 2.85, 2.2);
    this.rod(rearA, rearB, 0.075, wood);
    for (const point of [rearA, rearB]) {
      this.cylinder(point.x, point.y / 2, point.z, 0.09, 0.15, point.y, wood);
      this.cylinder(point.x, point.y + 0.045, point.z, 0.16, 0.16, 0.09, gold);
      this.rod(point, V(point.x + side * 0.65, 0.1, point.z - 1.5), 0.025, rope);
    }
    for (const dx of [-1, 1]) this.rod(V(x + dx * 2.85, 9.0, -1.35), pinnedCorner(frontSilk, dx * 3.15, 2.4), 0.035, rope);
    for (const dx of [-2.85, 2.85]) {
      const px = x + dx;
      this.cylinder(px, 3.3, 3, 0.11, 0.17, 6.6, wood);
      this.cylinder(px, 4.6, -1.25, 0.13, 0.18, 9.2, wood);
      for (const y of [1, 5.8, 6.4]) this.cylinder(px, y, 3, 0.17, 0.17, 0.14, gold);
      this.rod(V(px, 6.6, 3), V(px, 8.95, -1.3), 0.055, rope);
    }
    this.rod(V(x - 3, 6.58, 3), V(x + 3, 6.58, 3), 0.1, wood);
    this.rod(V(x - 3, 9.0, -1.35), V(x + 3, 9.0, -1.35), 0.12, wood);
    this.hangingRope([V(x - 2.9, 6.5, 3.06), V(x, 6.24, 3.09), V(x + 2.9, 6.5, 3.06)], rope);
    this.box(x, 1.8, 3.2, 5.25, 0.3, 2.1, wood);
    this.box(x, 0.92, 3.85, 5.08, 1.62, 0.22, darkWood);
    for (let i = 0; i < 10; i++) this.box(x - 2.25 + i * 0.5, 0.94, 3.99, 0.38, 1.55, 0.075, wood);
    for (const dx of [-2.2, 2.2]) for (const dz of [-0.75, 0.75]) this.box(x + dx, 0.88, 3.2 + dz, 0.2, 1.77, 0.22, wood);
    this.box(x, 0.55, 2.55, 5.1, 0.15, 0.18, wood);
    if (side < 0) {
      this.buildSilkMerchandise(x, wood, rope);
    } else {
      const spices = [0xbb7434, 0x945832, 0xccaa45, 0x647341].map((color) => this.material({ color, flatShading: true, roughness: 1 }));
      for (let i = 0; i < 4; i++) {
        const bx = x - 1.75 + i * 1.18, height = 0.3 + i * 0.025;
        this.cylinder(bx, 2.03, 3.46, 0.48, 0.34, 0.2, wicker, this.scene, 12);
        this.staticPart(new THREE.TorusGeometry(0.45, 0.035, 5, 12), wicker, bx, 2.14, 3.46, Math.PI / 2);
        this.staticPart(new THREE.ConeGeometry(0.41, height, 12), spices[i]!, bx, 2.13 + height / 2, 3.46, 0, i * 0.37, 0);
      }
      this.jar(x - 2.1, 1.95, 2.85, 0.47, 0.93, glazed);
      this.jar(x + 1.98, 1.95, 2.78, 0.41, 1.06, terracotta);
    }
    this.jar(x + side * 2.5, null, 5.1, 0.75, 1.7, terracotta);
    this.jar(x + side * 3.55, null, 4.7, 0.55, 1.23, paleClay);
    this.jar(x - side * 2.65, null, 5.15, 0.52, 1.17, glazed);
    const basketFloor = this.groundHeight(x + side * 1.4, 5.55, 0.72 * 0.75);
    this.basket(x + side * 1.4, basketFloor, 5.55, 0.72, 0.7, wicker);
    this.basket(x + side * 0.07, this.groundHeight(x + side * 0.07, 5.9, 0.5 * 0.75), 5.9, 0.5, 0.9, wicker);
    const produce = this.material({ color: side < 0 ? 0xb87639 : 0x706346, roughness: 1 });
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.4, radius = (i % 4) * 0.11;
      this.staticPart(new THREE.SphereGeometry(0.13, 7, 5), produce, x + side * 1.4 + Math.cos(angle) * radius, basketFloor + 0.61 + this.random() * 0.2, 5.55 + Math.sin(angle) * radius, 0, angle, 0, 1.15, 1, 0.9);
    }
    this.box(x - side * 0.8, 0.35, 1.9, 1.45, 0.7, 1.2, darkWood);
    this.box(x - side * 0.8, 0.73, 1.9, 1.52, 0.12, 1.25, wood);
  }

  private buildSilkMerchandise(x: number, wood: THREE.Material, rope: THREE.Material) {
    const silks = ['#a45e3e', '#c4ab78', '#3c7474', '#8c7345'].map(color => this.clothMaterial(color));
    for (let i = 0; i < 5; i++) {
      this.staticPart(makeFoldedSilkGeometry(1.15, 1.02, 0.15), silks[i % silks.length]!, x + 1.95, 1.95 + i * 0.15, 3.5);
    }
    // Two rolls rest on the counter; the third rests tangent to both lower rolls.
    const radius = 0.22, spacing = 0.44;
    for (const [dx, y, index] of [[0.2, 1.95, 1], [0.2 + spacing, 1.95, 2], [0.2 + spacing / 2, 1.95 + Math.sqrt(3) * radius, 0]] as const) {
      // Wound end faces look toward the courtyard; the full length stays on the counter.
      this.staticPart(makeSilkBoltGeometry(1.35, radius), silks[index]!, x + dx, y, 3.55, 0, -Math.PI / 2);
    }
    // A small samples rail grows from the counter, with each free silk strip tied to its beam.
    for (const dx of [-0.1, 2.2]) this.rod(V(x + dx, 1.95, 2.47), V(x + dx, 3.81, 2.47), 0.055, wood);
    this.rod(V(x - 0.21, 3.74, 2.47), V(x + 2.31, 3.74, 2.47), 0.06, wood);
    for (const [dx, index] of [[0.45, 2], [1.45, 1]] as const) {
      const cloth = this.addCloth(0.87, 1.45, silks[index]!, x + dx, 2.995, 2.55, 0.8 + index * 0.9);
      cloth.mesh.name = 'Merchant_Silk_Sample';
      for (const offset of [-0.34, 0.34]) this.rod(V(x + dx + offset, 3.72, 2.55), V(x + dx + offset, 3.74, 2.47), 0.018, rope);
    }
  }

  private jar(x: number, y: number | null, z: number, radius: number, height: number, material: THREE.Material) {
    y ??= this.groundHeight(x, z, radius * 0.49) - height * 0.02;
    const profile = [V(0, 0.02, 0), V(0.49, 0.02, 0), V(0.81, 0.13, 0), V(1, 0.42, 0), V(0.96, 0.68, 0), V(0.61, 0.84, 0), V(0.44, 0.9, 0), V(0.44, 0.97, 0), V(0.53, 0.98, 0), V(0.52, 1.02, 0), V(0.38, 1.02, 0), V(0.35, 0.91, 0), V(0.49, 0.78, 0), V(0.72, 0.6, 0), V(0.7, 0.2, 0), V(0, 0.12, 0)].map((p) => new THREE.Vector2(p.x * radius, p.y * height));
    this.staticPart(new THREE.LatheGeometry(profile, 12), material, x, y, z, 0, this.random() * 0.3, 0);
    for (const side of [-1, 1]) this.staticPart(new THREE.TorusGeometry(radius * 0.27, radius * 0.065, 5, 10, Math.PI * 1.35), material, x + side * radius * 0.69, y + height * 0.81, z, 0, Math.PI / 2, side < 0 ? Math.PI : 0, 1, 1.4, 1);
  }

  private basket(x: number, y: number, z: number, radius: number, height: number, material: THREE.Material) {
    this.cylinder(x, y + height / 2, z, radius, radius * 0.75, height, material, this.scene, 12);
    for (let i = 0; i < 6; i++) this.staticPart(new THREE.TorusGeometry(radius * (0.78 + i * 0.039), 0.025, 4, 12), material, x, y + i * height / 5, z, Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI * 2 / 10;
      this.rod(V(x + Math.cos(a) * radius * 0.76, y, z + Math.sin(a) * radius * 0.76), V(x + Math.cos(a) * radius, y + height, z + Math.sin(a) * radius), 0.02, material);
    }
  }

  private buildPalm(x: number, z: number, height: number, lean: number, trunk: THREE.Material, fruit: THREE.Material) {
    const spine = new THREE.CatmullRomCurve3([V(x, 0, z), V(x + lean * 0.1, height * 0.35, z), V(x + lean * 0.6, height * 0.76, z - 0.16), V(x + lean, height, z - 0.3)]);
    this.staticPart(new THREE.TubeGeometry(spine, 11, 0.19, 7, false), trunk, 0, 0, 0);
    for (let i = 1; i < 12; i++) {
      const p = spine.getPoint(i / 12);
      this.staticPart(new THREE.TorusGeometry(0.205, 0.042, 4, 7), trunk, p.x, p.y, p.z, Math.PI / 2);
    }
    const crown = spine.getPoint(1);
    this.staticPart(new THREE.SphereGeometry(0.34, 8, 6), trunk, crown.x, crown.y, crown.z, 0, 0, 0, 1, 1.35, 1);
    const leaves = this.material({ color: 0x3d6550, side: THREE.DoubleSide, roughness: 1 });
    const fronds: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI * 2 / 10 + height * 0.19;
      const length = 3.0 + this.random() * 1.3;
      const position: number[] = [], uv: number[] = [], index: number[] = [], weight: number[] = [], phase: number[] = [];
      const rows: number[][] = [];
      for (let j = 0; j <= 9; j++) {
        const t = j / 9;
        const px = length * t;
        const py = Math.sin(t * Math.PI) * 0.85 - t * 1.05;
        const width = Math.sin(t * Math.PI) * 0.33;
        const vertex = position.length / 3;
        if (j === 0 || j === 9) {
          position.push(px, py, 0); uv.push(0.5, t); weight.push(t * t); phase.push(angle);
          rows.push([vertex, vertex, vertex]);
        } else {
          position.push(px, py, -width, px, py + Math.sin(t * Math.PI) * 0.07, 0, px, py, width);
          uv.push(0, t, 0.5, t, 1, t); weight.push(t * t, t * t, t * t); phase.push(angle, angle, angle);
          rows.push([vertex, vertex + 1, vertex + 2]);
        }
      }
      for (let j = 0; j < 9; j++) {
        const a = rows[j]!, b = rows[j + 1]!;
        if (j === 0) index.push(a[0]!, b[0]!, b[1]!, a[0]!, b[1]!, b[2]!);
        else if (j === 8) index.push(a[0]!, b[0]!, a[1]!, a[1]!, b[0]!, a[2]!);
        else index.push(a[0]!, b[0]!, a[1]!, a[1]!, b[0]!, b[1]!, a[1]!, b[1]!, a[2]!, a[2]!, b[1]!, b[2]!);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geometry.setAttribute('windWeight', new THREE.Float32BufferAttribute(weight, 1));
      geometry.setAttribute('windPhase', new THREE.Float32BufferAttribute(phase, 1));
      geometry.setIndex(index); geometry.computeVertexNormals();
      geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, angle, (i % 3 - 1) * 0.12)));
      fronds.push(geometry);
    }
    const geometry = mergeGeometries(fronds, false)!;
    for (const frond of fronds) frond.dispose();
    geometry.computeBoundingBox();
    geometry.boundingBox!.expandByScalar(0.08);
    geometry.boundingSphere = geometry.boundingBox!.getBoundingSphere(new THREE.Sphere());
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    position.setUsage(THREE.DynamicDrawUsage);
    const mesh = new THREE.Mesh(geometry, leaves);
    mesh.position.copy(crown);
    mesh.name = 'Crown_Connected_Palm_Fronds';
    this.palmLeaves.push({ mesh, rest: new Float32Array(position.array), weights: geometry.getAttribute('windWeight') as THREE.BufferAttribute, phases: geometry.getAttribute('windPhase') as THREE.BufferAttribute });
    this.stats.palmFronds += 10;
    this.scene.add(mesh);
    for (let i = 0; i < 4; i++) this.staticPart(new THREE.SphereGeometry(0.15, 6, 5), fruit, crown.x + Math.cos(i * 1.6) * 0.22, crown.y - 0.28, crown.z + Math.sin(i * 1.6) * 0.22);
  }

  private buildLantern(x: number, y: number, z: number, wood: THREE.Material, iron: THREE.Material, gold: THREE.Material, ownPost = true) {
    if (ownPost) this.rod(V(x, 0, z), V(x, y + 0.9, z), 0.07, wood);
    this.rod(V(x, y + 0.9, z), V(x + 0.4, y + 0.9, z), 0.06, iron);
    this.rod(V(x + 0.4, y + 0.9, z), V(x + 0.4, y + 0.53, z), 0.025, iron);
    const lx = x + 0.4;
    this.cylinder(lx, y - 0.23, z, 0.23, 0.23, 0.08, gold, this.scene, 6);
    this.staticPart(new THREE.ConeGeometry(0.27, 0.2, 6), gold, lx, y + 0.29, z);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI * 2 / 6;
      this.rod(V(lx + Math.cos(a) * 0.19, y - 0.23, z + Math.sin(a) * 0.19), V(lx + Math.cos(a) * 0.19, y + 0.23, z + Math.sin(a) * 0.19), 0.022, iron);
    }
    const flameMaterial = this.material({ color: 0xffbb58, emissive: 0xff9b32, emissiveIntensity: 3, roughness: 1 });
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), flameMaterial);
    flame.geometry.scale(0.72, 1.8, 0.72);
    flame.position.set(lx, y, z);
    const light = new THREE.PointLight(0xffa959, 9.5, 7, 1.8);
    light.position.copy(flame.position);
    this.scene.add(flame, light);
    this.flames.push({ mesh: flame, light, phase: x * 0.77 });
  }

  private buildDust() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.stats.dustPoints * 3);
    for (let i = 0; i < this.stats.dustPoints; i++) {
      const p = { x: (this.random() - 0.5) * 29, y: this.random() * 10.5, z: 4 + this.random() * 8, phase: this.random() * Math.PI * 2, speed: 0.025 + this.random() * 0.035 };
      this.dustSeeds.push(p); positions.set([p.x, p.y, p.z], i * 3);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
    const c = canvas.getContext('2d')!;
    const gradient = c.createRadialGradient(16, 16, 0, 16, 16, 15);
    gradient.addColorStop(0, 'rgba(255,240,211,.8)'); gradient.addColorStop(1, 'rgba(255,240,211,0)');
    c.fillStyle = gradient; c.fillRect(0, 0, 32, 32);
    const material = new THREE.PointsMaterial({ map: this.texture(canvas), color: 0xffdba4, size: 0.045, transparent: true, opacity: 0.33, depthWrite: false, sizeAttenuation: true });
    this.materials.add(material);
    const dust = new THREE.Points(geometry, material);
    dust.name = 'Courtyard_Sunlit_Dust';
    dust.frustumCulled = false;
    return dust;
  }
}
