import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const MODEL_HOST = 'https://raw.githubusercontent.com/ael-dev3/Tervain/';
/** Conservatively enforce the published site's 1 GB limit in bytes after models are omitted. */
export const PAGES_SITE_BYTE_LIMIT = 1_000_000_000;

export function productionModelAssetBase(command: string, mode: string, env: NodeJS.ProcessEnv): string {
  if (command !== 'build' || mode !== 'production' || env.GITHUB_ACTIONS !== 'true') return '';
  if (!/^[0-9a-fA-F]{40}$/.test(env.GITHUB_SHA ?? '')) {
    throw new Error('A hosted production build requires a full 40-character GITHUB_SHA for original model delivery.');
  }
  return `${MODEL_HOST}${env.GITHUB_SHA!.toLowerCase()}/public/models/`;
}

/** Guard the only removable target before touching it: this project's real, non-symlinked dist/models. */
export function pagesModelArtifactTarget(root: string, outDir: string): string {
  const project = fs.realpathSync(root);
  const output = path.resolve(root, outDir);
  if (output !== path.resolve(root, 'dist')) throw new Error('Model omission is allowed only in the project dist artifact.');
  const outputStat = fs.lstatSync(output);
  if (!outputStat.isDirectory() || outputStat.isSymbolicLink() || fs.realpathSync(output) !== path.join(project, 'dist')) {
    throw new Error('Model omission requires a real project dist directory.');
  }
  const target = path.join(output, 'models');
  if (fs.existsSync(target)) {
    const stat = fs.lstatSync(target);
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(target) !== path.join(project, 'dist', 'models')) {
      throw new Error('Model omission requires a real dist/models directory.');
    }
  }
  return target;
}

export function artifactBytes(directory: string): number {
  let bytes = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('The Pages artifact must not contain symlinks.');
    if (entry.isDirectory()) bytes += artifactBytes(file);
    else if (entry.isFile()) bytes += fs.statSync(file).size;
  }
  return bytes;
}

export function omitPagesModelCopies(root: string, outDir: string): number {
  const target = pagesModelArtifactTarget(root, outDir);
  const removed = fs.existsSync(target) ? artifactBytes(target) : 0;
  // Vite has finished copying public/. Source models and fixtures remain untouched.
  fs.rmSync(target, { recursive: true, force: true });
  return removed;
}

export function finalizePagesModelArtifact(root: string, outDir: string): { removed: number; bytes: number } {
  const removed = omitPagesModelCopies(root, outDir);
  const bytes = artifactBytes(path.resolve(root, outDir));
  if (bytes > PAGES_SITE_BYTE_LIMIT) throw new Error(`Pages artifact is ${bytes} bytes after model omission; maximum is ${PAGES_SITE_BYTE_LIMIT}.`);
  return { removed, bytes };
}

export function hostedModelDelivery(modelBase: string): Plugin {
  let root = '', outDir = '';
  return {
    name: 'immutable-original-model-delivery',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = config.build.outDir;
    },
    closeBundle() {
      if (!modelBase) return;
      const { removed, bytes } = finalizePagesModelArtifact(root, outDir);
      console.info(`Original models: ${removed} bytes served from the build commit; Pages artifact: ${bytes} bytes.`);
    },
  };
}
