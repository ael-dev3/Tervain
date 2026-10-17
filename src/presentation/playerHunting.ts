import { BOW_LENGTH } from '../content/bowSize';
import * as THREE from 'three';
import type { Rig } from './characters';
import { createHuntingArrow } from './huntingArrow';
import type { HeroGrip } from './hero/animation';

/** The arrow's line while the bow is held ready after a shot: forward, a little out from the leg and a touch down. */
const BOW_AT_REST = new THREE.Vector3(.55, -.1, .83).normalize();
/**
 * How long the bow stays in hand after the last aim or shot before it goes back on his back (A75). As in Gothic 3 the
 * bow is carried slung on the back and taken in hand to shoot; walking and running with it hanging by the leg left
 * the string across his body and his bow hand clenched.
 */
export const BOW_READY_SECONDS = 2.5;
/**
 * Slung across the back (root space: +x his left, +z forward): the grip behind his shoulder blades, the limbs from his
 * right hip up over his left shoulder, the string outward, away from his back.
 */
// Out from the spine far enough that the limbs clear the vest and shoulder blade (playtest 5: they cut into his back).
const SLUNG_AT = new THREE.Vector3(.02, 1.2, -.29);
/** The slung bow is full size (B11): it is carried on the diagonal instead of being shrunk to fit. */
const SLUNG_SCALE = 1;
// About 14° off vertical, so both limbs stay between his shoulder blades; at 25° the upper limb crossed his left
// shoulder's outline (playtest 6).
const SLUNG_UP = new THREE.Vector3(.77, .64, 0).normalize();

type Snapshot = { position: THREE.Vector3; quaternion: THREE.Quaternion };
const Z = new THREE.Vector3(0, 0, 1);
const _tipLow = new THREE.Vector3(), _tipHigh = new THREE.Vector3(), _nock = new THREE.Vector3(), _dir = new THREE.Vector3(), _yAxis = new THREE.Vector3(0, 1, 0);

/**
 * The slung bow's give (A118): it hung rigidly on the spine, the same diagonal in every frame of a walk. A damped
 * pendulum in the plane of his back swings it with the sideways and vertical jolts of each step and lags it on starts,
 * stops and turns; a small spring lets it bob. At rest both settle to the strapped pose exactly.
 */
export class SlungSway {
  angle = 0;
  bob = 0;
  private spin = 0;
  private lift = 0;
  private readonly last = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private primed = false;
  static readonly MAX_ANGLE = 0.09;
  static readonly MAX_BOB = 0.025;

  /** `socket` in world space; `toLocal` turns a world vector into the back's frame (x across, y along the bow). */
  update(dt: number, socket: THREE.Vector3, toLocal: THREE.Quaternion): void {
    if (!(dt > 0)) return;
    if (!this.primed) { this.last.copy(socket); this.velocity.set(0, 0, 0); this.primed = true; return; }
    const velocity = _v.subVectors(socket, this.last).divideScalar(dt);
    const accel = _a.subVectors(velocity, this.velocity).divideScalar(dt).applyQuaternion(toLocal);
    this.velocity.copy(velocity); this.last.copy(socket);
    // A jump to a new place is not a jolt to swing from.
    if (accel.lengthSq() > 400 * 400) { this.angle = this.spin = this.bob = this.lift = 0; return; }
    const w = Math.PI * 2 * 1.6, b = Math.PI * 2 * 3.2;
    this.spin += (-w * w * this.angle - 2 * 0.25 * w * this.spin - (accel.x * 0.55 + accel.y * 0.2) * 1.4) * dt;
    this.angle = THREE.MathUtils.clamp(this.angle + this.spin * dt, -SlungSway.MAX_ANGLE, SlungSway.MAX_ANGLE);
    if (Math.abs(this.angle) === SlungSway.MAX_ANGLE) this.spin *= 0.5;
    this.lift += (-b * b * this.bob - 2 * 0.35 * b * this.lift - accel.y * 0.2) * dt;
    this.bob = THREE.MathUtils.clamp(this.bob + this.lift * dt, -SlungSway.MAX_BOB, SlungSway.MAX_BOB);
  }

