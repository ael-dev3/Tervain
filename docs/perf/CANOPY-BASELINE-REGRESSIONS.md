# A global canopy count can hide a newly affected tree

`audit-canopy.mjs --baseline` previously accepted a complete audit when its total candidate count was no greater than the baseline. That can hide a regression: fix one tree's detached clump and introduce one on another tree, and the unchanged total passes.

Compare candidate counts by registered tree label instead. Reject any per-tree increase, missing/new/duplicate labels, incomplete population, inconsistent summaries, or changed gap/scope. Return the offending tree labels and counts in `baselineComparison`. Decreasing candidate counts on every tree still passes.

## Before/after repro

The script calls the actual geometric canopy audit on two controlled trees, each with the same wood and a small crown component. Moving a component five metres from its wood makes one detached candidate. In the baseline, tree A is detached and B supported. The regression restores A and detaches B.

| Control | Total candidates | Old gate | Updated gate |
| --- | ---: | --- | --- |
| A detached, B supported → A supported, B detached | 1 → 1 | PASS | FAIL: B 0 → 1 |
| Both restored | 1 → 0 | PASS | PASS |
| Unchanged baseline | 1 → 1 | PASS | PASS |

[Receipt and comparator source hash](canopy-baseline-proof/report.json). Re-run:

```sh
node tools/repro-canopy-baseline.mjs --out canopy-baseline-proof.json
npx vitest run tests/presentation/canopyBaseline.test.ts tests/presentation/canopyAudit.test.ts
npm run typecheck
```

17 audit/comparator tests pass. The repro invokes the production audit through Vite's server module transform and asserts the old false pass, new rejection, unchanged control and improvement control. No renderer, model, material or visual behavior changes; screenshots would not verify this JSON comparison bug.

## Limits

This hardens the baseline comparison; it does not change the underlying component detector or make its results alpha-aware. Transparent-card bridges still require the alpha-aware geometry work demonstrated by #407. Counts within one tree can still conceal a different clump replacing another at equal count. Candidate locations require visual review, and hardware/video gates remain separate.
