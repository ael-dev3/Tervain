import * as THREE from 'three';

interface BonePose { bone: THREE.Bone; position: THREE.Vector3; rotation: THREE.Quaternion; scale: THREE.Vector3 }
interface Support { mesh: THREE.SkinnedMesh; vertex: number; x: number }
export interface CorpseBody {
  scene: THREE.Group; root: THREE.Group; bounds: THREE.Box3; size: THREE.Vector3;
  skeletons: ReadonlySet<THREE.Skeleton>;
  animation: { mixer: THREE.AnimationMixer; reset(): void };
}
type Ground = { heightAt(x: number, z: number): number; normalAt(x: number, z: number, out: [number, number, number]): unknown };

/** An articulated collapse owns bone poses, never a second mixer or animal asset. */
export class AnimalCorpse {
  private rest: BonePose[] = [];
  private meshes: THREE.SkinnedMesh[] = [];
  private supports: Support[] = [];
  private death: { elapsed: number; side: number; position: THREE.Vector3; rotation: THREE.Quaternion; poses: (BonePose & { end: THREE.Quaternion; endPosition: THREE.Vector3; endScale: THREE.Vector3 })[] } | null = null;
  private scanMesh = 0;
  private scanVertex = 0;
  private exactSupport = 0;
  private surfaceBounds = new THREE.Box3();
  private contactBounds = new THREE.Box3();
  private point = new THREE.Vector3();
  private up = new THREE.Vector3();
  private forward = new THREE.Vector3();
  private right = new THREE.Vector3();
  private basis = new THREE.Matrix4();
  private turn = new THREE.Quaternion();
  private normal: [number, number, number] = [0, 1, 0];
  constructor(private body: CorpseBody, private crowned: boolean) {
    const patches = new Map<string, { min: Support; max: Support }>(), inverse = body.scene.matrixWorld.clone().invert();
    body.scene.traverse(object => {
      if ((object as THREE.Bone).isBone) this.rest.push({ bone: object as THREE.Bone, position: object.position.clone(), rotation: object.quaternion.clone(), scale: object.scale.clone() });
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      this.meshes.push(mesh);
      const positions = mesh.geometry.getAttribute('position');
      for (let vertex = 0; vertex < positions.count; vertex++) {
        this.point.fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
        const y = THREE.MathUtils.clamp(Math.floor((this.point.y - body.bounds.min.y) / Math.max(.001, body.size.y) * 4), 0, 3);
        const z = THREE.MathUtils.clamp(Math.floor((this.point.z - body.bounds.min.z) / Math.max(.001, body.size.z) * 6), 0, 5);
        const key = `${y},${z}`, sample = { mesh, vertex, x: this.point.x }, patch = patches.get(key);
        if (!patch) patches.set(key, { min: sample, max: sample });
        else { if (sample.x < patch.min.x) patch.min = sample; if (sample.x > patch.max.x) patch.max = sample; }
      }
    });
    this.supports = [...new Set([...patches.values()].flatMap(patch => [patch.min, patch.max]))];
  }

  begin(id: string, immediate: boolean) {
    if (!this.death) {
      // Stopping actions restores their original bindings. Snapshot first so a running animal never snaps to rest.
      const poses = this.rest.map(rest => {
        const rotation = new THREE.Euler(), side = Number(id.slice(-1)) % 2 ? -1 : 1, name = rest.bone.name;
        if (/^(frontShoulder|frontUpper)/.test(name)) { rotation.x = -.28; rotation.z = side * .12; }
        if (/^(hindHip|hindUpper)/.test(name)) { rotation.x = .38; rotation.z = side * .12; }
        if (/^(frontElbow|hindKnee|frontLower|hindLower)/.test(name)) rotation.x = .48;
        if (/^(frontWrist|hindHock|frontPaw|hindPaw)/.test(name)) rotation.x = -.18;
        if (name === 'neck') rotation.x = .18;
        if (name === 'head') { rotation.x = .24; rotation.z = side * .12; if (this.crowned) rotation.y = -side * .6; }
        if (/^tail/.test(name)) rotation.x = .2;
        return { bone: rest.bone, position: rest.bone.position.clone(), rotation: rest.bone.quaternion.clone(), scale: rest.bone.scale.clone(),
          end: rest.rotation.clone().multiply(new THREE.Quaternion().setFromEuler(rotation)), endPosition: rest.position.clone(), endScale: rest.scale.clone() };
      });
      this.death = { elapsed: immediate ? 1 : 0, side: Number(id.slice(-1)) % 2 ? -1 : 1, position: this.body.root.position.clone(), rotation: this.body.root.quaternion.clone(), poses };
      this.body.animation.mixer.stopAllAction();
      for (const pose of poses) { pose.bone.position.copy(pose.position); pose.bone.quaternion.copy(pose.rotation); pose.bone.scale.copy(pose.scale); }
    } else if (immediate) this.death.elapsed = 1;
  }

