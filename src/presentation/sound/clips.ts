import { WORLD_AUDIO } from './worldAudioManifest';

/**
 * The one-shot clips of the world audio sprites, by name. A clip has one or more variants (separate takes cut from the
 * same generation); playback picks among them without repeating the last one, and varies pitch and level a little, so
 * repeated actions do not sound mechanical.
 */

type Banks = typeof WORLD_AUDIO.banks;
export type BankName = keyof Banks;
export type ClipId = { [B in BankName]: keyof Banks[B]['clips'] }[BankName] & string;

export interface ClipRef {
  bank: BankName;
  /** [offset, duration] in seconds within the bank sprite, one per variant. */
  variants: readonly (readonly [number, number])[];
}

const INDEX = new Map<string, ClipRef>();
for (const [bank, entry] of Object.entries(WORLD_AUDIO.banks) as [BankName, Banks[BankName]][]) {
  for (const [clip, variants] of Object.entries(entry.clips)) INDEX.set(clip, { bank, variants: variants as readonly (readonly [number, number])[] });
}

export function clipRef(id: ClipId): ClipRef {
  const ref = INDEX.get(id);
  if (!ref) throw new Error(`unknown sound clip ${id}`);
  return ref;
}

export function hasClip(id: string): id is ClipId {
  return INDEX.has(id);
}

export function allClipIds(): ClipId[] {
  return [...INDEX.keys()] as ClipId[];
}

/** A small deterministic generator (mulberry32) for choices that tests must be able to repeat. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Variant choice that never plays the same take twice in a row when there is another. */
export class VariantPicker {
  private readonly last = new Map<string, number>();
  constructor(private readonly random: () => number = Math.random) {}

  pick(id: ClipId): number {
    const n = clipRef(id).variants.length;
    if (n <= 1) return 0;
    const prev = this.last.get(id) ?? -1;
    let i = Math.floor(this.random() * (prev >= 0 ? n - 1 : n));
    if (prev >= 0 && i >= prev) i++;
    this.last.set(id, i);
    return i;
  }
}
