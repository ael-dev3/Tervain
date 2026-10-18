import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Explicit refs keep a newer live geometry/culling implementation from being
// silently compared with an older candidate. This is source evidence, not FPS.
const [baseline, candidate, output] = process.argv.slice(2);
assert.ok(baseline && candidate && output, 'Usage: baseline candidate output.json');
fs.rmSync(output, { force: true });
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });
const resolve = ref => git('rev-parse', `${ref}^{commit}`).trim();
const before = resolve(baseline), after = resolve(candidate);
const changed = git('diff', '--name-only', before, after, '--', 'src').trim().split('\n').filter(Boolean);
const material = 'src/presentation/foliage/foliageMaterial.ts';
assert.deepEqual(changed, [material], 'Runtime outside the crown shader differs from the baseline');
const oldSource = git('show', `${before}:${material}`);
const newSource = git('show', `${after}:${material}`);
const oldLine = '      diffuseColor.a = clamp( tvCov + ( tvIgn - 0.5 ) * 0.25 * tvInRamp, 0.0, 1.0 );';
const start = newSource.indexOf('      // A minified leaf already integrates several texels.');
const end = newSource.indexOf('\n      if ( diffuseColor.a <= 0.0 ) discard;', start);
assert.ok(start >= 0 && end > start, 'Missing stipple change');
const restored = (newSource.slice(0, start) + oldLine + newSource.slice(end))
  .replace('leaf-focus-world1-gap1-mip1-minstipple1', 'leaf-focus-world1-gap1-mip1')
  .replace('leaf-focus-world1-gap1-minstipple1', 'leaf-focus-world1-gap1');
assert.equal(restored, oldSource, 'Unexpected additional material changes');
const hash = source => createHash('sha256').update(source).digest('hex');
const report = {
  baseline: before, candidate: after,
  runtimeFilesChanged: changed,
  baselineShaderSha256: hash(oldSource), candidateShaderSha256: hash(newSource),
  assertions: { geometryAndCullingSourcesIdentical: true, onlyStippleAndProgramKeyChanged: true },
  shaderCost: { addedTextureInstructions: 0, addedSmoothstep: 1,
    note: 'Additional scaling/subtraction ALU; compiled instruction count and hardware cost are not measured.' },
  scope: 'Committed runtime source comparison. Does not replace matched rendered counts or motion evidence.',
  pass: true,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