  /** At most 48 flank samples per complete actor. The final exact scan consumes a shared per-frame budget. */
  update(dt: number, terrain: Ground, position: { x: number; z: number }, yaw: number, scanBudget: number): number {
    const death = this.death;
    if (!death) return 0;
    death.elapsed = Math.min(1, death.elapsed + Math.max(0, dt) / .9);
    const phase = death.elapsed * death.elapsed * (3 - 2 * death.elapsed);
    for (const pose of death.poses) {
      pose.bone.position.lerpVectors(pose.position, pose.endPosition, phase); pose.bone.scale.lerpVectors(pose.scale, pose.endScale, phase);
      pose.bone.quaternion.slerpQuaternions(pose.rotation, pose.end, phase);
    }
    terrain.normalAt(position.x, position.z, this.normal); this.up.set(...this.normal);
    this.forward.set(Math.sin(yaw), 0, Math.cos(yaw)).addScaledVector(this.up, -this.forward.dot(this.up)).normalize();
    this.right.crossVectors(this.up, this.forward).normalize(); this.forward.crossVectors(this.right, this.up).normalize();
    this.basis.makeBasis(this.right, this.up, this.forward); this.turn.setFromRotationMatrix(this.basis)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), death.side * Math.PI / 2 * phase));
    this.body.root.quaternion.slerpQuaternions(death.rotation, this.turn, phase);
    this.body.root.position.set(position.x, terrain.heightAt(position.x, position.z) + .006, position.z);
    this.body.root.updateMatrixWorld(true); this.body.skeletons.forEach(skeleton => skeleton.update());
    let support = this.exactSupport;
    if (!this.ready) for (const surface of this.supports) {
      surface.mesh.getVertexPosition(surface.vertex, this.point).applyMatrix4(surface.mesh.matrixWorld);
      support = Math.max(support, terrain.heightAt(this.point.x, this.point.z) + .006 - this.point.y);
    }
    let scanned = 0;
    if (death.elapsed === 1) while (this.scanMesh < this.meshes.length && scanned < scanBudget) {
      const mesh = this.meshes[this.scanMesh]!, count = mesh.geometry.getAttribute('position').count;
      while (this.scanVertex < count && scanned < scanBudget) {
        mesh.getVertexPosition(this.scanVertex++, this.point).applyMatrix4(mesh.matrixWorld); scanned++;
        this.exactSupport = Math.max(this.exactSupport, terrain.heightAt(this.point.x, this.point.z) + .006 - this.point.y);
        this.surfaceBounds.expandByPoint(this.point);
      }
      if (this.scanVertex === count) { this.scanMesh++; this.scanVertex = 0; }
    }
    const correction = Math.max(support, this.exactSupport);
    this.body.root.position.y = THREE.MathUtils.lerp(death.position.y, this.body.root.position.y + correction, phase);
    if (this.ready) this.contactBounds.copy(this.surfaceBounds).translate(this.up.set(0, correction, 0));
    this.body.root.updateMatrixWorld(true);
    return scanned;
  }

  reset() {
    this.death = null; this.scanMesh = this.scanVertex = this.exactSupport = 0;
    this.surfaceBounds.makeEmpty(); this.contactBounds.makeEmpty();
    for (const pose of this.rest) { pose.bone.position.copy(pose.position); pose.bone.quaternion.copy(pose.rotation); pose.bone.scale.copy(pose.scale); }
    this.body.animation.reset();
  }
  get isDead() { return !!this.death; }
  get ready() { return this.death?.elapsed === 1 && this.scanMesh === this.meshes.length; }
  get bounds(): THREE.Box3 | null { return this.ready ? this.contactBounds : null; }
}
