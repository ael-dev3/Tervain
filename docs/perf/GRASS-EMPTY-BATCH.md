# Grass GPU steps without temporary empty batches

Related: #326 motion/performance checklist. Published target: [Pages](https://ael-dev3.github.io/Tervain/), 0.0.18 · 421d34b.

The trample field advances at 30 Hz. Each step previously sliced its pending brush queue and spread the result together with the current movers, even when there were no pending samples to append. Use the existing mover list directly in that case. Steps with appended samples retain the original batching and queue ownership.

## Reproduce

```sh
node tools/repro-live-grass-empty-batch.mjs --url https://ael-dev3.github.io/Tervain/ --out grass-empty-batch-proof
```

The script loads the published game and runs the baseline and candidate `GrassTrample` implementations on its software-WebGL renderer. It advances a moving body for 360 updates at 60 Hz, then queues 103 brush samples and exercises three catch-up steps. It compares every submitted mover/recovery input, the full half-float GPU field bytes, and a rendered diagnostic view of that field. Nonzero field data and a fully consumed queue are required; an empty/no-op render cannot pass.

[Machine-readable receipt](../../proofs/grass-empty-batch/report.json) · [before field](../../proofs/grass-empty-batch/before.png) · [after field](../../proofs/grass-empty-batch/after.png).

Receipt: **360 → 0 temporary lists** across 180 ordinary steps; all **185 passes**, submitted inputs, **16,384 half-float field channels**, and diagnostic pixels match. The field has 6,046 nonzero channels; all 103 queued samples drain.

This removes two temporary lists per ordinary fixed step (slice and spread). It adds no retained storage or draw/shader changes. This is an allocation-site count, not a total heap measurement, hardware timing result, or grass-shimmer/pop-in fix. Hardware 60 Hz frame pacing still needs its own gate.

Validation: 22 existing trample/grass tests, including 60/120 Hz sample retention, overflow batches, catch-up, failed GPU passes and disposal. Production build also required.
