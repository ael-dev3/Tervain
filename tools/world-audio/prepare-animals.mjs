#!/usr/bin/env node
/**
 * Prepare the unchanged ElevenLabs calls in assets/audio/source/animals/ using tools/world-audio/animals.json.
 *   node tools/world-audio/prepare-animals.mjs
 * Needs FFmpeg with libopus on PATH. Writes public/audio/animals/{species}-{1|2}.{ogg,m4a} and public provenance
 * in docs/engineering/animal-audio-assets.json. The sources and generation plan are never rewritten.
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PLAN = path.join(ROOT, 'tools/world-audio/animals.json');
const SOURCE = path.join(ROOT, 'assets/audio/source/animals');
const OUT = path.join(ROOT, 'public/audio/animals');
const PROVENANCE = path.join(ROOT, 'docs/engineering/animal-audio-assets.json');
const RATE = 48000;
const LEVEL_DB = -20;
const PEAK_DB = -1;
const PAID_TERMS = 'https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform';
const SPECIES = ['tiger', 'lion', 'bear', 'wolf', 'cat', 'dog', 'boar', 'deer'];
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const wanted = new Set(SPECIES.flatMap((species) => [1, 2].map((variant) => `${species}-${variant}`)));
if (!Array.isArray(plan.assets) || plan.assets.length !== wanted.size) throw new Error('animals.json must contain two calls for each of the eight species');
for (const asset of plan.assets) {
  if (!wanted.delete(asset.id) || asset.id !== `${asset.species}-${asset.variant}` || typeof asset.prompt !== 'string'
    || asset.prompt.length < 20 || !fs.existsSync(path.join(SOURCE, `${asset.id}.mp3`))) {
    throw new Error(`Invalid or missing animal source: ${String(asset.id)}`);
  }
  if (asset.sourceSha256 && asset.sourceSha256 !== crypto.createHash('sha256').update(fs.readFileSync(path.join(SOURCE, `${asset.id}.mp3`))).digest('hex')) {
    throw new Error(`Animal source differs from its generation record: ${asset.id}`);
  }
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tervain-animal-audio-'));
const relative = (file) => path.relative(ROOT, file).replace(/\\/g, '/');
const record = (file) => ({ path: relative(file), bytes: fs.statSync(file).size, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
const toGain = (db) => 10 ** (db / 20);

/** RMS in short windows, as in the world-audio preparer: trim only the quiet edges, keeping pauses in a call. */
function envelope(samples, hop = 128, size = 512) {
  const values = [];
  for (let start = 0; start < samples.length; start += hop) {
    let sum = 0;
    const end = Math.min(samples.length, start + size);
    for (let i = start; i < end; i++) sum += samples[i] ** 2;
    values.push(10 * Math.log10(sum / Math.max(1, end - start) + 1e-18));
  }
  return values;
}

function prepare(file) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(RATE), '-'], { maxBuffer: 64 << 20 });
  const original = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const env = envelope(original);
  const peak = Math.max(...env);
  if (!Number.isFinite(peak) || peak < -85) throw new Error(`Silent animal source: ${relative(file)}`);
  let first = 0;
  let last = env.length - 1;
  while (first < last && env[first] < peak - 40) first++;
  while (last > first && env[last] < peak - 40) last--;
  const from = Math.max(0, first * 128 - 256);
  const to = Math.min(original.length, (last + 1) * 128 + 512);
  const samples = original.slice(from, to);
  let sum = 0;
  for (const value of samples) sum += value;
  const mean = sum / samples.length;
  for (let i = 0; i < samples.length; i++) samples[i] -= mean;
  const levels = envelope(samples, 256, 1024).sort((a, b) => b - a);
  const active = levels.slice(0, Math.max(1, Math.ceil(levels.length / 2)));
  const levelDb = 10 * Math.log10(active.reduce((total, db) => total + 10 ** (db / 10), 0) / active.length + 1e-18);
  let samplePeak = 0;
  for (const value of samples) samplePeak = Math.max(samplePeak, Math.abs(value));
  const gain = Math.min(toGain(LEVEL_DB - levelDb), toGain(PEAK_DB) / samplePeak);
  const fadeIn = Math.min(samples.length, Math.round(0.008 * RATE));
  const fadeOut = Math.min(samples.length, Math.round(0.05 * RATE));
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  for (let i = 0; i < fadeIn; i++) samples[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / fadeIn);
  for (let i = 0; i < fadeOut; i++) samples[samples.length - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / fadeOut);
  if (samples.length / RATE < 0.15 || samples.length / RATE > 10) throw new Error(`Unexpected prepared call duration: ${relative(file)}`);
  return { samples, sourceSeconds: original.length / RATE, preparedSeconds: samples.length / RATE, levelDb, gainDb: 20 * Math.log10(gain) };
}

