/**
 * Developer audition page for Tervain's world sound: every take in the sprites, every game cue as the game layers it,
 * every place bed and piece of score, and a live soundscape for any place, hour and threat, run by the game's own
 * SoundWorld with no world around it.
 *
 *   npm run dev, then open http://127.0.0.1:5173/tools/sound.html   (?mute=1 keeps scripted checks silent)
 *
 * Levels follow the game's default volume settings. Not part of the build.
 */
import { ITEMS, itemAction } from '../src/content/items';
import type { ItemId, NpcId } from '../src/game/types';
import { defaultSettings } from '../src/platform/settings';
import { NPC_STYLES } from '../src/presentation/npcStyle';
import { type ClipId } from '../src/presentation/sound/clips';
import {
  consumeCues, EQUIP, hitCue, landCues, MAP_OPEN, PAGE, pickupCues, SATCHEL_CLOSE, SATCHEL_OPEN, stepCue, swingCue, UNEQUIP,
  workSound, worldCues, type Cue, type SurfaceKind, type WorldAction,
} from '../src/presentation/sound/foley';
import type { Threat } from '../src/presentation/sound/musicDirector';
import { SoundWorld, type SoundFrame } from '../src/presentation/sound/soundWorld';
import { WORLD_AUDIO, type LoopId, type MusicId } from '../src/presentation/sound/worldAudioManifest';
import { PLACES, RITE_ALTAR } from '../src/world/layout';

const app = document.getElementById('app')!;
const status = document.getElementById('status')!;
const volumes = defaultSettings().volumes;
const BASE = import.meta.env.BASE_URL;
const ext = new Audio().canPlayType('audio/ogg; codecs="opus"') ? 'ogg' : 'm4a';

let ctx: AudioContext | null = null;
let buses: { effects: GainNode; ambience: GainNode; music: GainNode; dialogue: GainNode } | null = null;
let world: SoundWorld | null = null;

/** The first press creates the audio graph (browsers need a gesture), with the game's default levels. */
function audio() {
  if (!ctx) {
    ctx = new AudioContext({ latencyHint: 'interactive' });
    const master = ctx.createGain();
    master.gain.value = new URLSearchParams(location.search).has('mute') ? 0 : volumes.master;
    master.connect(ctx.destination);
    const bus = (v: number) => {
      const g = ctx!.createGain();
      g.gain.value = v;
      g.connect(master);
      return g;
    };
    buses = { effects: bus(volumes.effects), ambience: bus(volumes.ambience), music: bus(volumes.music), dialogue: bus(volumes.dialogue) };
    world = new SoundWorld(ctx, buses, BASE);
  }
  void ctx.resume();
  return { ctx, buses: buses!, world: world! };
}

const decoded = new Map<string, Promise<AudioBuffer>>();
function load(file: string): Promise<AudioBuffer> {
  let p = decoded.get(file);
  if (!p) {
    p = fetch(`${BASE}${WORLD_AUDIO.base}${file}.${ext}`).then((r) => r.arrayBuffer()).then((data) => audio().ctx.decodeAudioData(data));
    decoded.set(file, p);
  }
  return p;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...children);
  return e;
}
const button = (label: string, onclick: () => void) => el('button', { onclick, textContent: label, type: 'button' });
const row = (name: string, ...items: Node[]) => el('div', { className: 'row' }, el('span', { className: 'name', textContent: name }), ...items);

/** A cue or a layered action exactly as the game plays it (variant choice, pitch and level jitter, reverb). */
function cue(cues: Cue | readonly Cue[], bus: 'effects' | 'dialogue' = 'effects') {
  const { world: w } = audio();
  w.playAll(Array.isArray(cues) ? cues : [cues as Cue], { bus, reverb: 0.08 });
}

/* ------------------------------------------------------------------ a place, live */

const SPOTS: Record<string, { x: number; z: number; y?: number; indoors?: boolean }> = {
  ...Object.fromEntries(Object.entries(PLACES).map(([id, p]) => [id, { x: p.x, z: p.z }])),
  'archive (inside)': { ...PLACES.archive, indoors: true },
  'mill wheel': { x: -14, z: 0 },
  'spring altar': { x: RITE_ALTAR.x, z: RITE_ALTAR.z + 3 },
  'lighthouse gallery': { x: -319, z: 104, y: 14 },
};
const nightness = (hour: number) => (hour < 5 || hour > 21 ? 1 : hour < 7 ? (7 - hour) / 2 : hour > 19 ? (hour - 19) / 2 : 0);
const ground = { deckAt: () => null, carveAt: () => 0, seaDepth: () => 0, slopeAt: () => 0 } as unknown as SoundFrame['terrain'];

