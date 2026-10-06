import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HUNTING_SOUND_KINDS } from '../../src/presentation/huntingAudio';

describe('packaged hunting recordings', () => {
  it('ships six unique verified local assets with matching provenance and bounded duration/headroom', () => {
    const docs = readFileSync(resolve('docs/engineering/hunting-sounds.json'));
    const published = readFileSync(resolve('public/assets/audio/hunting/manifest.json'));
    expect(published.equals(docs)).toBe(true);
    const manifest = JSON.parse(docs.toString('utf8')) as {
      status: string; modelId: string;
      assets: { id: string; path: string; modelId: string; sha256: string; bytes: number;
        durationSeconds: number; peakDbfs: number; channels: number; sampleRate: number; loop: boolean }[];
    };
    expect(manifest.status).toBe('complete');
    expect(manifest.modelId).toBe('eleven_text_to_sound_v2');
    expect(manifest.assets.map((asset) => asset.id).sort()).toEqual([...HUNTING_SOUND_KINDS].sort());
    expect(new Set(manifest.assets.map((asset) => asset.sha256)).size).toBe(6);
    for (const asset of manifest.assets) {
      expect(asset.path).toBe(`public/assets/audio/hunting/${asset.id}.mp3`);
      const data = readFileSync(resolve(asset.path));
      expect(createHash('sha256').update(data).digest('hex')).toBe(asset.sha256);
      expect(data.length).toBe(asset.bytes);
      expect(asset.bytes).toBeLessThan(120_000);
      expect(asset.modelId).toBe(manifest.modelId);
      expect(asset.channels).toBe(1);
      expect(asset.sampleRate).toBe(44100);
      expect(asset.durationSeconds).toBeGreaterThanOrEqual(0.4);
      expect(asset.durationSeconds).toBeLessThanOrEqual(4);
      expect(Number.isFinite(asset.peakDbfs)).toBe(true);
      expect(asset.peakDbfs).toBeLessThan(-1.9);
      expect(asset.loop).toBe(asset.id === 'skinning');
    }
  });
});
