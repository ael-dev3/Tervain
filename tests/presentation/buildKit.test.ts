import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Batch, Ctx } from '../../src/presentation/buildKit';

const color = 0x9a8468;

function geometry(author: (batch: Batch) => void): THREE.BufferGeometry {
  const batch = new Batch(new Ctx(), 'test');
  batch.amp = 0;
  batch.jit = 0;
  author(batch);
  const result = batch.toGeometry();
  expect(result).not.toBeNull();
  return result!;
}

/** Check the actual triangles seen by back-face culling, independently of the authoring normals. */
function expectConsistentFaces(g: THREE.BufferGeometry): void {
  const positions = g.getAttribute('position');
  const normals = g.getAttribute('normal');
  const index = g.getIndex()!;
  expect(index.count).toBeGreaterThan(0);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    for (const id of ids) {
      expect(id).toBeLessThan(positions.count);
      normal.fromBufferAttribute(normals, id);
      expect(normal.length()).toBeCloseTo(1, 5);
    }
    a.fromBufferAttribute(positions, ids[0]!);
    b.fromBufferAttribute(positions, ids[1]!);
    c.fromBufferAttribute(positions, ids[2]!);
    const face = b.sub(a).cross(c.sub(a));
    expect(face.lengthSq(), `triangle ${i / 3} must have area`).toBeGreaterThan(1e-12);
    face.normalize();
    for (const id of ids) {
      normal.fromBufferAttribute(normals, id);
      expect(face.dot(normal), `triangle ${i / 3} normal must face its visible side`).toBeGreaterThan(0.1);
    }
  }
}

/** Coincident vertices are welded only for this check; hard shading seams may still duplicate them. */
function expectClosed(g: THREE.BufferGeometry): void {
  const position = g.getAttribute('position');
  const index = g.getIndex()!;
  const key = (id: number) => [position.getX(id), position.getY(id), position.getZ(id)].map((v) => Math.round(v * 1e5)).join(',');
  const edges = new Map<string, { count: number; orientation: number }>();
  let volume = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    a.fromBufferAttribute(position, ids[0]!);
    b.fromBufferAttribute(position, ids[1]!);
    c.fromBufferAttribute(position, ids[2]!);
    volume += a.dot(b.cross(c)) / 6;
    for (let e = 0; e < 3; e++) {
      const start = key(ids[e]!);
      const end = key(ids[(e + 1) % 3]!);
      const forward = start < end;
      const edgeKey = forward ? `${start}|${end}` : `${end}|${start}`;
      const edge = edges.get(edgeKey) ?? { count: 0, orientation: 0 };
      edge.count++;
      edge.orientation += forward ? 1 : -1;
      edges.set(edgeKey, edge);
    }
  }
  for (const [key, edge] of edges) {
    expect(edge.count, `edge ${key} must join exactly two triangles`).toBe(2);
    expect(edge.orientation, `edge ${key} must have opposing triangle directions`).toBe(0);
  }
  expect(volume, 'closed solid must have outward winding').toBeGreaterThan(0);
}

/** A front-sided material must be hittable from outside, without enabling double-sided rendering. */
function expectExteriorRay(g: THREE.BufferGeometry, target: THREE.Vector3, outward: THREE.Vector3): void {
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.FrontSide }));
  mesh.updateMatrixWorld(true);
  const direction = outward.clone().normalize();
  const ray = new THREE.Raycaster(target.clone().addScaledVector(direction, 4), direction.negate(), 0, 8);
  const hits = ray.intersectObject(mesh, false);
  expect(hits.length, `outside ray aimed at ${target.toArray()} must hit a front face`).toBeGreaterThan(0);
  expect(hits[0]!.point.distanceTo(target)).toBeLessThan(1e-5);
  mesh.material.dispose();
}

function expectAxialExterior(g: THREE.BufferGeometry, center: THREE.Vector3, extents: THREE.Vector3): void {
  for (const axis of [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]) {
    for (const sign of [-1, 1]) {
      const outward = axis.clone().multiplyScalar(sign);
      const target = center.clone().add(outward.clone().multiply(extents));
      expectExteriorRay(g, target, outward);
    }
  }
}

