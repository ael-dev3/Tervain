import { S } from '../content/strings';
import { NPCS } from '../content/npcs';
import type { App } from '../app';
import { hasFact, phaseIndex } from '../game/state';
import { ARCHIVE_SHUTTER, BELL, HUNTER_SUPPLY, HUNTER_TABLE, hunterStationPoint, INSPECT_LOCATIONS, LEDGER, MILL_WHEEL, PICKUP_LOCATIONS, RESULT_CHECKS, RITE_ALTAR, SHORTCUT, SLUICE, bySpec, frontOf } from '../world/layout';
import type { NpcId } from '../game/types';
import { isWorldPickupItem, WORLD_PICKUP_MODELS } from '../content/pickups';
import { worldPickupTargetY } from './worldPickups';
import { hunterTableSurfaceY } from './hunterSupplies';
import { hunterTradingOpen } from '../game/hunting';
import { DEER_BODY, doorwayAhead } from './riding';

export interface Interactable {
  id: string;
  pos(): { x: number; z: number; y?: number };
  /** The surface being operated may be solid; intervening scenery still blocks the action. */
  ignoreColliders?: readonly string[];
  r: number;
  prompt(): string;
  enabled(): boolean;
  act(): void;
  /** Lower wins when several are in reach. */
  priority?: number;
}

const App_MOUNT = '1005232412';
const archiveDoorPos = () => frontOf(bySpec('archive'), 0.3);

/** All things the player can act on, as data plus small actions over the game commands. */
export function buildInteractables(app: App): Interactable[] {
  const list: Interactable[] = [];
  const game = app.game;
  const st = () => game.state;
  list.push({
    id: 'hunter_notes', pos: () => ({ ...hunterStationPoint(HUNTER_TABLE.signX, HUNTER_TABLE.signZ), y: hunterTableSurfaceY(app.world.terrain) + HUNTER_TABLE.signCentreAboveTop }),
    r: HUNTER_SUPPLY.r, prompt: () => S('prompt.hunter_supplies'), enabled: () => true,
    ignoreColliders: ['hunter_board', 'hunter_board_post'],
    act: () => app.openHuntingNotes(), priority: 1,
  });
  list.push({
    id: 'hunter_restock', pos: () => ({ ...HUNTER_SUPPLY, y: hunterTableSurfaceY(app.world.terrain) + .12 }), r: HUNTER_SUPPLY.r,
    prompt: () => S('prompt.restock_arrows'), enabled: () => hunterTradingOpen(st()) && (st().inventory.animal_hide ?? 0) > 0,
    act: () => app.restockArrows(), priority: -.6,
  });
  list.push({
    id: 'hunter_sell_meat', pos: () => ({ ...hunterStationPoint(.7, .25), y: hunterTableSurfaceY(app.world.terrain) + .12 }), r: 2.2,
    prompt: () => S('prompt.sell_game_meat'), enabled: () => hunterTradingOpen(st()) && (st().inventory.raw_meat ?? 0) > 0,
    act: () => app.sellGameMeat(), priority: -.6,
  });

  // The saddled deer at the caravan rest can be ridden (A70).
  list.push({
    id: 'mount_deer', pos: () => { const m = app.world.animals?.mount(App_MOUNT); return m ? { x: m.x, y: m.y + m.seat, z: m.z } : { x: 1e9, z: 1e9 }; },
    r: 2.6, prompt: () => S('prompt.ride'), ignoreColliders: ['animal:' + App_MOUNT],
    enabled: () => !app.player.mount && !app.player.mountMove && app.player.alive && !app.player.swimming && !!app.world.animals?.mount(App_MOUNT) && app.noThreatNear(),
    act: () => app.mountDeer(), priority: -0.4,
  });
  list.push({
    id: 'dismount', pos: () => ({ x: app.player.x, y: app.player.y + 1.4, z: app.player.z }), r: 3,
    prompt: () => S('prompt.dismount'), enabled: () => !!app.player.mount, act: () => app.dismount(), priority: -5,
  });
  // A deer does not go indoors (A71): at a doorway the rider is offered to get down instead.
  list.push({
    id: 'dismount_door', pos: () => ({ x: app.player.x, y: app.player.y + 1.4, z: app.player.z }), r: 3,
    prompt: () => S('prompt.dismount_door'), act: () => app.dismount(), priority: -6,
    enabled: () => {
      const p = app.player;
      return !!p.mount && !p.mountMove && doorwayAhead(p.x + Math.sin(p.yaw) * DEER_BODY.front, p.z + Math.cos(p.yaw) * DEER_BODY.front) !== null;
    },
  });

  // People.
  for (const npc of app.npcs) {
    const def = NPCS[npc.id as NpcId];
    list.push({
      id: `npc:${npc.id}`,
      pos: () => ({ x: npc.x, y: npc.y + 1.1, z: npc.z }),
      r: def.interactRadius ?? 2.7,
      prompt: () => S('prompt.observe', { name: def.name }),
      enabled: () => !npc.hidden && st().npcs[npc.id].available && app.noThreatNear(),
      act: () => app.observeNpc(npc),
      priority: -1,
    });
  }

  // Observations.
  for (const p of INSPECT_LOCATIONS) {
    list.push({
      id: `inspect:${p.id}`,
      // Only the observed object's own solid is exempt; nearby walls still obstruct it.
      ignoreColliders: p.id === 'templar_waymarker' ? ['forest-waymarker:0'] : p.id === 'saltward_kit' ? ['kit_table'] : undefined,
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
      pos: () => ({ x: pk.x, z: pk.z, y: worldPickupTargetY(app.world?.scenery.pickups[pk.id]) }),
      r: pk.r,
      prompt: () => isWorldPickupItem(pk.item) ? S('prompt.pickup', { name: S(WORLD_PICKUP_MODELS[pk.item].nameKey) }) : S(`prompt.pickup.${pk.id}`),
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
    ignoreColliders: ['altar'],
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
