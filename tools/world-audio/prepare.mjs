#!/usr/bin/env node
/**
 * Prepare Tervain's world audio from the archived ElevenLabs generations.
 *
 *   node tools/world-audio/prepare.mjs            (needs FFmpeg with libopus on PATH)
 *
 * Reads the unchanged generations in assets/audio/source/world/ and the processing plan in tools/world-audio/plan.json,
 * then writes:
 *   - public/assets/audio/world/bank-*.{ogg,m4a}   one-shot sprites: every variant sliced from a source, trimmed,
 *                                                  loudness-matched and faded, laid end to end with short gaps;
 *   - public/assets/audio/world/loop-*.{ogg,m4a}   ambience loops with an equal-power crossfaded seam;
 *   - public/assets/audio/world/music-*.{ogg,m4a}  score pieces, loops and stings;
 *   - public/assets/audio/world/song-*.{ogg,m4a}   the inn's evening tunes;
 *   - src/presentation/sound/worldAudioManifest.ts the offsets and durations the game plays from;
 *   - docs/engineering/world-audio-assets.json     provenance: prompts, source hashes and derivative hashes;
 *   - public/assets/audio/voice/voice-*.{ogg,m4a}  each speaker's lines end to end (src/content/voice.ts), from the
 *                                                  generated takes in assets/audio/source/voice/ and their record in
 *                                                  tools/world-audio/voices.json;
 *   - src/presentation/sound/voiceManifest.ts      where each line sits in its speaker's sprite;
 *   - docs/engineering/voice-assets.json           the voices' designs, every line's text and hashes.
 * It also renders the crafted half (tools/world-audio/compose/): music composed and instruments synthesized in code,
 * and the sounds crafted for the world (the town bell, chimes, crickets, bubbles, a heartbeat, the rite).
 * Ogg Opus is the primary format; AAC in MP4 is the fallback for browsers without Opus, as for the menu score.
 * Everything is deterministic for a given FFmpeg build.
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMPOSED, LOOP_XFADE } from './compose/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = path.join(ROOT, 'assets/audio/source/world');
const OUT = path.join(ROOT, 'public/assets/audio/world');
const MANIFEST = path.join(ROOT, 'src/presentation/sound/worldAudioManifest.ts');
const PROVENANCE = path.join(ROOT, 'docs/engineering/world-audio-assets.json');
const VOICE_SOURCE = path.join(ROOT, 'assets/audio/source/voice');
const VOICE_OUT = path.join(ROOT, 'public/assets/audio/voice');
const VOICE_MANIFEST = path.join(ROOT, 'src/presentation/sound/voiceManifest.ts');
const VOICE_PROVENANCE = path.join(ROOT, 'docs/engineering/voice-assets.json');
const voicePlan = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/world-audio/voices.json'), 'utf8'));
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/world-audio/plan.json'), 'utf8'));
const RATE = 48000;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tervain-world-audio-'));

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const dbToGain = (db) => 10 ** (db / 20);
const gainToDb = (g) => 20 * Math.log10(Math.max(g, 1e-12));

/** Decode to planar float channels at 48 kHz. */
function decode(file, channels) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', String(channels), '-ar', String(RATE), '-'], { maxBuffer: 1 << 30 });
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const n = all.length / channels;
  const out = Array.from({ length: channels }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) out[c][i] = all[i * channels + c];
  return out;
}

