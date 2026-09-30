import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { createWindCloth } from '../src/presentation/menuWind';

const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
const positions = (mesh: THREE.Mesh) => mesh.geometry.getAttribute('position') as THREE.BufferAttribute;

describe('menu wind cloth', () => {
  it('forms a pointed ceremonial hem without detaching the suspension or stretching its UV coordinates', () => {
    const plain = createWindCloth(5.4, 10.6, material, { segmentsX: 20, segmentsY: 32, amplitude: 0.14 });
    const pointed = createWindCloth(5.4, 10.6, material, { segmentsX: 20, segmentsY: 32, amplitude: 0.14, hemDepth: 0.65 });
    const p = positions(pointed.mesh), q = positions(plain.mesh);
    expect(pointed.mesh.geometry.getAttribute('uv').array).toEqual(plain.mesh.geometry.getAttribute('uv').array);
    expect(pointed.mesh.geometry.index!.array).toEqual(plain.mesh.geometry.index!.array);
    for (let i = 0; i <= 20; i++) expect([p.getX(i), p.getY(i), p.getZ(i)]).toEqual([q.getX(i), q.getY(i), q.getZ(i)]);
    const lastRow = 32 * 21;
    expect(p.getY(lastRow) - q.getY(lastRow)).toBeCloseTo(0.65, 5);
    expect(p.getY(lastRow + 10)).toBe(q.getY(lastRow + 10));
    pointed.update(8);
    expect(p.getY(lastRow)).toBeGreaterThan(p.getY(lastRow + 10) + 0.6);
    plain.mesh.geometry.dispose();
    pointed.mesh.geometry.dispose();
  });
  it('keeps every suspension point fixed while the hanging fabric responds smoothly', () => {
    const { mesh, update } = createWindCloth(4.6, 7.4, material, { phase: 0.7 });
    const initial = positions(mesh).array.slice();
    const pins: number[] = [];
    for (let i = 0; i < positions(mesh).count; i++) if (Math.abs(positions(mesh).getY(i) - 3.7) < 1e-6) pins.push(i);
    expect(pins.length).toBeGreaterThan(10);
    for (const time of [0, 0.1, 3, 25, 200]) {
      update(time);
      for (const i of pins) {
        expect(positions(mesh).getX(i)).toBe(initial[i * 3]);
        expect(positions(mesh).getY(i)).toBe(initial[i * 3 + 1]);
        expect(positions(mesh).getZ(i)).toBe(0);
      }
    }
    expect(mesh.position.toArray()).toEqual([0, 0, 0]);
    expect([...positions(mesh).array]).not.toEqual([...initial]);
    update(3);
    const earlier = positions(mesh).array.slice();
    update(3.1);
    const current = positions(mesh).array;
    expect(Math.max(...current.map((value, i) => Math.abs(value - earlier[i]!)))).toBeLessThan(0.012);
    mesh.geometry.dispose();
  });

  it('restores stable nonflat rest folds at zero wind strength, independent of elapsed time', () => {
    const { mesh, update } = createWindCloth(4, 4.5, material, { phase: 1.1 });
    const rest = positions(mesh).array.slice();
    expect(Math.max(...rest.filter((_value, i) => i % 3 === 2))).toBeGreaterThan(0.06);
    update(7, 1);
    update(7, 0);
    expect(positions(mesh).array).toEqual(rest);
    const normal = mesh.geometry.getAttribute('normal').array.slice();
    update(400, 0);
    expect(positions(mesh).array).toEqual(rest);
    expect(mesh.geometry.getAttribute('normal').array).toEqual(normal);
    mesh.geometry.dispose();
  });

  it('is deterministic with finite unit normals and conservative bounds throughout the wind cycle', () => {
    const a = createWindCloth(4.6, 7.4, material, { phase: 0.4, amplitude: 0.2 });
    const b = createWindCloth(4.6, 7.4, material, { phase: 0.4, amplitude: 0.2 });
    const point = new THREE.Vector3();
    for (const time of [0, 0.5, 1, 4, 20, 80, 210, Number.MAX_VALUE]) {
      a.update(time, 2);
      b.update(time, 2);
      expect(positions(a.mesh).array).toEqual(positions(b.mesh).array);
      expect(a.mesh.geometry.getAttribute('normal').array).toEqual(b.mesh.geometry.getAttribute('normal').array);
      const pos = positions(a.mesh), normal = a.mesh.geometry.getAttribute('normal');
      for (let i = 0; i < pos.count; i++) {
        point.fromBufferAttribute(pos, i);
        expect(point.toArray().every(Number.isFinite)).toBe(true);
        expect(a.mesh.geometry.boundingBox!.containsPoint(point)).toBe(true);
        point.fromBufferAttribute(normal, i);
        expect(point.toArray().every(Number.isFinite)).toBe(true);
        expect(point.length()).toBeCloseTo(1, 5);
        expect(point.z).toBeGreaterThan(0);
      }
    }
    a.update(Number.NaN, Number.NaN);
    expect([...positions(a.mesh).array].every(Number.isFinite)).toBe(true);
    a.mesh.geometry.dispose();
    b.mesh.geometry.dispose();
  });

  it('keeps menu geometry bounded and uses the caller-owned material without cloning it', () => {
    const standard = createWindCloth(4, 6, material);
    expect(standard.mesh.geometry.index!.count / 3).toBeLessThanOrEqual(1200);
    expect(positions(standard.mesh).count).toBeLessThanOrEqual(700);
    expect(standard.mesh.material).toBe(material);
    const secondary = createWindCloth(4, 4.5, material, { segmentsX: 12, segmentsY: 16 });
    expect(secondary.mesh.geometry.index!.count / 3).toBeLessThanOrEqual(400);
    const oversized = createWindCloth(4, 6, material, { segmentsX: 1e6, segmentsY: 1e6, amplitude: 1e6 });
    expect(oversized.mesh.geometry.index!.count / 3).toBeLessThanOrEqual(8192);
    expect([...positions(oversized.mesh).array].every(Number.isFinite)).toBe(true);
    for (const cloth of [standard, secondary, oversized]) cloth.mesh.geometry.dispose();
    expect(() => createWindCloth(0, 4, material)).toThrow(RangeError);
    expect(() => createWindCloth(4, Number.NaN, material)).toThrow(RangeError);
  });
});