function placeSection() {
  const place = el('select');
  for (const id of Object.keys(SPOTS)) place.append(el('option', { value: id, textContent: id }));
  const hour = el('select');
  for (const [h, label] of [[6.2, 'dawn'], [11, 'day'], [19.5, 'dusk'], [23, 'night']] as const) hour.append(el('option', { value: String(h), textContent: label }));
  hour.value = '11';
  const threat = el('select');
  for (const t of ['none', 'alert', 'combat']) threat.append(el('option', { value: t, textContent: `threat: ${t}` }));
  const mill = el('input', { type: 'checkbox', checked: true });
  const quarry = el('input', { type: 'checkbox', checked: true });
  const meters = el('div', { id: 'meters' });
  let timer: ReturnType<typeof setInterval> | null = null;
  const toggle = button('Listen', () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      world?.update(0.05, null);
      toggle.classList.remove('on');
      toggle.textContent = 'Listen';
      return;
    }
    const { world: w } = audio();
    toggle.classList.add('on');
    toggle.textContent = 'Stop';
    let last = performance.now();
    timer = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = SPOTS[place.value]!;
      const h = Number(hour.value);
      const frame: SoundFrame = {
        mode: 'play',
        listener: { x: s.x, y: s.y ?? 2, z: s.z, fx: 0, fy: 0, fz: 1 },
        player: { x: s.x, y: (s.y ?? 2) - 1.6, z: s.z, exhausted: false },
        world: { hour: h, nightness: nightness(h), flows: { main: 0.8, village: 0.5, quarry: 0.4 }, millTurning: mill.checked, quarryWorking: quarry.checked },
        indoors: !!s.indoors,
        threat: threat.value as Threat,
        npcs: [],
        enemies: [],
        props: [],
        terrain: ground,
      };
      w.update(dt, frame);
      const beds = [...(w as unknown as { beds: Map<LoopId, { source: unknown; gain: GainNode }> }).beds.entries()]
        .filter(([, b]) => b.source && b.gain.gain.value > 0.01)
        .map(([id, b]) => `${id} ${b.gain.gain.value.toFixed(2)}`);
      const m = w.musicState;
      meters.textContent = `beds: ${beds.join(', ') || '-'}\ncalls so far: ${w.stats.emitted}   score: ${m.phase} ${m.piece ?? m.loop ?? ''}`;
    }, 1000 / 30);
  });
  return el('section', {}, el('h2', { textContent: 'A place, live' }),
    el('p', { textContent: 'The game’s own soundscape for a spot: place beds, wildlife calls and the score’s pacing (a piece starts after 8–18 s, then quiet).' }),
    el('div', { className: 'panel' }, el('div', { className: 'row' }, place, hour, threat, el('label', {}, mill, ' mill turning'), el('label', {}, quarry, ' quarry working'), toggle), meters));
}

/* ------------------------------------------------------------------ game cues */

function cueSection() {
  const surfaces: SurfaceKind[] = ['grass', 'road', 'stone', 'sand', 'water', 'deck'];
  const actions: WorldAction[] = ['door', 'gate', 'lever', 'shutter', 'sluice', 'sluice_jam', 'surge', 'rite'];
  const items = Object.keys(ITEMS) as ItemId[];
  const part = el('section', {}, el('h2', { textContent: 'Game cues, layered as in play' }));
  part.append(el('h3', { textContent: 'Feet' }));
  for (const s of surfaces) part.append(row(s, button('walk', () => cue(stepCue(s, false))), button('run', () => cue(stepCue(s, true))), button('land', () => cue(landCues(s, 8)))));
  part.append(el('h3', { textContent: 'Items' }));
  for (const item of items) {
    const buttons = [button('pick up', () => cue(pickupCues(item)))];
    if (itemAction(item) === 'consume') buttons.push(button('use', () => cue(consumeCues(item))));
    part.append(row(item, ...buttons));
  }
  part.append(row('hands', button('draw', () => cue(EQUIP)), button('sheathe', () => cue(UNEQUIP)), button('satchel open', () => cue(SATCHEL_OPEN)), button('satchel close', () => cue(SATCHEL_CLOSE)), button('page', () => cue(PAGE)), button('map', () => cue(MAP_OPEN))));
  part.append(el('h3', { textContent: 'The world' }));
  part.append(row('moving parts', ...actions.map((a) => button(a, () => cue(worldCues(a))))));
  part.append(row('bell', button('drought bell', () => cue({ clip: 'bell.big', gain: 0.8 })), button('all clear', () => cue({ clip: 'bell.small', gain: 0.8 }))));
  part.append(el('h3', { textContent: 'Fighting' }));
  part.append(row('player', button('swing', () => cue(swingCue(false))), button('heavy swing', () => cue(swingCue(true))), button('hit', () => cue(hitCue('flesh', true))), button('punch', () => cue(hitCue('flesh', false))), button('block', () => cue(hitCue('block', true))), button('parry', () => cue(hitCue('perfect', true))), button('hurt', () => cue({ clip: 'voice.hurt', gain: 0.55 }, 'dialogue')), button('fall', () => cue({ clip: 'voice.death', gain: 0.6 }, 'dialogue'))));
  part.append(row('enemies', button('growl', () => cue({ clip: 'beast.growl', gain: 0.75 })), button('lunge', () => cue({ clip: 'beast.attack', gain: 0.7 })), button('beast hurt', () => cue({ clip: 'beast.hurt', gain: 0.6 })), button('bandit shout', () => cue({ clip: 'bandit.shout', gain: 0.6 }, 'dialogue'))));
  part.append(el('h3', { textContent: 'Residents at work (one stroke)' }));
  for (const [id, style] of Object.entries(NPC_STYLES) as [NpcId, (typeof NPC_STYLES)[NpcId]][]) {
    const w = workSound(id, style.work);
    part.append(row(id, w ? button(`${style.work}: ${w.clip}`, () => cue({ clip: w.clip, gain: w.gain })) : el('span', { textContent: `${style.work}: silent` })));
  }
  return part;
}

