/** Original stored NavigationMap loading and native zone/path queries.
 * Coordinates are unreflected original centimetres. These are source/live
 * property-set identities, never renderer meshes. Forced map compilation,
 * AIZone inheritance, door binding, path search and movement are separate.
 * Float stores are modelled; JS is not bit-identical to extended x87 arithmetic.
 */
import manifestText from '../../public/gothic3/navigation-scene/manifest.json?raw';
import type { NativeValue } from './dialogue';
import type { NativePositionCm } from './navigation-runtime';
import { readNativeResource } from './resource';
import type { ResourceReceipt } from './resource';

type V = NativePositionCm;
type Matrix = readonly number[];
const MAP_SHA = '1b163f4f1be7115aeef37835e798772a3437db3429a32b4d36d866437b9a41c3';
const GAME_SHA = 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f';
const SHARED_SHA = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214';
const PI = Math.fround(Math.PI), TWO_PI = Math.fround(2 * Math.PI);
// Original Game2067bae0 is a widened float32 constant in double storage.
const ANGLE_EPSILON = Math.fround(0.001);
const HOMOGENEOUS_EPSILON = Math.fround(1e-5); // SharedBase100e5de8 acc52737
const f = Math.fround;
function known<T>(value: T): NativeValue<T> { return { known: true, value }; }
function unknown<T>(reason: string): NativeValue<T> { return { known: false, reason }; }
function vector(raw: unknown, label: string): V {
  if (!Array.isArray(raw) || raw.length !== 3 || raw.some((n) =>
    typeof n !== 'number' || !Number.isFinite(n) || f(n) !== n)) throw new Error('Invalid native vector: ' + label);
  return Object.freeze([raw[0] as number, raw[1] as number, raw[2] as number]);
}
function number(raw: unknown, label: string): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || f(raw) !== raw) throw new Error('Invalid native float: ' + label);
  return raw;
}
function bool(raw: unknown, label: string): boolean {
  if (typeof raw !== 'boolean') throw new Error('Invalid native bool: ' + label);
  return raw;
}
/** Native bCPropertyID equality compares 16 bytes; assignment clears the tail. */
export function navigationPropertyId(raw: string | null): string | null {
  if (raw === null) return null;
  if (!/^[0-9a-f]{40}$/i.test(raw)) throw new Error('Expected native 20-byte PropertyID storage');
  const value = raw.slice(0, 32).toLowerCase();
  return /^0{32}$/.test(value) ? null : value + '00000000';
}
export interface NativeNavigationProxy { readonly propertySet: string | null; readonly guid20: string | null }
interface NegativeZone {
  worldPointsCm: V[]; radiusCm: number; worldRadiusOffsetCm: V; ccw: boolean;
  zoneGuid20: string | null; guid20: string | null;
}
interface PathBinding {
  proxy: number; networkIndex: number;
  zoneACenterCm: V; zoneAMargin1Cm: V; zoneAMargin2Cm: V;
  zoneBCenterCm: V; zoneBMargin1Cm: V; zoneBMargin2Cm: V;
}
interface ZoneBinding { proxy: number; networkIndex: number; negativeZoneIndices: number[] }
interface QueryMap {
  schema: 'gothic3-navigation-query-map-v1'; mapSourceSha256: string;
  proxies: NativeNavigationProxy[];
  grid: { cells: number[][][]; minX: number; maxX: number; minZ: number; maxZ: number;
    cellSizeX: number; cellSizeZ: number };
  negativeZones: NegativeZone[]; zoneBindings: ZoneBinding[]; pathBindings: PathBinding[];
}
export interface NativeNavigationDefinition {
  readonly key: string; readonly index: number; readonly name: string; readonly guid: string;
  readonly flags: readonly number[]; readonly worldMatrix: Matrix; readonly sourceIndex: number;
  readonly propertySets: readonly { name: string; version: number; values: Record<string, unknown>;
    unknownProperties?: unknown[]; duplicateProperties?: unknown[] }[];
}
interface Definitions {
  schema: 'gothic3-navigation-entity-definitions-v1'; world: 'G3_World_01';
  entities: NativeNavigationDefinition[];
  sources: { source: { family: string; path: string; sha256: string }; sectorIds: string[];
    registered: boolean; enabledByAnyRegistry: boolean }[];
}
interface Output extends ResourceReceipt { path: string }
interface Manifest { schema: string; mapSourceSha256: string; inputs: { Game: string; SharedBase: string };
  queryMap: Output; definitions: Output; storedLists: Output }