  reset(): void { this.angle = this.spin = this.bob = this.lift = 0; this.primed = false; }
}
const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _q = new THREE.Quaternion(), _p = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const smooth = (t: number) => { const v = clamp(t, 0, 1); return v * v * (3 - 2 * v); };

/** Additive native-skeleton poses and palm attachments; the original hero mesh and locomotion stay intact. */
export class PlayerHuntingVisual {
  readonly bow = new THREE.Group();
  readonly nockedArrow = createHuntingArrow();
  readonly knife = new THREE.Group();
  private readonly modified = new Map<THREE.Object3D, Snapshot>();
  private readonly snapshots = new WeakMap<THREE.Object3D, Snapshot>();
  private readonly leftPalm: THREE.Group;
  private readonly rightPalm: THREE.Group;
  private readonly leftHand: THREE.Object3D;
  private readonly rightHand: THREE.Object3D;
  private readonly leftFoot: THREE.Object3D | null;
  private readonly rightFoot: THREE.Object3D | null;
  private readonly string: THREE.Group;
  private readonly skins: { mesh: THREE.SkinnedMesh; vertices: number[] }[] = [];
  private readonly joints = new Map<string, THREE.Object3D | null>();
  private direction = new THREE.Vector3(0, 0, 1);
  private equipped = false;
  private aiming = false;
  /** Seconds the bow stays in hand before it is slung on the back again (A75). */
  private ready = 0;
  private readonly back: THREE.Group;
  /** Between the strap and the bow: its swing and bob (A118). */
  private readonly sway = new THREE.Group();
  private readonly swing = new SlungSway();
  private draw = 0;
  private recoil = 0;
  /** Seconds at full draw: past a moment, the held string makes the bow arm tremble a little (B11). */
  private held = 0;
  private clock = 0;
  private skinProgress: number | null = null;
  private skinClock = 0;
  private skinTargetHeight = .4;

