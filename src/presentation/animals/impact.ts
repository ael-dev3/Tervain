import * as THREE from 'three';
import type { AnimalGround } from './navigation';
import type { AnimalArrowHit } from './hit';
import type { AnimalRig } from './rig';

const CAPACITY = 48;
interface Droplet { position: THREE.Vector3; velocity: THREE.Vector3; life: number; size: number }

/** Small, bounded feedback. Gameplay and wound persistence remain in the domain records. */
export class AnimalImpactEffects {
  readonly group = new THREE.Group();
  private blood = new THREE.MeshStandardMaterial({ color: 0x531515, roughness: .93, metalness: 0, transparent: true, opacity: .78, depthWrite: false });
  private dropletGeometry = new THREE.SphereGeometry(1, 5, 3);
  private stainGeometry = new THREE.CircleGeometry(1, 9);
  private droplets = new THREE.InstancedMesh(this.dropletGeometry, this.blood, CAPACITY);
  private particles: Droplet[] = [];
  private stains = new Map<string, THREE.Group>();
  private arrows = new Map<string, THREE.Group[]>();
  private arrowGeometry = new THREE.CylinderGeometry(.004, .004, .55, 4);
  private arrowMaterial = new THREE.MeshStandardMaterial({ color: 0x6a4932, roughness: .9 });
  private pointGeometry = new THREE.ConeGeometry(.017, .065, 4);
  private pointMaterial = new THREE.MeshStandardMaterial({ color: 0x80786b, metalness: .35, roughness: .66 });
  private featherGeometry = new THREE.BoxGeometry(.035, .08, .002);
  private featherMaterial = new THREE.MeshStandardMaterial({ color: 0x948778, roughness: 1 });
  private dummy = new THREE.Object3D();
  private disposed = false;
  private reduced = false;

  constructor(private terrain: AnimalGround) {
    this.group.name = 'animal impact effects'; this.group.add(this.droplets);
    this.droplets.count = 0; this.droplets.frustumCulled = false;
  }

  impact(rig: AnimalRig, hit: AnimalArrowHit, direction: THREE.Vector3, reducedMotion = false) {
    if (this.disposed) return;
    const point = new THREE.Vector3(hit.point.x, hit.point.y, hit.point.z), incoming = direction.clone().normalize();
    const count = reducedMotion || this.reduced || !hit.zone ? 0 : 6;
    for (let i = 0; i < count; i++) {
      if (this.particles.length === CAPACITY) this.particles.shift();
      const angle = i * 2.39996;
      this.particles.push({ position: point.clone(), velocity: incoming.clone().multiplyScalar(-.3)
        .add(new THREE.Vector3(Math.cos(angle) * .45, .25 + i * .055, Math.sin(angle) * .45)), life: .45 + i * .025, size: .009 + (i % 3) * .004 });
    }
    const embeds = this.arrows.get(hit.id) ?? [];
    if (embeds.length < 2) {
      const arrow = new THREE.Group(); arrow.name = 'embedded hunting arrow';
      const shaft = new THREE.Mesh(this.arrowGeometry, this.arrowMaterial); shaft.position.y = -.23; arrow.add(shaft);
      const tip = new THREE.Mesh(this.pointGeometry, this.pointMaterial); tip.position.y = .02; arrow.add(tip);
      for (const angle of [0, Math.PI / 2]) {
        const feather = new THREE.Mesh(this.featherGeometry, this.featherMaterial); feather.position.y = -.45; feather.rotation.y = angle; arrow.add(feather);
      }
      const anchor = rig.asset.scene.getObjectByName(hit.zone === 'head' ? 'Head' : 'Chest') ?? rig.root;
      anchor.updateWorldMatrix(true, false);
      arrow.position.copy(anchor.worldToLocal(point.clone()));
      const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), incoming);
      arrow.quaternion.copy(anchor.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
      anchor.add(arrow); embeds.push(arrow); this.arrows.set(hit.id, embeds);
    }
  }

  carcass(id: string, position: { x: number; z: number }, radius: number) {
    if (this.disposed || this.stains.has(id)) return;
    const stain = new THREE.Group(); stain.name = `carcass stain:${id}`;
    for (let patch = 0; patch < 3; patch++) {
      const angle = patch * 2.4, x = position.x + Math.cos(angle) * radius * .16, z = position.z + Math.sin(angle) * radius * .16;
      const mesh = new THREE.Mesh(this.stainGeometry, this.blood); mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, this.terrain.heightAt(x, z) + .018, z); mesh.scale.set(radius * (.32 + patch * .06), radius * (.18 + patch * .025), 1);
      stain.add(mesh);
    }
    this.stains.set(id, stain); this.group.add(stain);
    stain.userData.center = { x: position.x, z: position.z };
    stain.visible = !this.reduced;
  }

  moveCarcass(id: string, position: { x: number; z: number }) {
    const stain = this.stains.get(id);
    if (!stain) return;
    const previous = stain.userData.center as { x: number; z: number };
    if (Math.hypot(position.x - previous.x, position.z - previous.z) < .001) return;
    stain.position.x += position.x - previous.x; stain.position.z += position.z - previous.z;
    for (const patch of stain.children) patch.position.y = this.terrain.heightAt(patch.position.x + stain.position.x, patch.position.z + stain.position.z) + .018;
    stain.userData.center = { x: position.x, z: position.z };
  }

  setReduced(value: boolean) {
    this.reduced = value;
    if (value) { this.particles.length = 0; this.droplets.count = 0; }
    for (const stain of this.stains.values()) stain.visible = !value;
  }

  releaseRig(id: string) {
    for (const arrow of this.arrows.get(id) ?? []) arrow.removeFromParent();
    this.arrows.delete(id);
  }

  clearCarcass(id: string) {
    this.stains.get(id)?.removeFromParent(); this.stains.delete(id); this.releaseRig(id);
  }

  update(dt: number) {
    if (this.disposed) return;
    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      if (particle.life <= 0) return false;
      particle.velocity.y -= 3.6 * dt; particle.position.addScaledVector(particle.velocity, dt);
      if (particle.position.y <= this.terrain.heightAt(particle.position.x, particle.position.z) + .015) return false;
      return true;
    });
    this.droplets.count = this.particles.length;
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i]!; this.dummy.position.copy(particle.position); this.dummy.scale.setScalar(particle.size);
      this.dummy.updateMatrix(); this.droplets.setMatrixAt(i, this.dummy.matrix);
    }
    this.droplets.instanceMatrix.needsUpdate = true;
  }

  stats() { return { droplets: this.particles.length, stains: this.stains.size, embeddedArrows: [...this.arrows.values()].reduce((sum, arrows) => sum + arrows.length, 0) }; }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const id of this.arrows.keys()) this.releaseRig(id);
    this.group.clear(); this.group.removeFromParent(); this.stains.clear(); this.particles.length = 0;
    for (const geometry of [this.dropletGeometry, this.stainGeometry, this.arrowGeometry, this.pointGeometry, this.featherGeometry]) geometry.dispose();
    for (const material of [this.blood, this.arrowMaterial, this.pointMaterial, this.featherMaterial]) material.dispose();
    this.droplets.dispose();
  }
}