const manifest = JSON.parse(manifestText) as Manifest;
if (manifest.schema !== 'gothic3-navigation-scene-manifest-v1' || manifest.mapSourceSha256 !== MAP_SHA ||
    manifest.inputs.Game !== GAME_SHA || manifest.inputs.SharedBase !== SHARED_SHA) {
  throw new Error('Unsupported original navigation-scene receipt');
}
for (const output of [manifest.queryMap, manifest.definitions, manifest.storedLists]) {
  if (!/^[a-z-]+\.json\.gz$/.test(output.path) || !/^[a-f0-9]{64}$/.test(output.sha256) ||
      !Number.isSafeInteger(output.bytes) || output.bytes < 1) throw new Error('Invalid navigation resource receipt');
}

/** Hash-verified static source candidates. Loading does not register any entity. */
export interface NativeNavigationSceneSource {
  readonly query: QueryMap; readonly definitions: Definitions;
}
const trustedSources = new WeakSet<object>();
function freeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export async function loadNativeNavigationSceneSource(): Promise<NativeNavigationSceneSource> {
  const [query, definitions] = await Promise.all([
    readNativeResource<QueryMap>('navigation-scene/' + manifest.queryMap.path, manifest.queryMap),
    readNativeResource<Definitions>('navigation-scene/' + manifest.definitions.path, manifest.definitions,
      { maximumDecodedBytes: 16 * 1024 * 1024 }),
  ]);
  if (query.schema !== 'gothic3-navigation-query-map-v1' || query.mapSourceSha256 !== MAP_SHA ||
      definitions.schema !== 'gothic3-navigation-entity-definitions-v1' || definitions.world !== 'G3_World_01') {
    throw new Error('Unsupported navigation source schema');
  }
  const grid = query.grid;
  if (!grid.cells.length || !grid.cells[0]?.length || grid.cellSizeX <= 0 || grid.cellSizeZ <= 0 ||
      grid.cells.some((column) => column.length !== grid.cells[0]!.length ||
        column.some((cell) => cell.some((i) => !Number.isInteger(i) || i < 0 || i >= query.proxies.length)))) {
    throw new Error('Invalid stored navigation grid');
  }
  query.proxies.forEach((proxy) => navigationPropertyId(proxy.guid20));
  for (const binding of [...query.zoneBindings, ...query.pathBindings]) {
    if (!Number.isInteger(binding.proxy) || binding.proxy < 0 || binding.proxy >= query.proxies.length) {
      throw new Error('Invalid stored proxy index');
    }
  }
  for (const binding of query.zoneBindings) {
    if (binding.negativeZoneIndices.some((i) => !Number.isInteger(i) || i < 0 || i >= query.negativeZones.length)) {
      throw new Error('Invalid stored negative-zone index');
    }
  }
  const result = freeze({ query, definitions });
  trustedSources.add(result);
  return result;
}
/** Full original network/circle/interaction lists, optional: ~60.8 MB decoded.
 * They are not loaded for a zone query and are not a route-search implementation. */
export async function loadStoredNavigationLists(): Promise<unknown> {
  return freeze(await readNativeResource<unknown>('navigation-scene/' + manifest.storedLists.path, manifest.storedLists,
    { maximumDecodedBytes: 64 * 1024 * 1024 }));
}

interface AreaBase {
  readonly sourceKey: string; readonly id: string; readonly name: string;
  readonly kind: 'zone' | 'path'; readonly pointsCm: readonly V[];
  worldMatrix: Matrix; inverseWorldMatrix: Matrix;
  readonly topToleranceCm: number; readonly bottomToleranceCm: number;
  readonly linkInnerArea: boolean; readonly linkInnerTopArea: boolean; readonly linkInnerBottomArea: boolean;
  heights: { mean: number; maxOffset: number; minOffset: number } | null;
  networkIndex: number;
}
export interface NativeNavigationZone extends AreaBase {
  readonly kind: 'zone'; readonly radiusCm: number; readonly radiusOffsetCm: V;
  readonly ccw: boolean; negativeZones: readonly NegativeZone[];
}
export interface NativeNavigationPath extends AreaBase {
  readonly kind: 'path'; readonly radiiCm: readonly number[]; readonly unlimitedHeight: boolean;
  readonly zoneAId: string | null; readonly zoneBId: string | null;
  zoneAIntersectionCenterCm: V; zoneAIntersectionMargin1Cm: V; zoneAIntersectionMargin2Cm: V;
  zoneBIntersectionCenterCm: V; zoneBIntersectionMargin1Cm: V; zoneBIntersectionMargin2Cm: V;
}
export type NativeNavigationArea = NativeNavigationZone | NativeNavigationPath;
const sourceAreas = new WeakSet<object>();

