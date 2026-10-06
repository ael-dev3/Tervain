import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { BARKS, NPC_LIST } from '../../src/content/npcs';
import { DIALOGUE_NODES, DIALOGUE_STRINGS } from '../../src/content/dialogue';
import { INSPECT_POINTS } from '../../src/content/inspect';
import { HERO_LINES, SCENES, SPEAKER_NAMES, TALKS, VOICE_LINES, inHours, shown, type Speaker } from '../../src/content/voice';
import { createInitialState, evalAll } from '../../src/game/state';
import type { WorldState } from '../../src/game/types';
import { SpeechDirector } from '../../src/presentation/speech';
import { VOICE_AUDIO } from '../../src/presentation/sound/voiceManifest';
import { PLACES } from '../../src/world/layout';

const ROOT = path.resolve(__dirname, '../..');
const hashes = new Map<string, string>();
/** A bank's hash is checked once for every line in it; each file is read and hashed only once. */
const sha256 = (file: string) => hashes.get(file) ?? hashes.set(file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')).get(file)!;
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/world-audio/voices.json'), 'utf8')) as {
  voices: Record<string, { description: string; voiceId: string }>;
  lines: Record<string, { speaker: string; text: string; model: string; transcript: string }>;
  story: Record<string, { speaker: string; text: string; transcript?: string; same?: string }>;
  terms: { summary: string; attribution: string };
};
const provenance = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/engineering/voice-assets.json'), 'utf8')) as {
  lines: { id: string; text: string; source: { path: string; sha256: string }; derivatives: { path: string; sha256: string }[] }[];
};

