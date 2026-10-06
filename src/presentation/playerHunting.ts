import * as THREE from 'three';
import type { Rig } from './characters';
import { createHuntingArrow } from './huntingArrow';

type Snapshot = { position: THREE.Vector3; quaternion: THREE.Quaternion };
const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const smooth = (t: number) => { const v = clamp(t, 0, 1); return v * v * (3 - 2 * v); };

/** Additive native-skeleton poses and palm attachments; the original hero mesh and locomotion stay intact. */
export class PlayerHuntingVisual {
  readonly bow = new THREE.Group();
  readonly nockedArrow = createHuntingArrow();
  readonly knife = new THREE.Group();
  private readonly modified = new Map<THREE.Object3D, Snapshot>();
  private readonly leftPalm: THREE.Group;
  private readonly rightPalm: THREE.Group;
  private readonly leftHand: THREE.Object3D;
  private readonly rightHand: THREE.Object3D;
  private readonly leftFoot: THREE.Object3D | null;
  private readonly rightFoot: THREE.Object3D | null;
  private readonly string: THREE.Line;
  private readonly skins: { mesh: THREE.SkinnedMesh; vertices: number[] }[] = [];
  private readonly joints = new Map<string, THREE.Object3D | null>();
  private direction = new THREE.Vector3(0, 0, 1);
  private equipped = false;
  private aiming = false;
  private draw = 0;
  private recoil = 0;
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
    const wood = new THREE.MeshStandardMaterial({ color: 0x77523a, roughness: .86 });
    const grip = new THREE.MeshStandardMaterial({ color: 0x30271e, roughness: .94 });
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -.65, -.14), new THREE.Vector3(0, -.46, .015),
      new THREE.Vector3(0, -.23, .055), new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, .23, .055), new THREE.Vector3(0, .46, .015), new THREE.Vector3(0, .65, -.14),
    ]);
    const limbs = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .018, 6, false), wood);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, .18, 8), grip);
    this.string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -.65, -.14), new THREE.Vector3(0, 0, -.14), new THREE.Vector3(0, .65, -.14),
    ]), new THREE.LineBasicMaterial({ color: 0xd7c8a6 }));
    this.string.name = 'Hunting / drawn bow string';
    this.bow.add(limbs, handle, this.string, this.nockedArrow);
    this.leftPalm.add(this.bow);
    const steel = new THREE.MeshStandardMaterial({ color: 0x958e82, roughness: .65, metalness: .58 });
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
    if (this.aiming) this.direction.set(direction!.x, direction!.y, direction!.z).normalize();
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
    if (!this.equipped) return;
    const localDir = this.direction.clone().applyQuaternion(this.rig.root.getWorldQuaternion(new THREE.Quaternion()).invert());
    const bowDirection = this.aiming ? localDir : new THREE.Vector3(.1, -.55, .75).normalize();
    const hand = this.aiming ? new THREE.Vector3(.12, 1.42, 0).addScaledVector(bowDirection, .66) : new THREE.Vector3(.32, .92, .12);
    this.arm('Left', hand, new THREE.Vector3(.5, 1.3, .26));
    this.rig.root.updateMatrixWorld(true);
    const frame = new THREE.Quaternion().setFromUnitVectors(Z, bowDirection).premultiply(this.rig.root.getWorldQuaternion(new THREE.Quaternion()));
    this.orientPalm(this.leftPalm, frame);
    const recoil = this.recoil > 0 ? this.recoil / .22 : 0;
    this.recoil = Math.max(0, this.recoil - Math.max(0, dt));
    const nock = -.14 - .39 * this.draw;
    const positions = this.string.geometry.attributes.position as THREE.BufferAttribute;
    positions.setXYZ(1, 0, 0, nock);
    positions.needsUpdate = true;
    this.string.geometry.computeBoundingSphere();
    this.nockedArrow.visible = this.aiming && this.recoil <= 0;
    this.nockedArrow.position.set(0, 0, nock + .74);
    this.rig.root.updateMatrixWorld(true);
    if (this.aiming) {
      const nockWorld = this.bow.localToWorld(new THREE.Vector3(0, 0, nock));
      const target = this.rig.root.worldToLocal(nockWorld).add(new THREE.Vector3(-.025 - recoil * .13, .005, -recoil * .08));
      this.arm('Right', target, new THREE.Vector3(-.55, 1.42, .08));
      this.orientPalm(this.rightPalm, frame);
      this.closeFingers('Right', .7);
    }
    this.closeFingers('Left', .95);
    this.rig.root.updateMatrixWorld(true);
  }

  dispose(): void {
    this.restorePose();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    for (const holder of [this.leftPalm, this.rightPalm]) {
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
    this.closeFingers('Right', .94);
    this.closeFingers('Left', .35);
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
      this.rig.root.updateMatrixWorld(true);
      const actual = palm.getWorldPosition(new THREE.Vector3());
      const wrist = hand.getWorldPosition(new THREE.Vector3()).add(desired.clone().sub(actual));
      this.chain(side === 'Left' ? this.rig.armL : this.rig.armR, side === 'Left' ? this.rig.elbowL : this.rig.elbowR,
        hand, wrist, this.world(pole));
    }
  }

  private chain(upper: THREE.Object3D | undefined, lower: THREE.Object3D | undefined, end: THREE.Object3D,
    target: THREE.Vector3, pole: THREE.Vector3): void {
    if (!upper || !lower || lower === end) return;
    this.rig.root.updateMatrixWorld(true);
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

  private closeFingers(side: 'Left' | 'Right', amount: number): void {
    for (const part of ['Middle', 'Pinky', 'Ring', 'Thumb']) for (const i of [1, 2, 3, 4]) {
      const finger = this.joint(`${side}Hand${part}${i}`);
      if (!finger) continue;
      this.remember(finger);
      if (!this.rig.hero?.applyHandGrip) finger.rotateZ((side === 'Left' ? -1 : 1) * amount * (part === 'Thumb' ? .4 : .65));
    }
    this.rig.hero?.applyHandGrip?.(side, amount);
  }

  private orientPalm(socket: THREE.Object3D, world: THREE.Quaternion): void {
    this.worldRotation(socket, world);
  }

  private world(local: THREE.Vector3): THREE.Vector3 { return this.rig.root.localToWorld(local.clone()); }

  private remember(object: THREE.Object3D): void {
    if (!this.modified.has(object)) this.modified.set(object, { position: object.position.clone(), quaternion: object.quaternion.clone() });
  }
}