function writeWav(file, chans) {
  const n = chans[0].length;
  const ch = chans.length;
  const buf = Buffer.alloc(44 + n * ch * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * ch * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(3, 20); // IEEE float
  buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * ch * 4, 28);
  buf.writeUInt16LE(ch * 4, 32);
  buf.writeUInt16LE(32, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * ch * 4, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { buf.writeFloatLE(chans[c][i], o); o += 4; }
  fs.writeFileSync(file, buf);
}

/** Encode Opus (primary) and AAC (fallback); returns the two derivative records. */
function encode(chans, stem, kbps, dir = OUT, application = 'audio') {
  const wav = path.join(TMP, `${stem}.wav`);
  writeWav(wav, chans);
  const ogg = path.join(dir, `${stem}.ogg`);
  const m4a = path.join(dir, `${stem}.m4a`);
  const ch = chans.length;
  // Bit-exact muxing keeps Ogg serial numbers and MP4 timestamps fixed, so a rerun reproduces the same files.
  const exact = ['-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1'];
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'libopus', '-b:a', `${kbps * ch}k`, '-vbr', 'on', '-application', application, ...exact, ogg]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', `${Math.round(kbps * 1.25) * ch}k`, '-movflags', '+faststart', ...exact, m4a]);
  return [ogg, m4a].map((f) => ({ path: path.relative(ROOT, f).replace(/\\/g, '/'), bytes: fs.statSync(f).size, sha256: sha256(f) }));
}

/* ------------------------------------------------------------------ analysis */

function mono(chans) {
  if (chans.length === 1) return chans[0];
  const m = new Float32Array(chans[0].length);
  for (let i = 0; i < m.length; i++) {
    let s = 0;
    for (const c of chans) s += c[i];
    m[i] = s / chans.length;
  }
  return m;
}

/** Short-term level in dB, one value per hop. */
function envelopeDb(m, hop = 128, win = 512) {
  const frames = Math.max(1, Math.floor((m.length - win) / hop) + 1);
  const e = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    for (let i = f * hop; i < f * hop + win && i < m.length; i++) s += m[i] * m[i];
    e[f] = 10 * Math.log10(s / win + 1e-18);
  }
  return e;
}

function percentile(arr, p) {
  const s = Array.from(arr).sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor((p / 100) * s.length)))];
}

/** Separate events: rises well above the clip's floor, merged when closer than mergeMs. Returns sample ranges. */
function events(m, opt) {
  const hop = 128;
  const e = envelopeDb(m, hop);
  const floor = percentile(e, 20);
  const peak = Math.max(...e);
  const thr = floor + (opt.threshold ?? 0.45) * (peak - floor);
  const raw = [];
  let start = -1;
  for (let i = 0; i < e.length; i++) {
    if (start < 0 && e[i] > thr) start = i;
    else if (start >= 0 && e[i] < thr - 6) {
      raw.push([start, i]);
      start = -1;
    }
  }
  if (start >= 0) raw.push([start, e.length - 1]);
  // Extend each to where its rise began and its tail settles near the floor.
  const ext = raw.map(([s, t]) => {
    let a = s;
    while (a > 0 && e[a - 1] < e[a] && e[a - 1] > floor + 3) a--;
    let b = t;
    const tailFloor = floor + (opt.tailDb ?? 6);
    while (b < e.length - 1 && e[b + 1] > tailFloor) b++;
    let pk = -Infinity;
    for (let i = s; i <= t; i++) pk = Math.max(pk, e[i]);
    return { a, b, pk };
  });
  const merged = [];
  const mergeFrames = Math.round(((opt.mergeMs ?? 80) / 1000) * RATE / hop);
  for (const ev of ext) {
    const last = merged[merged.length - 1];
    if (last && ev.a <= last.b + mergeFrames) {
      last.b = Math.max(last.b, ev.b);
      last.pk = Math.max(last.pk, ev.pk);
    } else merged.push({ ...ev });
  }
  const maxLen = Math.round((opt.maxSeconds ?? 3) * RATE / hop);
  return merged
    .filter((ev) => ev.pk > peak - (opt.keepWithinDb ?? 18))
    .map((ev) => ({ start: Math.max(0, ev.a * hop - Math.round(0.006 * RATE)), end: Math.min(m.length, Math.min(ev.b, ev.a + maxLen) * hop + 512), pk: ev.pk }));
}

