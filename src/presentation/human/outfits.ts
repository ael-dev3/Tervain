import * as THREE from 'three';
import type { Accessory } from '../../content/npcs';
import type { NpcId } from '../../game/types';
import type { Outfit } from './dress';
import type { RGB } from './skin';

/**
 * Who wears what. Named people have authored costumes built from their look (the palette in content/npcs.ts), their
 * faction and their trade; everyone else is dressed from their look's accessory. These costumes are presentation
 * proposals (docs/art/gothic3-reference.md#people), not recorded faction dress.
 */

/** Linear RGB from a hex colour, pulled toward grey-brown and darkened so nobody wears a fresh dye. */
export function worn(h: number, k = 0.8): RGB {
  const c = new THREE.Color(h);
  const l = (c.r + c.g + c.b) / 3;
  return [(c.r * 0.72 + l * 0.28) * k, (c.g * 0.72 + l * 0.28) * k * 0.98, (c.b * 0.72 + l * 0.28) * k * 0.94];
}

export function linear(h: number): RGB {
  const c = new THREE.Color(h);
  return [c.r, c.g, c.b];
}

/** Outdoor skin: a little greyed and darkened from the look's colour, so faces sit in the earthy palette. */
export function skinTone(h: number): RGB {
  const c = new THREE.Color(h);
  const l = (c.r + c.g + c.b) / 3;
  return [(c.r * 0.8 + l * 0.2) * 0.84, (c.g * 0.8 + l * 0.2) * 0.84, (c.b * 0.8 + l * 0.2) * 0.86];
}

const LINEN: RGB = worn(0xcfc4a8, 0.78);
const LINEN_GREY: RGB = worn(0xa9a393, 0.72);
const LEATHER: RGB = worn(0x5a4230, 0.72);
const LEATHER_DARK: RGB = worn(0x3a2a1e, 0.7);
const IRON: RGB = [0.19, 0.19, 0.2];
const BRASS: RGB = [0.36, 0.27, 0.12];

export interface LookLike {
  skin: number;
  primary: number;
  secondary: number;
  hair: number;
  accessory: Accessory | 'none';
  accent?: number;
}

