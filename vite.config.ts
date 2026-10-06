import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import packageJson from './package.json' with { type: 'json' };
import packageLock from './package-lock.json' with { type: 'json' };
import { defineConfig } from 'vitest/config';
import { gothic3LocalData } from './tools/gothic3LocalData.ts';
import { hostedModelDelivery, productionModelAssetBase } from './tools/modelAssetDelivery.ts';

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
export default defineConfig(({ command, mode }) => {
  const modelBase = productionModelAssetBase(command, mode, process.env);
  return {
    base: command === 'build' ? './' : '/',
    // Development only: serves a local Gothic 3 Data folder (G3_DATA) to /gothic3-local/; see tools/gothic3LocalData.ts.
    plugins: [gothic3LocalData(), hostedModelDelivery(modelBase)],
    define: {
      __GAME_VERSION__: JSON.stringify(packageJson.version),
      __SOURCE_REVISION__: JSON.stringify(sourceRevision()),
      __MODEL_ASSET_BASE__: JSON.stringify(modelBase),
    },
    server: {
      watch: {
        // These generated study archives are served/read on demand, not application sources.
        // Keep src/gothic3 and assets/gothic3 receipts/manifests watched for normal HMR.
        ignored: ['**/assets/gothic3/**/sources{,/**}', '**/public/gothic3{,/**}'],
      },
    },
    build: {
      rolldownOptions: {
        input: {
          tervain: fileURLToPath(new URL('./index.html', import.meta.url)),
          gothic3: fileURLToPath(new URL('./gothic3/index.html', import.meta.url)),
          gothic3Local: fileURLToPath(new URL('./gothic3-local/index.html', import.meta.url)),
        },
      },
      target: 'es2023',
      chunkSizeWarningLimit: 1200,
    },
    test: {
      include: ['tests/**/*.test.ts'],
      environment: 'node',
      // Geometry and inline painting are CPU-heavy; avoid competing workers causing spurious timeouts.
      maxWorkers: 2,
    },
  };
});
