import * as THREE from 'three';
import { DEEPWOOD } from '../world/layout';
import { deepwoodCover } from '../world/forest';
import { mulberry32, smoothstep } from '../world/noise';
import type { BuildContext, SceneModule } from './context';

/** Local depth haze, not a new weather state: the sky resets the base fog before every update. */
export function woodlandFog(density: number, cover: number, night: number): number {
  return density + cover * (0.0032 + night * 0.0008);
}

/** Original woodland pollen/insects and a soft cooler depth separation beneath warm canopy light. */
export function buildWoodlandAir(ctx: Pick<BuildContext, 'terrain' | 'quality'>, fog: THREE.FogExp2): SceneModule {
  const group = new THREE.Group();
  group.name = 'deepwood-air';
  const count = ctx.quality === 'high' ? 144 : ctx.quality === 'medium' ? 96 : 48;
  const rng = mulberry32(5005);
  const seeds: { x: number; y: number; z: number; p: number }[] = [];
  for (let i = 0; i < count; i++) {
    let x = 0, z = 0;
    for (let tries = 0; tries < 80; tries++) {
      x = DEEPWOOD.minX + rng() * (DEEPWOOD.maxX - DEEPWOOD.minX);
      z = DEEPWOOD.minZ + rng() * (DEEPWOOD.maxZ - DEEPWOOD.minZ);
      if (deepwoodCover(x, z) > 0.6) break;
    }
    seeds.push({ x, y: ctx.terrain.heightAt(x, z) + 0.9 + rng() * 5, z, p: rng() * Math.PI * 2 });
  }
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.PointsMaterial({ color: 0xe3d4a4, size: 0.12, transparent: true, opacity: 0.3, depthWrite: false, fog: true });
  const motes = new THREE.Points(geometry, material);
  motes.frustumCulled = false;
  group.add(motes);
  const dayHaze = new THREE.Color(0x718c87);
  const nightHaze = new THREE.Color(0x182936);
  const haze = new THREE.Color();
  let clock = 0;
  let disposed = false;
  return {
    group,
    update(dt, f) {
      const cover = deepwoodCover(f.focus.x, f.focus.z);
      fog.density = woodlandFog(fog.density, cover, f.nightness);
      haze.copy(dayHaze).lerp(nightHaze, f.nightness);
      fog.color.lerp(haze, cover * 0.32);
      material.color.setHex(f.nightness > 0.45 ? 0xb8cfa1 : 0xe3d4a4);
      // Habitat cover already blends across the woodland edge; follow it instead of revealing the entire
      // pollen patch at a single cover threshold while its particles are still in the player's view.
      material.opacity = (0.25 + f.nightness * 0.25) * smoothstep(0, 0.18, cover);
      motes.visible = material.opacity > 0;
      if (!f.reducedMotion) clock += dt;
      seeds.forEach((p, i) => {
        positions[i * 3] = p.x + Math.sin(clock * 0.15 + p.p) * 0.75;
        positions[i * 3 + 1] = p.y + Math.sin(clock * 0.21 + p.p * 1.3) * 0.35;
        positions[i * 3 + 2] = p.z + Math.cos(clock * 0.12 + p.p) * 0.65;
      });
      geometry.attributes.position!.needsUpdate = true;
    },
    stats: () => ({ woodlandMotes: count }),
    dispose() {
      if (disposed) return;
      disposed = true;
      geometry.dispose();
      material.dispose();
    },
  };
}