/** The span between the first and last frames above the floor by a margin (silence trimmed). */
function activeSpan(m, marginDb = 40) {
  const hop = 128;
  const e = envelopeDb(m, hop);
  const peak = Math.max(...e);
  let a = 0;
  while (a < e.length - 1 && e[a] < peak - marginDb) a++;
  let b = e.length - 1;
  while (b > a && e[b] < peak - marginDb) b--;
  return { start: Math.max(0, a * hop - 256), end: Math.min(m.length, (b + 1) * hop + 512) };
}

/** RMS over the louder half of short frames: the level of the sound itself, not of its pauses. */
function activeRmsDb(chans) {
  const m = mono(chans);
  const e = envelopeDb(m, 256, 1024);
  const sorted = Array.from(e).sort((x, y) => y - x);
  const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  const p = top.reduce((s, v) => s + 10 ** (v / 10), 0) / top.length;
  return 10 * Math.log10(p + 1e-18);
}

function peakOf(chans) {
  let p = 0;
  for (const c of chans) for (let i = 0; i < c.length; i++) p = Math.max(p, Math.abs(c[i]));
  return p;
}

/** Scale to a target level, never past -1 dBFS peak. */
function normalize(chans, targetDb) {
  const level = activeRmsDb(chans);
  let gain = dbToGain(targetDb - level);
  const peak = peakOf(chans) * gain;
  if (peak > dbToGain(-1)) gain *= dbToGain(-1) / peak;
  for (const c of chans) for (let i = 0; i < c.length; i++) c[i] *= gain;
  return { gainDb: Math.round(gainToDb(gain) * 10) / 10, levelDb: Math.round(level * 10) / 10 };
}

function fade(chans, inS, outS) {
  const n = chans[0].length;
  const fi = Math.min(n, Math.round(inS * RATE));
  const fo = Math.min(n, Math.round(outS * RATE));
  for (const c of chans) {
    for (let i = 0; i < fi; i++) c[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fi);
    for (let i = 0; i < fo; i++) c[n - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fo);
  }
}

const slice = (chans, a, b) => chans.map((c) => c.slice(a, b));

/** Remove DC so slices and loops start and end at rest. */
function dcRemove(chans) {
  for (const c of chans) {
    let s = 0;
    for (let i = 0; i < c.length; i++) s += c[i];
    const mean = s / c.length;
    for (let i = 0; i < c.length; i++) c[i] -= mean;
  }
}

/** Fold the tail into the head with an equal-power crossfade: the result loops without a seam. */
function loopCrossfade(chans, seconds) {
  const n = chans[0].length;
  const x = Math.min(Math.floor(n / 3), Math.round(seconds * RATE));
  return chans.map((c) => {
    const out = new Float32Array(n - x);
    for (let i = 0; i < x; i++) {
      const t = (i + 0.5) / x;
      out[i] = c[i] * Math.sin((Math.PI / 2) * t) + c[n - x + i] * Math.cos((Math.PI / 2) * t);
    }
    out.set(c.subarray(x, n - x), x);
    return out;
  });
}

/* ------------------------------------------------------------------ preparation */

fs.mkdirSync(OUT, { recursive: true });
const banks = {};
const loops = {};
const music = {};
const songs = {};
const provenance = [];

