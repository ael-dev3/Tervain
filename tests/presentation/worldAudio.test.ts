import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ITEMS, itemAction } from '../../src/content/items';
import { S } from '../../src/content/strings';
import type { ItemId, NpcId } from '../../src/game/types';
import { defaultSettings } from '../../src/platform/settings';
import { AudioEngine, ambienceMix } from '../../src/presentation/audio';
import { NPC_STYLES } from '../../src/presentation/npcStyle';
import { allClipIds, clipRef, hasClip, rng, VariantPicker } from '../../src/presentation/sound/clips';
import {
  bellCue, consumeCues, EQUIP, hitCue, landCues, MAP_OPEN, PAGE, pickupCues, SATCHEL_CLOSE, SATCHEL_OPEN, stepCue, swingCue, UNEQUIP,
  workSound, worldCues, type Cue, type SurfaceKind, type WorldAction,
} from '../../src/presentation/sound/foley';
import {
  moodAt, MusicDirector, PLACE_REGION, PLAYLISTS, REGION_STING, THREAT_LOOPS, threatFrom, type MusicAction, type MusicContext,
} from '../../src/presentation/sound/musicDirector';
import {
  bedTargets, cricketDensity, cricketRate, EmitterScheduler, emitterRuleIds, groundSurface, INN, innEvening, innSong, nearestStream,
  temperatureAt, windTone, type ListenerState, type WorldSoundState,
} from '../../src/presentation/sound/soundscape';
import { SoundWorld, type SoundFrame } from '../../src/presentation/sound/soundWorld';
import { WORLD_AUDIO } from '../../src/presentation/sound/worldAudioManifest';
import { coastX } from '../../src/world/coast';
import { BUILDINGS, FORD, INLAND_HAMLET, LIGHTHOUSE, PLACES, RITE_ALTAR, STREAMS } from '../../src/world/layout';
import { distToPolyline } from '../../src/world/terrain';

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'public', WORLD_AUDIO.base);
const sha256 = (file: string) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
const SURFACES: SurfaceKind[] = ['grass', 'road', 'stone', 'water', 'deck', 'sand'];

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

/* ------------------------------------------------------------------ files and provenance */

interface Provenance {
  generator: { service: string };
  terms: { attribution: string };
  assets: {
    id: string; prompt: string; seconds: number; model: string;
    source: { path: string; bytes: number; sha256: string };
    use: { type: string };
    derivatives: { path: string; bytes: number; sha256: string }[];
  }[];
  composed: { id: string; title: string; render: string; pcmSha256: string; use: { type: string }; derivatives: { path: string; sha256: string }[] }[];
}
const provenance = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/engineering/world-audio-assets.json'), 'utf8')) as Provenance;

describe('prepared world audio', () => {
  const files = [
    ...Object.values(WORLD_AUDIO.banks).map((b) => b.file),
    ...Object.values(WORLD_AUDIO.loops).map((l) => l.file),
    ...Object.values(WORLD_AUDIO.music).map((m) => m.file),
    ...Object.values(WORLD_AUDIO.songs).map((m) => m.file),
  ];

  it('ships every sprite, loop and piece as Ogg Opus with an AAC fallback, and nothing else', () => {
    for (const file of files) {
      const ogg = fs.readFileSync(path.join(OUT, `${file}.ogg`));
      expect(ogg.subarray(0, 4).toString('latin1'), file).toBe('OggS');
      expect(ogg.subarray(28, 36).toString('latin1'), file).toBe('OpusHead');
      const m4a = fs.readFileSync(path.join(OUT, `${file}.m4a`));
      expect(m4a.subarray(4, 8).toString('latin1'), file).toBe('ftyp');
    }
    expect(fs.readdirSync(OUT).sort()).toEqual(files.flatMap((f) => [`${f}.m4a`, `${f}.ogg`]).sort());
  });

  it('records the prompt, the unchanged source and every derivative by hash', () => {
    const sources = fs.readdirSync(path.join(ROOT, 'assets/audio/source/world')).sort();
    expect(provenance.assets.map((a) => path.basename(a.source.path)).sort()).toEqual(sources);
    const derived = new Set<string>();
    for (const a of provenance.assets) {
      expect(a.prompt.length, a.id).toBeGreaterThan(20);
      expect(a.model).toBe('eleven_text_to_sound_v2');
      expect(sha256(path.join(ROOT, a.source.path)), a.id).toBe(a.source.sha256);
      expect(a.derivatives.length, a.id).toBe(2);
      for (const d of a.derivatives) {
        if (derived.has(d.path)) continue;
        derived.add(d.path);
        expect(sha256(path.join(ROOT, d.path)), d.path).toBe(d.sha256);
      }
    }
    // Every shipped file comes from a recorded source or from a render of the composer, each recorded by hash.
    for (const c of provenance.composed) {
      expect(c.render, c.id).toBe(`tools/world-audio/compose/index.mjs#${c.id}`);
      expect(c.pcmSha256, c.id).toMatch(/^[0-9a-f]{64}$/);
      for (const d of c.derivatives) {
        if (derived.has(d.path)) continue;
        derived.add(d.path);
        expect(sha256(path.join(ROOT, d.path)), d.path).toBe(d.sha256);
      }
    }
    expect([...derived].map((p) => path.basename(p)).sort()).toEqual(fs.readdirSync(OUT).sort());
  });

  it('retains source durations and credits ElevenLabs in the game', () => {
    expect(provenance.assets.reduce((sum, a) => sum + a.seconds, 0)).toBe(919);
    expect(provenance.terms.attribution).toContain('ElevenLabs (elevenlabs.io)');
    expect(S('about.body')).toContain('ElevenLabs (elevenlabs.io)');
  });

  it('cuts every variant inside its sprite, in order, with silence between neighbours', () => {
    for (const [name, bank] of Object.entries(WORLD_AUDIO.banks)) {
      const spans = Object.values(bank.clips).flat().map(([at, len]) => [at, at + len] as const).sort((a, b) => a[0] - b[0]);
      expect(spans.length, name).toBeGreaterThan(0);
      spans.forEach(([start, end], i) => {
        // A bubble is gone in a few hundredths of a second; everything else is longer.
        expect(end - start, name).toBeGreaterThanOrEqual(0.015);
        expect(end, name).toBeLessThanOrEqual(bank.duration + 1e-6);
        if (i) expect(start - spans[i - 1]![1], name).toBeGreaterThanOrEqual(0.059);
      });
    }
    expect(allClipIds()).toHaveLength(Object.values(WORLD_AUDIO.banks).reduce((n, b) => n + Object.keys(b.clips).length, 0));
  });
});

/* ------------------------------------------------------------------ clips and foley */

/** A cue names a real clip at a sane level, and any segment lies inside every one of the clip's takes. */
function expectCue(cue: Cue, label: string) {
  expect(hasClip(cue.clip), `${label}: ${cue.clip}`).toBe(true);
  expect(cue.gain, label).toBeGreaterThan(0);
  expect(cue.gain, label).toBeLessThanOrEqual(1);
  const shortest = Math.min(...clipRef(cue.clip).variants.map(([, len]) => len));
  const from = cue.from ?? 0;
  const to = cue.to ?? shortest;
  // A footfall is short; a part cut from a longer action must still be long enough to read as that action.
  expect(to - from, `${label}: ${cue.clip} segment`).toBeGreaterThan(cue.from === undefined && cue.to === undefined ? 0.08 : 0.4);
  expect(to, `${label}: ${cue.clip} ends inside its shortest take`).toBeLessThanOrEqual(shortest);
}

