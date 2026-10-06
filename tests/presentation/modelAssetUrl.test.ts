import { describe, expect, it } from 'vitest';
import { modelAssetUrl } from '../../src/presentation/assets/modelUrl';
import { warpkeepModelUrl } from '../../src/presentation/assets/library';
import { mainHeroUrl } from '../../src/presentation/mainHero';
import { meshyTreeUrl } from '../../src/presentation/meshyTrees';
import { meshyNpcUrl } from '../../src/presentation/meshynpcs';
import { solitaryPineUrl } from '../../src/presentation/solitaryPine';
import { broadleafUrl } from '../../src/presentation/sourceBroadleaf';
import { rockPileUrl } from '../../src/presentation/sourceRockPile';

const SHA = '0123456789abcdef0123456789abcdef01234567';
const HOSTED = `https://raw.githubusercontent.com/ael-dev3/Tervain/${SHA}/public/models/`;

describe('original model delivery', () => {
  it('keeps every model loader local under a served subdirectory', () => {
    const base = './', page = 'https://example.test/games/tervain/index.html';
    const urls = [
      mainHeroUrl(base, page),
      meshyTreeUrl('oak-elder', 'near', base, page),
      meshyNpcUrl('manifest.json', base, page),
      solitaryPineUrl('solitary-pine-under-10k.glb', base, page),
      broadleafUrl(base, page),
      rockPileUrl(base, page),
      warpkeepModelUrl('manifest.json', base, page),
    ];
    expect(urls.map((url) => url.href)).toEqual([
      'https://example.test/games/tervain/models/hero/weathered-wanderer-animated-hero.glb',
      'https://example.test/games/tervain/models/flora/meshy-012/oak-elder-near.glb',
      'https://example.test/games/tervain/models/npcs/manifest.json',
      'https://example.test/games/tervain/models/flora/solitary-pine-under-10k.glb',
      'https://example.test/games/tervain/models/scenery/ancient-guardian-broadleaf-under-20k.glb',
      'https://example.test/games/tervain/models/scenery/weathered-rock-pile-under-20k.glb',
      'https://example.test/games/tervain/models/warpkeep/manifest.json',
    ]);
    expect(modelAssetUrl('hero/hero.glb', '/', 'http://localhost:5173/', '').href).toBe('http://localhost:5173/models/hero/hero.glb');
  });

  it('pins both manifests and models to one full commit regardless of the served page', () => {
    for (const file of ['npcs/manifest.json', 'npcs/mara.glb', 'warpkeep/high/tree.glb', 'flora/meshy-012/oak-elder-near.glb', 'hero/hero.glb']) {
      expect(modelAssetUrl(file, './', 'https://example.test/Tervain/index.html', HOSTED).href).toBe(`${HOSTED}${file}`);
      expect(modelAssetUrl(file, '/', 'http://localhost:4173/', HOSTED).href).toBe(`${HOSTED}${file}`);
    }
  });

  it('rejects an unpublished or mutable production target instead of falling back locally', () => {
    for (const base of [HOSTED.replace(SHA, 'main'), HOSTED.replace(SHA, SHA.slice(0, 7)), HOSTED.replace('https:', 'http:'), HOSTED.replace('Tervain/', 'Warpkeep/')]) {
      expect(() => modelAssetUrl('hero/hero.glb', './', 'https://example.test/Tervain/', base)).toThrow(/exact production commit/);
    }
  });

  it('keeps manifest paths inside the model root on both delivery hosts', () => {
    for (const file of ['', '/hero.glb', '../hero.glb', 'npcs/../../hero.glb', 'npcs/%2e%2e/hero.glb', 'npcs/%2fhero.glb', 'https://example.test/x.glb', 'npcs\\hero.glb', 'npcs/hero.glb?bad', 'npcs/hero.glb#bad']) {
      for (const remote of ['', HOSTED]) expect(() => modelAssetUrl(file, './', 'https://example.test/Tervain/', remote)).toThrow(/Invalid model asset path/);
    }
  });
});
