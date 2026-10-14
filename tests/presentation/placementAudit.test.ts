import { buildFurniture, deferredFurniture } from '../../src/presentation/furniture';
import { FURNITURE } from '../../src/world/furniture';
import type { RoomLocator } from '../../src/world/interiors';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { expect, it } from 'vitest';
import { auditPlacements, type PlacementAuditTarget } from '../../src/diagnostics/placementAudit';

const box = (x: number, y: number) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  mesh.name = 'prop'; mesh.position.set(x, y, 0); return mesh;
};
it('flags a floating prop but accepts grounded and stacked mesh-supported props', () => {
  const scene = new THREE.Scene();
  scene.add(box(0, .5), box(0, 1.5), box(3, 2));
  const report = auditPlacements(scene, () => 0);
  expect(report.summary.props).toBe(3);
  expect(report.checks.filter(c => c.candidate)).toHaveLength(1);
  expect(report.checks.find(c => c.candidate)?.minGap).toBeCloseTo(1.5);
  expect(report.complete).toBe(true);
});
it('finds floating disconnected props inside one batched geometry', () => {
  const grounded = new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0);
  const floating = new THREE.BoxGeometry(1, 1, 1).translate(3, 2, 0);
  const scene = new THREE.Scene(); scene.add(new THREE.Mesh(mergeGeometries([grounded, floating])!, new THREE.MeshBasicMaterial()));
  const report = auditPlacements(scene, () => 0);
  expect(report.summary.props).toBe(2);
  expect(report.summary.candidates).toBe(1);
});
it('flags unsupported basal roots on slopes and accepts the same root ring on flat ground', () => {
  const geometry = new THREE.CylinderGeometry(1, 1, 2, 32).translate(0, 1, 0);
  const target: PlacementAuditTarget = { label: 'tree', kind: 'root', geometry, matrix: new THREE.Matrix4() };
  expect(auditPlacements(new THREE.Scene(), () => 0, [target]).summary.candidates).toBe(0);
  const report = auditPlacements(new THREE.Scene(), x => x * .25, [target]);
  expect(report.summary.roots).toBe(1);
  expect(report.checks[0]!.candidate).toBe(true);
  expect(report.checks[0]!.maxGap).toBeCloseTo(.25);
});
it('checks camera-culled population instances supplied by adapters and marks truncated reports incomplete', () => {
  const target: PlacementAuditTarget = { label: 'hidden furniture', kind: 'prop', geometry: new THREE.BoxGeometry(1, 1, 1), matrix: new THREE.Matrix4().makeTranslation(0, 2, 0) };
  const report = auditPlacements(new THREE.Scene(), () => 0, [target]);
  expect(report.summary.candidates).toBe(1);
  expect(report.checks[0]!.minGap).toBeCloseTo(1.5);
  const partial = auditPlacements(new THREE.Scene(), () => 0, [target, { ...target, label: 'another' }], { maxChecks: 1 });
  expect(partial.truncated).toBe(true); expect(partial.complete).toBe(false);
});
it('marks nonfinite terrain samples incomplete rather than declaring floating objects absent', () => {
  const scene = new THREE.Scene(); scene.add(box(0, 2));
  const report = auditPlacements(scene, () => NaN);
  expect(report.invalid).toBe(1); expect(report.complete).toBe(false);
});

it('exports furniture before it is drawn and forwards exports through its deferred wrapper', () => {
  const placement = FURNITURE.find(p => p.piece === 'chair')!;
  const template = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  const rooms = { base: () => 0, within: () => null } as unknown as RoomLocator;
  const furniture = buildFurniture(new Map([['chair', template]]), rooms, () => false, [placement], []);
  const wrapper = deferredFurniture();
  try {
    expect(wrapper.placementAuditTargets!()).toEqual([]);
    wrapper.attach(furniture);
    expect(furniture.group.children.filter(o => (o as THREE.InstancedMesh).isInstancedMesh).every(o => (o as THREE.InstancedMesh).count === 0)).toBe(true);
    const before = wrapper.placementAuditTargets!(); expect(before.length).toBeGreaterThan(0);
    wrapper.group.position.x = 10;
    expect(wrapper.placementAuditTargets!()[0]!.matrix.elements[12]! - before[0]!.matrix.elements[12]!).toBeCloseTo(10);
  } finally { wrapper.dispose?.(); template.geometry.dispose(); template.material.dispose(); }
});

