import { execSync } from 'node:child_process';
import { defineConfig } from 'vitest/config';

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
  define: { __SOURCE_REVISION__: JSON.stringify(sourceRevision()) },
  build: {
    target: 'es2023',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