for (const item of plan.sources) {
  const file = path.join(SOURCE, `${item.id}.mp3`);
  if (!fs.existsSync(file)) throw new Error(`missing source ${item.id}`);
  const use = item.use;
  const channels = use.channels ?? (use.type === 'slices' || use.type === 'whole' ? 1 : 2);
  // A generated loop or piece can be cut to its steady part first (a take that fades out at its end, say).
  let chans = decode(file, channels);
  if (use.trim) chans = slice(chans, Math.round(use.trim[0] * RATE), Math.round(use.trim[1] * RATE));
  dcRemove(chans);
  const record = { id: item.id, prompt: item.prompt, seconds: item.seconds, loop: item.loop, promptInfluence: item.promptInfluence, model: item.model, from: item.from, voice: item.voice, generated: item.generated, source: { path: path.relative(ROOT, file).replace(/\\/g, '/'), bytes: fs.statSync(file).size, sha256: sha256(file) }, use: { ...use } };

  if (use.type === 'slices' || use.type === 'whole') {
    const m = mono(chans);
    let ranges;
    if (use.ranges) ranges = use.ranges.map(([a, b]) => ({ start: Math.round(a * RATE), end: Math.round(b * RATE) }));
    else if (use.type === 'whole') ranges = [activeSpan(m, use.marginDb ?? 45)];
    else ranges = events(m, use);
    // Fragments shorter than a real event (a stray click between steps) are not variants.
    ranges = ranges.filter((r) => r.end - r.start >= (use.minSeconds ?? 0.09) * RATE);
    if (use.max && ranges.length > use.max) {
      // Keep the strongest, in their original order.
      const keep = new Set([...ranges].sort((p, q) => q.pk - p.pk).slice(0, use.max));
      ranges = ranges.filter((r) => keep.has(r));
    }
    if (!ranges.length) throw new Error(`${item.id}: no events found`);
    const clips = ranges.map((r) => {
      const c = slice(chans, r.start, r.end);
      normalize(c, use.targetDb ?? -20);
      fade(c, use.fadeIn ?? 0.004, Math.min(use.fadeOut ?? 0.04, (r.end - r.start) / RATE / 3));
      return c;
    });
    const bank = (banks[use.bank] ??= { clips: {}, parts: [] });
    bank.clips[use.name] = clips;
    record.use.variants = clips.length;
    record.use.spans = ranges.map((r) => [+(r.start / RATE).toFixed(3), +(r.end / RATE).toFixed(3)]);
  } else if (use.type === 'loop' || use.type === 'musicLoop') {
    const c = loopCrossfade(chans, use.crossfade ?? 0.35);
    const lv = normalize(c, use.targetDb ?? -24);
    const stem = use.type === 'loop' ? `loop-${use.name}` : `music-${use.name}`;
    const derivatives = encode(c, stem, use.kbps ?? 48);
    const entry = { file: stem, duration: +(c[0].length / RATE).toFixed(4), channels: c.length, sourceLevelDb: lv.levelDb };
    if (use.type === 'loop') loops[use.name] = entry;
    else music[use.name] = { ...entry, kind: 'loop', mood: use.mood, origin: 'generated' };
    record.derivatives = derivatives;
  } else if (use.type === 'piece' || use.type === 'sting') {
    const m = mono(chans);
    const span = activeSpan(m, use.marginDb ?? 50);
    const c = slice(chans, span.start, span.end);
    const lv = normalize(c, use.targetDb ?? -20);
    fade(c, use.fadeIn ?? 0.03, use.fadeOut ?? 1.5);
    const stem = `music-${use.name}`;
    record.derivatives = encode(c, stem, use.kbps ?? 48);
    music[use.name] = { file: stem, duration: +(c[0].length / RATE).toFixed(4), channels: c.length, kind: use.type, mood: use.mood, sourceLevelDb: lv.levelDb, origin: 'generated' };
  } else if (use.type === 'song') {
    // A sung song for the inn, heard through its walls like the lute tunes.
    const span = activeSpan(mono(chans), use.marginDb ?? 50);
    const c = slice(chans, span.start, span.end);
    const lv = normalize(c, use.targetDb ?? -22);
    fade(c, 0.02, 1.5);
    const stem = `song-${use.name}`;
    record.derivatives = encode(c, stem, use.kbps ?? 56);
    songs[use.name] = { file: stem, duration: +(c[0].length / RATE).toFixed(4), channels: c.length, title: use.title, sourceLevelDb: lv.levelDb };
  } else throw new Error(`${item.id}: unknown use ${use.type}`);
  provenance.push(record);
}