/** Builds the typed local state of one proven original property set. The caller
 * owns live registration/residency; source enabled flags cannot establish it. */
export function createNativeNavigationArea(source: NativeNavigationSceneSource, sourceKey: string): NativeValue<NativeNavigationArea> {
  if (!trustedSources.has(source)) return unknown('Navigation source is not hash verified.');
  const definition = source.definitions.entities.find((entity) => entity.key === sourceKey);
  if (!definition) return unknown('No original navigation definition: ' + sourceKey);
  try {
    const properties = definition.propertySets.filter((p) => p.name === 'gCNavZone_PS' || p.name === 'gCNavPath_PS');
    if (properties.length !== 1 || properties[0]!.unknownProperties?.length || properties[0]!.duplicateProperties?.length) {
      return unknown('Ambiguous/unsupported original navigation properties: ' + sourceKey);
    }
    const property = properties[0]!, values = property.values;
    const pointArray = values.Point as { elementType: string; count: number; items: unknown[] };
    if (pointArray?.elementType !== 'class bCVector' || !Array.isArray(pointArray.items) || pointArray.count !== pointArray.items.length) {
      throw new Error('Unsupported original Point array');
    }
    const points = Object.freeze(pointArray.items.map((point, i) => vector(point, 'Point[' + i + ']')));
    const matrix = validateMatrix(definition.worldMatrix);
    const id = navigationPropertyId(definition.guid);
    if (!id) throw new Error('Navigation entity has an invalid PropertyID');
    const base = { sourceKey, id, name: definition.name, pointsCm: points, worldMatrix: matrix,
      inverseWorldMatrix: invertNativeNavigationMatrix(matrix), networkIndex: 0, heights: null,
      topToleranceCm: number(values.TopToleranz, 'TopToleranz'), bottomToleranceCm: number(values.BottomToleranz, 'BottomToleranz'),
      linkInnerArea: bool(values.LinkInnerArea, 'LinkInnerArea'), linkInnerTopArea: bool(values.LinkInnerTopArea, 'LinkInnerTopArea'),
      linkInnerBottomArea: bool(values.LinkInnerBottomArea, 'LinkInnerBottomArea') };
    let area: NativeNavigationArea;
    if (property.name === 'gCNavZone_PS') {
      if (!points.length) throw new Error('Native angle test requires at least one zone point');
      area = { ...base, kind: 'zone', radiusCm: number(values.Radius, 'Radius'),
        radiusOffsetCm: vector(values.RadiusOffset, 'RadiusOffset'), ccw: bool(values.ZoneIsCCW, 'ZoneIsCCW'), negativeZones: [] };
    } else {
      const radius = values.Radius as { elementType: string; count: number; items: unknown[] };
      if (radius?.elementType !== 'float' || !Array.isArray(radius.items) || radius.count !== radius.items.length || radius.count !== points.length) {
        throw new Error('Unsupported original per-point Radius array');
      }
      const reference = (name: string): string | null => {
        const ref = values[name] as { rawGuid20: string | null };
        if (!ref || !('rawGuid20' in ref)) throw new Error('Unsupported zone reference: ' + name);
        return navigationPropertyId(ref.rawGuid20);
      };
      area = { ...base, kind: 'path', radiiCm: Object.freeze(radius.items.map((n) => number(n, 'Radius'))),
        unlimitedHeight: bool(values.UnlimitedHeight, 'UnlimitedHeight'), zoneAId: reference('ZoneAEntityID'), zoneBId: reference('ZoneBEntityID'),
        zoneAIntersectionCenterCm: vector(values.ZoneAIntersectionCenter, 'ZoneAIntersectionCenter'),
        zoneAIntersectionMargin1Cm: vector(values.ZoneAIntersectionMargin1, 'ZoneAIntersectionMargin1'),
        zoneAIntersectionMargin2Cm: vector(values.ZoneAIntersectionMargin2, 'ZoneAIntersectionMargin2'),
        zoneBIntersectionCenterCm: vector(values.ZoneBIntersectionCenter, 'ZoneBIntersectionCenter'),
        zoneBIntersectionMargin1Cm: vector(values.ZoneBIntersectionMargin1, 'ZoneBIntersectionMargin1'),
        zoneBIntersectionMargin2Cm: vector(values.ZoneBIntersectionMargin2, 'ZoneBIntersectionMargin2') };
    }
    sourceAreas.add(area);
    return known(area);
  } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
}

