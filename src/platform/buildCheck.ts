/**
 * The hosted build publishes version.json beside index.html. GitHub Pages lets browsers keep index.html for ten
 * minutes, so a tester can open the link and still get the build before the latest merge. Asking for version.json
 * without the cache tells the running build whether main has moved on; it can then reload itself once on start, or
 * offer a reload from the pause menu.
 */
export interface LiveBuild { version: string; revision: string }

const REVISION = /^[0-9a-f]{7,40}$/;

export function parseLiveBuild(value: unknown): LiveBuild | null {
  if (value === null || typeof value !== 'object') return null;
  const { version, revision } = value as Record<string, unknown>;
  if (typeof version !== 'string' || typeof revision !== 'string' || !REVISION.test(revision)) return null;
  return { version, revision: revision.slice(0, 7) };
}

/** The live build when it differs from the one running; never for a local or unstamped build. */
export function newerBuild(running: string, live: LiveBuild | null): LiveBuild | null {
  if (!live || !REVISION.test(running)) return null;
  return live.revision !== running.slice(0, 7) ? live : null;
}

export async function fetchLiveBuild(fetchImpl: typeof fetch = fetch, base = './', now = Date.now()): Promise<LiveBuild | null> {
  try {
    const response = await fetchImpl(`${base}version.json?t=${now}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return parseLiveBuild(await response.json());
  } catch {
    return null;
  }
}

const RELOADED = 'tervain:reloaded-for';

/** One automatic reload per live revision, so a CDN still serving the old page can never cause a reload loop. */
export function shouldReloadFor(live: LiveBuild, storage: Pick<Storage, 'getItem' | 'setItem'> | null): boolean {
  try {
    if (!storage || storage.getItem(RELOADED) === live.revision) return false;
    storage.setItem(RELOADED, live.revision);
    return true;
  } catch {
    return false;
  }
}