/* ------------------------------------------------------------------ every take, bed and piece */

function takeSection() {
  const part = el('section', {}, el('h2', { textContent: 'Every take' }), el('p', { textContent: 'Each variant cut from the generations, at its prepared level.' }));
  for (const [bank, entry] of Object.entries(WORLD_AUDIO.banks)) {
    part.append(el('h3', { textContent: `${bank} (${entry.file})` }));
    for (const [clip, variants] of Object.entries(entry.clips) as [ClipId, readonly (readonly [number, number])[]][]) {
      part.append(row(clip, ...variants.map(([at, len], i) => button(`${i + 1} · ${len.toFixed(2)} s`, async () => {
        const { ctx: c, buses: b } = audio();
        const buffer = await load(entry.file);
        const s = c.createBufferSource();
        s.buffer = buffer;
        s.connect(b.effects);
        s.start(c.currentTime, at, len);
      }))));
    }
  }
  return part;
}

function bedSection() {
  const part = el('section', {}, el('h2', { textContent: 'Place beds' }), el('p', { textContent: 'Each loop alone at full level; listen across the seam.' }));
  const playing = new Map<LoopId, AudioBufferSourceNode>();
  for (const [id, entry] of Object.entries(WORLD_AUDIO.loops) as [LoopId, (typeof WORLD_AUDIO.loops)[LoopId]][]) {
    const b = button(`${entry.duration.toFixed(1)} s ${entry.channels === 1 ? 'mono, placed' : 'stereo'}`, async () => {
      const on = playing.get(id);
      if (on) {
        on.stop();
        playing.delete(id);
        b.classList.remove('on');
        return;
      }
      const { ctx: c, buses: bs } = audio();
      const s = c.createBufferSource();
      s.buffer = await load(entry.file);
      s.loop = true;
      s.connect(bs.ambience);
      // Start near the end, so the seam is heard within a few seconds.
      s.start(c.currentTime, Math.max(0, entry.duration - 4));
      playing.set(id, s);
      b.classList.add('on');
    });
    part.append(row(id, b));
  }
  return part;
}

function scoreSection() {
  const part = el('section', {}, el('h2', { textContent: 'Score' }), el('p', { textContent: 'Pieces stream as in play; the danger and battle loops repeat; stings play once.' }));
  let current: { stop(): void; b: HTMLButtonElement } | null = null;
  for (const [id, entry] of Object.entries(WORLD_AUDIO.music) as [MusicId, (typeof WORLD_AUDIO.music)[MusicId]][]) {
    const b = button(`${entry.kind} · ${entry.mood} · ${entry.duration.toFixed(1)} s`, async () => {
      const was = current;
      current?.stop();
      if (was?.b === b) return;
      const { ctx: c, buses: bs } = audio();
      if (entry.kind === 'piece') {
        const media = new Audio(`${BASE}${WORLD_AUDIO.base}${entry.file}.${ext}`);
        c.createMediaElementSource(media).connect(bs.music);
        void media.play();
        current = { b, stop: () => { media.pause(); b.classList.remove('on'); current = null; } };
      } else {
        const s = c.createBufferSource();
        s.buffer = await load(entry.file);
        s.loop = entry.kind === 'loop';
        s.connect(bs.music);
        s.start();
        s.onended = () => b.classList.remove('on');
        current = { b, stop: () => { try { s.stop(); } catch { /* ended */ } b.classList.remove('on'); current = null; } };
      }
      b.classList.add('on');
    });
    part.append(row(id, b));
  }
  return part;
}

app.append(placeSection(), cueSection(), bedSection(), scoreSection(), takeSection());
const clips = Object.values(WORLD_AUDIO.banks).reduce((n, b) => n + Object.values(b.clips).reduce((m, v) => m + v.length, 0), 0);
status.textContent = `${Object.keys(WORLD_AUDIO.banks).length} sprite banks with ${clips} takes, ${Object.keys(WORLD_AUDIO.loops).length} beds, ${Object.keys(WORLD_AUDIO.music).length} pieces of score · ${ext === 'ogg' ? 'Ogg Opus' : 'AAC'} · default levels (master ${volumes.master}, music ${volumes.music}, effects ${volumes.effects}, ambience ${volumes.ambience})`;
