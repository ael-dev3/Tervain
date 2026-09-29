import { pickEntryNode } from '../../src/game/dialogue';
import { Game } from '../../src/game/game';
import type { Command, NpcId } from '../../src/game/types';

export function newGame(): Game {
  return new Game();
}

export function must(game: Game, cmd: Command) {
  const r = game.dispatch(cmd);
  if (!r.ok) throw new Error(`command ${cmd.t} failed: ${r.reason}`);
  return r;
}

/**
 * Walk the dialogue graph choosing, at each step, the unlocked choice that leads to the given
 * next node id ('end' to leave). Effects apply exactly as the game applies them.
 */
export function talk(game: Game, npc: NpcId, picks: string[]): string[] {
  const seen: string[] = [];
  let node = pickEntryNode(game.state, npc);
  if (!node) throw new Error(`${npc} unavailable`);
  game.showNode(node);
  seen.push(node);
  for (const pick of picks) {
    const visible = game.choices(node);
    const idx = visible.find((v) => !v.locked && v.choice.next === pick)?.index;
    if (idx === undefined) {
      const have = visible.map((v) => v.choice.next + (v.locked ? '(locked)' : '')).join(', ');
      throw new Error(`no unlocked choice leading to '${pick}' at ${node}; have ${have}`);
    }
    const r = game.choose(node, idx);
    if (!r.ok) throw new Error(`choice failed at ${node} -> ${pick}: ${r.reason}`);
    if (r.next === 'end') {
      seen.push('end');
      return seen;
    }
    node = r.next;
    game.showNode(node);
    seen.push(node);
  }
  return seen;
}

/** Give the player the repair kit the way the world would. */
export function takeKit(game: Game) {
  must(game, { t: 'pickup', pickupId: 'quarry_brace', item: 'sluice_brace', qty: 1 });
  must(game, { t: 'pickup', pickupId: 'quarry_wrench', item: 'gate_wrench', qty: 1 });
}

/** Gather the observable evidence a direct investigator can reach without combat or theft. */
export function investigate(game: Game) {
  must(game, { t: 'inspect', pointId: 'dry_channel' });
  must(game, { t: 'inspect', pointId: 'spring_sediment' });
  must(game, { t: 'inspect', pointId: 'town_diversion' });
  must(game, { t: 'inspect', pointId: 'quarry_seep' });
  must(game, { t: 'inspect', pointId: 'sluice_crack' });
}