function validateMatrix(raw: Matrix): Matrix {
  if (raw.length !== 16 || raw.some((n) => !Number.isFinite(n) || f(n) !== n)) throw new Error('Invalid original world matrix');
  return Object.freeze([...raw]);
}
/** SharedBase10032970 cofactor inverse. Native singular inverse is identity. */
export function invertNativeNavigationMatrix(raw: Matrix): Matrix {
  const m = validateMatrix(raw), at = (i: number): number => m[i]!;
  const a = at(7) * at(2) - at(6) * at(3), b = at(11) * at(2) - at(10) * at(3);
  const c = at(11) * at(6) - at(10) * at(7), d = at(15) * at(6) - at(14) * at(7);
  const e = at(15) * at(10) - at(14) * at(11), g = at(3) * at(14) - at(15) * at(2);
  const r0 = (at(5) * e - d * at(9)) + c * at(13);
  const r1 = -(at(13) * b + at(9) * g + at(1) * e);
  const r2 = at(13) * a + g * at(5) + at(1) * d;
  const r3 = -((at(1) * c - b * at(5)) + a * at(9));
  const det = at(12) * r3 + at(8) * r2 + at(0) * r0 + r1 * at(4);
  if (det === 0) return Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const reciprocal = 1 / det;
  const h = at(5) * at(0) - at(1) * at(4), i = at(9) * at(0) - at(1) * at(8);
  const j = at(9) * at(4) - at(5) * at(8), k = at(13) * at(4) - at(5) * at(12);
  const l = at(13) * at(8) - at(9) * at(12), n = at(1) * at(12) - at(0) * at(13);
  return Object.freeze([
    r0, r1, r2, r3,
    -((at(4) * e - at(8) * d) + at(12) * c), at(12) * b + at(0) * e + at(8) * g,
    -(at(12) * a + at(0) * d + at(4) * g), at(8) * a + (at(0) * c - at(4) * b),
    (l * at(7) - k * at(11)) + j * at(15), -(at(15) * i + at(3) * l + n * at(11)),
    at(15) * h + at(7) * n + at(3) * k, -(at(11) * h + (at(3) * j - at(7) * i)),
    -(at(14) * j + (at(6) * l - at(10) * k)), at(10) * n + at(2) * l + i * at(14),
    -(h * at(14) + at(2) * k + at(6) * n), (j * at(2) - at(6) * i) + at(10) * h,
  ].map((value) => f(value * reciprocal)));
}
/** SharedBase1000167c, including non-affine homogeneous near-zero behavior. */
export function transformNativeNavigationPoint(matrix: Matrix, point: V): V {
  const [x, y, z] = point;
  const tx = f(matrix[8]! * z + x * matrix[0]! + matrix[4]! * y + matrix[12]!);
  const ty = f(matrix[9]! * z + matrix[5]! * y + matrix[1]! * x + matrix[13]!);
  const tz = f(matrix[10]! * z + matrix[6]! * y + matrix[2]! * x + matrix[14]!);
  if (matrix[3] === 0 && matrix[7] === 0 && matrix[11] === 0 && matrix[15] === 1) return [tx, ty, tz];
  const w = f(matrix[11]! * z + matrix[7]! * y + x * matrix[3]! + matrix[15]!);
  if (Math.abs(w) < HOMOGENEOUS_EPSILON) return [0, 0, 0];
  const inv = f(1 / w);
  return [f(tx * inv), f(ty * inv), f(tz * inv)];
}
/** Host calls this at the corresponding live transform/cache update boundary. */
export function updateNativeNavigationTransform(area: NativeNavigationArea, matrix: Matrix): void {
  if (!sourceAreas.has(area)) throw new Error('Area was not constructed from pinned original properties');
  area.worldMatrix = validateMatrix(matrix);
  area.inverseWorldMatrix = invertNativeNavigationMatrix(area.worldMatrix);
  area.heights = null;
}

