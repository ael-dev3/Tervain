import { describe, expect, it } from 'vitest';
import { fetchLiveBuild, newerBuild, parseLiveBuild, shouldReloadFor } from '../../src/platform/buildCheck';

function memory() {
  const map = new Map<string, string>();
  return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
}

describe('live build check', () => {
  it('reads only a stamped version.json', () => {
    expect(parseLiveBuild({ version: '0.0.13', revision: '7e7884999313c061' })).toEqual({ version: '0.0.13', revision: '7e78849' });
    expect(parseLiveBuild({ version: '0.0.13', revision: 'unknown' })).toBeNull();
    expect(parseLiveBuild('7e78849')).toBeNull();
  });

  it('reports a newer build only for a stamped running build that differs', () => {
    const live = { version: '0.0.13', revision: 'abc1234' };
    expect(newerBuild('7e78849', live)).toBe(live);
    expect(newerBuild('abc1234', live)).toBeNull();
    expect(newerBuild('dev', live)).toBeNull();
    expect(newerBuild('unknown', live)).toBeNull();
    expect(newerBuild('7e78849', null)).toBeNull();
  });

  it('asks past every cache and fails quietly', async () => {
    let seen: [string, RequestInit | undefined] | null = null;
    const ok = (async (url: string, init?: RequestInit) => {
      seen = [url, init];
      return new Response(JSON.stringify({ version: '0.0.13', revision: 'abc1234' }));
    }) as typeof fetch;
    expect(await fetchLiveBuild(ok, './', 42)).toEqual({ version: '0.0.13', revision: 'abc1234' });
    expect(seen).toEqual(['./version.json?t=42', { cache: 'no-store' }]);
    expect(await fetchLiveBuild((async () => new Response('', { status: 404 })) as typeof fetch)).toBeNull();
    expect(await fetchLiveBuild((async () => { throw new Error('offline'); }) as typeof fetch)).toBeNull();
  });

  it('reloads at most once per live revision, so a stale CDN cannot loop', () => {
    const store = memory();
    expect(shouldReloadFor({ version: '0.0.13', revision: 'abc1234' }, store)).toBe(true);
    expect(shouldReloadFor({ version: '0.0.13', revision: 'abc1234' }, store)).toBe(false);
    expect(shouldReloadFor({ version: '0.0.13', revision: 'def5678' }, store)).toBe(true);
    expect(shouldReloadFor({ version: '0.0.13', revision: 'abc1234' }, null)).toBe(false);
  });
});