describe('clips', () => {
  it('never repeats a take back to back and reaches every take', () => {
    const picker = new VariantPicker(rng(11));
    for (const id of allClipIds()) {
      const n = clipRef(id).variants.length;
      const seen = new Set<number>();
      let last = -1;
      for (let i = 0; i < 200; i++) {
        const v = picker.pick(id);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(n);
        if (n > 1) expect(v).not.toBe(last);
        last = v;
        seen.add(v);
      }
      expect(seen.size, id).toBe(n);
    }
    const a = new VariantPicker(rng(5)), b = new VariantPicker(rng(5));
    expect(Array.from({ length: 30 }, () => a.pick('step.grass'))).toEqual(Array.from({ length: 30 }, () => b.pick('step.grass')));
    expect(() => clipRef('step.marble' as never)).toThrow();
  });
});

describe('foley tables', () => {
  it('gives every item a pickup sound and every edible or remedy a consume sound', () => {
    for (const item of ITEM_IDS) {
      const cues = pickupCues(item);
      expect(cues.length, item).toBeGreaterThan(0);
      cues.forEach((c) => expectCue(c, `pickup ${item}`));
      if (itemAction(item) === 'consume') consumeCues(item).forEach((c) => expectCue(c, `consume ${item}`));
    }
    expect(pickupCues('coin')[0]!.clip).toBe('item.coins');
    expect(pickupCues('rusted_sword').map((c) => c.clip)).toContain('item.sword.sheathe');
    expect(consumeCues('poultice')[0]!.clip).toBe('item.poultice');
  });

  it('steps on every surface, runs harder than it walks and lands harder from higher', () => {
    for (const surface of SURFACES) {
      const walk = stepCue(surface, false, () => 0.9);
      const run = stepCue(surface, true, () => 0.9);
      expectCue(walk, surface);
      expectCue(run, surface);
      expect(run.gain).toBeGreaterThan(walk.gain);
      const soft = landCues(surface, 3.5), hard = landCues(surface, 9);
      soft.concat(hard).forEach((c) => expectCue(c, `land ${surface}`));
      expect(hard[0]!.gain).toBeGreaterThan(soft[0]!.gain);
    }
    expect(stepCue('deck', false).clip).toBe('step.wood');
    expect(stepCue('road', false, () => 0.1).clip).toBe('step.gravel');
    expect(stepCue('road', false, () => 0.9).clip).toBe('step.dirt');
    expect(stepCue('water', true).clip).toBe('step.water');
  });

  it('covers the world\'s moving parts, combat contacts and the satchel, journal and map', () => {
    const actions: WorldAction[] = ['door', 'gate', 'shutter', 'lever', 'sluice', 'sluice_jam', 'surge', 'rite'];
    for (const a of actions) worldCues(a).forEach((c) => expectCue(c, a));
    expect(worldCues('lever').map((c) => c.clip)).toEqual(['lever', 'gate']);
    expect(worldCues('rite').map((c) => c.clip)).toEqual(['rite', 'rite.bowl']);
    // The all-clear rings its three bells high to low; the drought bell alternates two strikes of the great bell.
    expect([0, 1, 2].map((i) => bellCue(true, i).variant)).toEqual([0, 1, 2]);
    expect([0, 1].map((i) => bellCue(false, i))).toEqual([{ clip: 'bell.town', gain: 0.85, variant: 0 }, { clip: 'bell.town', gain: 0.85, variant: 1 }]);
    for (const c of [bellCue(true, 0), bellCue(false, 0)]) expectCue(c, c.clip);
    for (const c of [EQUIP, UNEQUIP, SATCHEL_OPEN, SATCHEL_CLOSE, PAGE, MAP_OPEN, swingCue(false), swingCue(true)]) expectCue(c, c.clip);
    expect(hitCue('flesh', true).clip).toBe('hit.flesh');
    expect(hitCue('flesh', false).clip).toBe('hit.punch');
    expect(hitCue('block', true).clip).toBe('hit.block');
    expect(hitCue('perfect', true).clip).toBe('hit.parry');
  });

  it('lets every resident\'s work be heard, except the warden who stands guard', () => {
    for (const [id, style] of Object.entries(NPC_STYLES) as [NpcId, (typeof NPC_STYLES)[NpcId]][]) {
      const work = workSound(id, style.work);
      if (style.work === 'guard') {
        expect(work, id).toBeNull();
        continue;
      }
      expect(work, id).not.toBeNull();
      expectCue({ clip: work!.clip, gain: work!.gain }, id);
      expect(work!.every[0]).toBeGreaterThan(0.3);
      expect(work!.every[1]).toBeGreaterThanOrEqual(work!.every[0]);
    }
    expect(workSound('quarry_hand', 'stonework')!.clip).toBe('work.chisel');
    expect(workSound('mill_hand', 'measuring')!.clip).toBe('work.sack');
    expect(workSound('village_baker', 'baking')!.clip).toBe('work.knead');
  });
});

/* ------------------------------------------------------------------ the soundscape */

const day = (hour = 12): WorldSoundState => ({ hour, nightness: 0, flows: { main: 0.8, village: 0.5, quarry: 0.4 }, millTurning: true, quarryWorking: true });
const night = (): WorldSoundState => ({ ...day(23), nightness: 1 });
const at = (p: { x: number; z: number }, extra: Partial<ListenerState> = {}): ListenerState => ({ x: p.x, y: 2, z: p.z, indoors: false, ...extra });
const STRAND = { x: coastX(32) + 8, z: 32 };

