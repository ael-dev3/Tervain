import { S } from '../content/strings';
import { NPCS } from '../content/npcs';
import type { App } from '../app';
import { hasFact, phaseIndex } from '../game/state';
import { ARCHIVE_SHUTTER, BELL, INSPECT_LOCATIONS, LEDGER, MILL_WHEEL, PICKUP_LOCATIONS, RESULT_CHECKS, RITE_ALTAR, SHORTCUT, SLUICE, bySpec, frontOf } from '../world/layout';
import type { NpcId } from '../game/types';

export interface Interactable {
  id: string;
  pos(): { x: number; z: number };
  r: number;
  prompt(): string;
  enabled(): boolean;
  act(): void;
  /** Lower wins when several are in reach. */
  priority?: number;
}

const archiveDoorPos = () => frontOf(bySpec('archive'), 0.3);

/** All things the player can act on, as data plus small actions over the game commands. */
export function buildInteractables(app: App): Interactable[] {
  const list: Interactable[] = [];
  const game = app.game;
  const st = () => game.state;

  // People.
  for (const npc of app.npcs) {
    const def = NPCS[npc.id as NpcId];
    list.push({
      id: `npc:${npc.id}`,
      pos: () => ({ x: npc.x, z: npc.z }),
      r: def.interactRadius ?? 2.7,
      prompt: () => S('prompt.talk', { name: def.name }),
      enabled: () => !npc.hidden && st().npcs[npc.id].available && game.entryNode(npc.id) !== null && app.noThreatNear(),
      act: () => app.startDialogue(npc),
      priority: -1,
    });
  }

  // Observations.
  for (const p of INSPECT_LOCATIONS) {
    list.push({
      id: `inspect:${p.id}`,
      pos: () => ({ x: p.x, z: p.z }),
      r: p.r,
      prompt: () => S(`prompt.inspect.${p.id}`),
      // Once an allocation is committed the same spot is where the result is checked; inspecting it again adds nothing.
      enabled: () => (p.id === 'dry_channel' ? phaseIndex(st().quest.phase) < phaseIndex('committed') : true),
      act: () => app.inspect(p.id),
    });
  }

  // Things to pick up.
  for (const pk of PICKUP_LOCATIONS) {
    list.push({
      id: `pickup:${pk.id}`,
      pos: () => ({ x: pk.x, z: pk.z }),
      r: pk.r,
      prompt: () => S(`prompt.pickup.${pk.id}`),
      enabled: () => st().locationChanges[`pickup:${pk.id}`] !== 'taken',
      act: () => app.pickup(pk.id, pk.item, pk.qty),
      priority: -0.5,
    });
  }

  // The maintenance lever.
  list.push({
    id: 'lever',
    pos: () => SHORTCUT.lever,
    r: SHORTCUT.lever.r,
    prompt: () => S('prompt.lever'),
    enabled: () => st().locationChanges.shortcut !== 'open',
    act: () => app.pullLever(),
  });

  // The sluice controls.
  list.push({
    id: 'sluice',
    pos: () => SLUICE.control,
    r: SLUICE.control.r,
    prompt: () => S('prompt.sluice'),
    enabled: () => true,
    act: () => app.openSluice(),
  });

  // Archive: door, shutter, ledger.
  list.push({
    id: 'archive_door',
    pos: archiveDoorPos,
    r: 2.4,
    prompt: () => S('prompt.archive_door.locked'),
    enabled: () => st().locationChanges.archive_door !== 'open',
    act: () => app.tryArchiveDoor(),
  });
  list.push({
    id: 'archive_shutter',
    pos: () => ARCHIVE_SHUTTER,
    r: ARCHIVE_SHUTTER.r,
    prompt: () => S('prompt.archive_shutter'),
    enabled: () => st().locationChanges.archive_shutter !== 'forced' && st().locationChanges.archive_shutter !== 'sealed',
    act: () => app.forceShutter(),
  });
  list.push({
    id: 'ledger',
    pos: () => LEDGER,
    r: LEDGER.r,
    prompt: () => S('prompt.ledger'),
    enabled: () => st().locationChanges.archive_door === 'open' || st().locationChanges.archive_shutter === 'forced',
    act: () => app.readLedger(),
  });

  // The spring rite.
  list.push({
    id: 'rite',
    pos: () => RITE_ALTAR,
    r: RITE_ALTAR.r,
    prompt: () => (hasFact(st(), 'rite_taught') ? S('prompt.rite') : S('prompt.rite.notaught')),
    enabled: () => true,
    act: () => app.performRite(),
  });

  // Seeing the result reach the village.
  for (const c of RESULT_CHECKS) {
    list.push({
      id: c.id,
      pos: () => ({ x: c.x, z: c.z }),
      r: c.r,
      prompt: () => S(c.id === 'check_channel' ? 'prompt.check_channel' : 'prompt.check_mill'),
      enabled: () => st().quest.phase === 'committed',
      act: () => app.checkResult(),
    });
  }
  void BELL;
  void MILL_WHEEL;
  return list;
}