describe('spoken lines', () => {
  it('voices every line, for every person and the hero, with the text the game shows', () => {
    const speakers = new Set<Speaker>(['hero', ...NPC_LIST.map((n) => n.id)]);
    for (const [id, line] of Object.entries(VOICE_LINES)) {
      expect(speakers.has(line.speaker), id).toBe(true);
      expect(VOICE_AUDIO.lines[id as keyof typeof VOICE_AUDIO.lines], id).toBeDefined();
      // The audio was generated from exactly this text.
      expect(plan.lines[id]?.text, id).toBe(line.text);
      expect(plan.lines[id]?.speaker, id).toBe(line.speaker);
    }
    expect(Object.keys(plan.lines).sort()).toEqual(Object.keys(VOICE_LINES).sort());
    for (const s of speakers) {
      expect(plan.voices[s]?.description.length, s).toBeGreaterThan(40);
      expect(SPEAKER_NAMES[s], s).toBeTruthy();
    }
  });

  it('names only real lines from exchanges, remarks and the hero\'s cues, and gives everyone something to say', () => {
    const named = [...TALKS.flatMap((t) => [t.ask, t.reply]), ...BARKS.map((b) => b.line), ...Object.values(HERO_LINES).flat(), ...SCENES.flatMap((s) => s.lines)].filter(Boolean) as string[];
    for (const id of named) expect(VOICE_LINES[id], id).toBeDefined();
    for (const t of TALKS) {
      expect(VOICE_LINES[t.reply]!.speaker, t.reply).toBe(t.npc);
      if (t.ask) expect(VOICE_LINES[t.ask]!.speaker, t.ask).toBe('hero');
    }
    for (const b of BARKS) expect(VOICE_LINES[b.line]!.speaker, b.line).toBe(b.npc);
    for (const n of NPC_LIST) {
      expect(TALKS.some((t) => t.npc === n.id), n.id).toBe(true);
      expect(BARKS.some((b) => b.npc === n.id), n.id).toBe(true);
    }
    // Every line is used somewhere.
    const used = new Set(named);
    for (const id of Object.keys(VOICE_LINES)) expect(used.has(id) || id === 'tolan.bark.hey', id).toBe(true);
  });

  it('greets every place the hero can discover except the strand he wakes on, and remarks on what he inspects', () => {
    for (const place of Object.keys(PLACES)) {
      if (place === 'shore') continue;
      expect(HERO_LINES[`place.${place}` as keyof typeof HERO_LINES], place).toBeDefined();
    }
    // The noticeboard opens its own panel; everything else the hero can inspect has his remark.
    for (const id of Object.keys(INSPECT_POINTS)) if (id !== 'noticeboard') expect(HERO_LINES[`inspect.${id}` as keyof typeof HERO_LINES], id).toBeDefined();
  });

  it('keeps delivery directions out of the words on screen, and gives every scene two people taking turns', () => {
    expect(shown('[sighs] Another night, another lock to check.')).toBe('Another night, another lock to check.');
    expect(shown('Ila is down safe? [exhales] Good.')).toBe('Ila is down safe? Good.');
    for (const l of Object.values(VOICE_LINES)) expect(shown(l.text), l.text).not.toMatch(/[[\]]/);
    for (const s of SCENES) {
      const speakers = s.lines.map((id) => VOICE_LINES[id]!.speaker);
      expect(new Set(speakers), s.id).toEqual(new Set(s.cast));
      speakers.forEach((sp, i) => { if (i) expect(sp, `${s.id} ${i}`).not.toBe(speakers[i - 1]); });
    }
  });

  it('voices the whole of the text-first dialogue for a future conversation window, word for word', () => {
    for (const node of Object.values(DIALOGUE_NODES)) {
      for (const [key, speaker] of [[node.text, node.speaker], ...node.choices.map((c) => [c.text, 'hero'] as const)] as const) {
        expect(plan.story[key]?.text, key).toBe(DIALOGUE_STRINGS[key]);
        expect(plan.story[key]?.speaker, key).toBe(speaker);
        expect(VOICE_AUDIO.story[key as keyof typeof VOICE_AUDIO.story], key).toBeDefined();
      }
    }
  });

  it('ships each speaker\'s lines as one Opus sprite with an AAC fallback, recorded by hash and checked by ear-less transcription', () => {
    const out = path.join(ROOT, 'public', VOICE_AUDIO.base);
    const files = Object.values(VOICE_AUDIO.banks).flatMap((b) => [`${b.file}.ogg`, `${b.file}.m4a`]);
    expect(fs.readdirSync(out).sort()).toEqual(files.sort());
    for (const b of Object.values(VOICE_AUDIO.banks)) {
      const ogg = fs.readFileSync(path.join(out, `${b.file}.ogg`));
      expect(ogg.subarray(28, 36).toString('latin1')).toBe('OpusHead');
      // Small enough to decode and drop as people come and go.
      expect(b.duration, b.file).toBeLessThan(45);
    }
    // Lines sit inside their sprite, in order, without overlapping; a bank holds one speaker.
    const all = [...Object.values(VOICE_AUDIO.lines), ...Object.values(VOICE_AUDIO.story)];
    for (const [id, bank] of Object.entries(VOICE_AUDIO.banks)) {
      const mine = all.filter(([b]) => b === id);
      for (const [, , , speaker] of mine) expect(speaker, id).toBe(bank.speaker);
      const spans = [...new Map(mine.map(([, at, len]) => [at, [at, at + len]])).values()].sort((a, b) => a[0]! - b[0]!);
      expect(spans.length, id).toBe(bank.lines);
      spans.forEach(([a, b], i) => {
        expect(a, id).toBeGreaterThanOrEqual(i ? spans[i - 1]![1]! : 0);
        expect(b, id).toBeLessThanOrEqual(bank.duration);
      });
    }
    for (const r of provenance.lines) {
      expect(sha256(path.join(ROOT, r.source.path)), r.id).toBe(r.source.sha256);
      for (const d of r.derivatives) expect(sha256(path.join(ROOT, d.path)), d.path).toBe(d.sha256);
      expect((plan.lines[r.id] ?? plan.story[r.id])!.transcript!.length, r.id).toBeGreaterThan(0);
    }
    expect(plan.terms.attribution).toContain('ElevenLabs (elevenlabs.io)');
    // Reads and hashes about 86 MB of recordings and banks.
  }, 30000);
});

