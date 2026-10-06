#!/usr/bin/env node
/**
 * Generates Tervain's sound with ElevenLabs from the plans in the repository, so the sound grows with the game:
 * edit a plan, run this, then run prepare.mjs.
 *
 *   ELEVENLABS_API_KEY=... node tools/world-audio/generate.mjs voices [--story] [--dry-run] [--max-credits N]
 *       Voices every spoken line in src/content/voice.ts (and with --story the dialogue in dialogue.ts) that is new
 *       or whose words changed since it was recorded, with its speaker's designed voice. Lines that are gone are
 *       dropped from tools/world-audio/voices.json and their sources removed.
 *   ELEVENLABS_API_KEY=... node tools/world-audio/generate.mjs design <speaker> "<description>" "<sample line>"
 *       Designs a voice for a new speaker from a description, keeps the first preview that reads its sample
 *       correctly, saves it to the account and records it in voices.json.
 *   ELEVENLABS_API_KEY=... node tools/world-audio/generate.mjs sounds [id ...] [--dry-run] [--max-credits N]
 *       Generates the sources in tools/world-audio/plan.json that have no file yet (or the ids named): effects and
 *       beds with the sound-effects model, the score with the music model (a prompt or a composition plan), and
 *       voice-changed takes (`from` + `voice`).
 *
 * Every speech take is transcribed and retaken (up to twice) when its words come back wrong. The key is read from
 * the environment only, never written or printed. --max-credits stops once the account's usage has grown by that
 * much; --dry-run lists the work and an estimate without spending anything.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VOICES = path.join(ROOT, 'tools/world-audio/voices.json');
const PLAN = path.join(ROOT, 'tools/world-audio/plan.json');
const VOICE_SOURCE = path.join(ROOT, 'assets/audio/source/voice');
const WORLD_SOURCE = path.join(ROOT, 'assets/audio/source/world');
const TODAY = new Date().toISOString().slice(0, 10);

const args = process.argv.slice(2);
const command = args[0];
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = flag('--dry-run');
const maxCredits = Number(option('--max-credits') ?? Infinity);
const KEY = process.env.ELEVENLABS_API_KEY;
if (!dryRun && !KEY) {
  console.error('Set ELEVENLABS_API_KEY in the environment (it is never stored or printed).');
  process.exit(1);
}

/* ------------------------------------------------------------------ the API */

async function api(method, route, { json, form, query, raw = false } = {}) {
  const url = new URL(`https://api.elevenlabs.io${route}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
  const headers = { 'xi-api-key': KEY };
  let body;
  if (json) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (form) body = form;
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(url, { method, headers, body });
    if (r.status === 429 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
      continue;
    }
    if (!r.ok) throw new Error(`${method} ${route} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
    if (raw) return Buffer.from(await r.arrayBuffer());
    return r.json();
  }
  throw new Error(`${method} ${route}: gave up after retries`);
}

let startUsage = null;
async function checkBudget() {
  const s = await api('GET', '/v1/user/subscription');
  startUsage ??= s.character_count;
  const spent = s.character_count - startUsage;
  if (spent >= maxCredits) throw new Error(`stopping: ${spent} credits spent (limit ${maxCredits})`);
  if (s.character_count >= s.character_limit) throw new Error('stopping: the account has no credits left');
  return spent;
}

async function transcribe(buf) {
  const form = new FormData();
  form.append('model_id', 'scribe_v1');
  form.append('file', new Blob([buf], { type: 'audio/mpeg' }), 'take.mp3');
  return ((await api('POST', '/v1/speech-to-text', { form })).text ?? '').replace(/\[[^\]]*\]\s*/g, '').trim();
}

