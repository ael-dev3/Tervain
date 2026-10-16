import * as THREE from 'three';
import { indexVerticalSupport } from './verticalSupports';

export interface PlacementAuditTarget {
  label: string;
  kind: 'prop' | 'root';
  geometry: THREE.BufferGeometry;
  matrix: THREE.Matrix4;
}
export interface PlacementAuditOptions { clearance?: number; maxChecks?: number; kind?: 'root' | 'prop'; /** Selected tree detail, default near (0). */ lod?: number; }
interface Check {
  label: string; kind: 'prop' | 'root'; component: number;
  position: number[]; samples: number; minGap: number; maxGap: number; unsupportedFraction: number; candidate: boolean;
}

/** Weld coincident vertices, so a box's six split-normal faces are audited as one component. */
interface Component { vertices: number[]; faces: Set<number> }
function components(geometry: THREE.BufferGeometry): Component[] {
  const p = geometry.getAttribute('position'), index = geometry.index;
  const parent = Array.from({ length: p.count }, (_, i) => i);
  const find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]!]!; i = parent[i]!; } return i; };
  const join = (a: number, b: number) => { parent[find(a)] = find(b); };
  const welded = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const key = `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
    const other = welded.get(key);
    if (other !== undefined) join(i, other); else welded.set(key, i);
  }
  for (let i = 0; i + 2 < (index?.count ?? p.count); i += 3) {
    const a = index?.getX(i) ?? i, b = index?.getX(i + 1) ?? i + 1, c = index?.getX(i + 2) ?? i + 2;
    join(a, b); join(a, c);
  }
  const groups = new Map<number, number[]>();
  for (const i of welded.values()) { const root = find(i), group = groups.get(root) ?? []; group.push(i); groups.set(root, group); }
  const result = new Map([...groups].map(([root, vertices]) => [root, { vertices, faces: new Set<number>() }]));
  for (let i = 0; i + 2 < (index?.count ?? p.count); i += 3) result.get(find(index?.getX(i) ?? i))!.faces.add(i / 3);
  return [...result.values()];
}

/** Lowest points of the outer basal ring, rather than elevated trunk/root-flare faces. */
function rootSamples(geometry: THREE.BufferGeometry): THREE.Vector3[] {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!, p = geometry.getAttribute('position');
  const points: THREE.Vector3[] = [];
  let radius = 0;
  for (let i = 0; i < p.count; i++) if (p.getY(i) <= box.min.y + .35) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i); points.push(v);
  }
  if (!points.length) return [];
  const centre = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
  const cx = centre.x, cz = centre.z;
  for (const v of points) radius = Math.max(radius, Math.hypot(v.x - cx, v.z - cz));
  const sectors = new Map<number, THREE.Vector3>();
  for (const v of points) {
    if (Math.hypot(v.x - cx, v.z - cz) < radius * .65) continue;
    const key = Math.floor((Math.atan2(v.z - cz, v.x - cx) + Math.PI) * 16 / (Math.PI * 2)) % 16;
    const old = sectors.get(key);
    if (!old || v.y < old.y) sectors.set(key, v);
  }
  return [...sectors.values()];
}

const omitted = /water|terrain|sky|grass|foliage|leaves|floor shadows|cloud|dust|shadow$|sun|moon/i;
const treeWood = (mesh: THREE.Mesh) => mesh.parent?.name === 'flora' && mesh.name.endsWith(':wood');
const skeletal = (object: THREE.Object3D) => {
  for (let p: THREE.Object3D | null = object; p; p = p.parent) if ((p as THREE.Bone).isBone || (p as THREE.SkinnedMesh).isSkinnedMesh) return true;
  return false;
};

/** Offline snapshot audit. Report candidates; hanging objects and basal-ring geometry need human interpretation. */
export function auditPlacements(scene: THREE.Object3D, heightAt: (x: number, z: number) => number,
  populations: readonly PlacementAuditTarget[] = [], options: PlacementAuditOptions = {}) {
  const clearance = options.clearance ?? .08, maxChecks = options.maxChecks ?? 20_000;
  if (!(clearance >= 0 && Number.isFinite(clearance)) || !Number.isInteger(maxChecks) || maxChecks < 1) throw new Error('Invalid placement audit limits');
  if (options.kind !== undefined && options.kind !== 'root' && options.kind !== 'prop') throw new Error('Invalid placement audit kind');
  if (options.lod !== undefined && (!Number.isInteger(options.lod) || options.lod < 0 || options.lod > 2)) throw new Error('Invalid placement LOD');
  scene.updateMatrixWorld(true);
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const targets = populations.filter(target => !options.kind || target.kind === options.kind), supports: THREE.Mesh[] = [], skipped: string[] = [];
  const local = new THREE.Matrix4();
  scene.traverse(object => {
    if (options.kind === 'root') return;
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || skeletal(mesh)) return;
    const label = mesh.name || `mesh-${mesh.id}`;
    if (!omitted.test(label) || /terrain/i.test(label)) {
      const instances = mesh as THREE.InstancedMesh;
      const count = instances.isInstancedMesh ? instances.count : 1;
      for (let i = 0; i < count; i++) {
        const support = new THREE.Mesh(mesh.geometry, material);
        support.matrixAutoUpdate = false;
        if (instances.isInstancedMesh) {
          instances.getMatrixAt(i, local);
          support.matrixWorld.multiplyMatrices(mesh.matrixWorld, local);
        } else support.matrixWorld.copy(mesh.matrixWorld);
        supports.push(support);
      }
    }
    if (omitted.test(label) || treeWood(mesh) || label.startsWith('Furniture /')) return;
    if (!mesh.geometry.getAttribute('position')) return;
    if (mesh.geometry.getAttribute('position').count > 100_000) { skipped.push(label); return; }
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
      const instances = mesh as THREE.InstancedMesh;
      for (let i = 0; i < instances.count; i++) {
        instances.getMatrixAt(i, local);
        targets.push({ label: `${label}[${i}]`, kind: 'prop', geometry: mesh.geometry, matrix: new THREE.Matrix4().multiplyMatrices(mesh.matrixWorld, local) });
      }
    } else targets.push({ label, kind: 'prop', geometry: mesh.geometry, matrix: mesh.matrixWorld.clone() });
  });
  // Population adapters include camera-culled furniture and trees as supports as well as audit targets.
  for (const target of options.kind === 'root' ? [] : populations) {
    const support = new THREE.Mesh(target.geometry, material);
    support.matrixAutoUpdate = false; support.matrixWorld.copy(target.matrix); supports.push(support);
  }
  // Vertical support probes only need geometry whose world bounds overlap their X/Z position.
  // Expand instances once, so Three's InstancedMesh raycaster cannot scan an entire forest per sample.
  const cellSize = 16, cells = new Map<string, THREE.Mesh[]>(), wide: THREE.Mesh[] = [];
  const bounds = new Map<THREE.Mesh, THREE.Box3>(), releaseIndexes: (() => void)[] = [];
  for (const mesh of supports) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld).expandByScalar(1e-5);
    bounds.set(mesh, box);
    const x0 = Math.floor(box.min.x / cellSize), x1 = Math.floor(box.max.x / cellSize);
    const z0 = Math.floor(box.min.z / cellSize), z1 = Math.floor(box.max.z / cellSize);
    if ((x1-x0+1)*(z1-z0+1)>4) releaseIndexes.push(indexVerticalSupport(mesh,cellSize));
    if (![x0, x1, z0, z1].every(Number.isFinite) || (x1 - x0 + 1) * (z1 - z0 + 1) > 256) { wide.push(mesh); continue; }
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const key = `${x},${z}`, bucket = cells.get(key) ?? [];
      bucket.push(mesh); cells.set(key, bucket);
    }
  }
  const nearby = (x: number, z: number) => [...(cells.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) ?? []), ...wide]
    .filter(mesh => { const box = bounds.get(mesh)!; return x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z; });
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), origin = new THREE.Vector3();
  const componentCache = new Map<THREE.BufferGeometry, Component[]>(), rootCache = new Map<THREE.BufferGeometry, THREE.Vector3[]>();
  const checks: Check[] = [];
  let truncated = false, invalid = 0;
  try {
    for (const target of targets) {
      const p = target.geometry.getAttribute('position');
      if (!p) { invalid++; continue; }
      let sets: { points: THREE.Vector3[]; faces?: Set<number> }[];
      if (target.kind === 'root') {
        let samples = rootCache.get(target.geometry);
        if (!samples) { samples = rootSamples(target.geometry); rootCache.set(target.geometry, samples); }
        sets = [{ points: samples.map(v => v.clone().applyMatrix4(target.matrix)) }];
      } else {
        let groups = componentCache.get(target.geometry);
        if (!groups) { groups = components(target.geometry); componentCache.set(target.geometry, groups); }
        sets = groups.map(group => ({ points: group.vertices.map(i => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(target.matrix)), faces: group.faces }));
      }
      for (const [component, { points, faces }] of sets.entries()) {
        if (checks.length >= maxChecks) { truncated = true; break; }
        if (!points.length || points.some(v => ![v.x, v.y, v.z].every(Number.isFinite))) { invalid++; continue; }
        const box = new THREE.Box3().setFromPoints(points);
        // Prop components use actual lowest vertices; checking their AABB corners invents off-object samples.
        const samples = target.kind === 'root' ? points : points.filter(v => v.y <= box.min.y + .015);
        const gaps: number[] = [];
        for (const sample of samples) {
          const ground = heightAt(sample.x, sample.z);
          let gap = sample.y - ground;
          if (target.kind === 'prop' && gap > clearance) {
            origin.set(sample.x, box.min.y - .002, sample.z);
            ray.set(origin, down); ray.far = Math.max(0, box.min.y - ground + .1);
            const self = (hit: THREE.Intersection) => {
              const mesh = hit.object as THREE.Mesh;
              if (mesh.geometry !== target.geometry || hit.faceIndex == null || !faces?.has(hit.faceIndex)) return false;
              local.copy(mesh.matrixWorld);
              if (hit.instanceId !== undefined) {
                const instance = new THREE.Matrix4(); (mesh as THREE.InstancedMesh).getMatrixAt(hit.instanceId, instance); local.multiply(instance);
              }
              return local.elements.every((v, i) => Math.abs(v - target.matrix.elements[i]!) < 1e-4);
            };
            const candidates = nearby(sample.x, sample.z);
            const hit = ray.intersectObjects(candidates, false).find(hit => !self(hit));
            if (hit) gap = Math.min(gap, hit.distance + .002);
            // A flush support can contain the probe just below the bottom; look up over the tolerance too.
            ray.set(origin, new THREE.Vector3(0, 1, 0)); ray.far = clearance + .002;
            const upper = ray.intersectObjects(candidates, false).find(hit => !self(hit));
            if (upper) gap = Math.min(gap, Math.abs(upper.distance - .002));
          }
          if (Number.isFinite(gap)) gaps.push(gap);
        }
        if (!gaps.length) { invalid++; continue; }
        const minGap = Math.min(...gaps), maxGap = Math.max(...gaps);
        const unsupportedFraction = gaps.filter(g => g > clearance).length / gaps.length;
        checks.push({ label: target.label, kind: target.kind, component, position: box.getCenter(new THREE.Vector3()).toArray(),
          samples: gaps.length, minGap, maxGap, unsupportedFraction,
          candidate: target.kind === 'prop' ? minGap > clearance : unsupportedFraction >= .25 && maxGap > clearance });
      }
      if (truncated) break;
    }
  } finally { for(const release of releaseIndexes)release(); material.dispose(); }
  return { schema: 1, clearance, kind: options.kind ?? 'all', lod: options.lod ?? 0, scope: 'static scene components plus supplied full populations; intentional hanging/floating objects require review',
    complete: !truncated && skipped.length === 0 && invalid === 0, truncated, skipped, invalid,
    summary: { checks: checks.length, roots: checks.filter(c => c.kind === 'root').length, props: checks.filter(c => c.kind === 'prop').length,
      candidates: checks.filter(c => c.candidate).length }, checks };
}
