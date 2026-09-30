import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';

/**
 * Rags tied to the ancient tree's low boughs by pilgrims: strips of undyed wool, faded red and ochre, a bleached linen one,
 * each knotted round the bough and hanging free. They stir on the GPU from one clock (still when it is frozen). The
 * custom is a working proposal for how people mark a Templar-kept tree, not recorded doctrine.
 */

const COLOURS: [number, number, number][] = [
  [0.42, 0.12, 0.08],
  [0.5, 0.36, 0.14],
  [0.62, 0.58, 0.5],
  [0.2, 0.22, 0.26],
  [0.36, 0.3, 0.24],
  [0.3, 0.08, 0.1],
];

export function buildRibbons(anchors: THREE.Vector3[], time: { value: number }, seed = 61) {
  const rng = mulberry32(seed);
  const pos: number[] = [];
  const col: number[] = [];
  const rib: number[] = [];
  const idx: number[] = [];
  const seg = 7;
  for (const a of anchors) {
    const len = 0.45 + rng() * 0.55;
    const w = 0.045 + rng() * 0.035;
    const yaw = rng() * Math.PI;
    const c = COLOURS[Math.floor(rng() * COLOURS.length)]!;
    const k = 0.7 + rng() * 0.4;
    const phase = rng() * 20;
    const sx = Math.cos(yaw) * w * 0.5;
    const sz = Math.sin(yaw) * w * 0.5;
    const base = pos.length / 3;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      // The anchor is the knot, tucked just inside the bough.
      const y = a.y - t * len;
      // Ends fray narrower; the lower part is stained darker.
      const narrow = 1 - t * 0.35;
      const dirt = 1 - t * 0.35;
      for (const s of [-1, 1]) {
        pos.push(a.x + sx * s * narrow, y, a.z + sz * s * narrow);
        col.push(c[0] * k * dirt, c[1] * k * dirt, c[2] * k * dirt);
        rib.push(t * len, phase);
      }
    }
    for (let i = 0; i < seg; i++) {
      const p = base + i * 2;
      idx.push(p, p + 1, p + 3, p, p + 3, p + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aRib', new THREE.Float32BufferAttribute(rib, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  if (g.boundingSphere) g.boundingSphere.radius += 1;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aRib;\nuniform float uTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          float d = aRib.x;
          float sway = sin(uTime * 1.6 + aRib.y + d * 3.5) * 0.09 + sin(uTime * 2.9 + aRib.y * 1.7 + d * 6.0) * 0.03;
          transformed.x += (sway + 0.12) * d * d * 1.4;
          transformed.z += (sin(uTime * 1.1 + aRib.y * 0.7) * 0.06 - 0.05) * d * d * 1.4;
        }`,
      );
  };
  mat.customProgramCacheKey = () => 'tervain-menu-rags';
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = 'Menu_Pilgrim_Rags';
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  return { mesh, dispose: () => (g.dispose(), mat.dispose()) };
}