const words = (s) => s.toLowerCase().replace(/[’']/g, '').match(/[a-z0-9]+/g) ?? [];
/** Word error rate between what was meant and what was heard. */
function wer(ref, hyp) {
  const r = words(ref), h = words(hyp);
  const d = Array.from({ length: r.length + 1 }, (_, i) => Array.from({ length: h.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return d[r.length][h.length] / Math.max(1, r.length);
}
const shown = (text) => text.replace(/\[[^\]]*\]\s*/g, '').replace(/\s{2,}/g, ' ').trim();

/** One spoken take, checked by ear-less transcription and retaken when it reads wrong. */
async function speak(voiceId, text) {
  let best = null;
  for (let take = 1; take <= 3; take++) {
    const buf = await api('POST', `/v1/text-to-speech/${voiceId}`, { json: { text, model_id: 'eleven_v4' }, query: { output_format: 'mp3_44100_192' }, raw: true });
    const heard = await transcribe(buf);
    const e = wer(shown(text), heard);
    if (!best || e < best.e) best = { buf, heard, e };
    if (e <= 0.1) break;
  }
  return best;
}

const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

/* ------------------------------------------------------------------ voices */

async function voices() {
  const plan = JSON.parse(fs.readFileSync(VOICES, 'utf8'));
  const { VOICE_LINES } = await import(pathUrl('src/content/voice.ts'));
  const want = { lines: Object.fromEntries(Object.entries(VOICE_LINES).map(([id, l]) => [id, { speaker: l.speaker, text: l.text }])) };
  if (flag('--story')) {
    const d = await import(pathUrl('src/content/dialogue.ts'));
    want.story = {};
    for (const n of Object.values(d.DIALOGUE_NODES)) {
      want.story[n.text] = { speaker: n.speaker, text: d.DIALOGUE_STRINGS[n.text] };
      for (const c of n.choices) want.story[c.text] = { speaker: 'hero', text: d.DIALOGUE_STRINGS[c.text] };
    }
  }
  const work = [];
  for (const [set, lines] of Object.entries(want)) {
    const have = (plan[set] ??= {});
    const folder = set === 'story' ? path.join(VOICE_SOURCE, 'story') : VOICE_SOURCE;
    for (const [id, l] of Object.entries(lines)) {
      const h = have[id];
      if (h && h.text === l.text && h.speaker === l.speaker) continue;
      if (!plan.voices[l.speaker]) throw new Error(`no voice for ${l.speaker}: design one first (generate.mjs design ...)`);
      work.push({ set, id, ...l, file: path.join(folder, `${id.replace(/#/g, '~')}.mp3`) });
    }
    for (const id of Object.keys(have)) {
      if (lines[id]) continue;
      console.log(`dropping ${set} ${id}`);
      if (!dryRun) {
        if (!have[id].same) fs.rmSync(path.join(folder, `${id.replace(/#/g, '~')}.mp3`), { force: true });
        delete have[id];
      }
    }
  }
  const chars = work.reduce((s, w) => s + w.text.length, 0);
  console.log(`${work.length} lines to voice (${chars} characters)`);
  if (dryRun) return;
  for (const w of work) {
    await checkBudget();
    const best = await speak(plan.voices[w.speaker].voiceId, w.text);
    fs.mkdirSync(path.dirname(w.file), { recursive: true });
    fs.writeFileSync(w.file, best.buf);
    plan[w.set][w.id] = { speaker: w.speaker, text: w.text, model: 'eleven_v4', format: 'mp3_44100_192', generated: TODAY, transcript: best.heard };
    writeJson(VOICES, plan);
    console.log(`${best.e > 0.1 ? 'CHECK' : 'ok   '} ${w.id}${best.e > 0.1 ? ` (heard: ${best.heard})` : ''}`);
  }
  console.log(`voiced ${work.length}; ${await checkBudget()} credits spent`);
}

async function design() {
  const [, speaker, description, sample] = args;
  if (!speaker || !description || !sample) throw new Error('usage: design <speaker> "<description>" "<sample line>"');
  const plan = JSON.parse(fs.readFileSync(VOICES, 'utf8'));
  if (dryRun) return console.log(`would design a voice for ${speaker}`);
  await checkBudget();
  const r = await api('POST', '/v1/text-to-voice/design', { json: { voice_description: description, model_id: 'eleven_ttv_v3', text: sample } });
  for (const p of r.previews ?? []) {
    const heard = await transcribe(Buffer.from(p.audio_base_64, 'base64'));
    if (wer(sample, heard) > 0.1) continue;
    const saved = await api('POST', '/v1/text-to-voice', { json: { voice_name: `Tervain · ${speaker}`, voice_description: description, generated_voice_id: p.generated_voice_id } });
    plan.voices[speaker] = { name: `Tervain · ${speaker}`, description, designSample: sample, voiceId: saved.voice_id };
    writeJson(VOICES, plan);
    return console.log(`designed and saved a voice for ${speaker}`);
  }
  throw new Error('no preview read its sample correctly; try again or reword the description');
}

/* ------------------------------------------------------------------ sounds */

async function sounds() {
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const named = args.slice(1).filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));
  const work = plan.sources.filter((s) => (named.length ? named.includes(s.id) : !fs.existsSync(path.join(WORLD_SOURCE, `${s.id}.mp3`))));
  const estimate = work.reduce((sum, s) => sum + (s.model?.startsWith('music') ? 14 : s.from ? 17 : 11) * (s.seconds ?? 10), 0);
  console.log(`${work.length} sources to generate (about ${Math.round(estimate)} credits)`);
  if (dryRun) return;
  for (const s of work) {
    await checkBudget();
    let buf;
    if (s.from) {
      const form = new FormData();
      form.append('model_id', s.model ?? 'eleven_multilingual_sts_v2');
      form.append('remove_background_noise', 'false');
      form.append('audio', new Blob([fs.readFileSync(path.join(WORLD_SOURCE, `${s.from}.mp3`))], { type: 'audio/mpeg' }), `${s.from}.mp3`);
      buf = await api('POST', `/v1/speech-to-speech/${s.voice}`, { form, query: { output_format: 'mp3_44100_192' }, raw: true });
    } else if (s.model?.startsWith('music')) {
      const json = s.compositionPlan
        ? { composition_plan: s.compositionPlan, model_id: s.model }
        : { prompt: s.prompt, music_length_ms: Math.round(s.seconds * 1000), model_id: s.model, force_instrumental: s.forceInstrumental ?? true };
      buf = await api('POST', '/v1/music', { json, query: { output_format: 'mp3_44100_192' }, raw: true });
    } else {
      const json = { text: s.prompt, duration_seconds: s.seconds, prompt_influence: s.promptInfluence ?? 0.5, model_id: s.model ?? 'eleven_text_to_sound_v2' };
      if (s.loop) json.loop = true;
      buf = await api('POST', '/v1/sound-generation', { json, query: { output_format: 'mp3_44100_192' }, raw: true });
    }
    fs.writeFileSync(path.join(WORLD_SOURCE, `${s.id}.mp3`), buf);
    s.generated = TODAY;
    writeJson(PLAN, plan);
    console.log(`ok    ${s.id} (${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12)})`);
  }
  console.log(`generated ${work.length}; ${await checkBudget()} credits spent. Check the takes, then run prepare.mjs.`);
}

function pathUrl(rel) {
  return `file:///${path.join(ROOT, rel).replace(/\\/g, '/').replace(/^\//, '')}`;
}

const commands = { voices, design, sounds };
if (!commands[command]) {
  console.log('usage: generate.mjs voices [--story] | design <speaker> "<description>" "<sample>" | sounds [id ...]  [--dry-run] [--max-credits N]');
  process.exit(command ? 1 : 0);
}
try {
  await commands[command]();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
