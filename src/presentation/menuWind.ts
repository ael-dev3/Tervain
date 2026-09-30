import * as THREE from 'three';

export interface WindClothOptions {
  segmentsX?: number;
  segmentsY?: number;
  phase?: number;
  /** Rest-fold depth in local metres; moving wind is a smaller fraction of this depth. */
  amplitude?: number;
  /** Raise the bottom corners around a low central point; suspension edge and UVs stay fixed. */
  hemDepth?: number;
}

export interface WindCloth {
  /** Vertical local XY cloth, with its entire upper edge fixed at y=height/2. Front faces +Z. */
  mesh: THREE.Mesh;
  /** Absolute seconds. Strength zero restores the authored resting folds without animation. */
  update(time: number, strength?: number): void;
}

/** Menu-only silk: real folded geometry and smooth normals, with gentle wind below a fixed suspension edge. */
export function createWindCloth(width: number, height: number, material: THREE.Material, options: WindClothOptions = {}): WindCloth {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 1e6 || height > 1e6) {
    throw new RangeError('Wind cloth requires positive, finite scene-scale dimensions.');
  }
  const segments = (value: number | undefined, fallback: number) => Number.isFinite(value)
    ? THREE.MathUtils.clamp(Math.round(value!), 2, 64) : fallback;
  const sx = segments(options.segmentsX, 20), sy = segments(options.segmentsY, 24);
  const phase = Number.isFinite(options.phase) ? options.phase! % (Math.PI * 2) : 0;
  const defaultDepth = Math.min(width * 0.055, height * 0.04);
  const depth = THREE.MathUtils.clamp(Number.isFinite(options.amplitude) ? options.amplitude! : defaultDepth, 0, Math.min(width, height) * 0.25);
  const hemDepth = THREE.MathUtils.clamp(Number.isFinite(options.hemDepth) ? options.hemDepth! : 0, 0, height * 0.15);
  const geometry = new THREE.PlaneGeometry(width, height, sx, sy);
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  position.setUsage(THREE.DynamicDrawUsage);
  const rest = new Float32Array(position.array.length);
  const uValues = new Float32Array(position.count);
  const vValues = new Float32Array(position.count);
  const weights = new Float32Array(position.count);

  for (let j = 0; j <= sy; j++) {
    const v = j / sy;
    // No rigid-body translation: wind and hanging folds grow continuously below the pinned edge.
    const weight = v * (2 - v);
    for (let i = 0; i <= sx; i++) {
      const vertex = j * (sx + 1) + i, u = i / sx, k = vertex * 3;
      uValues[vertex] = u;
      vValues[vertex] = v;
      weights[vertex] = weight;
      const folds = Math.sin(u * Math.PI * 6 + phase) * 0.7
        + Math.sin(u * Math.PI * 12 + phase * 0.7 + v * 0.35) * 0.18
        + Math.sin(u * Math.PI * 2 - v * 0.8 + phase) * 0.12;
      rest[k] = position.getX(vertex) * (1 - weight * 0.035) + depth * 0.06 * weight * Math.sin(v * 2 + phase) * (u * 2 - 1);
      rest[k + 1] = position.getY(vertex) - depth * 0.12 * weight * (0.5 + 0.5 * Math.sin(u * Math.PI * 2 + phase))
        + depth * 0.025 * weight * Math.sin(u * Math.PI * 6 + phase)
        + hemDepth * Math.abs(u * 2 - 1) * v ** 6;
      rest[k + 2] = depth * (weight * folds + Math.sin(v * Math.PI) * 0.32);
    }
  }
  // Conservative static bounds cover every permitted wind strength; no per-frame bound allocation is needed.
  geometry.boundingBox = new THREE.Box3(
    new THREE.Vector3(-width / 2 - depth * 0.12, -height / 2 - depth * 0.2, -depth * 2),
    new THREE.Vector3(width / 2 + depth * 0.12, height / 2 + depth * 0.2, depth * 2));
  geometry.boundingSphere = geometry.boundingBox.getBoundingSphere(new THREE.Sphere());
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'menu-wind-cloth';
  let previousTime: number | null = null;
  let previousStrength: number | null = null;

  const update = (time: number, strength = 1) => {
    const seconds = Number.isFinite(time) ? time : previousTime ?? 0;
    const wind = Number.isFinite(strength) ? THREE.MathUtils.clamp(strength, 0, 2) : 0;
    if (previousStrength === wind && (wind === 0 || seconds === previousTime)) return;
    previousTime = seconds;
    previousStrength = wind;
    // All frequencies share this period. Wrapping keeps even long-running menu clocks finite and continuous.
    const angle = (seconds * 0.03) % (Math.PI * 2);
    for (let i = 0; i < position.count; i++) {
      const k = i * 3, u = uValues[i]!, v = vValues[i]!, weight = weights[i]!;
      const moving = depth * weight * wind;
      position.setXYZ(i,
        rest[k]! + moving * 0.025 * Math.sin(angle * 16 + phase - v * 2),
        rest[k + 1]! + moving * 0.018 * Math.sin(angle * 20 + u * 2.2 + phase),
        rest[k + 2]! + moving * (Math.sin(angle * 25 + phase - v * 3.1 + u * 0.7) * 0.22
          + Math.sin(angle * 45 - v * 6.6 + u * Math.PI * 4 + phase * 0.4) * 0.055 * (0.45 + v * 0.55)));
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  };
  // Construction starts in its sculpted rest pose; update(0) explicitly supplies the first wind pose.
  update(0, 0);
  return { mesh, update };
}