describe('who says what, and when', () => {
  function director() {
    const said: { line: string; at?: { x: number; y: number; z: number } }[] = [];
    const captions: string[] = [];
    const d = new SpeechDirector({
      say: (line, at) => {
        said.push({ line, at });
        return VOICE_AUDIO.lines[line as keyof typeof VOICE_AUDIO.lines]?.[2] ?? 1;
      },
      caption: (speaker, text) => captions.push(`${speaker}: ${text}`),
    });
    return { d, said, captions };
  }
  const here = () => ({ x: 1, y: 1.6, z: 2 });
  const state = (): WorldState => createInitialState('slot-1');
  const run = (d: SpeechDirector, seconds: number) => { for (let t = 0; t < seconds; t += 0.05) d.update(0.05); };

  it('opens with their introduction, then the hero asks and they answer once he has finished', () => {
    const { d, said } = director();
    const s = state();
    expect(d.talk('rillford_reeve', here, s)).toBe(true);
    expect(said.map((x) => x.line)).toEqual(['mara.intro']);
    expect(said[0]!.at).toEqual(here());
    // Still speaking: interacting again does not stack another exchange on top.
    expect(d.talk('rillford_reeve', here, s)).toBe(false);
    run(d, 15);
    expect(d.talk('rillford_reeve', here, s)).toBe(true);
    expect(said.at(-1)!.line).toBe('hero.ask.water');
    const ask = VOICE_AUDIO.lines['hero.ask.water'][2];
    run(d, ask + 0.2);
    expect(said.at(-1)!.line).toBe('hero.ask.water');
    run(d, 0.4);
    expect(said.at(-1)!.line).toBe('mara.water');
  });

  it('follows the state of the valley, and after everything has been said rounds the repeatable lines', () => {
    const { d, said } = director();
    const s = state();
    s.quest.phase = 'settled';
    s.quest.allocation = 'rotation';
    const lines = () => {
      d.talk('rillford_reeve', here, s);
      run(d, 20);
      return said.at(-1)!.line;
    };
    expect(lines()).toBe('mara.intro');
    expect(lines()).toBe('mara.after.rotation');
    expect(lines()).toBe('mara.after.rotation');
    expect(said.map((x) => x.line)).not.toContain('mara.water');
  });

  it('lets Ila call from the ledge, then speak of the gully once she is safe', () => {
    const { d, said } = director();
    const s = state();
    d.talk('maintenance_worker', here, s);
    expect(said.at(-1)!.line).toBe('ila.ledge');
    run(d, 20);
    s.facts.ila_rescued = true;
    d.talk('maintenance_worker', here, s);
    expect(said.at(-1)!.line).toBe('ila.saw');
  });

  it('says each of the hero\'s cues once, a repeatable one after its cooldown, and never over himself', () => {
    const { d, said, captions } = director();
    expect(d.hero('place.rillford')).toBe(true);
    expect(said.at(-1)!.line).toBe('hero.place.rillford');
    expect(captions.at(-1)).toBe('hero: Rillford. The bell is louder here. So is the quiet.');
    // He is still speaking; another remark now is dropped rather than talked over.
    expect(d.hero('place.ford')).toBe(false);
    run(d, 10);
    expect(d.hero('place.rillford')).toBe(false);
    expect(d.hero('wounded', { again: 40 })).toBe(true);
    run(d, 10);
    expect(d.hero('wounded', { again: 40 })).toBe(false);
    run(d, 35);
    expect(d.hero('wounded', { again: 40 })).toBe(true);
    // Two wound lines, in turn.
    expect(said.filter((x) => x.line.startsWith('hero.wounded')).map((x) => x.line)).toEqual(['hero.wounded.1', 'hero.wounded.2']);
  });

  it('holds a delayed line back by the game clock, and a remark keeps its speaker from starting an exchange', () => {
    const { d, said } = director();
    d.hero('arrival', { delay: 3 });
    run(d, 2.9);
    expect(said).toHaveLength(0);
    run(d, 0.2);
    expect(said.at(-1)!.line).toBe('hero.arrival');
    const seconds = d.remark('mill_hand', 'bess.bark.wheel', here());
    expect(seconds).toBeGreaterThan(0.5);
    // A second remark waits, but talking to her cuts the remark short and starts the exchange.
    expect(d.remark('mill_hand', 'bess.bark.grain', here())).toBe(0);
    expect(d.talk('mill_hand', here, state())).toBe(true);
    // She answers once the hero has finished his own line.
    expect(d.talk('mill_hand', here, state())).toBe(false);
    run(d, VOICE_AUDIO.lines['hero.arrival'][2]);
    expect(said.at(-1)!.line).toBe('bess.intro');
    d.clear();
    expect(d.busyFor('mill_hand')).toBe(0);
  });

  it('names what someone may say soon, so the voice is ready first, without using up an exchange', () => {
    const { d, said } = director();
    const s = state();
    const mine = (scene: string) => SCENES.find((x) => x.id === scene)!.lines.filter((id) => VOICE_LINES[id]!.speaker === 'rillford_reeve');
    const remarks = (hour: number) => BARKS.filter((b) => b.npc === 'rillford_reeve' && evalAll(s, b.when) && (!b.hours || inHours(hour, b.hours))).map((b) => b.line);
    // At one in the afternoon: her introduction, the remarks for the hour and her part at the dry mill.
    const noon = d.soon('rillford_reeve', s, 13);
    expect(noon).toEqual(['mara.intro', ...remarks(13), ...mine('mill.dry')]);
    expect(d.soon('rillford_reeve', s, 13)).toEqual(noon);
    d.talk('rillford_reeve', here, s);
    expect(said.at(-1)!.line).toBe('mara.intro');
    run(d, 15);
    // Next the hero asks and she answers; in the evening she talks with the baker in the square instead.
    expect(d.soon('rillford_reeve', s, 18.5)).toEqual(['hero.ask.water', 'mara.water', ...remarks(18.5), ...mine('square.evening')]);
    expect(new Set(d.soon('rillford_reeve', s, 2))).toEqual(new Set(['hero.ask.water', 'mara.water', ...remarks(2)]));
  });

  it('predicts the exchange that talking plays, repeatable ones in their turn', () => {
    const { d, said } = director();
    const s = state();
    for (let i = 0; i < 14; i++) {
      const next = d.soon('caravan_master', s, 10).filter((id) => TALKS.some((t) => t.npc === 'caravan_master' && t.reply === id));
      d.talk('caravan_master', here, s);
      run(d, 30);
      expect(said.at(-1)!.line, `talk ${i}`).toBe(next[0]);
    }
  });
});