  constructor(private readonly rig: Rig) {
    this.leftHand = this.joint('LeftHand') ?? rig.elbowL ?? rig.armL ?? rig.root;
    this.rightHand = this.joint('RightHand') ?? rig.elbowR ?? rig.armR ?? rig.root;
    this.leftFoot = this.joint('LeftFoot');
    this.rightFoot = this.joint('RightFoot');
    this.leftPalm = this.palm('Left', this.leftHand);
    this.rightPalm = this.palm('Right', this.rightHand);
    this.bow.name = 'Hunting / bent ash bow in left palm';
    const wood = new THREE.MeshStandardMaterial({ color: 0x4a2f1e, roughness: .86 });
    const grip = new THREE.MeshStandardMaterial({ color: 0x30271e, roughness: .94 });
    const H = BOW_LENGTH / 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -H, -.16), new THREE.Vector3(0, -H * .7067, .017),
      new THREE.Vector3(0, -H * .3533, .063), new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, H * .3533, .063), new THREE.Vector3(0, H * .7067, .017), new THREE.Vector3(0, H, -.16),
    ]);
    const limbs = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .027, 6, false), wood);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, .18, 8), grip);
    // A lit hemp cord from tip to nock to tip; a one-pixel unlit line read as a glowing wire beside the bow (playtest 5).
    const cord = new THREE.MeshStandardMaterial({ color: 0xe6dcc0, roughness: .9, emissive: 0x4a4333 });
    const piece = () => new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, 1, 5, 1, true), cord);
    this.string = new THREE.Group();
    this.string.add(piece(), piece());
    this.string.name = 'Hunting / drawn bow string';
    this.setString(-.14);
    this.bow.add(limbs, handle, this.string, this.nockedArrow);
    this.leftPalm.add(this.bow);
    // The back socket rides the upper spine, so the slung bow moves with his chest and shoulders (A75).
    this.back = new THREE.Group();
    this.back.name = 'Hunting / bow slung on the back';
    const spine = this.joint('Spine2') ?? this.joint('Spine1') ?? this.joint('Spine') ?? rig.torso ?? rig.root;
    rig.root.updateMatrixWorld(true);
    const up = SLUNG_UP, forward = Z.clone(), across = up.clone().cross(forward).normalize();
    const slung = new THREE.Matrix4().makeBasis(across, up, forward.clone().crossVectors(across, up)).setPosition(SLUNG_AT);
    new THREE.Matrix4().copy(spine.matrixWorld).invert().multiply(rig.root.matrixWorld).multiply(slung)
      .decompose(this.back.position, this.back.quaternion, this.back.scale);
    spine.add(this.back);
    this.sway.name = 'Hunting / slung bow swing';
    this.back.add(this.sway);
    const steel = new THREE.MeshStandardMaterial({ color: 0x958e82, roughness: .72, metalness: .5 });
    this.knife.name = 'Hunting / skinning knife in right palm';
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.023, .018, .18), steel);
    blade.position.z = .095;
    const knifeHandle = new THREE.Mesh(new THREE.CylinderGeometry(.019, .019, .085, 6), grip);
    knifeHandle.rotation.x = Math.PI / 2;
    knifeHandle.position.z = -.04;
    this.knife.add(blade, knifeHandle);
    this.rightPalm.add(this.knife);
    for (const holder of [this.bow, this.knife]) holder.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) (object as THREE.Mesh).castShadow = true;
    });
    this.bow.visible = this.knife.visible = false;
    rig.root.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      const positions = mesh.geometry.attributes.position;
      // A few actual sole vertices are enough for a bounded visual support correction during the crouch.
      const candidates: number[] = [];
      if (positions) for (let i = 0; i < positions.count; i++) if (positions.getY(i) < .05) candidates.push(i);
      this.skins.push({ mesh, vertices: candidates.filter((_, i) => i % Math.max(1, Math.floor(candidates.length / 32)) === 0) });
    });
  }

  get isAiming(): boolean { return this.equipped && this.aiming; }

  setEquipped(value: boolean): void {
    this.equipped = value;
    if (!value) { this.aiming = false; this.draw = this.recoil = 0; }
    this.bow.visible = value && this.skinProgress === null;
  }

  setAim(direction: { x: number; y: number; z: number } | null, draw = 0): void {
    this.aiming = direction !== null && [direction.x, direction.y, direction.z].every(Number.isFinite) &&
      direction.x * direction.x + direction.y * direction.y + direction.z * direction.z > 1e-8;
    if (this.aiming) { this.direction.set(direction!.x, direction!.y, direction!.z).normalize(); this.ready = BOW_READY_SECONDS; }
    this.draw = Number.isFinite(draw) ? clamp(draw, 0, 1) : 0;
  }

  setSkinning(progress: number | null, seconds = 0, targetHeight?: number): void {
    this.skinProgress = progress === null ? null : clamp(progress, 0, 1);
    this.skinClock = seconds;
    if (targetHeight !== undefined && Number.isFinite(targetHeight)) this.skinTargetHeight = clamp(targetHeight, .1, 1.1);
    this.knife.visible = progress !== null;
    this.bow.visible = this.equipped && progress === null;
  }

  release(): { origin: THREE.Vector3; direction: THREE.Vector3 } | null {
    if (!this.isAiming || this.skinProgress !== null) return null;
    this.rig.root.updateMatrixWorld(true);
    const origin = this.nockedArrow.getWorldPosition(new THREE.Vector3());
    this.draw = 0;
    this.recoil = .22;
    this.nockedArrow.visible = false;
    return { origin, direction: this.direction.clone() };
  }

  /** Whether the bow is in his hand (aiming, or ready after a shot) rather than slung on his back (A75). */
  get inHand(): boolean { return this.equipped && (this.aiming || this.ready > 0 || this.recoil > 0); }

  /** Must run before poseRig: remove exactly the previous overlay without accumulating its rotations. */
  restorePose(): void {
    for (const [object, pose] of this.modified) { object.position.copy(pose.position); object.quaternion.copy(pose.quaternion); }
    this.modified.clear();
  }

  apply(dt: number): void {
    this.rig.root.updateMatrixWorld(true);
    if (this.skinProgress !== null) { this.poseSkinning(); return; }
    this.knife.visible = false;
    this.bow.visible = this.equipped;
    if (!this.equipped) { this.ready = 0; return; }
    if (!this.aiming) this.ready = Math.max(0, this.ready - Math.max(0, dt));
    // Carried, the bow rides on his back and both hands hang free; it comes to hand to aim and shoot (A75).
    if (!this.inHand) {
      if (this.bow.parent !== this.sway) { this.sway.add(this.bow); this.swing.reset(); }
      this.bow.scale.setScalar(SLUNG_SCALE);
      // Flat across the back, the string lying along it; hung steeply (SLUNG_UP) so the upper limb stays inside his left
      // shoulder's outline (playtest 6). String side in sank the string into his back.
      this.bow.rotation.set(0, Math.PI / 2, 0);
      this.back.updateWorldMatrix(true, false);
      this.swing.update(dt, this.back.getWorldPosition(_p), this.back.getWorldQuaternion(_q).invert());
      this.sway.rotation.set(0, 0, this.swing.angle);
      this.sway.position.set(0, this.swing.bob, 0);
      this.nockedArrow.visible = false;
      this.setString(-.14);
      return;
    }
    if (this.bow.parent !== this.leftPalm) this.leftPalm.add(this.bow);
    this.bow.scale.setScalar(1);
    this.bow.rotation.set(0, 0, 0);
    const localDir = this.direction.clone().applyQuaternion(this.rig.root.getWorldQuaternion(new THREE.Quaternion()).invert());
    // At rest the bow hangs upright beside the leg, its back to the front and the string behind the grip (A69). It was
    // pitched 36° nose-down, which laid it diagonally across the thigh with the string cutting in front of the body.
    const bowDirection = this.aiming ? localDir : BOW_AT_REST;
    // Aiming, the arrow runs along the line of his jaw (A75; it was at his chest): the draw comes to his face, as Gothic 3's
    // archers draw.
    const hand = this.aiming ? new THREE.Vector3(.12, 1.55, 0).addScaledVector(bowDirection, .66) : new THREE.Vector3(.34, .9, .1);
    const recoil = this.recoil > 0 ? this.recoil / .22 : 0;
    this.clock += Math.max(0, dt);
    this.held = this.aiming && this.draw >= 1 ? this.held + Math.max(0, dt) : 0;
    if (this.aiming) {
      // The loose throws the bow hand forward and the limbs up (B11); a long hold at full draw starts to shake.
      const kick = recoil * recoil;
      hand.addScaledVector(bowDirection, .05 * kick).y += .035 * kick;
      const tremble = Math.min(1, Math.max(0, this.held - 1.2) / 2) * .006;
      if (tremble > 0) { hand.x += Math.sin(this.clock * 37) * tremble; hand.y += Math.sin(this.clock * 29 + 1.3) * tremble; }
    }
    if (this.aiming) {
      // An archer's stance (B11): the chest turns side-on, bow shoulder leading, so the bow arm reaches out past his body and
      // the bow, string and drawing hand read from the shoulder camera instead of hiding behind his back.
      const spine = this.joint('Spine') ?? this.rig.torso;
      if (spine) this.rotate(spine, 0, .24, 0);
      if (this.rig.torso) this.rotate(this.rig.torso, 0, .16, 0);
      // The head stays on the mark.
      if (this.rig.head) this.rotate(this.rig.head, 0, -.36, 0);
    }
    this.arm('Left', hand, new THREE.Vector3(.5, 1.3, .26));
    // Quaternion getters below refresh the root and grip ancestor paths.
    const frame = new THREE.Quaternion().setFromUnitVectors(Z, bowDirection).premultiply(this.rig.root.getWorldQuaternion(new THREE.Quaternion()));
    this.gripBow(frame);
    this.orientPalm(this.leftPalm, frame);
    // The limbs pitch up with the loose and spring back.
    this.bow.rotation.x = -.16 * recoil * recoil;
    this.recoil = Math.max(0, this.recoil - Math.max(0, dt));
    // The loosed string slaps past rest and rings down.
    const nock = -.14 - .39 * this.draw + (recoil > 0 ? Math.sin((1 - recoil) * Math.PI * 7) * .035 * recoil : 0);
    this.setString(nock);
    this.nockedArrow.visible = this.aiming && this.recoil <= 0;
    this.nockedArrow.position.set(0, 0, nock + .74);
    // localToWorld refreshes the reparented bow before solving the draw arm.
    if (this.aiming) {
      const nockWorld = this.bow.localToWorld(new THREE.Vector3(0, 0, nock));
      const target = this.rig.root.worldToLocal(nockWorld).add(new THREE.Vector3(-.025 - recoil * .13, .005, -recoil * .08));
      // The draw elbow rises and comes back behind the line of the arrow as the string does (B11).
      this.arm('Right', target, new THREE.Vector3(-.55, 1.62 + .22 * this.draw, -.05 - .18 * this.draw));
      this.orientPalm(this.rightPalm, frame);
      this.closeFingers('Right', .7, 'draw');
    }
    this.closeFingers('Left', .95, 'bow');
    this.rig.root.updateMatrixWorld(true);
  }

  dispose(): void {
    this.restorePose();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    for (const holder of [this.leftPalm, this.rightPalm, this.back]) {
      holder.removeFromParent();
      holder.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.geometry || !mesh.material) return;
        geometries.add(mesh.geometry);
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
      });
    }
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
  }

  private poseSkinning(): void {
    this.bow.visible = false;
    this.knife.visible = true;
    const p = this.skinProgress!;
    const amount = smooth(p / .15) * smooth((1 - p) / .15);
    if (!this.rig.hips || !this.rig.body) return;
    const leftTarget = this.leftFoot?.getWorldPosition(new THREE.Vector3());
    const rightTarget = this.rightFoot?.getWorldPosition(new THREE.Vector3());
    const leftRotation = this.leftFoot?.getWorldQuaternion(new THREE.Quaternion());
    const rightRotation = this.rightFoot?.getWorldQuaternion(new THREE.Quaternion());
    this.remember(this.rig.hips);
    const crouch = .5 + clamp((.4 - this.skinTargetHeight) * .9, 0, .22);
    this.rig.hips.position.y -= crouch * amount;
    this.rig.root.updateMatrixWorld(true);
    if (leftTarget && rightTarget && this.leftFoot && this.rightFoot) {
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.rig.root.getWorldQuaternion(new THREE.Quaternion()));
      leftTarget.addScaledVector(forward, .16 * amount);
      rightTarget.addScaledVector(forward, -.3 * amount);
      this.chain(this.rig.legL, this.rig.kneeL, this.leftFoot, leftTarget, this.world(new THREE.Vector3(.19, .4, .62)));
      this.chain(this.rig.legR, this.rig.kneeR, this.rightFoot, rightTarget, this.world(new THREE.Vector3(-.18, .08, -.05)));
      this.worldRotation(this.leftFoot, leftRotation!);
      this.worldRotation(this.rightFoot, rightRotation!);
    }
    this.rotate(this.joint('Spine') ?? this.rig.torso, .42 * amount, 0, 0);
    this.rotate(this.rig.torso, .24 * amount, 0, 0);
    this.rotate(this.rig.head, .25 * amount, 0, 0);
    const stroke = Math.sin(this.skinClock * Math.PI * 3.2) * .065 * amount;
    this.armPalm('Left', new THREE.Vector3(.2, THREE.MathUtils.lerp(1.1, this.skinTargetHeight + .09, amount), .22 + .4 * amount), new THREE.Vector3(.46, .6, .38));
    this.armPalm('Right', new THREE.Vector3(-.1 + stroke, THREE.MathUtils.lerp(1.05, this.skinTargetHeight + .14, amount), .25 + .29 * amount), new THREE.Vector3(-.44, .6, .34));
    const toolQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(.7 + stroke * 2, .25, -.15)).premultiply(this.rig.root.getWorldQuaternion(new THREE.Quaternion()));
    this.orientPalm(this.rightPalm, toolQ);
    this.closeFingers('Right', .94, 'knife');
    this.closeFingers('Left', .35, 'hide');
    // Keep the visual soles above the physics-owned floor without moving the authoritative player.
    this.rig.root.updateMatrixWorld(true);
    let lowest = Infinity;
    const point = new THREE.Vector3();
    for (const { mesh, vertices } of this.skins) for (const vertex of vertices) {
      mesh.getVertexPosition(vertex, point);
      lowest = Math.min(lowest, this.rig.root.worldToLocal(mesh.localToWorld(point)).y);
    }
    if (Number.isFinite(lowest) && lowest < -.004) {
      this.remember(this.rig.body);
      this.rig.body.position.y += Math.min(.15, -lowest);
    }
    this.rig.root.updateMatrixWorld(true);
  }

  /** Lays the cord from each tip to the nock, `nock` metres along the bow's z (−0.14 at rest, further back drawn). */
  private setString(nock: number): void {
    const tips = [_tipLow.set(0, -BOW_LENGTH / 2, -.16), _tipHigh.set(0, BOW_LENGTH / 2, -.16)], at = _nock.set(0, 0, nock);
    this.string.children.forEach((segment, i) => {
      const tip = tips[i]!;
      segment.position.copy(tip).add(at).multiplyScalar(.5);
      segment.quaternion.setFromUnitVectors(_yAxis, _dir.copy(at).sub(tip).normalize());
      segment.scale.set(1, tip.distanceTo(at), 1);
    });
  }

  private joint(part: string): THREE.Object3D | null {
    if (!this.joints.has(part)) this.joints.set(part, this.rig.root.getObjectByName(`mixamorig${part}`) ?? this.rig.root.getObjectByName(`mixamorig:${part}`) ?? null);
    return this.joints.get(part)!;
  }

  private palm(side: 'Left' | 'Right', hand: THREE.Object3D): THREE.Group {
    const socket = new THREE.Group();
    socket.name = `Hunting / ${side.toLowerCase()} palm equipment socket`;
    const middle = this.joint(`${side}HandMiddle1`), pinky = this.joint(`${side}HandPinky1`);
    if (middle && pinky) socket.position.copy(middle.position).lerp(pinky.position, .5);
    else socket.position.set(0, -.25, 0);
    hand.add(socket);
    return socket;
  }

  private arm(side: 'Left' | 'Right', target: THREE.Vector3, pole: THREE.Vector3): void {
    this.chain(side === 'Left' ? this.rig.armL : this.rig.armR, side === 'Left' ? this.rig.elbowL : this.rig.elbowR,
      side === 'Left' ? this.leftHand : this.rightHand, this.world(target), this.world(pole));
  }

  /** The imported palm is offset from its wrist: solve that real grip point, not just the wrist joint. */
  private armPalm(side: 'Left' | 'Right', target: THREE.Vector3, pole: THREE.Vector3): void {
    this.arm(side, target, pole);
    const palm = side === 'Left' ? this.leftPalm : this.rightPalm;
    const hand = side === 'Left' ? this.leftHand : this.rightHand;
    const desired = this.world(target);
    for (let i = 0; i < 3; i++) {
      // Each getter refreshes the affected hand/palm path after the previous correction.
      const actual = palm.getWorldPosition(new THREE.Vector3());
      const wrist = hand.getWorldPosition(new THREE.Vector3()).add(desired.clone().sub(actual));
      this.chain(side === 'Left' ? this.rig.armL : this.rig.armR, side === 'Left' ? this.rig.elbowL : this.rig.elbowR,
        hand, wrist, this.world(pole));
    }
  }

  private chain(upper: THREE.Object3D | undefined, lower: THREE.Object3D | undefined, end: THREE.Object3D,
    target: THREE.Vector3, pole: THREE.Vector3): void {
    if (!upper || !lower || lower === end) return;
    // World-position getters refresh their ancestor paths; no full hero walk is needed here.
    const start = upper.getWorldPosition(new THREE.Vector3()), middle = lower.getWorldPosition(new THREE.Vector3()), tip = end.getWorldPosition(new THREE.Vector3());
    const a = start.distanceTo(middle), b = middle.distanceTo(tip);
    if (a < .01 || b < .01) return;
    const toward = target.clone().sub(start);
    const distance = clamp(toward.length(), Math.abs(a - b) + .001, a + b - .001);
    const axis = toward.normalize();
    const bend = pole.clone().sub(start);
    bend.addScaledVector(axis, -bend.dot(axis));
    if (bend.lengthSq() < 1e-8) bend.copy(Y).addScaledVector(axis, -Y.dot(axis));
    bend.normalize();
    const along = (a * a - b * b + distance * distance) / (2 * distance);
    const knee = start.clone().addScaledVector(axis, along).addScaledVector(bend, Math.sqrt(Math.max(0, a * a - along * along)));
    this.aimJoint(upper, lower, knee);
    this.aimJoint(lower, end, target);
  }

  private aimJoint(bone: THREE.Object3D, child: THREE.Object3D, target: THREE.Vector3): void {
    const start = bone.getWorldPosition(new THREE.Vector3());
    const from = child.getWorldPosition(new THREE.Vector3()).sub(start).normalize();
    const to = target.clone().sub(start).normalize();
    const next = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(from, to));
    this.worldRotation(bone, next);
  }

  private worldRotation(object: THREE.Object3D, next: THREE.Quaternion): void {
    this.remember(object);
    object.quaternion.copy(object.parent ? object.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(next) : next);
    object.updateMatrixWorld(true);
  }

  private rotate(object: THREE.Object3D, x: number, y: number, z: number): void {
    const rootQ = this.rig.root.getWorldQuaternion(new THREE.Quaternion());
    const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).premultiply(rootQ).multiply(rootQ.clone().invert());
    this.worldRotation(object, object.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta));
  }

  /**
   * The authored hero holds the grip through his own hands, faded in and out with his other grips (A71); a figure
   * without them closes its fingers here.
   */
  private closeFingers(side: 'Left' | 'Right', amount: number, grip: HeroGrip): void {
    if (this.rig.hero) { this.rig.hero.holdGrip(side, grip); return; }
    for (const part of ['Middle', 'Pinky', 'Ring', 'Thumb']) for (const i of [1, 2, 3, 4]) {
      const finger = this.joint(`${side}Hand${part}${i}`);
      if (!finger) continue;
      this.remember(finger);
      finger.rotateZ((side === 'Left' ? -1 : 1) * amount * (part === 'Thumb' ? .4 : .65));
    }
  }

  /**
   * Turn the bow hand itself to the bow (A69): the hand points along the arrow's line and the knuckles run up the limbs,
   * so the fist closes round the handle. Only the palm socket used to turn, leaving the hand at whatever angle the arm
   * solve left it, so the bow passed through the fist askew.
   */
  private gripBow(frame: THREE.Quaternion): void {
    const middle = this.joint('LeftHandMiddle1'), pinky = this.joint('LeftHandPinky1');
    if (!middle || !pinky) return;
    // The hand's own axes: along it (wrist to the middle knuckle) and across the knuckles (little finger to middle).
    const along = middle.position.clone().normalize();
    const across = middle.position.clone().sub(pinky.position);
    across.addScaledVector(along, -across.dot(along)).normalize();
    // Where they should point: along the arrow's line, and up the bow's limbs.
    const aim = Z.clone().applyQuaternion(frame), up = Y.clone().applyQuaternion(frame);
    up.addScaledVector(aim, -up.dot(aim)).normalize();
    const local = new THREE.Matrix4().makeBasis(along, across, along.clone().cross(across));
    const wanted = new THREE.Matrix4().makeBasis(aim, up, aim.clone().cross(up));
    this.worldRotation(this.leftHand, new THREE.Quaternion().setFromRotationMatrix(wanted.multiply(local.transpose())));
  }

  private orientPalm(socket: THREE.Object3D, world: THREE.Quaternion): void {
    this.worldRotation(socket, world);
  }

  private world(local: THREE.Vector3): THREE.Vector3 { return this.rig.root.localToWorld(local.clone()); }

  private remember(object: THREE.Object3D): void {
    if (this.modified.has(object)) return;
    let snapshot = this.snapshots.get(object);
    if (!snapshot) {
      snapshot = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
      this.snapshots.set(object, snapshot);
    }
    // The animation may have changed since restorePose: save this frame's base pose, once per joint.
    snapshot.position.copy(object.position); snapshot.quaternion.copy(object.quaternion);
    this.modified.set(object, snapshot);
  }
}