/** The authored costume for each named person. */
export function npcOutfit(id: NpcId, look: LookLike, seed: number): Outfit {
  const pri = worn(look.primary, 0.78);
  const sec = worn(look.secondary, 0.74);
  const acc = look.accent !== undefined ? worn(look.accent, 0.72) : sec;
  const skin = skinTone(look.skin);
  switch (id) {
    case 'caravan_master':
      return {
        skin,
        seed,
        dirt: 0.5,
        shirt: { color: LINEN, cloth: 'linen', sleeve: 'long', neck: 'laced' },
        legs: { color: sec, cloth: 'wool', baggy: 0.6 },
        feet: { kind: 'boots', color: LEATHER, cuff: true },
        outer: { kind: 'coat', color: pri, cloth: 'wool', hem: 0.56, sleeve: 'long', neck: 'high', open: true, trim: LEATHER_DARK },
        belt: { color: LEATHER_DARK, metal: IRON, pouch: LEATHER, knife: true },
        hat: worn(0x3a2e24, 0.7),
      };
    case 'rillford_reeve':
      return {
        skin,
        seed,
        dirt: 0.25,
        shirt: { color: LINEN, cloth: 'linen', sleeve: 'long', neck: 'crew' },
        legs: { color: LEATHER_DARK, cloth: 'wool', baggy: 0 },
        feet: { kind: 'shoes', color: LEATHER },
        outer: { kind: 'dress', color: pri, cloth: 'wool', hem: 0.86, sleeve: 'long', neck: 'square', trim: sec },
        belt: { color: LEATHER, metal: BRASS, pouch: LEATHER },
        shawl: sec,
      };
    case 'spring_steward':
      return {
        skin,
        seed,
        dirt: 0.2,
        legs: { color: LEATHER_DARK, cloth: 'wool', baggy: 0 },
        feet: { kind: 'shoes', color: LEATHER_DARK },
        outer: { kind: 'robe', color: pri, cloth: 'wool', hem: 0.87, sleeve: 'wide', neck: 'crew' },
        scapular: sec,
        belt: { color: acc, metal: BRASS, rope: true },
        cowl: [pri[0] * 0.85, pri[1] * 0.85, pri[2] * 0.85],
      };
    case 'quarry_foreman':
      return {
        skin,
        seed,
        dirt: 0.55,
        shirt: { color: LINEN_GREY, cloth: 'linen', sleeve: 'rolled', neck: 'open' },
        legs: { color: sec, cloth: 'wool', baggy: 0.4 },
        feet: { kind: 'boots', color: LEATHER_DARK, cuff: true },
        outer: { kind: 'jerkin', color: pri, cloth: 'leather', hem: 0.12, sleeve: 'none', neck: 'laced' },
        belt: { color: LEATHER_DARK, metal: IRON, pouch: LEATHER },
        bracers: LEATHER_DARK,
        helmet: IRON,
        furCollar: worn(0x5e4c3a, 0.78),
        gloves: LEATHER_DARK,
      };
    case 'maintenance_worker':
      return {
        skin,
        seed,
        dirt: 0.45,
        shirt: { color: LINEN, cloth: 'linen', sleeve: 'rolled', neck: 'laced' },
        legs: { color: [pri[0] * 0.7, pri[1] * 0.7, pri[2] * 0.7], cloth: 'wool', baggy: 0.5 },
        feet: { kind: 'shoes', color: LEATHER, wraps: LINEN_GREY },
        outer: { kind: 'tunic', color: pri, cloth: 'wool', hem: 0.26, sleeve: 'none', neck: 'open', trim: sec },
        belt: { color: LEATHER, metal: IRON, pouch: LEATHER },
        satchel: { color: [sec[0] * 0.35 + LEATHER[0] * 0.65, sec[1] * 0.35 + LEATHER[1] * 0.65, sec[2] * 0.35 + LEATHER[2] * 0.65], strap: LEATHER_DARK },
        neckScarf: { color: sec },
      };
    case 'estate_steward':
      return {
        skin,
        seed,
        dirt: 0.15,
        shirt: { color: LINEN, cloth: 'linen', sleeve: 'long', neck: 'crew' },
        legs: { color: LEATHER_DARK, cloth: 'wool', baggy: 0.2 },
        feet: { kind: 'boots', color: LEATHER_DARK, cuff: false },
        outer: { kind: 'coat', color: pri, cloth: 'wool', hem: 0.5, sleeve: 'long', neck: 'high', trim: sec },
        belt: { color: LEATHER_DARK, metal: BRASS, pouch: LEATHER_DARK },
        ledger: worn(0x4a3222, 0.7),
      };
    case 'trail_hunter':
      return {
        skin, seed, dirt: 0.48,
        shirt: { color: LINEN_GREY, cloth: 'linen', sleeve: 'long', neck: 'laced' },
        legs: { color: sec, cloth: 'wool', baggy: 0.32 },
        feet: { kind: 'boots', color: LEATHER_DARK, cuff: true },
        outer: { kind: 'jerkin', color: pri, cloth: 'leather', hem: 0.22, sleeve: 'none', neck: 'open' },
        belt: { color: LEATHER_DARK, metal: IRON, pouch: LEATHER, knife: true },
        bracers: LEATHER,
      };
    case 'ash_recorder':
      return {
        skin,
        seed,
        dirt: 0.45,
        shirt: { color: LINEN_GREY, cloth: 'linen', sleeve: 'long', neck: 'crew' },
        legs: { color: pri, cloth: 'wool', baggy: 0.3 },
        feet: { kind: 'shoes', color: LEATHER_DARK, wraps: [pri[0] * 1.3, pri[1] * 1.3, pri[2] * 1.3] },
        outer: { kind: 'robe', color: pri, cloth: 'wool', hem: 0.62, sleeve: 'long', neck: 'crew' },
        belt: { color: sec, metal: IRON, rope: true, pouch: LEATHER },
        hood: sec,
      };
    case 'shrine_warden':
      return {
        skin,
        seed,
        dirt: 0.25,
        shirt: { color: LINEN, cloth: 'linen', sleeve: 'long', neck: 'crew' },
        legs: { color: LEATHER_DARK, cloth: 'wool', baggy: 0.3 },
        feet: { kind: 'boots', color: LEATHER_DARK, cuff: true },
        mail: [0.3, 0.3, 0.31],
        // Undyed padding under the order's blue, so the tabard reads.
        outer: { kind: 'gambeson', color: worn(0x8c8270, 0.8), cloth: 'padded', hem: 0.26, sleeve: 'long', neck: 'high', trim: acc },
        belt: { color: LEATHER_DARK, metal: BRASS },
        bracers: LEATHER_DARK,
        pauldrons: LEATHER_DARK,
        tabard: { color: [pri[0] * 0.92, pri[1] * 0.92, pri[2] * 0.95], trim: acc },
        gloves: LEATHER_DARK,
      };
    case 'mill_hand':
      return {
        skin,
        seed,
        dirt: 0.3,
        shirt: { color: LINEN, cloth: 'linen', sleeve: 'rolled', neck: 'open' },
        legs: { color: sec, cloth: 'wool', baggy: 0.5 },
        feet: { kind: 'shoes', color: LEATHER, wraps: LINEN_GREY },
        outer: { kind: 'tunic', color: pri, cloth: 'wool', hem: 0.34, sleeve: 'none', neck: 'open' },
        apron: { color: worn(0xd8d2c0, 0.8), bib: false },
        belt: { color: LEATHER, metal: IRON },
        scarf: worn(0xd8ccb0, 0.75),
      };
    case 'quarry_hand':
      return {
        skin,
        seed,
        dirt: 0.62,
        shirt: { color: LINEN_GREY, cloth: 'linen', sleeve: 'rolled', neck: 'laced' },
        legs: { color: sec, cloth: 'wool', baggy: 0.6 },
        feet: { kind: 'shoes', color: LEATHER_DARK, wraps: LINEN_GREY },
        outer: { kind: 'vest', color: pri, cloth: 'wool', hem: -0.1, sleeve: 'none', neck: 'open' },
        belt: { color: LEATHER, metal: IRON, knife: true },
        bracers: LEATHER,
        pack: { color: LEATHER, roll: worn(0x6a5a44, 0.7) },
        headband: worn(0xa44c30, 0.84),
        neckScarf: { color: worn(0xb0a07c, 0.72) },
      };
    case 'village_baker':
      return {
        skin,
        seed,
        dirt: 0.2,
        shirt: { color: LINEN, cloth: 'linen', sleeve: 'rolled', neck: 'crew' },
        legs: { color: LEATHER, cloth: 'wool', baggy: 0.2 },
        feet: { kind: 'shoes', color: LEATHER },
        outer: { kind: 'dress', color: pri, cloth: 'wool', hem: 0.72, sleeve: 'none', neck: 'square' },
        apron: { color: sec, bib: true },
        belt: { color: LEATHER, metal: IRON },
      };
  }
}

