/** Resolve bounded Ardea scene placement from each actor's stored Start-routine
 * points. This seeds the browser scene at an unambiguous native routine anchor;
 * it does not simulate pathfinding, movement, schedule changes or activation. */
import type { NativeValue } from './dialogue';
import { gameplayResources, NativeWorldData } from './native-data';
import type { NativeEntityIndex, NativeEntityRecord } from './native-data';
import type { SourceArdeaActor } from './actor-dialogue-state';
import { nativeNavigationRoutinePointAssignments } from './navigation-routine';
import type { NativeNavigationRoutinePoint } from './navigation-routine';
import type { ArdeaScene, ScenePerson, Vec3 } from './types';

interface InitialArdeaActor extends SourceArdeaActor {
  readonly source: { readonly path: string };
}

interface PropertyValue { readonly name: string; readonly status?: string; readonly value?: unknown }
interface PointReference { readonly rawGuid20: string }

export interface NativeRoutineScenePlacement {
  readonly personId: string;
  readonly personName: string;
  readonly routine: string;
  readonly pointId20: string;
  readonly pointName: string;
  readonly position: Vec3;
  readonly rotationY: number;
}

export interface NativeRoutineScenePlacements {
  readonly placements: ReadonlyMap<string, NativeRoutineScenePlacement>;
  readonly skipped: readonly { readonly personId: string; readonly reason: string }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function oneProperty(properties: readonly PropertyValue[], name: string): NativeValue<unknown> {
  const matches = properties.filter((property) => property.name === name);
  if (matches.length !== 1 || matches[0]!.status !== 'decoded') {
    return { known: false, reason: 'Native Navigation.' + name + ' is missing, duplicated or not decoded.' };
  }
  return { known: true, value: matches[0]!.value };
}

function stringArray(value: unknown, label: string): NativeValue<readonly string[]> {
  if (!isRecord(value) || value.prefix !== 1 || !Number.isSafeInteger(value.count) ||
      !Array.isArray(value.items) || value.count !== value.items.length ||
      !value.items.every((item) => typeof item === 'string')) {
    return { known: false, reason: 'Native Navigation.' + label + ' array is not a complete decoded string array.' };
  }
  return { known: true, value: value.items as string[] };
}

function pointIdArray(value: unknown, label: string): NativeValue<readonly string[]> {
  if (!isRecord(value) || value.prefix !== 1 || !Number.isSafeInteger(value.count) ||
      !Array.isArray(value.items) || value.count !== value.items.length ||
      !value.items.every((item) => isRecord(item) && typeof item.rawGuid20 === 'string' &&
        /^[a-f0-9]{40}$/i.test(item.rawGuid20))) {
    return { known: false, reason: 'Native Navigation.' + label + ' array is not a complete decoded PropertyID array.' };
  }
  return { known: true, value: value.items.map((item) => (item as PointReference).rawGuid20.toLowerCase()) };
}

function pointIdValue(value: unknown, label: string): NativeValue<string> {
  if (!isRecord(value) || typeof value.rawGuid20 !== 'string' || !/^[a-f0-9]{40}$/i.test(value.rawGuid20)) {
    return { known: false, reason: 'Native Navigation.' + label + ' is not a decoded 20-byte PropertyID.' };
  }
  return { known: true, value: value.rawGuid20.toLowerCase() };
}

/** The selected routine is safe to place immediately only if its indexed
 * work/rest/sleep arrays agree and the actor's stored current point fields
 * match that row. Otherwise wait for the native day-part scheduler. */
export function nativeRoutineStartPoint(actor: SourceArdeaActor): NativeValue<{ routine: string; pointId20: string }> {
  if (!/^[a-f0-9]{40}$/i.test(actor.guid)) return { known: false, reason: 'Native Ardea actor GUID is malformed.' };
  const sets = actor.propertySets.filter((set) => set.name === 'gCNavigation_PS');
  if (sets.length !== 1) return { known: false, reason: 'Actor does not have one source Navigation property set.' };
  const properties = sets[0]!.properties;
  const routineValue = oneProperty(properties, 'Routine');
  const namesValue = oneProperty(properties, 'RoutineNames');
  if (!routineValue.known) return routineValue;
  if (!namesValue.known) return namesValue;
  if (typeof routineValue.value !== 'string') return { known: false, reason: 'Native Navigation.Routine is not decoded text.' };
  const names = stringArray(namesValue.value, 'RoutineNames');
  if (!names.known) return names;
  const arrays: Record<NativeNavigationRoutinePoint, readonly string[]> = {
    WorkingPoint: [], RelaxingPoint: [], SleepingPoint: [],
  };
  for (const property of ['WorkingPoint', 'RelaxingPoint', 'SleepingPoint'] as const) {
    const arrayName = property === 'WorkingPoint' ? 'WorkingPoints' : property === 'RelaxingPoint' ? 'RelaxingPoints' : 'SleepingPoints';
    const value = oneProperty(properties, arrayName);
    if (!value.known) return value;
    const parsed = pointIdArray(value.value, arrayName);
    if (!parsed.known) return parsed;
    arrays[property] = parsed.value;
  }
  const result = nativeNavigationRoutinePointAssignments(routineValue.value, names.value, arrays);
  if (!result.known) return result;
  const currentPointIds = new Map<NativeNavigationRoutinePoint, string>();
  for (const entry of result.value) {
    const current = oneProperty(properties, entry.property);
    if (!current.known) return current;
    const parsed = pointIdValue(current.value, entry.property);
    if (!parsed.known) return parsed;
    if (parsed.value.slice(0, 32) !== entry.propertyId.slice(0, 32)) {
      return { known: false, reason: 'Native Navigation.' + entry.property + ' differs from the selected Routine row.' };
    }
    currentPointIds.set(entry.property, parsed.value);
  }
  const pointIds = result.value.map((entry) => currentPointIds.get(entry.property));
  if (pointIds.some((id) => id === undefined) ||
      new Set(pointIds.map((id) => id!.slice(0, 32))).size !== 1) {
    return { known: false, reason: 'Native work/rest/sleep points differ; current day-part selection is not resolved.' };
  }
  const pointId20 = currentPointIds.get('WorkingPoint')!;
  if (/^0{40}$/.test(pointId20)) return { known: false, reason: 'Native routine currently selects the empty point ID.' };
  return { known: true, value: { routine: routineValue.value, pointId20 } };
}

function withinBounds(position: Vec3, bounds: ArdeaScene['bounds']): boolean {
  return position.every((value, axis) => Number.isFinite(value) &&
    value >= bounds.min[axis]! && value <= bounds.max[axis]!);
}

/** Pure source-to-scene conversion, including the native 16-byte ID equality. */
export function nativeRoutinePointPlacement(person: ScenePerson, routine: string, pointId20: string,
  sourceIndex: number, candidates: readonly NativeEntityIndex[], origin: Vec3, bounds: ArdeaScene['bounds'],
  destinationWorldMatrix?: readonly number[]): NativeValue<NativeRoutineScenePlacement> {
  if (person.id.toLowerCase() !== person.id || !/^[a-f0-9]{40}$/.test(person.id) ||
      !/^[a-f0-9]{40}$/.test(pointId20) || !Number.isSafeInteger(sourceIndex) || sourceIndex < 0) {
    return { known: false, reason: 'Native scene routine identity or source index is malformed.' };
  }
  const prefix = pointId20.slice(0, 32);
  const matches = candidates.filter((candidate) => candidate.file === sourceIndex &&
    typeof candidate.guid === 'string' && candidate.guid.slice(0, 32).toLowerCase() === prefix);
  if (matches.length !== 1) return { known: false, reason: matches.length
    ? 'Native routine point PropertyID is ambiguous in its source file.'
    : 'Native routine point PropertyID has no entity in its source file.' };
  const point = matches[0]!;
  if (point.position.length !== 3 || !point.position.every(Number.isFinite)) {
    return { known: false, reason: 'Native routine point position is malformed.' };
  }
  const position: Vec3 = [(point.position[0]! - origin[0]!) / 100,
    (point.position[1]! - origin[1]!) / 100, -(point.position[2]! - origin[2]!) / 100];
  if (!withinBounds(position, bounds)) return { known: false, reason: 'Native routine point is outside the loaded Ardea scene.' };
  let rotationY = person.rotationY ?? 0;
  if (destinationWorldMatrix !== undefined) {
    if (destinationWorldMatrix.length !== 16 || !destinationWorldMatrix.every(Number.isFinite)) {
      return { known: false, reason: 'Native routine point transform is malformed.' };
    }
    const yaw = Math.atan2(-destinationWorldMatrix[8]!, destinationWorldMatrix[10]!);
    rotationY = Object.is(yaw, -0) ? 0 : yaw;
  }
  return { known: true, value: Object.freeze({ personId: person.id, personName: person.name, routine,
    pointId20, pointName: point.name, position, rotationY }) };
}

/** Read only the selected SysDyn file's index chunks and source actor records.
 * Missing/ambiguous points are reported per actor and leave its scene transform
 * untouched; a missing global source fails the placement pass as a whole. */
export async function loadNativeRoutineScenePlacements(scene: ArdeaScene): Promise<NativeRoutineScenePlacements> {
  const manifest = await gameplayResources.manifest();
  const peoplePath = manifest.initial.people;
  if (typeof peoplePath !== 'string') throw new Error('Native Ardea actor source path is missing.');
  const actors = await gameplayResources.read<InitialArdeaActor[]>(peoplePath);
  if (!Array.isArray(actors)) throw new Error('Native Ardea actor source is not an array.');
  const actorsById = new Map<string, InitialArdeaActor>();
  for (const actor of actors) {
    if (!actor || typeof actor.guid !== 'string' || !/^[a-f0-9]{40}$/i.test(actor.guid) ||
        typeof actor.source?.path !== 'string') throw new Error('Native Ardea actor identity/source is malformed.');
    const id = actor.guid.toLowerCase();
    if (actorsById.has(id)) throw new Error('Duplicate native Ardea actor source ID: ' + id);
    actorsById.set(id, actor);
  }
  const selected: { person: ScenePerson; actor: InitialArdeaActor; routine: string; pointId20: string }[] = [];
  const skipped: { personId: string; reason: string }[] = [];
  for (const person of scene.people) {
    const actor = actorsById.get(person.id.toLowerCase());
    if (!actor) continue;
    const point = nativeRoutineStartPoint(actor);
    if (!point.known) { skipped.push({ personId: person.id, reason: point.reason }); continue; }
    selected.push({ person, actor, routine: point.value.routine, pointId20: point.value.pointId20 });
  }
  if (!selected.length) return { placements: new Map(), skipped: Object.freeze(skipped) };
  const sourcePaths = new Set(selected.map((entry) => entry.actor.source.path));
  if (sourcePaths.size !== 1) throw new Error('Selected Ardea routines span multiple source files.');
  const world = new NativeWorldData(gameplayResources);
  const source = await world.sourceByPath([...sourcePaths][0]!);
  if (source.kind !== 'found') throw new Error('Native Ardea SysDyn source file is not uniquely indexed.');
  const pointIds = [...new Map(selected.map((entry) => [entry.pointId20.slice(0, 32), entry.pointId20])).values()];
  const index = await world.entitiesByPropertyIds(source.value.index, pointIds);
  const targetRecords = new Map<string, NativeEntityRecord | null>();
  await Promise.all(pointIds.map(async (id) => {
    const propertyId = id.slice(0, 32);
    const rows = index.get(propertyId) ?? [];
    if (rows.length !== 1) { targetRecords.set(propertyId, null); return; }
    const result = await world.entity(rows[0]!);
    targetRecords.set(propertyId, result.kind === 'found' ? result.value : null);
  }));
  const placements = new Map<string, NativeRoutineScenePlacement>();
  for (const entry of selected) {
    const candidates = index.get(entry.pointId20.slice(0, 32)) ?? [];
    const target = targetRecords.get(entry.pointId20.slice(0, 32));
    const matrix = target?.worldMatrix;
    const result = nativeRoutinePointPlacement(entry.person, entry.routine, entry.pointId20,
      source.value.index, candidates, scene.origin, scene.bounds, matrix);
    if (result.known) placements.set(entry.person.id, result.value);
    else skipped.push({ personId: entry.person.id, reason: result.reason });
  }
  return { placements, skipped: Object.freeze(skipped) };
}