it('keeps boundary and transformed-instance supports while excluding distant raycasts', () => {
  const scene = new THREE.Scene();
  const instances = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), 200);
  instances.name = 'supports';
  for (let i = 0; i < 200; i++) instances.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i * 32, .5, 0));
  // The first support straddles the grid boundary, including the negative cell.
  scene.add(instances, box(-.25, 1.5));
  let tested = 0;
  const original = THREE.Mesh.prototype.raycast;
  THREE.Mesh.prototype.raycast = function(ray, hits) { tested++; return original.call(this, ray, hits); };
  try {
    const report = auditPlacements(scene, () => 0);
    expect(report.complete).toBe(true);
    expect(report.summary.props).toBe(201);
    expect(report.summary.candidates).toBe(0);
    // Only the stacked prop needs support queries, and each must exclude 199 far instances.
    expect(tested).toBeLessThan(32);
  } finally { THREE.Mesh.prototype.raycast = original; }
});

it('audits the full supplied root population independently of oversized prop geometry', () => {
  const scene=new THREE.Scene();
  const oversized=new THREE.BufferGeometry();oversized.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(300003),3));
  scene.add(new THREE.Mesh(oversized,new THREE.MeshBasicMaterial()));
  const geometry=new THREE.CylinderGeometry(1,1,2,32).translate(0,1,0);
  const populations:PlacementAuditTarget[]=[
    {label:'root-a',kind:'root',geometry,matrix:new THREE.Matrix4()},
    {label:'root-b',kind:'root',geometry,matrix:new THREE.Matrix4().makeTranslation(4,0,0)},
    {label:'prop',kind:'prop',geometry:new THREE.BoxGeometry(1,1,1),matrix:new THREE.Matrix4().makeTranslation(8,2,0)},
  ];
  const report=auditPlacements(scene,()=>0,populations,{kind:'root'});
  expect(report.complete).toBe(true);expect(report.summary.roots).toBe(2);expect(report.summary.props).toBe(0);expect(report.skipped).toEqual([]);
  expect(()=>auditPlacements(scene,()=>0,populations,{kind:'invalid' as 'root'})).toThrow('Invalid placement audit kind');
});


it('reports one exposed root sector even when the tree is below the floater threshold', () => {
  const geometry = new THREE.CylinderGeometry(1, 1, 2, 32).translate(0, 1, 0);
  const target: PlacementAuditTarget = { label: 'partial root', kind: 'root', geometry, matrix: new THREE.Matrix4() };
  // Locate a sampled sector, then put a small cut beneath only that point.
  const probes: number[][] = [];
  auditPlacements(new THREE.Scene(), (x, z) => { probes.push([x, z]); return 0; }, [target], { kind: 'root' });
  const [px, pz] = probes[0]!;
  const report = auditPlacements(new THREE.Scene(), (x, z) => Math.hypot(x - px!, z - pz!) < 1e-5 ? -.24 : 0, [target], { kind: 'root' });
  expect(report.summary.candidates).toBe(0);
  expect(report.summary.rootCoverage?.unsupportedSamples).toBe(1);
  expect(report.summary.rootCoverage?.rootsWithUnsupportedSamples).toBe(1);
  expect(report.summary.rootCoverage?.supportedFraction).toBeLessThan(1);
  expect(report.summary.rootCoverage?.maxGap).toBeCloseTo(.24);
  const grounded = auditPlacements(new THREE.Scene(), () => 0, [target], { kind: 'root' });
  expect(grounded.summary.rootCoverage?.unsupportedSamples).toBe(0);
  expect(grounded.summary.rootCoverage?.supportedFraction).toBe(1);
  expect(auditPlacements(new THREE.Scene(), () => 0).summary.rootCoverage).toBeNull();
  geometry.dispose();
});

it.each([NaN, Infinity, -Infinity])('does not clear a prop with a partially invalid terrain footprint (%s)', invalid => {
  const scene = new THREE.Scene(); scene.add(box(0, .5));
  const report = auditPlacements(scene, x => x < 0 ? invalid : 0);
  expect(report.complete).toBe(false);
  expect(report.invalid).toBe(1);
  expect(report.checks).toHaveLength(0);
});

it('does not clear root coverage after discarding invalid basal samples', () => {
  const target: PlacementAuditTarget = { label: 'root', kind: 'root', geometry: new THREE.CylinderGeometry(1, 1, 2, 32).translate(0, 1, 0), matrix: new THREE.Matrix4() };
  const report = auditPlacements(new THREE.Scene(), x => x < 0 ? NaN : 0, [target], {kind:'root'});
  expect(report.complete).toBe(false);
  expect(report.invalid).toBe(1);
  expect(report.checks).toHaveLength(0);
});