function horizontalDistanceSquared(a: V, b: V): number {
  const x = f(a[0] - b[0]), z = f(a[2] - b[2]);
  return f(x * x + z * z);
}
function normalizedDirection(point: V, target: V): V {
  const x = f(target[0] - point[0]), z = f(target[2] - point[2]);
  const length = f(Math.sqrt(x * x + z * z));
  if (!(length > 0)) return [x, 0, z];
  const inverse = f(1 / length);
  return [f(x * inverse), 0, f(z * inverse)];
}
function zero(v: V): boolean { return v[0] === 0 && v[1] === 0 && v[2] === 0; }
function angle(a: V, b: V): number {
  const dot = f(a[2] * b[2] + a[0] * b[0] + a[1] * b[1]);
  return f(Math.acos(Math.max(-1, Math.min(1, dot))));
}
function crossY(a: V, b: V): number { return f(a[2] * b[0] - a[0] * b[2]); }
/** Native signed-angle test, preserving its original border/degenerate behavior.
 * This is not a generic point-in-polygon substitution. */
export function nativeNavigationAngleContains(points: readonly V[], point: V, initialBorder = true): boolean {
  if (!points.length) throw new Error('Native zone angle test requires at least one point');
  let previous = normalizedDirection(point, points[points.length - 1]!);
  let current = normalizedDirection(point, points[0]!);
  let value = angle(previous, current);
  if (zero(previous) || zero(current) || Math.abs(value) > PI - ANGLE_EPSILON) return initialBorder;
  let sum = crossY(previous, current) > 0 ? -Math.abs(value) : Math.abs(value);
  for (let i = 1; i < points.length; i++) {
    previous = current;
    current = normalizedDirection(point, points[i]!);
    value = angle(previous, current);
    if (zero(current) || Math.abs(value) > PI - ANGLE_EPSILON) { sum = TWO_PI; break; }
    sum = f(sum + (crossY(previous, current) > 0 ? -Math.abs(value) : Math.abs(value)));
  }
  return Math.abs(sum) > PI;
}
export function nativeNavigationZoneContains(zone: NativeNavigationZone, pointCm: V): boolean {
  return nativeNavigationAngleContains(zone.pointsCm, transformNativeNavigationPoint(zone.inverseWorldMatrix, pointCm), true);
}
function internalNegativeZone(zone: NativeNavigationZone, point: V): boolean {
  for (const negative of zone.negativeZones) {
    if (horizontalDistanceSquared(point, negative.worldRadiusOffsetCm) <= f(negative.radiusCm * negative.radiusCm) &&
        nativeNavigationAngleContains(negative.worldPointsCm, point, true)) return true;
  }
  return false;
}
/** SharedBase100605d0 Contains(infinite tapered double cylinder). Endpoint
 * circles are strict; the segment's perpendicular boundary is inclusive. */
