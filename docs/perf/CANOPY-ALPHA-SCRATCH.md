# Reuse alpha-audit triangle corners

The alpha-aware crown detector samples each triangle on a six-step barycentric grid (28 samples). Each opaque sample previously constructed and loaded three identical corner vectors. Those corners now load once per triangle into three scratch vectors per component scan. Point accumulation order, sampling, thresholds and output are unchanged.

```sh
node tools/repro-canopy-alpha-scratch.mjs proofs/canopy-alpha-scratch/report.json
npx vitest run tests/presentation/canopyAudit.test.ts
npm run typecheck
```

The repro loads the published `421d34b` detector and the corrected source through Vite, instruments explicit no-argument Vector3 constructions in each, and runs the same 200-triangle opaque fixture. Count: **17,079 → 282** (98.3% reduction in these constructions). Full audit reports, including operation counters, are exactly equal. The counter does not include library-internal allocations or clones, and is not a heap profile.

This only reduces diagnostic work when an alpha-aware crown scan runs. It does not reduce ordinary gameplay frame cost, repair tree assets, establish live tree-quality scores, or measure hardware performance. Rendering is untouched. Live reference: https://ael-dev3.github.io/Tervain/ ; foliage tracking: issue #326.