describe('place beds', () => {
  it('sets a finite level for every loop everywhere, day and night', () => {
    const loops = Object.keys(WORLD_AUDIO.loops).sort();
    for (const p of [STRAND, PLACES.deepwood, PLACES.rillford, FORD, PLACES.quarry, PLACES.the_cut, PLACES.spring_shrine, PLACES.archive, LIGHTHOUSE]) {
      for (const w of [day(), night()]) {
        const t = bedTargets(at(p), w);
        expect(Object.keys(t).sort()).toEqual(loops);
        for (const [id, b] of Object.entries(t)) {
          expect(Number.isFinite(b.gain), id).toBe(true);
          expect(b.gain, id).toBeGreaterThanOrEqual(0);
          expect(b.gain, id).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('hears the sea on the strand, the wood in the deepwood and the village in Rillford', () => {
    const strand = bedTargets(at(STRAND), day());
    expect(strand.sea.gain).toBeGreaterThan(0.6);
    expect(strand.sea.at!.x).toBeLessThan(coastX(STRAND.z));
    expect(strand.forest_day.gain).toBeLessThan(0.05);
    const wood = bedTargets(at(PLACES.deepwood), day());
    expect(wood.forest_day.gain).toBeGreaterThan(0.7);
    expect(wood.village_day.gain).toBe(0);
    expect(bedTargets(at(PLACES.deepwood), night()).forest_night.gain).toBeGreaterThan(0.6);
    expect(bedTargets(at(PLACES.deepwood), night()).forest_day.gain).toBe(0);
    const village = bedTargets(at(PLACES.rillford), day());
    expect(village.village_day.gain).toBeGreaterThan(0.6);
    expect(bedTargets(at(PLACES.rillford), night()).village_night.gain).toBeGreaterThan(0.6);
    expect(bedTargets(at(INLAND_HAMLET), day()).village_day.gain).toBeGreaterThan(0.3);
  });

  it('places working sources: the mill only while it turns, the quarry only while it works', () => {
    const mill = { x: -14, z: 0 };
    expect(bedTargets(at(mill), day()).mill.gain).toBeGreaterThan(0.7);
    expect(bedTargets(at(mill), { ...day(), millTurning: false }).mill.gain).toBe(0);
    expect(bedTargets(at(PLACES.quarry), day()).quarry.gain).toBeGreaterThan(0.7);
    expect(bedTargets(at(PLACES.quarry), { ...day(), quarryWorking: false }).quarry.gain).toBe(0);
    expect(bedTargets(at(RITE_ALTAR), day()).spring.gain).toBeGreaterThan(0.7);
    expect(bedTargets(at(PLACES.the_cut), day()).cut.gain).toBeGreaterThan(0.6);
    expect(bedTargets(at({ x: LIGHTHOUSE.x + 5, z: LIGHTHOUSE.z }, { y: 14 }), day()).cliff_wind.gain).toBeGreaterThan(0.6);
    // Frogs and reeds at the ford wake up after dark.
    expect(bedTargets(at(FORD), night()).marsh.gain).toBeGreaterThan(bedTargets(at(FORD), day()).marsh.gain * 2);
  });

  it('places the brook at its nearest bank and follows the water that is actually flowing', () => {
    const flows = day().flows;
    for (const p of [PLACES.sluice, PLACES.rillford, FORD, PLACES.quarry, { x: 30, z: -20 }]) {
      const s = nearestStream(p.x, p.z, flows)!;
      // The point lies on a stream's centre line, and no stream's bank is nearer.
      const stream = STREAMS.find((st) => distToPolyline(s.at.x, s.at.z, st.points).d < 1e-6)!;
      expect(stream, `${p.x},${p.z}`).toBeDefined();
      expect(s.flow).toBe(flows[stream.id]);
      expect(s.d).toBeCloseTo(Math.max(0, Math.hypot(p.x - s.at.x, p.z - s.at.z) - stream.halfWidth), 6);
      for (const other of STREAMS) expect(Math.max(0, distToPolyline(p.x, p.z, other.points).d - other.halfWidth)).toBeGreaterThanOrEqual(s.d - 1e-9);
    }
    const p = PLACES.sluice;
    expect(nearestStream(p.x, p.z, { main: 0, village: 0, quarry: 0 })).toBeNull();
    expect(bedTargets(at(p), { ...day(), flows: { main: 0, village: 0, quarry: 0 } }).brook.gain).toBe(0);
    expect(bedTargets(at(p), day()).brook.gain).toBeGreaterThan(0.4);
  });

  it('closes the room indoors: the archive hums and the outdoors drops to a quarter', () => {
    const outside = bedTargets(at(PLACES.archive), day());
    const inside = bedTargets(at(PLACES.archive, { indoors: true }), day());
    expect(outside.interior.gain).toBe(0);
    expect(inside.interior.gain).toBeGreaterThan(0.6);
    expect(inside.meadow_day.gain).toBeCloseTo(outside.meadow_day.gain * 0.25);
  });

  it('sings higher in needles than in open ground', () => {
    expect(windTone(PLACES.deepwood.x, PLACES.deepwood.z)).toBeGreaterThan(windTone(PLACES.rillford.x, PLACES.rillford.z));
    expect(windTone(PLACES.rillford.x, PLACES.rillford.z)).toBe(300);
  });
});

describe('wildlife calls', () => {
  const run = (seed: number, l: ListenerState, w: WorldSoundState, minutes = 10) => {
    const em = new EmitterScheduler(rng(seed));
    const events: ReturnType<EmitterScheduler['update']> = [];
    for (let i = 0; i < minutes * 60 * 20; i++) events.push(...em.update(0.05, l, w));
    return events;
  };
  const count = (events: { rule: string }[], rule: string) => events.filter((e) => e.rule === rule).length;

  it('is repeatable for a seed and names only real clips', () => {
    expect(run(3, at(PLACES.deepwood), day(7))).toEqual(run(3, at(PLACES.deepwood), day(7)));
    for (const e of run(4, at(INLAND_HAMLET), day(6.2))) expect(hasClip(e.clip), e.rule).toBe(true);
  });

  it('puts gulls over the sea by day, birds in the wood, owls at night and frogs by the ford', () => {
    const strand = run(1, at(STRAND), day());
    expect(count(strand, 'gull')).toBeGreaterThan(20);
    for (const e of strand.filter((e) => e.rule === 'gull')) expect(e.at.x).toBeLessThan(coastX(e.at.z));
    expect(count(run(1, at(STRAND), night()), 'gull')).toBe(0);
    expect(count(run(1, at(PLACES.quarry), day()), 'gull')).toBeLessThan(4);
    const wood = run(2, at(PLACES.deepwood), day(7));
    expect(count(wood, 'songbird')).toBeGreaterThan(20);
    expect(count(wood, 'owl')).toBe(0);
    expect(count(run(2, at(PLACES.deepwood), night()), 'owl')).toBeGreaterThan(4);
    expect(count(run(2, at(PLACES.deepwood), night()), 'songbird')).toBe(0);
    expect(count(run(5, at(FORD), night()), 'frog')).toBeGreaterThan(40);
    expect(count(run(5, at(PLACES.deepwood), night()), 'frog')).toBe(0);
    expect(count(run(6, at(PLACES.rillford), day(6.2)), 'rooster')).toBeGreaterThan(2);
    expect(count(run(6, at(PLACES.rillford), day(14)), 'rooster')).toBe(0);
  });

  it('keeps the birds out of a closed room and every rule finds a place to call', () => {
    expect(run(7, at(PLACES.archive, { indoors: true }), day(7)).filter((e) => e.rule !== 'dog')).toEqual([]);
    const heard = new Set<string>();
    const hall = BUILDINGS.find((b) => b.kind === 'shrine')!;
    for (const [p, w] of [[STRAND, day()], [PLACES.deepwood, day(7)], [PLACES.deepwood, night()], [FORD, night()], [PLACES.rillford, day(6.2)], [INLAND_HAMLET, day()], [{ x: -180, z: -22 }, day()], [{ x: hall.x + 6, z: hall.z + 8 }, day()], [{ x: RITE_ALTAR.x + 3, z: RITE_ALTAR.z }, day()]] as const) {
      for (const e of run(8, at(p), w, 20)) heard.add(e.rule);
    }
    expect([...heard].sort()).toEqual(emitterRuleIds().sort());
  });
});

describe('crafted life of the world', () => {
  it('lets crickets keep time with the warmth of the air (Dolbear), mostly from dusk into the night', () => {
    expect(temperatureAt(15)).toBeCloseTo(20);
    expect(temperatureAt(3)).toBeCloseTo(8);
    expect(cricketRate(20)).toBeCloseTo(110 / 60);
    expect(cricketRate(12)).toBeCloseTo(54 / 60);
    expect(cricketRate(8)).toBe(0);
    expect(cricketRate(temperatureAt(20))).toBeGreaterThan(cricketRate(temperatureAt(23)));
    const field = at(PLACES.quarry);
    expect(cricketDensity(field, night())).toBeGreaterThan(0.8);
    expect(cricketDensity(field, { ...day(19.5), nightness: 0.3 })).toBeGreaterThan(0.8);
    expect(cricketDensity(field, day(12))).toBeLessThan(0.2);
    expect(cricketDensity({ ...field, indoors: true }, night())).toBe(0);
    expect(cricketDensity(at(STRAND), night())).toBeLessThan(cricketDensity(field, night()) * 0.4);
    // Too cold before dawn: silence.
    expect(cricketDensity(field, { ...night(), hour: 4 })).toBe(0);
  });

  it('stirs the shrine chime in short bursts of tuned notes and lets the spring give up bubbles', () => {
    const hall = BUILDINGS.find((b) => b.kind === 'shrine')!;
    const em = new EmitterScheduler(rng(21));
    const events: ReturnType<EmitterScheduler['update']> = [];
    for (let i = 0; i < 20 * 300; i++) events.push(...em.update(0.05, at({ x: hall.x + 6, z: hall.z + 8 }), day()));
    const chimes = events.filter((e) => e.rule === 'chime');
    expect(chimes.length).toBeGreaterThan(15);
    expect(chimes.every((e) => e.pitch === 0)).toBe(true);
    expect(chimes.some((e) => e.delay > 0)).toBe(true);
    expect(Math.max(...chimes.map((e) => e.delay))).toBeLessThan(2);
    const em2 = new EmitterScheduler(rng(22));
    const bubbles: ReturnType<EmitterScheduler['update']> = [];
    for (let i = 0; i < 20 * 120; i++) bubbles.push(...em2.update(0.05, at({ x: RITE_ALTAR.x + 3, z: RITE_ALTAR.z }), night()).filter((e) => e.rule === 'bubble'));
    expect(bubbles.length).toBeGreaterThan(40);
    for (const b of bubbles) expect(Math.hypot(b.at.x - RITE_ALTAR.x, b.at.z - RITE_ALTAR.z)).toBeLessThan(2);
    const far = new EmitterScheduler(rng(23));
    for (let i = 0; i < 20 * 120; i++) expect(far.update(0.05, at(PLACES.rillford), night()).filter((e) => e.rule === 'chime' || e.rule === 'bubble')).toEqual([]);
  });

  it('plays the inn from dusk until late, heard through its walls near the inn only', () => {
    expect(innEvening(12)).toBe(0);
    expect(innEvening(18.7)).toBeGreaterThan(0);
    expect(innEvening(21)).toBe(1);
    expect(innEvening(23.8)).toBe(0);
    const door = at({ x: INN.x + 8, z: INN.z });
    expect(innSong(door, { ...day(21), nightness: 0.9 }).gain).toBeGreaterThan(0.9);
    expect(innSong(at(PLACES.quarry), { ...day(21), nightness: 0.9 }).gain).toBe(0);
    expect(innSong(door, day(14)).gain).toBe(0);
  });
});

describe('ground under other feet', () => {
  const ground = (o: Partial<Record<'deck' | 'carve' | 'sea' | 'slope', number>> = {}) => ({
    deckAt: () => (o.deck ? { y: 1 } : null) as never,
    carveAt: () => o.carve ?? 0,
    seaDepth: () => o.sea ?? 0,
    slopeAt: () => o.slope ?? 0,
  });
  it('reads decks, water, roads, stone and sand the way the player does', () => {
    expect(groundSurface(ground({ deck: 1 }), 0, 0)).toBe('deck');
    expect(groundSurface(ground({ carve: 0.5 }), 0, 0)).toBe('water');
    expect(groundSurface(ground({ sea: 0.5 }), 0, 0)).toBe('water');
    expect(groundSurface(ground({ slope: 0.8 }), PLACES.deepwood.x, PLACES.deepwood.z)).toBe('stone');
    expect(groundSurface(ground(), PLACES.deepwood.x, PLACES.deepwood.z)).toBe('grass');
    expect(groundSurface(ground(), STRAND.x, STRAND.z)).toBe('sand');
  });
});

/* ------------------------------------------------------------------ the score */

describe('music director', () => {
  const ctx = (over: Partial<MusicContext> = {}): MusicContext => ({ active: true, x: PLACES.rillford.x, z: PLACES.rillford.z, night: false, threat: 'none', ...over });
  const step = (d: MusicDirector, seconds: number, c: MusicContext) => {
    const out: MusicAction[] = [];
    for (let t = 0; t < seconds; t += 0.05) out.push(...d.update(0.05, c));
    return out;
  };

  it('chooses the mood of the place', () => {
    expect(moodAt(PLACES.rillford.x, PLACES.rillford.z, false)).toBe('vale');
    expect(moodAt(INLAND_HAMLET.x, INLAND_HAMLET.z, false)).toBe('vale');
    expect(moodAt(PLACES.deepwood.x, PLACES.deepwood.z, false)).toBe('wild');
    expect(moodAt(PLACES.the_cut.x, PLACES.the_cut.z, false)).toBe('wild');
    expect(moodAt(PLACES.rillford.x, PLACES.rillford.z, true)).toBe('night');
    expect(moodAt(PLACES.spring_shrine.x, PLACES.spring_shrine.z, true)).toBe('sacred');
    expect(moodAt(PLACES.archive.x, PLACES.archive.z, false)).toBe('sacred');
    for (const list of Object.values(PLAYLISTS)) expect(list.length).toBeGreaterThan(0);
  });

  it('waits, plays one piece for the place, then leaves the world quiet for a while', () => {
    const d = new MusicDirector(rng(1));
    expect(d.update(0.05, ctx({ active: false }))).toEqual([]);
    const first = step(d, 20, ctx());
    expect(first).toHaveLength(1);
    const piece = first[0]!;
    expect(piece.t).toBe('piece');
    if (piece.t !== 'piece') return;
    expect(PLAYLISTS.vale).toContain(piece.id);
    expect(d.phase).toBe('piece');
    let played = 0;
    while (d.phase === 'piece') {
      d.update(0.05, ctx());
      played += 0.05;
    }
    expect(played).toBeLessThanOrEqual(WORLD_AUDIO.music[piece.id].duration);
    expect(d.phase).toBe('wait');
    expect(step(d, 34, ctx())).toEqual([]);
    const next = step(d, 50, ctx());
    expect(next).toHaveLength(1);
    // Never the same piece twice running where there is a choice.
    const wild = new MusicDirector(rng(9));
    const ids: string[] = [];
    for (let i = 0; i < 8; i++) for (const a of step(wild, 120, ctx({ x: PLACES.deepwood.x, z: PLACES.deepwood.z }))) if (a.t === 'piece') ids.push(a.id);
    expect(ids.length).toBeGreaterThan(5);
    ids.forEach((id, i) => { if (i) expect(id).not.toBe(ids[i - 1]); });
  });

  it('brings in danger, then battle in the same voice, never steps back down mid-fight, and calms afterwards', () => {
    const d = new MusicDirector(rng(2));
    step(d, 20, ctx());
    // The first fight of a session hears the composed music; the next encounter the generated one.
    expect(step(d, 0.05, ctx({ threat: 'alert' }))).toEqual([{ t: 'loop', id: 'danger_watch', fadeIn: 2.2 }]);
    expect(step(d, 0.05, ctx({ threat: 'combat' }))).toEqual([{ t: 'loop', id: 'battle_ford', fadeIn: 0.8 }]);
    expect(step(d, 2, ctx({ threat: 'alert' }))).toEqual([]);
    expect(step(d, 3.9, ctx())).toEqual([]);
    expect(step(d, 0.3, ctx())).toEqual([{ t: 'stop', fadeOut: 3 }]);
    expect(d.phase).toBe('wait');
    expect(step(d, 0.05, ctx({ threat: 'combat' }))).toEqual([{ t: 'loop', id: 'combat', fadeIn: 0.8 }]);
    expect(THREAT_LOOPS.alert.sort()).toEqual(['danger', 'danger_watch']);
    expect(THREAT_LOOPS.combat.sort()).toEqual(['battle_ford', 'combat']);
  });

  it('opens each mood with its own arrangement of the theme, then varies', () => {
    const d = new MusicDirector(rng(12));
    const first = step(d, 20, ctx())[0]!;
    expect(first).toEqual({ t: 'piece', id: 'theme_vale', fadeIn: 2.5 });
    for (const [mood, id] of [['wild', 'theme_wild'], ['night', 'theme_night'], ['sacred', 'theme_sacred']] as const) {
      expect(PLAYLISTS[mood]).toContain(id);
      expect(WORLD_AUDIO.music[id].origin).toBe('composed');
    }
    const later: string[] = [];
    for (let i = 0; i < 6; i++) for (const a of step(d, 140, ctx())) if (a.t === 'piece') later.push(a.id);
    expect(new Set(later).size).toBeGreaterThan(1);
  });

  it('greets every place with its region motif, and gives way to the music of the inn', () => {
    for (const id of Object.keys(PLACES) as (keyof typeof PLACES)[]) {
      const region = PLACE_REGION[id];
      expect(region, id).toBeDefined();
      const d = new MusicDirector(rng(13));
      expect(d.sting('discover', id)).toEqual([{ t: 'sting', id: REGION_STING[region] }]);
      expect(WORLD_AUDIO.music[REGION_STING[region]].kind).toBe('sting');
    }
    const d = new MusicDirector(rng(14));
    expect(step(d, 20, ctx())[0]!.t).toBe('piece');
    expect(step(d, 0.05, ctx({ diegetic: true }))).toEqual([{ t: 'stop', fadeOut: 3 }]);
    expect(step(d, 60, ctx({ diegetic: true }))).toEqual([]);
    expect(step(d, 19, ctx())).toEqual([]);
    expect(step(d, 1.2, ctx())[0]!.t).toBe('piece');
  });

  it('marks discoveries, quests, victory and a fall, but never talks over a fight', () => {
    const d = new MusicDirector(rng(3));
    step(d, 1, ctx());
    const quest = d.sting('quest')[0]!;
    expect(quest.t === 'sting' && ['sting_quest', 'sting_quest_theme'].includes(quest.id)).toBe(true);
    const found = d.sting('discover')[0]!;
    expect(found.t === 'sting' && ['sting_discover', 'sting_lute'].includes(found.id)).toBe(true);
    step(d, 0.05, ctx({ threat: 'combat' }));
    expect(d.sting('discover', 'rillford')).toEqual([]);
    const won = d.sting('victory');
    expect(won[0]).toEqual({ t: 'stop', fadeOut: 1.5 });
    expect(won[1]!.t === 'sting' && ['sting_victory', 'sting_victory_theme'].includes(won[1]!.id)).toBe(true);
    expect(d.phase).toBe('wait');
    const fell = d.sting('death');
    expect(fell[0]).toEqual({ t: 'stop', fadeOut: 0.4 });
    expect(fell[1]!.t === 'sting' && ['sting_death', 'sting_fall_theme'].includes(fell[1]!.id)).toBe(true);
    expect(d.phase).toBe('off');
    // Two thirds of the stings come in the composed voice.
    const e = new MusicDirector(rng(15));
    let composedStings = 0;
    for (let i = 0; i < 300; i++) {
      const a = e.sting('quest')[0]!;
      if (a.t === 'sting' && WORLD_AUDIO.music[a.id].origin === 'composed') composedStings++;
    }
    expect(composedStings).toBeGreaterThan(170);
    expect(composedStings).toBeLessThan(230);
  });

  it('gives way when the player enters sacred ground, and stops for menus', () => {
    const d = new MusicDirector(rng(4));
    step(d, 20, ctx());
    expect(d.phase).toBe('piece');
    const shrine = ctx({ x: PLACES.spring_shrine.x, z: PLACES.spring_shrine.z });
    expect(step(d, 7.9, shrine)).toEqual([]);
    expect(step(d, 0.3, shrine)).toEqual([{ t: 'stop', fadeOut: 4 }]);
    const a = step(d, 5, shrine);
    expect(a).toHaveLength(1);
    expect(a[0]!.t === 'piece' && PLAYLISTS.sacred.includes(a[0]!.id)).toBe(true);
    expect(step(d, 0.05, ctx({ active: false }))).toEqual([{ t: 'stop', fadeOut: 1.2 }]);
    expect(d.phase).toBe('off');
  });

  it('measures the threat from engaged, living enemies near the player', () => {
    const e = (x: number, state = 'chase', alive = true, engaged = true) => ({ x, z: 0, state, alive, engaged });
    expect(threatFrom([], 0, 0)).toBe('none');
    expect(threatFrom([e(10)], 0, 0)).toBe('combat');
    expect(threatFrom([e(10, 'alert')], 0, 0)).toBe('alert');
    expect(threatFrom([e(25)], 0, 0)).toBe('alert');
    expect(threatFrom([e(50)], 0, 0)).toBe('none');
    expect(threatFrom([e(5, 'dead', false)], 0, 0)).toBe('none');
    expect(threatFrom([e(5, 'idle', true, false)], 0, 0)).toBe('none');
  });
});

/* ------------------------------------------------------------------ the runtime, against a scripted audio graph */

class Param {
  value: number;
  constructor(v = 1) { this.value = v; }
  setTargetAtTime = vi.fn((v: number) => { this.value = v; return this; });
  setValueAtTime = vi.fn((v: number) => { this.value = v; return this; });
  linearRampToValueAtTime = vi.fn((v: number) => { this.value = v; return this; });
  cancelScheduledValues = vi.fn(() => this);
}
class FakeNode {
  readonly kind: string;
  outputs: FakeNode[] = [];
  connect = vi.fn((n: FakeNode) => { this.outputs.push(n); return n; });
  disconnect = vi.fn(() => { this.outputs = []; });
  constructor(kind: string) { this.kind = kind; }
}
class FakeSource extends FakeNode {
  buffer: { duration: number; file?: string } | null = null;
  loop = false;
  playbackRate = new Param();
  onended: (() => void) | null = null;
  started: [number, number?, number?] | null = null;
  stopped = false;
  start = vi.fn((when: number, offset?: number, duration?: number) => { this.started = [when, offset, duration]; });
  stop = vi.fn(() => { this.stopped = true; });
}
class FakeContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 8000;
  nodes: FakeNode[] = [];
  sources: FakeSource[] = [];
  destination = new FakeNode('destination');
  listener = {
    positionX: new Param(0), positionY: new Param(0), positionZ: new Param(0),
    forwardX: new Param(0), forwardY: new Param(0), forwardZ: new Param(-1),
    upX: new Param(0), upY: new Param(1), upZ: new Param(0),
  };
  private node<T extends FakeNode>(n: T) { this.nodes.push(n); return n; }
  createGain = () => this.node(Object.assign(new FakeNode('gain'), { gain: new Param() }));
  createBiquadFilter = () => this.node(Object.assign(new FakeNode('filter'), { type: '', frequency: new Param(350), Q: new Param() }));
  createConvolver = () => this.node(Object.assign(new FakeNode('convolver'), { normalize: true, buffer: null }));
  createPanner = () => this.node(Object.assign(new FakeNode('panner'), {
    panningModel: '', distanceModel: '', refDistance: 1, rolloffFactor: 1, maxDistance: 10000,
    positionX: new Param(0), positionY: new Param(0), positionZ: new Param(0),
  }));
  createBufferSource = () => { const s = this.node(new FakeSource('source')); this.sources.push(s); return s; };
  createMediaElementSource = () => this.node(new FakeNode('media'));
  createBuffer = (_channels: number, length: number, rate: number) => {
    const data = [new Float32Array(length), new Float32Array(length)];
    return { duration: length / rate, getChannelData: (c: number) => data[c]! };
  };
  resume = vi.fn(async () => { this.state = 'running'; });
  suspend = vi.fn(async () => { this.state = 'suspended'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  decodeAudioData = vi.fn(async (data: { file: string }) => {
    const name = path.basename(data.file).replace(/\.(ogg|m4a)$/, '');
    const all = [...Object.values(WORLD_AUDIO.banks), ...Object.values(WORLD_AUDIO.loops), ...Object.values(WORLD_AUDIO.music)];
    const entry = all.find((e) => e.file === name);
    if (!entry) throw new Error(`no such file ${name}`);
    return { duration: entry.duration, file: name };
  });
}
class FakeMedia {
  static made: FakeMedia[] = [];
  src = '';
  preload = '';
  paused = true;
  ended = false;
  currentTime = 0;
  constructor() { FakeMedia.made.push(this); }
  canPlayType = vi.fn(() => 'probably');
  play = vi.fn(() => { this.paused = false; return Promise.resolve(); });
  pause = vi.fn(() => { this.paused = true; });
  load = vi.fn();
  removeAttribute = vi.fn((name: string) => { if (name === 'src') this.src = ''; });
  listeners = new Map<string, () => void>();
  addEventListener = vi.fn((type: string, listener: () => void) => { this.listeners.set(type, listener); });
}

function runtime(seed = 3) {
  const ctx = new FakeContext();
  const fetched: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    fetched.push(url);
    return { ok: true, arrayBuffer: async () => ({ file: url }) };
  }));
  FakeMedia.made = [];
  vi.stubGlobal('Audio', FakeMedia);
  const bus = () => ctx.createGain() as unknown as GainNode;
  const buses = { effects: bus(), ambience: bus(), music: bus(), dialogue: bus() };
  const world = new SoundWorld(ctx as unknown as AudioContext, buses, '/tervain/', rng(seed));
  return { ctx, world, fetched, buses };
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const terrain = { deckAt: () => null, carveAt: () => 0, seaDepth: () => 0, slopeAt: () => 0 } as unknown as SoundFrame['terrain'];
function frame(p: { x: number; z: number }, over: Partial<SoundFrame> = {}): SoundFrame {
  return {
    mode: 'play',
    listener: { x: p.x, y: 3, z: p.z, fx: 0, fy: 0, fz: 1 },
    player: { x: p.x, y: 1, z: p.z, exhausted: false, health: 1 },
    world: day(),
    indoors: false,
    threat: 'none',
    npcs: [],
    enemies: [],
    props: [],
    terrain,
    ...over,
  };
}
const playing = (ctx: FakeContext, file: string) => ctx.sources.filter((s) => s.buffer?.file === file && s.started && !s.stopped);
/** The nodes a voice passes through on its way to a bus. */
function chain(source: FakeNode, buses: Record<string, unknown>): string[] {
  const ends = new Set(Object.values(buses));
  const out: string[] = [];
  for (let n: FakeNode | undefined = source; n && !ends.has(n); n = n.outputs[0]) out.push(n.kind);
  return out;
}

describe('world sound runtime', () => {
  it('loads every sprite bank at once from the deployed base, and drops sounds that arrive before them', async () => {
    const { world, fetched } = runtime();
    expect(world.play({ clip: 'step.grass', gain: 0.4 })).toBe(false);
    expect(world.stats.dropped).toBe(1);
    await flush();
    expect(fetched.sort()).toEqual(Object.values(WORLD_AUDIO.banks).map((b) => `/tervain/assets/audio/world/${b.file}.ogg`).sort());
    expect(world.banksReady).toBe(true);
  });

  it('falls back to AAC for good when the browser names Opus but cannot decode it', async () => {
    const { ctx, world, fetched } = runtime();
    const decode = ctx.decodeAudioData.getMockImplementation()!;
    ctx.decodeAudioData.mockImplementation(async (data: { file: string }) => {
      if (data.file.endsWith('.ogg')) throw new Error('EncodingError');
      return decode(data);
    });
    await flush();
    await flush();
    expect(world.banksReady).toBe(true);
    expect(world.stats.decodeErrors).toBe(0);
    expect(fetched.filter((f) => f.endsWith('.m4a'))).toHaveLength(Object.keys(WORLD_AUDIO.banks).length);
    expect(world.url('loop-sea')).toBe('/tervain/assets/audio/world/loop-sea.m4a');
  });

  it('plays a take from its sprite segment and places world sounds through air and a panner', async () => {
    const { ctx, world, buses } = runtime();
    await flush();
    world.update(0.05, frame(PLACES.rillford));
    expect(world.play({ clip: 'item.satchel', gain: 0.4, from: 0.6, to: 2 })).toBe(true);
    const satchel = ctx.sources.at(-1)!;
    const [offset, length] = WORLD_AUDIO.banks.items.clips['item.satchel'][0]!;
    expect(satchel.started![1]).toBeCloseTo(offset + 0.6);
    expect(satchel.started![2]).toBeCloseTo(Math.min(length, 2) - 0.6);
    const gull = { x: PLACES.rillford.x + 40, y: 10, z: PLACES.rillford.z };
    expect(world.play({ clip: 'gull', gain: 0.5 }, { at: gull })).toBe(true);
    expect(chain(ctx.sources.at(-1)!, buses)).toEqual(['source', 'gain', 'filter', 'panner']);
    expect(chain(satchel, buses)).toEqual(['source', 'gain']);
    // Too far away to matter: never started.
    expect(world.play({ clip: 'gull', gain: 0.5 }, { at: { ...gull, x: gull.x + 200 } })).toBe(false);
  });

  it('keeps every bus within its voice budget by ending the oldest voice', async () => {
    const { ctx, world } = runtime();
    await flush();
    for (let i = 0; i < 40; i++) world.play({ clip: 'step.stone', gain: 0.4 });
    const live = ctx.sources.filter((s) => s.started && !s.stopped);
    expect(live).toHaveLength(28);
    expect(ctx.sources.filter((s) => s.stopped)).toHaveLength(12);
    // A finished voice releases its nodes.
    live[0]!.onended?.();
    expect(live[0]!.disconnect).toHaveBeenCalled();
  });

  it('fades place beds in where they belong, out under a menu, and releases them when long silent', async () => {
    const { ctx, world, fetched } = runtime();
    await flush();
    world.update(0.05, frame(STRAND));
    await flush();
    world.update(0.05, frame(STRAND));
    expect(fetched).toContain('/tervain/assets/audio/world/loop-sea.ogg');
    const sea = playing(ctx, 'loop-sea');
    expect(sea).toHaveLength(1);
    expect(sea[0]!.loop).toBe(true);
    expect(world.recordedLevel).toBe(1);
    // Standing still schedules no further automation on a settled bed (bounded automation).
    const seaGain = (sea[0]!.outputs[0] as unknown as { gain: Param }).gain;
    const scheduled = seaGain.setTargetAtTime.mock.calls.length;
    for (let t = 0; t < 2; t += 0.05) world.update(0.05, frame(STRAND));
    expect(seaGain.setTargetAtTime.mock.calls.length).toBe(scheduled);
    expect(fetched.some((f) => f.includes('loop-village'))).toBe(false);
    for (let t = 0; t < 47; t += 0.05) world.update(0.05, null);
    expect(world.recordedLevel).toBe(0);
    expect(sea[0]!.stopped).toBe(true);
  });

  it('starts a piece for the place as a stream, swaps it for the battle loop in a fight, and stops it for a menu', async () => {
    vi.useFakeTimers();
    const { ctx, world } = runtime(1);
    await flush();
    // The first element only asked which codec the browser plays.
    const probes = FakeMedia.made.length;
    for (let t = 0; t < 20; t += 0.05) world.update(0.05, frame(PLACES.rillford));
    expect(FakeMedia.made).toHaveLength(probes + 1);
    const media = FakeMedia.made.at(-1)!;
    // The vale's first piece is its own arrangement of the theme.
    expect(media.src).toMatch(/\/tervain\/assets\/audio\/world\/music-theme_vale\.ogg$/);
    expect(media.play).toHaveBeenCalledOnce();
    expect(world.musicState.phase).toBe('piece');
    // A hidden tab pauses the stream rather than letting it run on unheard.
    world.setHidden(true);
    expect(media.paused).toBe(true);
    world.setHidden(false);
    expect(media.play).toHaveBeenCalledTimes(2);
    // A stream the browser cannot play switches to the AAC fallback in place.
    media.listeners.get('error')!();
    expect(media.src).toMatch(/music-theme_vale\.m4a$/);
    expect(media.play).toHaveBeenCalledTimes(3);
    world.update(0.05, frame(PLACES.rillford, { threat: 'combat' }));
    await flush();
    // The first fight of a session plays the composed battle music.
    expect(world.musicState.loop).toBe('battle_ford');
    expect(playing(ctx, 'music-battle_ford')[0]!.loop).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(media.paused).toBe(true);
    world.sting('victory');
    await flush();
    expect(playing(ctx, 'music-sting_victory')).toHaveLength(1);
    vi.advanceTimersByTime(3000);
    expect(playing(ctx, 'music-battle_ford')).toHaveLength(0);
    world.dispose();
    expect(ctx.sources.every((s) => !s.started || s.stopped)).toBe(true);
  });

  it('caps music one-shots and stops every owned sting on menu entry and disposal', async () => {
    const { ctx, world } = runtime();
    await flush();
    world.update(0.05, frame(PLACES.rillford));
    for (let i = 0; i < 20; i++) world.sting('quest');
    await flush();
    const stings = () => ctx.sources.filter((s) => s.started && !s.stopped && s.buffer?.file?.startsWith('music-sting'));
    expect(stings()).toHaveLength(4);
    expect(ctx.sources.filter((s) => s.stopped && s.buffer?.file?.startsWith('music-sting'))).toHaveLength(16);
    // A null menu frame must cancel even below the 20 Hz sound update cadence.
    world.update(0.001, null);
    expect(stings()).toHaveLength(0);
    world.sting('quest');
    await flush();
    expect(stings()).toHaveLength(0);
    world.update(0.05, frame(PLACES.rillford, { mode: 'dead' }));
    world.sting('death');
    await flush();
    expect(stings()).toHaveLength(1);
    world.dispose();
    expect(ctx.sources.every((s) => !s.started || s.stopped)).toBe(true);
  });

  it('owns fading streams and loops through hidden-tab suspension and immediate disposal', async () => {
    vi.useFakeTimers();
    const { ctx, world } = runtime(1);
    await flush();
    for (let t = 0; t < 20; t += 0.05) world.update(0.05, frame(PLACES.rillford));
    const media = FakeMedia.made.at(-1)!;
    await flush();
    world.update(0.05, frame(PLACES.rillford, { threat: 'combat' }));
    await flush();
    world.setHidden(true);
    expect(media.paused).toBe(true);
    world.setHidden(false);
    // The retired piece must not restart on focus; then retire the fight loop too.
    expect(media.play).toHaveBeenCalledOnce();
    world.update(0.05, null);
    world.dispose();
    expect(media.src).toBe('');
    expect(ctx.sources.every((s) => !s.started || s.stopped)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['menu', 'hidden', 'dispose'] as const)('never starts a pending sting after %s, even after returning', async (transition) => {
    const { ctx, world } = runtime();
    await flush();
    world.update(0.05, frame(PLACES.rillford));
    const decode = ctx.decodeAudioData.getMockImplementation()!;
    const pending: (() => Promise<void>)[] = [];
    ctx.decodeAudioData.mockImplementation((data: { file: string }) => {
      if (!data.file.includes('music-sting')) return decode(data);
      return new Promise((resolve) => pending.push(async () => resolve(await decode(data))));
    });
    world.sting('quest');
    await flush();
    expect(pending).toHaveLength(1);
    if (transition === 'menu') {
      world.update(0.001, null);
      world.update(0.05, frame(PLACES.rillford));
    } else if (transition === 'hidden') {
      world.setHidden(true);
      world.setHidden(false);
    } else world.dispose();
    await Promise.all(pending.map((finish) => finish()));
    await flush();
    expect(ctx.sources.some((s) => s.started && s.buffer?.file?.startsWith('music-sting'))).toBe(false);
  });

  it('cannot repopulate decoded banks after disposal during an in-flight decode', async () => {
    const { ctx, world } = runtime();
    const decode = ctx.decodeAudioData.getMockImplementation()!;
    const pending: (() => Promise<void>)[] = [];
    ctx.decodeAudioData.mockImplementation((data: { file: string }) => new Promise((resolve) => {
      pending.push(async () => resolve(await decode(data)));
    }));
    await flush();
    expect(pending).toHaveLength(Object.keys(WORLD_AUDIO.banks).length);
    world.dispose();
    await Promise.all(pending.map((finish) => finish()));
    await flush();
    expect(world.banksReady).toBe(false);
    const held = world as unknown as { bankBuffers: Map<string, unknown>; bankLoads: Map<string, unknown> };
    expect(held.bankBuffers.size).toBe(0);
    expect(held.bankLoads.size).toBe(0);
  });

  it('waits for the real stream end through buffering and gesture rejection, while threats can interrupt', async () => {
    vi.useFakeTimers();
    const { world } = runtime(1);
    await flush();
    for (let t = 0; t < 20; t += 0.05) world.update(0.05, frame(PLACES.rillford));
    const media = FakeMedia.made.at(-1)!;
    await flush();
    media.paused = true;
    media.play.mockRejectedValueOnce(new Error('NotAllowedError'));
    world.resumeStreams();
    await flush();
    // The unheard stream exceeds its whole nominal duration without entering a quiet interval or being replaced.
    const made = FakeMedia.made.length;
    for (let t = 0; t < 100; t += 0.05) world.update(0.05, frame(PLACES.rillford));
    expect(world.musicState.phase).toBe('piece');
    expect(FakeMedia.made).toHaveLength(made);
    expect(media.play).toHaveBeenCalledTimes(2);
    world.resumeStreams();
    await flush();
    expect(media.paused).toBe(false);
    expect(media.play).toHaveBeenCalledTimes(3);
    media.currentTime = 2;
    for (let t = 0; t < 100; t += 0.05) world.update(0.05, frame(PLACES.rillford));
    expect(world.musicState.phase).toBe('piece');
    media.ended = true;
    world.update(0.05, frame(PLACES.rillford));
    expect(world.musicState.phase).toBe('wait');
    world.update(0.05, frame(PLACES.rillford, { threat: 'combat' }));
    await flush();
    expect(world.musicState.loop).toBe('battle_ford');
    world.dispose();
    vi.runAllTimers();
  });

  it('pauses a stale streaming play promise that resolves after menu entry', async () => {
    vi.useFakeTimers();
    const { world } = runtime(1);
    await flush();
    for (let t = 0; t < 20; t += 0.05) world.update(0.05, frame(PLACES.rillford));
    const media = FakeMedia.made.at(-1)!;
    await flush();
    media.paused = true;
    let finish!: () => void;
    media.play.mockImplementationOnce(() => new Promise<void>((resolve) => {
      finish = () => { media.paused = false; resolve(); };
    }));
    world.resumeStreams();
    world.update(0.05, null);
    finish();
    await flush();
    expect(media.paused).toBe(true);
    world.dispose();
    vi.runAllTimers();
  });

  it('hears residents at work and on foot, enemies winding up and falling, and crates landing', async () => {
    const { ctx, world } = runtime(5);
    await flush();
    const center = PLACES.rillford;
    const npcs = [
      { id: 'quarry_hand' as NpcId, x: center.x + 3, y: 0, z: center.z, mode: 'work', hidden: false },
      { id: 'village_baker' as NpcId, x: center.x - 3, y: 0, z: center.z, mode: 'walk', hidden: false },
      { id: 'mill_hand' as NpcId, x: center.x, y: 0, z: center.z + 3, mode: 'work', hidden: true },
    ];
    const bandit = { id: 'ford_bandit_a', x: center.x, y: 0, z: center.z - 6, state: 'chase', alive: true, spawn: { kind: 'bandit' as const } };
    const crate = { id: 'camp_crate_0', kind: 'crate' as const, x: center.x + 1, y: 0.3, z: center.z + 1, vx: 0, vy: -6, vz: 0, held: false };
    world.update(0.05, frame(center, { npcs, enemies: [bandit], props: [crate] }));
    const fromBank = (bank: keyof typeof WORLD_AUDIO.banks, clip: string) => {
      const takes = (WORLD_AUDIO.banks[bank].clips as Record<string, readonly (readonly [number, number])[]>)[clip]!;
      return ctx.sources.filter((s) => s.buffer?.file === `bank-${bank}` && takes.some(([o]) => Math.abs(s.started![1]! - o) < 1e-6)).length;
    };
    const steps = () => (['step.grass', 'step.dirt', 'step.gravel', 'step.run'] as const).reduce((n, c) => n + fromBank('steps', c), 0);
    // Walking in place (held at a doorway) makes no footfalls.
    for (let t = 0; t < 2; t += 0.05) world.update(0.05, frame(center, { npcs, enemies: [bandit], props: [crate] }));
    expect(steps()).toBe(0);
    for (let t = 0; t < 30; t += 0.05) {
      // The baker walks a 3 m circle at 1.5 m/s; the toll-jumper runs a 6 m circle at 3.4 m/s until it falls.
      npcs[1]!.x = center.x + 3 * Math.cos(t * 0.5);
      npcs[1]!.z = center.z + 3 * Math.sin(t * 0.5);
      if (t < 9) {
        bandit.x = center.x + 6 * Math.cos(t * 0.57);
        bandit.z = center.z + 6 * Math.sin(t * 0.57);
      }
      bandit.state = t > 2 && t < 2.5 ? 'telegraph' : t >= 2.5 && t < 3 ? 'strike' : t >= 9 ? 'dead' : 'chase';
      bandit.alive = t < 9;
      crate.vy = t < 4 ? -6 : 0;
      world.update(0.05, frame(center, { npcs, enemies: [bandit], props: [crate] }));
    }
    expect(fromBank('people', 'work.chisel')).toBeGreaterThan(3);
    expect(fromBank('people', 'work.sack')).toBe(0);
    expect(fromBank('combat', 'swing')).toBeGreaterThan(0);
    expect(fromBank('combat', 'voice.death')).toBe(1);
    expect(fromBank('world', 'wood.impact')).toBe(1);
    // About 45 m walked at 0.74 m a step, and 30 m run at 1.2 m.
    expect(steps()).toBeGreaterThan(70);
    expect(steps()).toBeLessThan(100);
  });

  it('plays crickets with their own voices at night, a heartbeat when badly wounded, and the inn with the score held back', async () => {
    const { ctx, world } = runtime(9);
    await flush();
    const nightWorld = { ...day(21), nightness: 0.9 };
    const door = { x: INN.x + 8, z: INN.z };
    const takes = (clip: string) => {
      const list = (WORLD_AUDIO.banks.crafted.clips as Record<string, readonly (readonly [number, number])[]>)[clip]!;
      return ctx.sources.filter((s) => s.buffer?.file === 'bank-crafted' && list.some(([o]) => Math.abs(s.started![1]! - o) < 1e-6));
    };
    for (let t = 0; t < 30; t += 0.05) world.update(0.05, frame(door, { world: nightWorld, player: { x: door.x, y: 1, z: door.z, exhausted: false, health: 0.1 } }));
    const chirps = takes('cricket');
    expect(chirps.length).toBeGreaterThan(30);
    expect(new Set(chirps.map((s) => s.started![1])).size).toBeGreaterThan(1);
    const beats = takes('heart').length;
    expect(beats).toBeGreaterThan(45);
    expect(beats).toBeLessThan(65);
    // The inn's tune streams from the inn; the score waits rather than play over it.
    const song = FakeMedia.made.find((m) => m.src.includes('/song-'));
    expect(song).toBeDefined();
    expect(world.musicState.song).not.toBeNull();
    expect(world.musicState.piece).toBeNull();
    expect(FakeMedia.made.some((m) => m.src.includes('/music-'))).toBe(false);
    world.dispose();
    expect(song!.paused).toBe(true);
  });

  it('rings a chosen take when a cue names one: the all-clear peal falls high to low', async () => {
    const { ctx, world } = runtime();
    await flush();
    world.update(0.05, frame(PLACES.rillford));
    for (const i of [0, 1, 2]) world.play(bellCue(true, i));
    const peal = WORLD_AUDIO.banks.crafted.clips['bell.peal'];
    expect(ctx.sources.slice(-3).map((s) => s.started![1])).toEqual(peal.map(([o]) => o));
  });

  it('cleans up partially built graphs when the browser lacks convolution', () => {
    const ctx = new FakeContext() as unknown as { createConvolver?: unknown; nodes: FakeNode[] };
    delete ctx.createConvolver;
    Object.defineProperty(ctx, 'createConvolver', { value: undefined });
    vi.stubGlobal('fetch', vi.fn());
    const bus = () => (ctx as unknown as FakeContext).createGain() as unknown as GainNode;
    const buses = { effects: bus(), ambience: bus(), music: bus(), dialogue: bus() };
    const before = ctx.nodes.length;
    expect(() => new SoundWorld(ctx as unknown as AudioContext, buses, '/')).toThrow();
    expect(ctx.nodes.slice(before).every((n) => n.disconnect.mock.calls.length === 1)).toBe(true);
  });
});

describe('audio engine and the recorded world', () => {
  function engine() {
    const ctx = new FakeContext();
    vi.stubGlobal('window', { AudioContext: vi.fn(function () { return ctx; }), Audio: FakeMedia });
    vi.stubGlobal('Audio', FakeMedia);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({ ok: true, arrayBuffer: async () => ({ file: url }) })));
    const audio = new AudioEngine(defaultSettings);
    return { ctx, audio };
  }

  it('builds nothing for menus and builds the recorded world on the first world frame', async () => {
    const { ctx, audio } = engine();
    audio.updateWorld(0.05, frame(PLACES.rillford));
    expect(audio.diagnostics.world).toBeNull();
    audio.resume();
    const nodes = ctx.nodes.length;
    audio.updateWorld(0.05, null);
    expect(ctx.nodes).toHaveLength(nodes);
    audio.updateWorld(0.05, frame(PLACES.rillford));
    expect(audio.diagnostics.world).not.toBeNull();
    await flush();
    expect(audio.diagnostics.world!.banksReady).toBe(true);
    audio.footstep('grass', false);
    audio.pickup('coin');
    audio.worldEvent('lever');
    expect(ctx.sources.filter((s) => s.buffer?.file?.startsWith('bank-')).length).toBe(4);
    audio.dispose();
    expect(ctx.sources.every((s) => !s.started || s.stopped)).toBe(true);
  });

  it('keeps captions and the menu graph when the recorded world cannot be built', () => {
    const { ctx, audio } = engine();
    Object.defineProperty(ctx, 'createConvolver', { value: undefined });
    audio.resume();
    const caption = vi.fn();
    audio.onCaption = caption;
    expect(() => audio.updateWorld(0.05, frame(PLACES.rillford))).not.toThrow();
    expect(audio.diagnostics.world).toBeNull();
    audio.growl({ x: 0, y: 0, z: 0 });
    audio.shout();
    audio.worldEvent('door', '[The archive door opens]');
    expect(caption.mock.calls.map(([t]) => t)).toEqual(['[A low growl]', '[A rough shout]', '[The archive door opens]']);
    expect(audio.ready).toBe(true);
    audio.dispose();
  });

  it('steps the procedural beds back while recorded beds sound, and restores them for menus', async () => {
    const { ctx, audio } = engine();
    audio.resume();
    const env = { nightness: 0, waterProximity: 1, flow: 1, millNear: 0, millTurning: false, windAmount: 1, quarryNear: 0, quarryWorking: false, time: 0, underRoof: false, seaProximity: 1 };
    const wind = ctx.nodes.filter((n) => n.kind === 'gain')[5] as unknown as { gain: Param };
    audio.update(1, env);
    const full = wind.gain.value;
    audio.updateWorld(0.05, frame(STRAND));
    await flush();
    audio.updateWorld(0.05, frame(STRAND));
    await flush();
    audio.updateWorld(0.05, frame(STRAND));
    ctx.currentTime = 1;
    audio.update(1, { ...env, time: 1 });
    expect(full).toBeCloseTo(ambienceMix(env, 0).wind, 9);
    expect(wind.gain.value).toBeCloseTo(ambienceMix(env, 1).wind * 0.45, 9);
    for (let t = 0; t < 0.2; t += 0.05) audio.updateWorld(0.05, null);
    ctx.currentTime = 2;
    audio.update(1, { ...env, time: 2 });
    expect(wind.gain.value).toBeCloseTo(ambienceMix(env, 2).wind, 9);
    audio.dispose();
  });
});
