import * as THREE from 'three';
import { Batch, Ctx } from './buildKit';

/** The existing success response lasts 2.5 seconds; the channel and quest effects remain in App/Game. */
const DURATION = 2.5;
const WATER_RADIUS = 0.323;
const ASH_SURFACE = -0.139;

export interface RiteResponse {
  play(): void;
  update(dt: number, reducedMotion: boolean, nightness: number): void;
  dispose(): void;
}

/** A small physical response confined to the shrine's bowl and the stone directly beneath it. */
export function buildRiteResponse(anchor: THREE.Object3D): RiteResponse {
  const bowl = anchor.children.find((o) => (o as THREE.Mesh).geometry instanceof THREE.CylinderGeometry) as THREE.Mesh;
  const water = anchor.children.find((o) => (o as THREE.Mesh).geometry instanceof THREE.CircleGeometry) as THREE.Mesh;
  if (!bowl || !water) throw new Error('The rite response needs its physical bowl and water surface.');

  // A closed-bottom, hollow stone cup. Its base meets the altar slab at local y=-0.14.
  // The old solid cylinder concealed the water and floated four centimetres above the slab.
  const cup = new Batch(new Ctx(), 'rite-bowl');
  cup.lathe([0, -0.14, 0.27, -0.14, 0.32, -0.09, 0.42, 0.06, 0.36, 0.06, 0.25, -0.075, 0, -0.075], 16, 0, 0, 0, 0xffffff, { flat: true, jit: 0, amp: 0 });
  bowl.geometry.dispose();
  bowl.geometry = cup.toGeometry()!;

  const segments = 24, rings = 3;
  const positions = new Float32Array((1 + segments * rings) * 3);
  const indices: number[] = [];
  for (let ring = 0; ring < rings; ring++) {
    for (let i = 0; i < segments; i++) {
      const a = i / segments * Math.PI * 2;
      const r = WATER_RADIUS * (ring + 1) / rings;
      const k = (1 + ring * segments + i) * 3;
      positions[k] = Math.cos(a) * r;
      positions[k + 1] = Math.sin(a) * r;
      const next = (i + 1) % segments;
      if (ring === 0) indices.push(0, 1 + i, 1 + next);
      else {
        const inner = 1 + (ring - 1) * segments;
        const outer = inner + segments;
        indices.push(inner + i, outer + i, outer + next, inner + i, outer + next, inner + next);
      }
    }
  }
  const waterGeo = new THREE.BufferGeometry();
  waterGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  waterGeo.setIndex(indices);
  waterGeo.computeVertexNormals();
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x53615d, roughness: 0.28, metalness: 0.08 });
  water.geometry.dispose();
  for (const m of Array.isArray(water.material) ? water.material : [water.material]) m.dispose();
  water.geometry = waterGeo;
  water.material = waterMat;
  // Inside the cup below its rim, rather than coplanar with a solid stone cap.
  water.position.y = 0.022;
  water.name = 'rite-water';

  const response = new THREE.Group();
  response.name = 'rite-response';
  response.visible = false;
  anchor.add(response);
  const ashPositions = new Float32Array(8 * 9);
  for (let i = 0; i < 8; i++) {
    const a = i * 2.39996;
    const r = 0.48 + (i % 3) * 0.035;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    ashPositions.set([x - 0.018, ASH_SURFACE, z + 0.011, x + 0.024, ASH_SURFACE, z + 0.016, x + 0.003, ASH_SURFACE, z - 0.019], i * 9);
  }
  const ashGeo = new THREE.BufferGeometry();
  ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPositions, 3));
  ashGeo.computeVertexNormals();
  const ashMat = new THREE.MeshStandardMaterial({ color: 0xa18f77, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  const ash = new THREE.Mesh(ashGeo, ashMat);
  ash.name = 'rite-ash';
  response.add(ash);
  const light = new THREE.PointLight(0xe2c191, 0, 2.1, 2);
  light.name = 'rite-local-fill';
  light.position.set(0, 0.2, 0);
  // Keep its light slot present at zero intensity, avoiding a new lighting program on rite completion.
  anchor.add(light);
  const base = waterMat.color.clone();
  const warm = new THREE.Color(0x948774);
  let remaining = 0;
  let disposed = false;

  return {
    play() {
      if (disposed) return;
      remaining = DURATION;
      response.visible = true;
    },
    update(dt, reducedMotion, nightness) {
      if (disposed || remaining <= 0) return;
      remaining = Math.max(0, remaining - dt);
      const elapsed = DURATION - remaining;
      const attack = THREE.MathUtils.smoothstep(elapsed, 0, 0.18);
      const fade = THREE.MathUtils.smoothstep(remaining, 0, 0.9);
      const envelope = attack * fade;
      for (let i = 0; i < positions.length; i += 3) {
        const r = Math.hypot(positions[i]!, positions[i + 1]!);
        // A millimetre-scale settling ripple; the rim stays still and all water stays inside the cup.
        positions[i + 2] = reducedMotion ? 0 : Math.sin(r * 31 - elapsed * 7) * 0.003 * envelope * (1 - r / WATER_RADIUS);
      }
      waterGeo.attributes.position!.needsUpdate = true;
      waterGeo.computeVertexNormals();
      waterMat.color.copy(base).lerp(warm, envelope * 0.16);
      for (let i = 0; i < 8; i++) {
        const lift = reducedMotion ? 0 : Math.sin(Math.min(1, elapsed / 1.6) * Math.PI) * (0.01 + i % 3 * 0.007) * envelope;
        for (let j = 0; j < 3; j++) ashPositions[i * 9 + j * 3 + 1] = ASH_SURFACE + lift;
      }
      ashGeo.attributes.position!.needsUpdate = true;
      ashMat.opacity = envelope * 0.32;
      light.intensity = envelope * (0.65 - THREE.MathUtils.clamp(nightness, 0, 1) * 0.35);
      response.visible = remaining > 0;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      anchor.remove(response);
      anchor.remove(light);
      // The repaired bowl and water remain in the scene and follow its normal geometry/material cleanup.
      ashGeo.dispose();
      ashMat.dispose();
      light.dispose();
    },
  };
}
