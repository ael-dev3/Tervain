# Wood-detached foliage must participate in the crown gate

The canopy detector measures both disconnected crown chunks (`candidates`) and clumps beyond the wood-reach limit (`detachedCards` / `detachedClumps`). The command-line gate previously checked only the first metric, including when comparing a baseline. A chain of nearby cards could pass while its outer leaves remained unsupported.

Run the deterministic production-detector repro:

```sh
node tools/repro-canopy-detached-gate.mjs proofs/canopy-detached-gate/report.json
npx vitest run tests/presentation/canopyDetachedGate.test.ts tests/presentation/canopyBaseline.test.ts
```

The controlled five-component crown forms one connected chunk and has zero disconnected candidates, but two cards form one clump beyond the 1.5 m wood-reach threshold. Before: gate passes. After: gate fails. A supported crown still passes.

`tools/audit-canopy.mjs` now gates both measurements. Without a baseline, unsupported counts must be zero. With a baseline, neither detached count may increase on any tree; a lower forest total cannot conceal a newly affected tree. Missing measurements, inconsistent summaries and changed wood-reach thresholds fail. Explicitly leafless trees retain their valid zero-foliage coverage.

The receipt uses the production detector on controlled geometry. This does not establish current live tree counts, repair tree assets, measure hardware performance, or replace the live walk/video gate. Rendering and production game code are unchanged. Live comparison target remains https://ael-dev3.github.io/Tervain/ ; the open playtest checklist is issue #326.