/** A loop whose head and tail are the same music (a composed loop): a linear crossfade keeps the level even. */
function linearLoop(chans, seconds) {
  const n = chans[0].length;
  const x = Math.round(seconds * RATE);
  return chans.map((c) => {
    const out = new Float32Array(n - x);
    for (let i = 0; i < x; i++) {
      const t = (i + 0.5) / x;
      out[i] = c[i] * t + c[n - x + i] * (1 - t);
    }
    out.set(c.subarray(x, n - x), x);
    return out;
  });
}

const pcmHash = (chans) => {
  const h = crypto.createHash('sha256');
  for (const c of chans) h.update(Buffer.from(c.buffer, c.byteOffset, c.byteLength));
  return h.digest('hex');
};

// The crafted half: composed and synthesized in code; the render is the source.
const composed = [];
for (const item of COMPOSED) {
  const use = item.use;
  const rendered = item.render();
  const record = { id: item.id, title: item.title, render: `tools/world-audio/compose/index.mjs#${item.id}`, use: { ...use } };
  if (use.type === 'variants') {
    record.pcmSha256 = pcmHash(rendered);
    const clips = rendered.map((v) => {
      const c = [Float32Array.from(v)];
      dcRemove(c);
      const span = activeSpan(c[0], 70);
      const cut = slice(c, Math.max(0, span.start - Math.round(0.002 * RATE)), span.end);
      normalize(cut, use.targetDb ?? -20);
      fade(cut, 0.001, Math.min(0.25, (cut[0].length / RATE) / 4));
      return cut;
    });
    const bank = (banks[use.bank] ??= { clips: {}, parts: [] });
    bank.clips[use.name] = clips;
    record.use.variants = clips.length;
  } else if (use.type === 'loop') {
    record.pcmSha256 = pcmHash(rendered);
    const c = linearLoop(rendered, LOOP_XFADE);
    const lv = normalize(c, use.targetDb ?? -20);
    const stem = `music-${item.id}`;
    record.derivatives = encode(c, stem, use.kbps ?? 48);
    music[item.id] = { file: stem, duration: +(c[0].length / RATE).toFixed(4), channels: c.length, kind: 'loop', mood: use.mood, sourceLevelDb: lv.levelDb, origin: 'composed', title: item.title };
  } else if (use.type === 'piece' || use.type === 'sting' || use.type === 'song') {
    record.pcmSha256 = pcmHash(rendered);
    const m = mono(rendered);
    const span = activeSpan(m, 60);
    const c = slice(rendered, 0, span.end);
    const lv = normalize(c, use.targetDb ?? (use.type === 'song' ? -22 : -21));
    fade(c, 0.005, Math.min(1.5, (c[0].length / RATE) / 8));
    if (use.type === 'song') {
      const stem = `song-${item.id}`;
      record.derivatives = encode(c, stem, use.kbps ?? 56);
      songs[item.id] = { file: stem, duration: +(c[0].length / RATE).toFixed(4), channels: c.length, title: item.title, sourceLevelDb: lv.levelDb };
    } else {
      const stem = `music-${item.id}`;
      // Opus at 96 kbit/s stereo is transparent for these sparse textures.
      record.derivatives = encode(c, stem, use.kbps ?? 48);
      music[item.id] = { file: stem, duration: +(c[0].length / RATE).toFixed(4), channels: c.length, kind: use.type, mood: use.mood, sourceLevelDb: lv.levelDb, origin: 'composed', title: item.title };
    }
  } else throw new Error(`${item.id}: unknown composed use ${use.type}`);
  composed.push(record);
}