function encode(samples, id) {
  const raw = path.join(TMP, `${id}.f32`);
  fs.writeFileSync(raw, Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
  const input = ['-v', 'error', '-y', '-f', 'f32le', '-ac', '1', '-ar', String(RATE), '-i', raw];
  // Stable serial numbers and timestamps make repeated preparation reproducible for a given FFmpeg build.
  const exact = ['-fflags', '+bitexact', '-flags:a', '+bitexact', '-map_metadata', '-1'];
  const ogg = path.join(OUT, `${id}.ogg`);
  const m4a = path.join(OUT, `${id}.m4a`);
  execFileSync('ffmpeg', [...input, '-c:a', 'libopus', '-b:a', '64k', '-vbr', 'on', '-application', 'audio', ...exact, ogg]);
  execFileSync('ffmpeg', [...input, '-c:a', 'aac', '-b:a', '80k', '-movflags', '+faststart', ...exact, m4a]);
  return [ogg, m4a].map(record);
}

try {
  // Decode and validate every source before changing any shipped file.
  const prepared = plan.assets.map((asset) => ({ asset, file: path.join(SOURCE, `${asset.id}.mp3`), ...prepare(path.join(SOURCE, `${asset.id}.mp3`)) }));
  fs.mkdirSync(OUT, { recursive: true });
  const assets = prepared.map(({ asset, file, samples, sourceSeconds, preparedSeconds, levelDb, gainDb }) => {
    const derivatives = encode(samples, asset.id);
    console.log(`${asset.id}: ${preparedSeconds.toFixed(2)}s, mono, Opus + AAC`);
    return {
      id: asset.id, species: asset.species, variant: asset.variant, prompt: asset.prompt,
      model: asset.model ?? plan.generator?.model, generated: asset.generated ?? null, format: asset.format ?? null,
      requestedSeconds: asset.seconds, seconds: +sourceSeconds.toFixed(5), preparedSeconds: +preparedSeconds.toFixed(5),
      levelDb: +levelDb.toFixed(2), gainDb: +gainDb.toFixed(2), source: record(file), derivatives,
    };
  });
  // Public generation facts only: no account identifiers, usage records or credential fields are copied.
  const safeGeneratorKeys = ['service', 'model', 'requestedSpeechModel', 'animalEndpointModelSupport', 'generationPlan', 'generationDate', 'paidGenerationPlan', 'sourceTermURL', 'scope'];
  const generator = Object.fromEntries(Object.entries(plan.generator ?? {}).filter(([key, value]) => safeGeneratorKeys.includes(key) && typeof value === 'string'));
  const generationDates = [...new Set(assets.map((asset) => asset.generated))];
  fs.writeFileSync(PROVENANCE, `${JSON.stringify({
    schemaVersion: 1,
    generator: {
      ...generator, service: 'ElevenLabs', model: plan.generator?.model,
      generationDate: generator.generationDate ?? (generationDates.length === 1 ? generationDates[0] : null),
      paidGenerationPlan: generator.paidGenerationPlan ?? (String(generator.generationPlan).startsWith('Creator paid') ? 'Creator' : null),
      sourceTermURL: generator.sourceTermURL ?? PAID_TERMS,
      scope: 'Animal sound effects from the sound-generation endpoint; excludes Eleven Music and speech. No Creative Commons or public asset-reuse grant.',
      plan: 'tools/world-audio/animals.json', planSha256: record(PLAN).sha256,
    },
    processing: { sampleRate: RATE, channels: 1, targetActiveRmsDb: LEVEL_DB, peakLimitDb: PEAK_DB, fadeInSeconds: 0.008, fadeOutSeconds: 0.05 },
    terms: {
      attribution: 'Animal sound effects generated with ElevenLabs (elevenlabs.io).',
      license: 'ElevenLabs service terms apply; generated audio is not offered as Creative Commons.',
      sourceTermURL: PAID_TERMS,
      limits: 'General paid-output terms remain subject to intellectual-property rights, applicable law, service-specific terms and the exclusion of Beta Services.',
    },
    assets,
  }, null, 2)}\n`);
} finally {
  fs.rmSync(TMP, { recursive: true, force: true });
}