export function nativeNavigationDoubleCylinderContains(point: V, a: V, ra: number, b: V, rb: number): boolean {
  if (horizontalDistanceSquared(point, a) < f(ra * ra) || horizontalDistanceSquared(point, b) < f(rb * rb)) return true;
  const dx = f(b[0] - a[0]), dz = f(b[2] - a[2]);
  const length = f(Math.sqrt(dx * dx + dz * dz));
  const inverse = length > 0 ? f(1 / length) : 0;
  const nx = length > 0 ? f(-dz * inverse) : -dz, nz = length > 0 ? f(dx * inverse) : dx;
  const distance = f((point[0] - a[0]) * nx + (point[2] - a[2]) * nz);
  const ratio = f(dx === 0 ? ((point[2] - distance * nz) - a[2]) / dz :
    ((point[0] - distance * nx) - a[0]) / dx);
  // FCOMI/JBE at10060830 also rejects unordered0/0 for coincident endpoints.
  if (!(ratio > 0 && ratio < 1)) return false;
  const radius = f(ra + f(rb - ra) * ratio);
  return radius >= Math.abs(distance);
}
function marginContains(point: V, a: V, b: V, inside: V): boolean {
  if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) return true;
  const delta: V = [f(b[0] - a[0]), 0, f(b[2] - a[2])];
  const query: V = [f(point[0] - a[0]), 0, f(point[2] - a[2])];
  const expected: V = [f(inside[0] - a[0]), 0, f(inside[2] - a[2])];
  return crossY(delta, query) * crossY(delta, expected) >= 0;
}
export function nativeNavigationPathContains(path: NativeNavigationPath, worldPointCm: V): boolean {
  const points = path.pointsCm, point = transformNativeNavigationPoint(path.inverseWorldMatrix, worldPointCm);
  if (points.length === 1) return horizontalDistanceSquared(point, points[0]!) < f(path.radiiCm[0]! ** 2);
  for (let i = 0; i < points.length - 1; i++) {
    if (!nativeNavigationDoubleCylinderContains(point, points[i]!, path.radiiCm[i]!, points[i + 1]!, path.radiiCm[i + 1]!)) continue;
    if (i === 0 && path.zoneAId && !marginContains(point, path.zoneAIntersectionMargin1Cm, path.zoneAIntersectionMargin2Cm, points[1]!)) return false;
    if (i === points.length - 2 && path.zoneBId && !marginContains(point, path.zoneBIntersectionMargin1Cm, path.zoneBIntersectionMargin2Cm, points[points.length - 2]!)) return false;
    return true; // native returns on its first contained segment, including margin rejection
  }
  return false;
}
function heightFlags(area: NativeNavigationArea, point: V): { inHeight: boolean; linked: boolean } {
  if (area.heights === null || area.heights.maxOffset < 0 || area.heights.minOffset < 0) {
    let total = 0, min = Infinity, max = -Infinity;
    for (const local of area.pointsCm) {
      const y = transformNativeNavigationPoint(area.worldMatrix, local)[1];
      total = f(total + y); min = Math.min(min, y); max = Math.max(max, y);
    }
    const mean = area.pointsCm.length ? f(total / area.pointsCm.length) : 0;
    area.heights = { mean, maxOffset: area.pointsCm.length ? f(max - mean) : 0,
      minOffset: area.pointsCm.length ? f(mean - min) : 0 };
  }
  const { mean, maxOffset, minOffset } = area.heights;
  const top = f(mean + maxOffset + area.topToleranceCm), bottom = f(mean - minOffset - area.bottomToleranceCm);
  if (point[1] > top) return { inHeight: false, linked: area.linkInnerTopArea };
  if (point[1] < bottom) return { inHeight: false, linked: area.linkInnerBottomArea };
  return { inHeight: true, linked: area.linkInnerArea };
}

export interface NativeNavigationSceneHost {
  /** A known null is actual failed live proxy resolution, not merely unloaded
   * source data. Native equality uses16bytes. RTTI/type checks remain explicit. */
  resolve(proxy: NativeNavigationProxy): NativeValue<NativeNavigationArea | null>;
  /** Original virtual EnterEx/ExitEx(false), not a renderer event. Effects may
   * be partial/reentrant; unknown/throw is conservatively recorded as attempted. */
  notifyPathProperty(path: NativeNavigationPath, property: string, phase: 'enter' | 'exit', nativeFlag: false): NativeValue<true>;
}
export interface NavigationSceneMutation {
  readonly status: 'query-bindings-complete' | 'unsupported' | 'partial';
  readonly applied: readonly string[]; readonly attempted: readonly string[]; readonly reason?: string;
  /** This stage never asserts full gCNavigationAdmin::CompileNavigationScene. */
  readonly fullNavigationAdminCompiled: false;
}
export interface NativeZoneQueryResult {
  /** Native map-grid-empty branch returns0 before clearing caller output. */
  readonly nativeResult: 0 | 1; readonly outputWritten: boolean;
  readonly areaId: string | null;
  /** null means native left the caller's bool unchanged; an excluded zone can
   * leave this false even after its output PropertyID has been destroyed. */
  readonly isPath: boolean | null;
}
/** Ordered stored map queries against host-resolved original live areas.
 * bindQueryProperties ports the loaded lists' relevant associations/observer
 * writes; it does not bind unrelated interaction proxies or AIZone/doors. */
export class NativeStoredNavigationScene {
  private ready = false;
  private boundAreas = new WeakSet<object>();
  private bindingState: 'new' | 'binding' | 'complete' | 'failed' = 'new';
  private querying = false;
  constructor(private readonly source: NativeNavigationSceneSource, private readonly host: NativeNavigationSceneHost) {
    if (!trustedSources.has(source)) throw new Error('Navigation scene source is not hash verified');
  }
  get queryBindingsReady(): boolean { return this.ready; }

