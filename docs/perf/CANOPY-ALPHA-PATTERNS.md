# Cache repeated atlas coverage during crown audits

Alpha-aware crown audits test 28 barycentric positions per leaf triangle. Atlas cards reuse UV triangles, but the published audit evaluates their same alpha values again for every card. Cache the accepted barycentric weights by the six ordered UV coordinates within each component scan. Every triangle still creates its own ordered surface samples; geometry bounds, contacts, operation charging and candidate decisions remain unchanged.

This PR builds on #499's scratch-vector change. The cache is local to one cutout/scan, including fully transparent patterns; it cannot survive into another mask, geometry scan or audit invocation. It does not alter production foliage.

## Reproduce

```sh
node tools/repro-live-canopy-patterns.mjs --out canopy-pattern-proof
npx vitest run tests/presentation/canopyAudit.test.ts
npm run build
```

The tool defaults to https://ael-dev3.github.io/Tervain/. It selects up to three smallest masked wood/leaf geometry pairs per retained Low forest LOD. Both actual audit sources run against the same native geometry and cutout callbacks. The baseline is pinned to #499's source commit; the published input build remains 0.0.18 · 421d34b.

The replay uses nine targets, three at each LOD. Alpha callback evaluations fall **640,584→47,376**. Every ordered opaque sample and complete audit report hashes identically, including the operation counts. Fourteen existing audit tests and production build pass.

[Full per-target receipt](../../proofs/canopy-alpha-patterns/report.json). The tool also asserts nonempty opaque samples and complete individual reports, so an empty/unavailable mask cannot provide a passing optimization comparison.

This is diagnostic CPU work and sampled native-input proof. It is not full-population coverage, proof that floating foliage is fixed, or a measurement of load time, heap allocation bytes, hardware FPS or the night/mud hitch. There are no render/draw/triangle/texture/upload changes or changed images to illustrate. Existing cutout correctness fixes (#486/#489/#501) remain separate. Hardware play gate is still required before shipping.
