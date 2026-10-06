import type { ScenePerson } from './types';

export interface ActorWorldPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Read an actor's current scene transform, falling back to its source placement
 * until a scene object has been constructed. */
export function liveScenePersonPosition(person: Pick<ScenePerson, 'id' | 'position'>,
  actors: ReadonlyMap<string, { readonly position: ActorWorldPosition }>): readonly [number, number, number] {
  const position = actors.get(person.id)?.position;
  return position ? [position.x, position.y, position.z] : person.position;
}