  bindQueryProperties(): NavigationSceneMutation {
    if (this.bindingState !== 'new' || this.querying) return Object.freeze({ status: 'unsupported',
      applied: Object.freeze([]), attempted: Object.freeze([]), fullNavigationAdminCompiled: false,
      reason: 'Stored binding is single-use and cannot interleave with queries. After partial failure reconstruct the host/areas and a fresh scene; full native GameReset/recompile is not implemented here.' });
    this.bindingState = 'binding';
    this.ready = false;
    this.boundAreas = new WeakSet<object>();
    const applied: string[] = [], attempted: string[] = [];
    const result = (reason?: string): NavigationSceneMutation => Object.freeze({
      status: reason ? (applied.length || attempted.length ? 'partial' : 'unsupported') : 'query-bindings-complete',
      applied: Object.freeze([...applied]), attempted: Object.freeze([...attempted]),
      ...(reason ? { reason } : {}), fullNavigationAdminCompiled: false,
    });
    const notify = (path: NativeNavigationPath, property: string, phase: 'enter' | 'exit'): void => {
      attempted.push(path.sourceKey + ':' + property + ':' + phase);
      const receipt = this.host.notifyPathProperty(path, property, phase, false);
      if (!receipt.known) throw new Error(receipt.reason);
      if (receipt.value !== true) throw new Error('Property observer did not confirm completion');
      applied.push(path.sourceKey + ':' + property + ':' + phase);
    };
    try {
      for (const binding of this.source.query.zoneBindings) {
        const proxy = this.source.query.proxies[binding.proxy]!;
        attempted.push('resolve-zone:' + binding.proxy);
        const resolved = this.host.resolve(proxy);
        if (!resolved.known) throw new Error(resolved.reason);
        if (resolved.value === null) continue; // exactly native failed proxy lookup
        const zone = resolved.value;
        if (!sourceAreas.has(zone) || zone.kind !== 'zone' || zone.id !== navigationPropertyId(proxy.guid20)) {
          throw new Error('Live zone resolver returned a mismatched original property set');
        }
        zone.networkIndex = binding.networkIndex;
        zone.negativeZones = Object.freeze(binding.negativeZoneIndices.map((i) => this.source.query.negativeZones[i]!));
        applied.push(zone.sourceKey + ':networkIndex+negativeZonePointers');
        this.boundAreas.add(zone);
      }
      for (const binding of this.source.query.pathBindings) {
        const proxy = this.source.query.proxies[binding.proxy]!;
        attempted.push('resolve-path:' + binding.proxy);
        const resolved = this.host.resolve(proxy);
        if (!resolved.known) throw new Error(resolved.reason);
        if (resolved.value === null) continue;
        const path = resolved.value;
        if (!sourceAreas.has(path) || path.kind !== 'path' || path.id !== navigationPropertyId(proxy.guid20)) {
          throw new Error('Live path resolver returned a mismatched original property set');
        }
        const write = (property: string, field: keyof NativeNavigationPath, value: V): void => {
          notify(path, property, 'enter');
          // Native keeps this exact resolved property-set pointer across observers.
          (path as unknown as Record<string, unknown>)[field] = vector(value, property);
          applied.push(path.sourceKey + ':' + property + ':write');
          notify(path, property, 'exit');
        };
        write('ZoneAIntersectionCenter', 'zoneAIntersectionCenterCm', binding.zoneACenterCm);
        path.networkIndex = binding.networkIndex;
        applied.push(path.sourceKey + ':networkIndex');
        write('ZoneAIntersectionMargin1', 'zoneAIntersectionMargin1Cm', binding.zoneAMargin1Cm);
        write('ZoneAIntersectionMargin2', 'zoneAIntersectionMargin2Cm', binding.zoneAMargin2Cm);
        write('ZoneBIntersectionCenter', 'zoneBIntersectionCenterCm', binding.zoneBCenterCm);
        write('ZoneBIntersectionMargin1', 'zoneBIntersectionMargin1Cm', binding.zoneBMargin1Cm);
        write('ZoneBIntersectionMargin2', 'zoneBIntersectionMargin2Cm', binding.zoneBMargin2Cm);
        this.boundAreas.add(path);
      }
      this.ready = true;
      this.bindingState = 'complete';
      return result();
    } catch (error) {
      this.bindingState = 'failed';
      return result(error instanceof Error ? error.message : String(error));
    }
  }