/** A plain costume from a look's accessory, for people without an authored one. */
export function lookOutfit(look: LookLike, seed: number, woman: boolean): Outfit {
  const pri = worn(look.primary, 0.78);
  const sec = worn(look.secondary, 0.74);
  const acc = look.accent !== undefined ? worn(look.accent, 0.72) : sec;
  const skin = skinTone(look.skin);
  const base: Outfit = {
    skin,
    seed,
    dirt: 0.45,
    shirt: { color: LINEN_GREY, cloth: 'linen', sleeve: 'rolled', neck: 'laced' },
    legs: { color: sec, cloth: 'wool', baggy: 0.5 },
    feet: { kind: 'shoes', color: LEATHER, wraps: LINEN_GREY },
    outer: { kind: 'tunic', color: pri, cloth: 'wool', hem: 0.26, sleeve: 'none', neck: 'open' },
    belt: { color: LEATHER, metal: IRON, pouch: LEATHER },
  };
  switch (look.accessory) {
    case 'pack':
      return { ...base, outer: { kind: 'vest', color: pri, cloth: 'wool', hem: -0.1, sleeve: 'none', neck: 'open' }, pack: { color: LEATHER, roll: sec }, neckScarf: { color: worn(0x6a6a5a, 0.72) } };
    case 'shawl':
      return {
        ...base,
        dirt: 0.3,
        shirt: { color: LINEN, cloth: 'linen', sleeve: 'long', neck: 'crew' },
        outer: { kind: woman ? 'dress' : 'tunic', color: pri, cloth: 'wool', hem: woman ? 0.84 : 0.3, sleeve: 'long', neck: 'square' },
        feet: { kind: 'shoes', color: LEATHER },
        shawl: sec,
        scarf: woman ? worn(0x8a7a5a, 0.7) : undefined,
      };
    case 'coat':
      return {
        ...base,
        dirt: 0.35,
        shirt: { color: LINEN, cloth: 'linen', sleeve: 'long', neck: 'crew' },
        feet: { kind: 'boots', color: LEATHER_DARK, cuff: true },
        outer: { kind: 'coat', color: pri, cloth: 'wool', hem: 0.52, sleeve: 'long', neck: 'high', open: true, trim: acc },
        hat: worn(0x2e2a26, 0.7),
        furCollar: worn(0xb8aa8a, 0.74),
      };
    case 'hood':
      return { ...base, hood: pri };
    default:
      return base;
  }
}

