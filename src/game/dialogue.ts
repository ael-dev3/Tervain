import { DIALOGUE_NODES, ENTRY_RULES } from '../content/dialogue';
import { evalAll, evalCond } from './state';
import type { Cond, DialogueChoice, DialogueNode, NpcId, WorldState } from './types';

/** Choose the opening node for an NPC. Unavailable NPCs cannot be addressed. */
export function pickEntryNode(s: WorldState, npc: NpcId): string | null {
  if (!s.npcs[npc].available) return null;
  for (const rule of ENTRY_RULES[npc]) {
    if (evalAll(s, rule.when)) return rule.node;
  }
  return null;
}

export function getNode(id: string): DialogueNode | undefined {
  return DIALOGUE_NODES[id];
}

export interface VisibleChoice {
  index: number;
  choice: DialogueChoice;
  locked: boolean;
  /** Unmet positive requirements, for the "why is this locked" line. */
  missing: Cond[];
}

function isFilter(c: Cond): boolean {
  return c.t === 'not';
}

/**
 * Filter (`not`) conditions decide whether a choice is offered at all. Positive conditions
 * decide whether it is usable; a locked choice stays visible with its requirement so a
 * persuasion option is never an unexplained roll.
 */
export function visibleChoices(s: WorldState, node: DialogueNode): VisibleChoice[] {
  const out: VisibleChoice[] = [];
  node.choices.forEach((choice, index) => {
    const conds = choice.when ?? [];
    for (const c of conds) if (isFilter(c) && !evalCond(s, c)) return;
    const missing = conds.filter((c) => !isFilter(c) && !evalCond(s, c));
    if (missing.length === 0) {
      out.push({ index, choice, locked: false, missing: [] });
    } else if (choice.showLocked) {
      out.push({ index, choice, locked: true, missing });
    }
  });
  return out;
}
