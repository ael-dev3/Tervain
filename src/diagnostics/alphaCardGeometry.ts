import * as THREE from 'three';

export interface AlphaMask { width: number; height: number; alpha: Uint8Array; cutoff: number; opacity?: number }
interface Vertex { u: number; v: number; point: THREE.Vector3 }

/** Offline base-mip texel clipping. No linear filtering, mip selection, texture transforms or wind simulation. */
export function alphaCardGeometry(source: THREE.BufferGeometry, mask: AlphaMask, maxCells = 200_000) {
  const { width, height, alpha, cutoff } = mask, opacity = mask.opacity ?? 1;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || alpha.length !== width * height ||
      !(cutoff > 0 && cutoff <= 1) || !(opacity >= 0 && opacity <= 1) || !Number.isInteger(maxCells) || maxCells < 1) throw new Error('Invalid alpha clipping input');
  const position = source.getAttribute('position'), uv = source.getAttribute('uv');
  if (!position || !uv || position.count !== uv.count) throw new Error('Missing matching position/UV attributes');
  const output: number[] = []; let cells = 0;
  const clip = (polygon: Vertex[], axis: 'u' | 'v', boundary: number, lower: boolean): Vertex[] => {
    const result: Vertex[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i]!, b = polygon[(i + 1) % polygon.length]!;
      const insideA = lower ? a[axis] >= boundary : a[axis] <= boundary;
      const insideB = lower ? b[axis] >= boundary : b[axis] <= boundary;
      if (insideA) result.push(a);
      if (insideA !== insideB) {
        const t = (boundary - a[axis]) / (b[axis] - a[axis]);
        result.push({ u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t, point: a.point.clone().lerp(b.point, t) });
      }
    }
    return result;
  };
  const index = source.index, count = index?.count ?? position.count;
  if (count % 3) throw new Error('Expected triangles');
  for (let i = 0; i < count; i += 3) {
    const triangle = [0, 1, 2].map(j => {
      const n = index?.getX(i + j) ?? i + j;
      if (!Number.isInteger(n) || n < 0 || n >= position.count) throw new Error('Invalid triangle index');
      return { u: uv.getX(n), v: uv.getY(n), point: new THREE.Vector3().fromBufferAttribute(position, n) };
    });
    if (triangle.some(p => ![p.u, p.v, ...p.point.toArray()].every(Number.isFinite) || p.u < 0 || p.u > 1 || p.v < 0 || p.v > 1)) throw new Error('Unsupported UV or nonfinite geometry');
    const area = (triangle[1]!.u - triangle[0]!.u) * (triangle[2]!.v - triangle[0]!.v) - (triangle[2]!.u - triangle[0]!.u) * (triangle[1]!.v - triangle[0]!.v);
    if (Math.abs(area) < 1e-12) throw new Error('Degenerate UV triangle');
    const x0 = Math.max(0, Math.floor(Math.min(...triangle.map(p => p.u)) * width));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(...triangle.map(p => p.u)) * width) - 1);
    const y0 = Math.max(0, Math.floor(Math.min(...triangle.map(p => p.v)) * height));
    const y1 = Math.min(height - 1, Math.ceil(Math.max(...triangle.map(p => p.v)) * height) - 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (++cells > maxCells) throw new Error('Alpha clipping budget exhausted');
      if (alpha[y * width + x]! / 255 * opacity < cutoff) continue;
      let polygon = clip(triangle, 'u', x / width, true);
      polygon = clip(polygon, 'u', (x + 1) / width, false);
      polygon = clip(polygon, 'v', y / height, true);
      polygon = clip(polygon, 'v', (y + 1) / height, false);
      for (let j = 1; j + 1 < polygon.length; j++) {
        const a = polygon[0]!.point, b = polygon[j]!.point, c = polygon[j + 1]!.point;
        if (new THREE.Triangle(a, b, c).getArea() <= 1e-12) continue;
        output.push(...a.toArray(), ...b.toArray(), ...c.toArray());
      }
    }
  }
  return { geometry: new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(output, 3)), cells, triangles: output.length / 9,
    scope: 'Base-mip nearest texel mask in UV [0,1], no wrapping/transforms/filtering/mips/wind. This is diagnostic geometry, never replacement game art.' };
}
