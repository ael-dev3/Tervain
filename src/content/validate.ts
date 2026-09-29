import { DIALOGUE_NODES, DIALOGUE_STRINGS, ENTRY_RULES } from './dialogue';
import { INSPECT_POINTS } from './inspect';
import { NPCS } from './npcs';
import { NPC_IDS, type Cond, type Effect } from '../game/types';

/**
 * Authored content is validated as data: every link resolves, every effect uses a known
 * identifier, and every displayed line has text. Returns a list of problems (empty when valid).
 */
export function validateContent(anchorNames?: ReadonlySet<string>): string[] {
  const problems: string[] = [];

  const checkEffects = (where: string, effects: Effect[] | undefined) => {
    for (const e of effects ?? []) {
      if (e.t === 'trust' && !NPCS[e.npc]) problems.push(`${where}: unknown npc ${e.npc}`);
      if (e.t === 'cmd' && e.cmd.t === 'rescueWorker' && !NPCS.maintenance_worker) problems.push(`${where}: no worker`);
    }
  };
  const checkConds = (where: string, conds: Cond[] | undefined) => {
    const walk = (c: Cond) => {
      if (c.t === 'not') walk(c.c);
      else if (c.t === 'all' || c.t === 'any') c.c.forEach(walk);
      else if ((c.t === 'trust' || c.t === 'avail' || c.t === 'met') && !NPCS[c.npc]) problems.push(`${where}: unknown npc ${c.npc}`);
    };
    (conds ?? []).forEach(walk);
  };

  for (const node of Object.values(DIALOGUE_NODES)) {
    if (!DIALOGUE_STRINGS[node.text]) problems.push(`node ${node.id}: missing text`);
    checkEffects(`node ${node.id} onEnter`, node.onEnter);
    if (node.choices.length === 0) problems.push(`node ${node.id}: no choices (dead end)`);
    node.choices.forEach((c, i) => {
      const where = `node ${node.id} choice ${i}`;
      if (!DIALOGUE_STRINGS[c.text]) problems.push(`${where}: missing text`);
      if (c.next !== 'end' && !DIALOGUE_NODES[c.next]) problems.push(`${where}: next '${c.next}' does not exist`);
      checkEffects(where, c.effects);
      checkConds(where, c.when);
    });
  }

  // Every node must be able to reach a way out so leaving mid-conversation is never blocked.
  for (const node of Object.values(DIALOGUE_NODES)) {
    const seen = new Set<string>();
    const stack = [node.id];
    let exits = false;
    while (stack.length && !exits) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const c of DIALOGUE_NODES[id]?.choices ?? []) {
        if (c.next === 'end') exits = true;
        else stack.push(c.next);
      }
    }
    if (!exits) problems.push(`node ${node.id}: cannot reach an exit`);
  }

  for (const id of NPC_IDS) {
    const rules = ENTRY_RULES[id];
    if (!rules || rules.length === 0) problems.push(`npc ${id}: no entry rules`);
    for (const r of rules ?? []) {
      if (!DIALOGUE_NODES[r.node]) problems.push(`npc ${id}: entry node ${r.node} missing`);
      checkConds(`npc ${id} entry`, r.when);
    }
    const last = rules?.[rules.length - 1];
    if (last && last.when && last.when.length > 0) problems.push(`npc ${id}: final entry rule must be unconditional`);
    if (!NPCS[id]) problems.push(`npc ${id}: missing definition`);
  }

  for (const pt of Object.values(INSPECT_POINTS)) {
    if (pt.effects.length === 0) problems.push(`inspect ${pt.id}: no effects`);
  }

  if (anchorNames) {
    for (const def of Object.values(NPCS)) {
      const names = [def.home, ...def.schedule.map((s) => s.anchor), ...(def.overrides ?? []).map((o) => o.anchor)];
      for (const a of names) if (!anchorNames.has(a)) problems.push(`npc ${def.id}: unknown anchor ${a}`);
    }
  }
  return problems;
}