describe('settlement geometry front faces', () => {
  it.each([false, true])('flips both normals and winding on quads (subdivided=%s)', (subdivided) => {
    const corners = [-1, 0, -1, -1, 0, 1, 1, 0, 1, 1, 0, -1];
    for (const flip of [false, true]) {
      const g = geometry((b) => b.quad(corners, color, { flip, nu: subdivided ? 3 : 1, nv: subdivided ? 2 : 1 }));
      expectConsistentFaces(g);
      expectExteriorRay(g, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, flip ? -1 : 1, 0));
      g.dispose();
    }
  });

  it.each([0, 0.4])('keeps all box faces closed and outward (subdivision=%s)', (sub) => {
    const g = geometry((b) => b.bx(-1, 0, -0.75, 1, 2, 0.75, color, { sub }));
    expectConsistentFaces(g);
    expectClosed(g);
    expectAxialExterior(g, new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 1, 0.75));
    g.dispose();
  });

  it('closes triangular gable prisms on both ends and every side', () => {
    const g = geometry((b) => b.prism([[-1, 0], [1, 0], [0, 2]], -0.3, 0.3, color));
    expectConsistentFaces(g);
    expectClosed(g);
    expectExteriorRay(g, new THREE.Vector3(0, 0.6, 0.3), new THREE.Vector3(0, 0, 1));
    expectExteriorRay(g, new THREE.Vector3(0, 0.6, -0.3), new THREE.Vector3(0, 0, -1));
    expectExteriorRay(g, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0));
    expectExteriorRay(g, new THREE.Vector3(0.5, 1, 0), new THREE.Vector3(2, 1, 0));
    g.dispose();
  });

  it.each([false, true])('keeps smooth/flat lathe surfaces visible and lit from outside (flat=%s)', (flat) => {
    const g = geometry((b) => b.lathe([0.8, 0, 1, 1, 0.8, 2], 12, 0, 0, 0, color, { flat }));
    expectConsistentFaces(g);
    expectExteriorRay(g, new THREE.Vector3(0.9, 0.5, 0), new THREE.Vector3(1, -0.2, 0));
    expectExteriorRay(g, new THREE.Vector3(-0.9, 1.5, 0), new THREE.Vector3(-1, 0.2, 0));
    g.dispose();
  });

  it.each([
    { top: 1, bottom: 1, flat: false },
    { top: 0.6, bottom: 1, flat: false },
    { top: 0, bottom: 1, flat: false },
    { top: 1, bottom: 0, flat: false },
    { top: 1, bottom: 1, flat: true },
    { top: 0.6, bottom: 1, flat: true },
    { top: 0, bottom: 1, flat: true },
    { top: 1, bottom: 0, flat: true },
  ])('closes cylinder/cone walls and caps without pole triangles ($top/$bottom, flat=$flat)', ({ top, bottom, flat }) => {
    const g = geometry((b) => b.cyl(top, bottom, 2, 12, 0, 0, 0, color, { flat }));
    expectConsistentFaces(g);
    expectClosed(g);
    expectExteriorRay(g, new THREE.Vector3((top + bottom) / 2, 1, 0), new THREE.Vector3(1, (bottom - top) / 2, 0));
    if (top > 0) expectExteriorRay(g, new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, 1, 0));
    if (bottom > 0) expectExteriorRay(g, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0));
    g.dispose();
  });

  it.each([false, true])('transforms house trim rods with outward walls and end caps (flat=%s)', (flat) => {
    const start = new THREE.Vector3(-1, 0.3, -0.6);
    const end = new THREE.Vector3(1, 1.5, 0.8);
    const axis = end.clone().sub(start).normalize();
    const side = axis.clone().cross(new THREE.Vector3(0, 1, 0)).normalize();
    const g = geometry((b) => {
      b.ctx.push(0.5, 0.2, -0.3, 0.4, 0.1, -0.2);
      b.rod(...start.toArray(), ...end.toArray(), 0.15, 12, color, { flat });
      start.applyMatrix4(b.ctx.matrix);
      end.applyMatrix4(b.ctx.matrix);
      axis.transformDirection(b.ctx.matrix);
      side.transformDirection(b.ctx.matrix);
      b.ctx.pop();
    });
    expectConsistentFaces(g);
    expectClosed(g);
    expectExteriorRay(g, start, axis.clone().negate());
    expectExteriorRay(g, end, axis);
    // The rod's circumferential seam is not necessarily aligned with this world-space direction.
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.FrontSide }));
    mesh.updateMatrixWorld(true);
    const center = start.clone().add(end).multiplyScalar(0.5);
    const ray = new THREE.Raycaster(center.clone().addScaledVector(side, 1), side.clone().negate());
    const hits = ray.intersectObject(mesh);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.point.distanceTo(center)).toBeGreaterThan(0.14);
    expect(hits[0]!.point.distanceTo(center)).toBeLessThan(0.151);
    mesh.material.dispose();
    g.dispose();
  });
});