describe('the hero keeps his remarks for a pause', () => {
  it('waits for a conversation to finish before remarking, and drops a remark that has waited too long', () => {
    const said: string[] = [];
    const d = new SpeechDirector({ say: (line) => { said.push(line); return 4; }, caption: () => {} });
    const s = createInitialState('slot-1');
    d.talk('mill_hand', () => ({ x: 0, y: 0, z: 0 }), s);
    d.hero('arrival.bell', { delay: 1 });
    for (let t = 0; t < 3.9; t += 0.05) d.update(0.05);
    expect(said).toEqual(['bess.intro']);
    for (let t = 0; t < 1; t += 0.05) d.update(0.05);
    expect(said).toEqual(['bess.intro', 'hero.arrival.bell']);
    // A remark due during a long exchange is let go after twenty seconds.
    const long = new SpeechDirector({ say: (line) => { said.push(line); return line.startsWith('hero') ? 1 : 30; }, caption: () => {} });
    said.length = 0;
    long.talk('village_baker', () => ({ x: 0, y: 0, z: 0 }), s);
    long.hero('beast', { delay: 0.5 });
    for (let t = 0; t < 40; t += 0.05) long.update(0.05);
    expect(said).toEqual(['hesper.intro']);
  });
});

describe('overheard, and waiting for a voice', () => {
  const here = (npc: string) => ({ x: npc.length, y: 1.6, z: 0 });
  it('plays a scene in turns from where each person stands, once a day, holding both of them', () => {
    const said: { line: string; at?: { x: number } }[] = [];
    const d = new SpeechDirector({ say: (line, at) => { said.push({ line, at }); return 2; }, caption: () => {} });
    const scene = SCENES.find((s) => s.id === 'quarry.waiting')!;
    expect(d.scene(scene, 0, here)).toBe(true);
    expect(d.scene(scene, 0, here)).toBe(false);
    // Nobody starts a conversation with either of them in the middle of it.
    expect(d.talk('quarry_foreman', () => here('x'), createInitialState('slot-1'))).toBe(false);
    for (let t = 0; t < 30; t += 0.05) d.update(0.05);
    expect(said.map((x) => x.line)).toEqual(scene.lines);
    expect(said[0]!.at).toEqual(here('quarry_foreman'));
    expect(said[1]!.at).toEqual(here('quarry_hand'));
    expect(d.sceneDue(scene, 0)).toBe(false);
    expect(d.sceneDue(scene, 1)).toBe(true);
  });

  it('holds a line back while its voice loads, then goes ahead without it if it never comes', () => {
    const tries: string[] = [];
    const captions: string[] = [];
    let ready = false;
    const d = new SpeechDirector({ say: (line) => { tries.push(line); return ready ? 2 : null; }, caption: (_, text) => captions.push(text) });
    d.hero('beast');
    expect(captions).toHaveLength(0);
    for (let t = 0; t < 0.6; t += 0.05) d.update(0.05);
    ready = true;
    for (let t = 0; t < 0.3; t += 0.05) d.update(0.05);
    expect(captions).toEqual(['That is no dog.']);
    for (let t = 0; t < 2.5; t += 0.05) d.update(0.05);
    ready = false;
    expect(d.hero('victory')).toBe(true);
    for (let t = 0; t < 5; t += 0.05) d.update(0.05);
    expect(captions.at(-1)).toBe('Stay down. Please.');
    expect(tries.filter((l) => l === 'hero.victory').length).toBeGreaterThan(10);
  });
});

describe('speech in the world', () => {
  it('reads the hero\'s question before it is asked, so the answer lands after it', () => {
    const say = vi.fn((_line: string) => 1);
    const d = new SpeechDirector({ say, caption: () => {} });
    d.talk('caravan_master', () => ({ x: 0, y: 0, z: 0 }), createInitialState('slot-1'));
    expect(say).toHaveBeenCalledTimes(1);
    expect(say.mock.calls[0]![0]).toBe('hero.ask.where');
  });
});