// Sprites: each bank's variants end to end with 60 ms of silence between, so playback never bleeds into a neighbour.
const bankEntries = {};
for (const [name, bank] of Object.entries(banks)) {
  const gap = Math.round(0.06 * RATE);
  const offsets = {};
  let total = gap;
  for (const [clip, variants] of Object.entries(bank.clips)) {
    offsets[clip] = variants.map((v) => {
      const at = total;
      total += v[0].length + gap;
      return [+(at / RATE).toFixed(5), +(v[0].length / RATE).toFixed(5)];
    });
  }
  const data = new Float32Array(total);
  for (const [clip, variants] of Object.entries(bank.clips)) {
    variants.forEach((v, i) => data.set(v[0], Math.round(offsets[clip][i][0] * RATE)));
  }
  const stem = `bank-${name}`;
  const derivatives = encode([data], stem, 40);
  bankEntries[name] = { file: stem, duration: +(total / RATE).toFixed(4), clips: offsets };
  for (const p of provenance) if (p.use.bank === name) p.derivatives = derivatives;
  for (const p of composed) if (p.use.bank === name) p.derivatives = derivatives;
}

/** JSON with short number lists kept on one line, so the manifest and the provenance read as tables. */
function pretty(value, indent = '') {
  const inner = `${indent}  `;
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === 'number')) return `[${value.join(', ')}]`;
    const items = value.map((v) => pretty(v, inner));
    const line = `[${items.join(', ')}]`;
    if (value.every((v) => Array.isArray(v)) && line.length <= 110) return line;
    return `[\n${items.map((v) => `${inner}${v}`).join(',\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    return `{\n${entries.map(([k, v]) => `${inner}${JSON.stringify(k)}: ${pretty(v, inner)}`).join(',\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

const manifest = { version: 1, base: 'assets/audio/world/', banks: bankEntries, loops, music, songs };
fs.writeFileSync(MANIFEST, `// Generated by tools/world-audio/prepare.mjs from tools/world-audio/plan.json. Do not edit by hand.
// Offsets and durations are seconds in the 48 kHz sprites and loops under public/assets/audio/world/.

export const WORLD_AUDIO = ${pretty(manifest)} as const;

export type WorldAudioManifest = typeof WORLD_AUDIO;
export type BankId = keyof typeof WORLD_AUDIO.banks;
export type LoopId = keyof typeof WORLD_AUDIO.loops;
export type MusicId = keyof typeof WORLD_AUDIO.music;
export type SongId = keyof typeof WORLD_AUDIO.songs;
`);
const preparedWith = execFileSync('ffmpeg', ['-version']).toString().split('\n')[0].trim();
fs.writeFileSync(PROVENANCE, `${pretty({ schemaVersion: 1, generator: plan.generator, terms: plan.terms, preparedWith, assets: provenance, composed })}\n`);
/* ------------------------------------------------------------------ voices */

// Spoken lines are cut into short sprites per speaker (about half a minute each): a bank is fetched when its speaker
// comes near or first speaks, and dropped when they are far and quiet, so decoded speech stays small in memory. The
// story's text-first dialogue (dialogue.ts) is voiced too, in its own banks, ready for a conversation interface; the
// game does not load those yet.
fs.mkdirSync(VOICE_OUT, { recursive: true });
const BANK_SECONDS = voicePlan.bankSeconds ?? 30;
const voiceBanks = {};
const spokenLines = {};
const storyLines = {};
const voiceRecords = [];

function voiceClip(file) {
  if (!fs.existsSync(file)) throw new Error(`missing voice source ${path.relative(ROOT, file)}`);
  const chans = decode(file, 1);
  dcRemove(chans);
  // Silence trimmed to a breath either side; every voice at one spoken level.
  const span = activeSpan(chans[0], 45);
  const c = slice(chans, Math.max(0, span.start - Math.round(0.03 * RATE)), Math.min(chans[0].length, span.end + Math.round(0.08 * RATE)));
  const lv = normalize(c, voicePlan.targetDb ?? -19);
  fade(c, 0.005, 0.04);
  return { c, lv };
}

/** Lays one set's lines into banks of about BANK_SECONDS per speaker; returns where each line sits. */
function bankVoices(set, entries, sourceOf, prefix) {
  const out = {};
  const bySpeaker = {};
  for (const [id, line] of entries) (bySpeaker[line.speaker] ??= []).push([id, line]);
  for (const [speaker, lines] of Object.entries(bySpeaker)) {
    const gap = Math.round(0.08 * RATE);
    let bank = null;
    let n = 0;
    const flush = () => {
      if (!bank) return;
      const data = new Float32Array(bank.total);
      for (const [c, at] of bank.parts) data.set(c[0], at);
      const derivatives = encode([data], `voice-${bank.id}`, voicePlan.kbps ?? 40, VOICE_OUT, 'voip');
      voiceBanks[bank.id] = { file: `voice-${bank.id}`, speaker, set, duration: +(bank.total / RATE).toFixed(4), lines: bank.parts.length };
      for (const r of bank.records) voiceRecords.push({ ...r, derivatives });
      bank = null;
    };
    for (const [id, line] of lines) {
      const file = sourceOf(id);
      const { c, lv } = voiceClip(file);
      if (bank && (bank.total + c[0].length) / RATE > BANK_SECONDS) flush();
      bank ??= { id: `${prefix}${speaker}-${++n}`, parts: [], records: [], total: gap };
      bank.parts.push([c, bank.total]);
      out[id] = [bank.id, +(bank.total / RATE).toFixed(5), +(c[0].length / RATE).toFixed(5), speaker];
      bank.records.push({ id, set, speaker, text: line.text, model: line.model, generated: line.generated, transcript: line.transcript, source: { path: path.relative(ROOT, file).replace(/\\/g, '/'), bytes: fs.statSync(file).size, sha256: sha256(file) }, levelDb: lv.levelDb });
      bank.total += c[0].length + gap;
    }
    flush();
  }
  return out;
}

const voiceFile = (id) => path.join(VOICE_SOURCE, `${id.replace(/#/g, '~')}.mp3`);
Object.assign(spokenLines, bankVoices('spoken', Object.entries(voicePlan.lines), voiceFile, ''));
// Story lines that repeat another's words (the same reply offered in several places) share its recording.
const storyEntries = Object.entries(voicePlan.story ?? {}).filter(([, l]) => !l.same);
Object.assign(storyLines, bankVoices('story', storyEntries, (id) => path.join(VOICE_SOURCE, 'story', `${id.replace(/#/g, '~')}.mp3`), 'story-'));
for (const [id, l] of Object.entries(voicePlan.story ?? {})) if (l.same) storyLines[id] = storyLines[l.same];

fs.writeFileSync(VOICE_MANIFEST, `// Generated by tools/world-audio/prepare.mjs from tools/world-audio/voices.json. Do not edit by hand.
// Each line: [bank, offset, duration, speaker]; offsets and durations are seconds within the bank's sprite under
// public/assets/audio/voice/. \`lines\` are the spoken lines the game plays (src/content/voice.ts); \`story\` voices the
// text-first dialogue (src/content/dialogue.ts) by its string keys, for a future conversation interface.

export const VOICE_AUDIO = ${pretty({ version: 2, base: 'assets/audio/voice/', banks: voiceBanks, lines: spokenLines, story: storyLines })} as const;

export type VoiceBank = keyof typeof VOICE_AUDIO.banks;
export type VoiceLineId = keyof typeof VOICE_AUDIO.lines;
export type StoryLineId = keyof typeof VOICE_AUDIO.story;
`);
fs.writeFileSync(VOICE_PROVENANCE, `${pretty({ schemaVersion: 2, generator: voicePlan.generator, terms: voicePlan.terms, preparedWith, voices: voicePlan.voices, lines: voiceRecords })}\n`);
fs.rmSync(TMP, { recursive: true, force: true });
const count = (o) => Object.keys(o).length;
console.log(`banks ${count(bankEntries)} (${Object.values(bankEntries).reduce((s, b) => s + Object.values(b.clips).reduce((t, v) => t + v.length, 0), 0)} variants), loops ${count(loops)}, music ${count(music)}, songs ${count(songs)}; composed ${composed.length} renders; voice banks ${count(voiceBanks)} (${count(spokenLines)} spoken lines, ${count(storyLines)} story lines)`);
