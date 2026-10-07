#!/usr/bin/env node
/**
 * The teaser's narration: a calm, dry storyteller, voiced with ElevenLabs (`eleven_v4`, the premade voice George).
 * Each line is spoken, transcribed with word timings (`scribe_v1`) and retaken once when its words come back wrong.
 * The takes, their words and timings are kept in tools/teaser/voice/, where the captions and the score place them.
 * The key is read from the environment only, never written or printed.
 *
 *   ELEVENLABS_API_KEY=... node tools/teaser/voice.mjs [id ...]     voices the lines that are new or changed (or those named)
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const VOICE_DIR = path.join(HERE, 'voice');
const RECORD = path.join(VOICE_DIR, 'takes.json');

export const NARRATOR = { name: 'George', voiceId: 'JBFqnCBsd6RMkjVDRZzb', model: 'eleven_v4' };

/**
 * What the narrator says (`say`, with spoken numbers and square-bracketed directions) and what the subtitles show
 * (`shown`: one or more cues; each cue after the first starts on the word named in `at`, matched whole).
 */
export const LINES = [
  { id: 'intro', say: 'So. I asked AI to make a game... heavily inspired by Gothic 3.',
    shown: ['So. I asked AI to make a game… heavily inspired by Gothic 3.'] },
  { id: 'comment1', say: 'Creative Problem seven-eight-oh-three said... Bro, that\'s Gothic 3 from the first ten seconds.',
    shown: ['CreativeProblem7803 said:', '“Bro, that’s Gothic 3 from the first 10 seconds.”'], at: ['bro'] },
  { id: 'mission', say: 'Mission failed... successfully.', shown: ['Mission failed… successfully.'] },
  { id: 'polish', say: 'Since then, we\'ve been polishing.', shown: ['Since then, we’ve been polishing.'] },
  { id: 'swim', say: 'You can swim now.', shown: ['You can swim now.'] },
  { id: 'bench', say: 'And it took an entire pull request to teach the villagers how to sit on a bench.',
    shown: ['And it took an entire pull request', 'to teach the villagers how to sit on a bench.'], at: ['to'] },
  { id: 'comment2', say: 'The monsters are not presentable... It\'s just one monster to polish.',
    shown: ['“The monsters are not presentable…', '…it’s just one monster to polish.”'], at: ['its'] },
  { id: 'fair', say: '[sighs] Fair.', shown: ['Fair.'] },
  { id: 'better', say: 'Better?', shown: ['Better?'] },
  { id: 'presentable', say: 'Presentable.', shown: ['Presentable.'] },
  // Spelt as it is said: "Tervain" alone comes back as "Teravine".
  { id: 'outro', say: 'Tervane. Now with one presentable monster.', shown: ['Tervain. Now with one presentable monster.'] },
];

/** The recorded takes: words with their times in seconds from the start of each file. */
export function takes() {
  return fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : { lines: {} };
}

const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
/** Words for comparing what was meant with what was heard: digits spelt out, "oh" as zero, punctuation gone. */
export function words(text) {
  return text.replace(/\[[^\]]*\]/g, ' ').toLowerCase().replace(/[’']/g, '').replace(/\d/g, (d) => ` ${DIGITS[d]} `)
    .match(/[a-z]+/g)?.map((w) => (w === 'oh' ? 'zero' : w)) ?? [];
}
function wer(ref, hyp) {
  const r = words(ref), h = words(hyp);
  const d = Array.from({ length: r.length + 1 }, (_, i) => Array.from({ length: h.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= r.length; i++) for (let j = 1; j <= h.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  return d[r.length][h.length] / Math.max(1, r.length);
}

async function generate(only) {
  const KEY = process.env.ELEVENLABS_API_KEY;
  if (!KEY) throw new Error('Set ELEVENLABS_API_KEY in the environment (it is never stored or printed).');
  const api = async (method, route, { json, form, query, raw } = {}) => {
    const url = new URL(`https://api.elevenlabs.io${route}`);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    const headers = { 'xi-api-key': KEY };
    if (json) headers['content-type'] = 'application/json';
    for (let attempt = 0; attempt < 5; attempt++) {
      const r = await fetch(url, { method, headers, body: json ? JSON.stringify(json) : form });
      if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 2000 * (attempt + 1))); continue; }
      if (!r.ok) throw new Error(`${method} ${route} -> ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return raw ? Buffer.from(await r.arrayBuffer()) : r.json();
    }
    throw new Error(`${method} ${route}: gave up after retries`);
  };
  const record = takes();
  const tier = (await api('GET', '/v1/user/subscription')).tier;
  fs.mkdirSync(VOICE_DIR, { recursive: true });
  for (const line of LINES) {
    const had = record.lines[line.id];
    if (only.length ? !only.includes(line.id) : had && had.say === line.say) continue;
    let best = null;
    for (let take = 1; take <= 2; take++) {
      const buf = await api('POST', `/v1/text-to-speech/${NARRATOR.voiceId}`, { json: { text: line.say, model_id: NARRATOR.model }, query: { output_format: 'mp3_44100_192' }, raw: true });
      const form = new FormData();
      form.append('model_id', 'scribe_v1');
      form.append('timestamps_granularity', 'word');
      form.append('file', new Blob([buf], { type: 'audio/mpeg' }), `${line.id}.mp3`);
      const heard = await api('POST', '/v1/speech-to-text', { form });
      const said = (heard.words ?? []).filter((w) => w.type === 'word').map((w) => ({ text: w.text, start: w.start, end: w.end }));
      const e = wer(line.say, heard.text ?? '');
      if (!best || e < best.e) best = { buf, said, text: (heard.text ?? '').trim(), e };
      if (e <= 0.1) break;
    }
    const file = path.join(VOICE_DIR, `${line.id}.mp3`);
    fs.writeFileSync(file, best.buf);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
    const sha256 = crypto.createHash('sha256').update(best.buf).digest('hex');
    record.lines[line.id] = { say: line.say, seconds: Number(probe.stdout.trim()), sha256, transcript: best.text, words: best.said };
    Object.assign(record, { voice: NARRATOR.name, voiceId: NARRATOR.voiceId, model: NARRATOR.model, format: 'mp3_44100_192', plan: tier, generated: new Date().toISOString().slice(0, 10) });
    fs.writeFileSync(RECORD, `${JSON.stringify(record, null, 2)}\n`);
    console.log(`${best.e > 0.1 ? 'CHECK' : 'ok   '} ${line.id.padEnd(12)} ${record.lines[line.id].seconds.toFixed(2)} s  heard: ${best.text}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generate(process.argv.slice(2).filter((a) => !a.startsWith('--')));
}
