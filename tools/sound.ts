/**
 * Developer audition page for Tervain's world sound: every take in the sprites, every game cue as the game layers it,
 * every place bed, piece of score and inn tune (generated and composed), every spoken line and overheard scene, the
 * voiced story dialogue, and a live soundscape for any place, hour and threat, run by the game's own SoundWorld with
 * no world around it.
 *
 *   npm run dev, then open http://127.0.0.1:5173/tools/sound.html   (?mute=1 keeps scripted checks silent)
 *
 * Levels follow the game's default volume settings. Not part of the build.
 */
import { DIALOGUE_STRINGS } from '../src/content/dialogue';
import { ITEMS, itemAction } from '../src/content/items';
import { SCENES, SPEAKER_NAMES, VOICE_LINES, type Speaker } from '../src/content/voice';
import type { ItemId, NpcId } from '../src/game/types';
import { defaultSettings } from '../src/platform/settings';
import { NPC_STYLES } from '../src/presentation/npcStyle';
import { type ClipId } from '../src/presentation/sound/clips';
import { INN } from '../src/presentation/sound/soundscape';
import {
  bellCue, consumeCues, EQUIP, hitCue, landCues, MAP_OPEN, PAGE, pickupCues, SATCHEL_CLOSE, SATCHEL_OPEN, stepCue, swingCue, UNEQUIP,
  workSound, worldCues, type Cue, type SurfaceKind, type WorldAction,
} from '../src/presentation/sound/foley';
import type { Threat } from '../src/presentation/sound/musicDirector';
import { SoundWorld, type SoundFrame } from '../src/presentation/sound/soundWorld';
import { VOICE_AUDIO, type VoiceBank } from '../src/presentation/sound/voiceManifest';
import { WORLD_AUDIO, type LoopId, type MusicId, type SongId } from '../src/presentation/sound/worldAudioManifest';
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
function load(file: string, base: string = WORLD_AUDIO.base): Promise<AudioBuffer> {
  let p = decoded.get(file);
  if (!p) {
    p = fetch(`${BASE}${base}${file}.${ext}`).then((r) => r.arrayBuffer()).then((data) => audio().ctx.decodeAudioData(data));
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
  'outside the inn': { x: INN.x + 9, z: INN.z - 6 },
};
const nightness = (hour: number) => (hour < 5 || hour > 21 ? 1 : hour < 7 ? (7 - hour) / 2 : hour > 19 ? (hour - 19) / 2 : 0);
const ground = { deckAt: () => null, carveAt: () => 0, seaDepth: () => 0, slopeAt: () => 0 } as unknown as SoundFrame['terrain'];

function placeSection() {
  const place = el('select');
  for (const id of Object.keys(SPOTS)) place.append(el('option', { value: id, textContent: id }));
  const hour = el('select');
  for (const [h, label] of [[6.2, 'dawn'], [11, 'day'], [19.5, 'dusk'], [21, 'evening'], [23, 'night'], [3, 'before dawn']] as const) hour.append(el('option', { value: String(h), textContent: label }));
  hour.value = '11';
  const threat = el('select');
  for (const t of ['none', 'alert', 'combat']) threat.append(el('option', { value: t, textContent: `threat: ${t}` }));
  const mill = el('input', { type: 'checkbox', checked: true });
  const quarry = el('input', { type: 'checkbox', checked: true });
  const wounded = el('input', { type: 'checkbox', checked: false });
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
        player: { x: s.x, y: (s.y ?? 2) - 1.6, z: s.z, exhausted: false, health: wounded.checked ? 0.12 : 1 },
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
      meters.textContent = `beds: ${beds.join(', ') || '-'}\ncalls so far: ${w.stats.emitted}   score: ${m.phase} ${m.piece ?? m.loop ?? ''}   inn: ${m.song ?? '-'}`;
    }, 1000 / 30);
  });
  return el('section', {}, el('h2', { textContent: 'A place, live' }),
    el('p', { textContent: 'The game’s own soundscape for a spot: place beds, wildlife calls and the score’s pacing (a piece starts after 8–18 s, then quiet).' }),
    el('div', { className: 'panel' }, el('div', { className: 'row' }, place, hour, threat, el('label', {}, mill, ' mill turning'), el('label', {}, quarry, ' quarry working'), el('label', {}, wounded, ' badly wounded'), toggle), meters));
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
  const peal = (bright: boolean) => {
    for (let i = 0; i < (bright ? 3 : 2); i++) setTimeout(() => cue(bellCue(bright, i)), i * (bright ? 600 : 1400));
  };
  part.append(row('the town bell', button('drought bell', () => peal(false)), button('all-clear peal', () => peal(true)), button('generated bells', () => cue([{ clip: 'bell.big', gain: 0.8 }, { clip: 'bell.small', gain: 0.6, delay: 1.5 }]))));
  part.append(row('crafted life', button('wind chime', () => cue([0, 1, 2, 3].map((k) => ({ clip: 'chime' as ClipId, gain: 0.34, delay: k * 0.3, variant: (k * 2) % 5 })))),
    button('spring bubbles', () => cue([0, 1, 2, 3, 4].map((k) => ({ clip: 'bubble' as ClipId, gain: 0.3, delay: k * 0.15, pitch: 0.12 })))),
    button('crickets', () => cue([0, 1, 2, 3, 4, 5].map((k) => ({ clip: 'cricket' as ClipId, gain: 0.3, delay: k * 0.55, variant: k % 6 })))),
    button('heartbeat', () => cue([0, 1, 2, 3].map((k) => ({ clip: 'heart' as ClipId, gain: 0.6, delay: k * 0.6 })))),
    button('the rite', () => cue(worldCues('rite')))));
  part.append(el('h3', { textContent: 'Fighting' }));
  part.append(row('player', button('swing', () => cue(swingCue(false))), button('heavy swing', () => cue(swingCue(true))), button('hit', () => cue(hitCue('flesh', true))), button('punch', () => cue(hitCue('flesh', false))), button('block', () => cue(hitCue('block', true))), button('parry', () => cue(hitCue('perfect', true))), button('hurt', () => cue({ clip: 'hero.hurt', gain: 0.55 }, 'dialogue')), button('fall', () => cue({ clip: 'hero.death', gain: 0.6 }, 'dialogue')), button('exhausted', () => cue({ clip: 'hero.breath', gain: 0.5 }, 'dialogue'))));
  part.append(row('enemies', button('growl', () => cue({ clip: 'beast.growl', gain: 0.75 })), button('lunge', () => cue({ clip: 'beast.attack', gain: 0.7 })), button('beast hurt', () => cue({ clip: 'beast.hurt', gain: 0.6 })), button('bandit shout', () => cue({ clip: 'bandit.shout', gain: 0.6 }, 'dialogue')), button('bandit hurt', () => cue({ clip: 'voice.hurt', gain: 0.6 }, 'dialogue')), button('bandit fall', () => cue({ clip: 'voice.death', gain: 0.65 }, 'dialogue'))));
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
    const named = 'title' in entry ? ` · ${entry.title}` : '';
    const b = button(`${entry.origin} ${entry.kind} · ${entry.mood}${named} · ${entry.duration.toFixed(1)} s`, async () => {
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

/** The inn's evening tunes, dry of the walls they are heard through in the game. */
function songSection() {
  const part = el('section', {}, el('h2', { textContent: 'The inn' }), el('p', { textContent: 'Lute tunes composed for the inn, played as they leave the instrument; in the world they come through its walls.' }));
  let current: HTMLAudioElement | null = null;
  for (const [id, entry] of Object.entries(WORLD_AUDIO.songs) as [SongId, (typeof WORLD_AUDIO.songs)[SongId]][]) {
    const b = button(`${entry.title} · ${entry.duration.toFixed(1)} s`, () => {
      const playing = current;
      current?.pause();
      current = null;
      for (const other of part.querySelectorAll('button')) other.classList.remove('on');
      if (playing?.dataset.song === id) return;
      const { ctx: c, buses: bs } = audio();
      const media = new Audio(`${BASE}${WORLD_AUDIO.base}${entry.file}.${ext}`);
      media.dataset.song = id;
      c.createMediaElementSource(media).connect(bs.music);
      void media.play();
      current = media;
      b.classList.add('on');
    });
    part.append(row(id, b));
  }
  return part;
}

/* ------------------------------------------------------------------ voices */

let speaking: AudioBufferSourceNode[] = [];
/** Plays lines one after another, a breath apart, as the game paces an exchange; a new press stops the last. */
async function speak(lines: readonly (readonly [VoiceBank, number, number, string])[]) {
  for (const s of speaking) s.stop();
  speaking = [];
  const { ctx: c, buses: b } = audio();
  const buffers = await Promise.all(lines.map(([bank]) => load(VOICE_AUDIO.banks[bank].file, VOICE_AUDIO.base)));
  let at = c.currentTime + 0.05;
  lines.forEach(([, offset, length], i) => {
    const s = c.createBufferSource();
    s.buffer = buffers[i]!;
    s.connect(b.dialogue);
    s.start(at, offset, length);
    speaking.push(s);
    at += length + 0.35;
  });
}

const who = (speaker: Speaker) => (speaker === 'hero' ? 'The hero' : SPEAKER_NAMES[speaker]);

/** Every spoken line by speaker, the scenes people play out between themselves, and the voiced story dialogue. */
function voiceSection() {
  const part = el('section', {}, el('h2', { textContent: 'Voices' }),
    el('p', { textContent: 'Every line as recorded, centred and dry (in the game residents speak from where they stand). Words in brackets are delivery directions; the game does not show them.' }));
  const line = (id: string, text: string, entry: readonly [VoiceBank, number, number, string]) =>
    el('div', { className: 'row' }, el('span', { className: 'name', textContent: id }), button(`${entry[2].toFixed(1)} s`, () => void speak([entry])), el('span', { className: 'words', textContent: text }));
  const bySpeaker = new Map<Speaker, string[]>();
  for (const [id, l] of Object.entries(VOICE_LINES)) bySpeaker.set(l.speaker, [...(bySpeaker.get(l.speaker) ?? []), id]);
  for (const [speaker, ids] of bySpeaker) {
    part.append(el('h3', { textContent: `${who(speaker)}: ${ids.length} lines` }));
    for (const id of ids) part.append(line(id, VOICE_LINES[id]!.text, VOICE_AUDIO.lines[id as keyof typeof VOICE_AUDIO.lines]));
  }
  part.append(el('h3', { textContent: 'Overheard scenes, played through' }));
  for (const scene of SCENES) {
    const lines = scene.lines.map((id) => VOICE_AUDIO.lines[id as keyof typeof VOICE_AUDIO.lines]);
    const seconds = lines.reduce((n, l) => n + l[2] + 0.35, 0);
    part.append(row(scene.id, button(`${scene.cast.map((n) => who(n)).join(' and ')}, ${seconds.toFixed(0)} s`, () => void speak(lines))));
  }
  const story = el('details', {}, el('summary', { textContent: `Story dialogue: ${Object.keys(VOICE_AUDIO.story).length} keys, voiced for a future conversation window` }));
  for (const [key, entry] of Object.entries(VOICE_AUDIO.story)) story.append(line(key, `${who(entry[3] as Speaker)}: ${DIALOGUE_STRINGS[key] ?? ''}`, entry));
  part.append(story);
  return part;
}

app.append(placeSection(), cueSection(), voiceSection(), bedSection(), scoreSection(), songSection(), takeSection());
const clips = Object.values(WORLD_AUDIO.banks).reduce((n, b) => n + Object.values(b.clips).reduce((m, v) => m + v.length, 0), 0);
status.textContent = `${Object.keys(WORLD_AUDIO.banks).length} sprite banks with ${clips} takes, ${Object.keys(WORLD_AUDIO.loops).length} beds, ${Object.keys(WORLD_AUDIO.music).length} pieces of score, ${Object.keys(WORLD_AUDIO.songs).length} inn tunes, ${Object.keys(VOICE_AUDIO.lines).length} spoken lines, ${Object.keys(VOICE_AUDIO.story).length} story keys · ${ext === 'ogg' ? 'Ogg Opus' : 'AAC'} · default levels (master ${volumes.master}, music ${volumes.music}, effects ${volumes.effects}, ambience ${volumes.ambience})`;