  /** Game202c47e0 GetZone. Prefer smallest eligible zone radius, then the first
   * eligible path when height/link/exclusion priority allows it. */
  getZone(positionCm: V, dontConsiderNavPath = false, excludeInternalNegZones = true,
          minimumZoneRadiusCm = -1): NativeValue<NativeZoneQueryResult> {
    if (!this.ready) return unknown('Stored query-property bindings are not complete.');
    if (this.bindingState !== 'complete' || this.querying) return unknown('Navigation query cannot interleave with construction or a reentrant query.');
    this.querying = true;
    try {
      const point = vector(positionCm, 'GetZone position');
      bool(dontConsiderNavPath, 'GetZone dontConsiderNavPath');
      bool(excludeInternalNegZones, 'GetZone excludeInternalNegZones');
      const minimum = number(minimumZoneRadiusCm, 'GetZone minimumRadius');
      const grid = this.source.query.grid;
      if (!grid.cells.length) return known({ nativeResult: 0, outputWritten: false, areaId: null, isPath: null });
      const ix = Math.max(0, Math.min(grid.cells.length - 1, Math.trunc((point[0] - grid.minX) / grid.cellSizeX)));
      const iz = Math.max(0, Math.min(grid.cells[ix]!.length - 1, Math.trunc((point[2] - grid.minZ) / grid.cellSizeZ)));
      const cell = grid.cells[ix]![iz]!;
      const resolve = (i: number): NativeNavigationArea | null => {
        const proxy = this.source.query.proxies[i]!, receipt = this.host.resolve(proxy);
        if (!receipt.known) throw new Error(receipt.reason);
        if (receipt.value && (!sourceAreas.has(receipt.value) || receipt.value.id !== navigationPropertyId(proxy.guid20))) {
          throw new Error('GetZone resolver returned mismatched original identity');
        }
        if (receipt.value && !this.boundAreas.has(receipt.value)) {
          throw new Error('Live area identity was replaced or not bound by this stored scene.');
        }
        return receipt.value;
      };
      let selected: NativeNavigationZone | null = null, linked = false, radius = 0;
      for (const i of cell) {
        const area = resolve(i);
        if (!area || area.kind !== 'zone' || (minimum > 0 && area.radiusCm <= minimum)) continue;
        const flags = heightFlags(area, point);
        if (!(flags.linked || (!linked && flags.inHeight))) continue;
        if (selected && !(area.radiusCm < radius)) continue;
        const center = transformNativeNavigationPoint(area.worldMatrix, area.radiusOffsetCm);
        if (horizontalDistanceSquared(point, center) > f(area.radiusCm * area.radiusCm) || !nativeNavigationZoneContains(area, point)) continue;
        selected = area; radius = area.radiusCm; linked = flags.linked;
      }
      let insideNegative = false;
      if (!dontConsiderNavPath) {
        if (selected) insideNegative = internalNegativeZone(selected, point);
        const zoneHasPriority = selected !== null && (linked || !insideNegative);
        if (!(selected && !insideNegative && linked)) {
          for (const i of cell) {
            const area = resolve(i);
            if (!area || area.kind !== 'path') continue;
            const flags = heightFlags(area, point);
            if ((flags.linked || (!zoneHasPriority && flags.inHeight)) && nativeNavigationPathContains(area, point)) {
              return known({ nativeResult: 1, outputWritten: true, areaId: area.id, isPath: true });
            }
          }
        }
      }
      const pathFlag = selected ? false : null;
      if (selected && excludeInternalNegZones && (dontConsiderNavPath ? internalNegativeZone(selected, point) : insideNegative)) selected = null;
      return known({ nativeResult: 1, outputWritten: true, areaId: selected?.id ?? null, isPath: pathFlag });
    } catch (error) { return unknown(error instanceof Error ? error.message : String(error)); }
    finally { this.querying = false; }
  }

  /** Direct adapter for NativeNavigationLifecycleHost.findZoneAt. */
  findZoneAt(positionCm: V, dontConsiderNavPath: boolean, excludeInternalNegZones: boolean,
             minimumZoneRadiusCm: number): NativeValue<string | null> {
    const result = this.getZone(positionCm, dontConsiderNavPath, excludeInternalNegZones, minimumZoneRadiusCm);
    if (!result.known) return result;
    if (!result.value.outputWritten) return unknown('Native empty-grid branch leaves caller output unchanged.');
    return known(result.value.areaId);
  }
}