/** The wanderer: a Gothic hero's plain start, with nothing in hand (a proposal until the owner rules on the hero's look). */
export function playerOutfit(look: LookLike): Outfit {
  const pri = worn(look.primary, 0.78);
  const sec = worn(look.secondary, 0.74);
  return {
    skin: skinTone(look.skin),
    seed: 77,
    dirt: 0.42,
    shirt: { color: LINEN_GREY, cloth: 'linen', sleeve: 'long', neck: 'laced' },
    legs: { color: sec, cloth: 'wool', baggy: 0.55 },
    feet: { kind: 'boots', color: LEATHER, cuff: true },
    outer: { kind: 'tunic', color: pri, cloth: 'wool', hem: 0.24, sleeve: 'none', neck: 'open' },
    belt: { color: LEATHER_DARK, metal: IRON, pouch: LEATHER },
    bracers: LEATHER_DARK,
  };
}

/** Toll-jumpers: hooded, in hard-worn leather, one pauldron's worth of scavenged protection. */
export function banditOutfit(look: LookLike, variant: number): Outfit {
  const pri = worn(look.primary, 0.78);
  const sec = worn(look.secondary, 0.74);
  return {
    skin: skinTone(look.skin),
    seed: 900 + variant,
    dirt: 0.7,
    shirt: { color: LINEN_GREY, cloth: 'linen', sleeve: variant ? 'long' : 'rolled', neck: 'open' },
    legs: { color: sec, cloth: 'wool', baggy: 0.6 },
    feet: variant ? { kind: 'shoes', color: LEATHER_DARK, wraps: LINEN_GREY } : { kind: 'boots', color: LEATHER_DARK, cuff: true },
    outer: { kind: 'jerkin', color: pri, cloth: 'leather', hem: 0.16, sleeve: 'none', neck: 'laced' },
    belt: { color: LEATHER_DARK, metal: IRON, knife: true, pouch: LEATHER_DARK },
    bracers: LEATHER_DARK,
    pauldrons: variant ? LEATHER_DARK : undefined,
    hood: [pri[0] * 0.7, pri[1] * 0.7, pri[2] * 0.7],
    neckScarf: variant ? undefined : { color: worn(0x3c342a, 0.8), mask: true },
    shoulderGuard: variant ? undefined : LEATHER_DARK,
    furCollar: variant ? worn(0x3e342a, 0.8) : undefined,
  };
}
