import { execSync } from 'node:child_process';
import packageJson from './package.json' with { type: 'json' };
import packageLock from './package-lock.json' with { type: 'json' };
import { defineConfig } from 'vitest/config';

if (!/^0\.0\.\d+$/.test(packageJson.version)) {
  throw new Error(`Tervain must stay on the 0.0.x build line until its quality gate is met (got ${packageJson.version}).`);
}

if (packageLock.version !== packageJson.version || packageLock.packages[''].version !== packageJson.version) {
  throw new Error(
    `Tervain package-lock.json must match package.json ${packageJson.version} (lockfile: ${packageLock.version}; root package: ${packageLock.packages[''].version}).`,
  );
}

function sourceRevision(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

// The site is served from https://ael-dev3.github.io/Tervain/ so assets need a repo-relative base.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  define: {
    __GAME_VERSION__: JSON.stringify(packageJson.version),
    __SOURCE_REVISION__: JSON.stringify(sourceRevision()),
  },
  build: {
    target: 'es2023',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
