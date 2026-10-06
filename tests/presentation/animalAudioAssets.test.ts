import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ANIMAL_AUDIO } from '../../src/presentation/sound/animalAudio';

const ROOT = path.resolve(__dirname, '../..');
const sha256 = (file: string) => createHash('sha256').update(fs.readFileSync(path.join(ROOT, file))).digest('hex');
interface FileRecord { path: string; bytes: number; sha256: string }
interface AnimalAsset {
  id: string; species: string; variant: number; prompt: string; model: string; generated: string;
  seconds: number; preparedSeconds: number; source: FileRecord; derivatives: FileRecord[];
}
const plan = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/world-audio/animals.json'), 'utf8')) as {
  assets: { id: string; prompt: string; model: string; sourceSha256: string }[];
};
const provenance = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/engineering/animal-audio-assets.json'), 'utf8')) as {
  generator: { service: string; model: string; generationDate: string; paidGenerationPlan: string; planSha256: string; scope: string };
  terms: { attribution: string; license: string; sourceTermURL: string }; processing: { channels: number; peakLimitDb: number }; assets: AnimalAsset[];
};

describe('prepared animated animal sound assets', () => {
  const files = Object.values(ANIMAL_AUDIO.species).flatMap((animal) => [...animal.files]).sort();

  it('ships two Opus calls and AAC fallbacks per species, all with provenance', () => {
    expect(provenance.assets.map((asset) => asset.id).sort()).toEqual(files);
    expect(fs.readdirSync(path.join(ROOT, 'public', ANIMAL_AUDIO.base)).sort()).toEqual(files.flatMap((file) => [`${file}.m4a`, `${file}.ogg`]).sort());
    expect(provenance.processing.channels).toBe(1);
    expect(provenance.processing.peakLimitDb).toBeLessThan(0);
    for (const file of files) {
      const ogg = fs.readFileSync(path.join(ROOT, 'public', ANIMAL_AUDIO.base, `${file}.ogg`));
      expect(ogg.subarray(0, 4).toString('latin1'), file).toBe('OggS');
      expect(ogg.subarray(28, 36).toString('latin1'), file).toBe('OpusHead');
      // OpusHead's channel-count byte: positioned calls must retain mono spatialization.
      expect(ogg[37], file).toBe(1);
      const m4a = fs.readFileSync(path.join(ROOT, 'public', ANIMAL_AUDIO.base, `${file}.m4a`));
      expect(m4a.subarray(4, 8).toString('latin1'), file).toBe('ftyp');
    }
  });

  it('keeps unchanged generated sources, actual model and every derivative hash reviewable', () => {
    expect(provenance.generator.service).toBe('ElevenLabs');
    expect(provenance.generator.model).toBe('eleven_text_to_sound_v2');
    expect(provenance.generator.paidGenerationPlan).toBe('Creator');
    expect(provenance.generator.generationDate).toBe('2026-10-06');
    expect(provenance.generator.planSha256).toBe(sha256('tools/world-audio/animals.json'));
    expect(provenance.generator.scope).toContain('excludes Eleven Music and speech');
    expect(provenance.terms.attribution).toContain('ElevenLabs (elevenlabs.io)');
    expect(provenance.terms.license).toContain('not offered as Creative Commons');
    expect(provenance.terms.sourceTermURL).toContain('help.elevenlabs.io');
    expect(fs.readdirSync(path.join(ROOT, 'assets/audio/source/animals')).sort()).toEqual(files.map((file) => `${file}.mp3`));
    for (const asset of provenance.assets) {
      const planned = plan.assets.find((candidate) => candidate.id === asset.id)!;
      expect(asset.id).toBe(`${asset.species}-${asset.variant}`);
      expect(asset.prompt).toBe(planned.prompt);
      expect(asset.model).toBe(planned.model);
      expect(asset.model).toBe('eleven_text_to_sound_v2');
      expect(asset.generated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(asset.seconds).toBeGreaterThan(0.4);
      expect(asset.preparedSeconds).toBeGreaterThan(0.4);
      expect(asset.preparedSeconds).toBeLessThan(6);
      expect(asset.preparedSeconds).toBeLessThanOrEqual(asset.seconds);
      expect(asset.source.path).toBe(`assets/audio/source/animals/${asset.id}.mp3`);
      expect(asset.source.sha256).toBe(planned.sourceSha256);
      expect(asset.derivatives).toHaveLength(2);
      for (const file of [asset.source, ...asset.derivatives]) {
        expect(file.bytes).toBe(fs.statSync(path.join(ROOT, file.path)).size);
        expect(file.sha256).toBe(sha256(file.path));
      }
    }
  });
});
