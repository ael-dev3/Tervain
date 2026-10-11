import { describe, expect, it } from 'vitest';
import { MODEL_FILES } from '../../src/presentation/assets/modelFiles';
import { JOURNEY_MODEL_FILES } from '../../src/presentation/journeyPrefetch';

describe('the journey files fetched ahead from the menu (A86)', () => {
  it('names only shipped model files, each once: the wanderer first, then every tree near file before any mid or far', () => {
    expect(JOURNEY_MODEL_FILES.length).toBeGreaterThan(40);
    expect(new Set(JOURNEY_MODEL_FILES).size).toBe(JOURNEY_MODEL_FILES.length);
    for (const file of JOURNEY_MODEL_FILES) expect(MODEL_FILES[file], file).toBeDefined();
    expect(JOURNEY_MODEL_FILES[0]).toMatch(/^hero\//);
    const trees = JOURNEY_MODEL_FILES.filter((file) => file.startsWith('flora/meshy-012/'));
    const lastNear = trees.map((file) => file.endsWith('-near.glb')).lastIndexOf(true);
    const firstOther = trees.findIndex((file) => !file.endsWith('-near.glb'));
    expect(lastNear).toBeLessThan(firstOther);
  });
});
