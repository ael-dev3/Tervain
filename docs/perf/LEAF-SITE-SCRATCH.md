# Reuse UV state while preparing falling-leaf release sites

Published source: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). Related checklist: [#326](https://github.com/ael-dev3/Tervain/issues/326).

`sampleLeafSurfaceSites` prepares each tree's cached falling-leaf origins. Every valid sampled face previously rebuilt the same texture matrix and requested a temporary UV vector. Prepare that state once per texture in the synchronous batch, reset its UV point for each sample, and discard it when the batch returns. A later call prepares fresh state, so texture-transform changes between calls still apply. The single-sample public helper retains its existing fresh-state behaviour.

The replay verifies that the parent sampling functions match the published source, then reads ten native oak/birch/orchard near templates and their actual release caches. Those are the species used by the falling-leaf system.

| Check | Parent | Candidate |
| --- | ---: | ---: |
| UV matrix preparation calls | 4,993 | 10 |
| UV vector constructor requests | 4,993 | 10 |
| Release points, every coordinate equal | 3,584 | 3,584 |

All parent results exactly match the native cached release points. All 77 actual runtime stream origins match those sources. The receipt retains coordinate hashes in source order and the stream-origin evidence. The unchanged coordinates are the visual-output contract: no emission locations, geometry, materials, shaders or draws change.

The exploratory timing uses uninstrumented modules, twenty alternating warm-up passes per variant and five alternating timed samples. Each timed sample runs twenty passes across the ten-template corpus. Medians are 68.3 / 48.7 ms, but the ranges overlap (28.6–75.7 / 31.1–85.0 ms), so no reliable CPU-time reduction is claimed. Samples are retained in the receipt. These are cloud CPU measurements, not normal loading-time measurements, Mac frame timings or a hardware play-gate receipt. Constructor requests are not measured heap allocations or GC spikes. The caches are normally generated once per variant at preparation time.

[Machine-readable receipt](proofs/leaf-site-scratch/report.json) · [Pre-change unchanged-source control](proofs/leaf-site-scratch/unchanged-source.json)

Run from the repository root:

```sh
node tools/repro-live-leaf-site-scratch.mjs --out leaf-site-scratch-proof
```

The default target is the published build; `--url` accepts another served build. Parent source is pinned to `736d8711b`. The pre-change control fails the reduction assertion with 4,993 matrix/vector requests in both variants. `--candidate-ref 736d8711b` restores that parent for the same negative control. Only the final receipt's before/after timing samples share the twenty-pass timing scope; the pre-change control records an earlier single-pass timing scope and is used for constructor/output assertions.

32 focused tests, type-check and production build pass. The new functional test changes a texture's transform between batches and checks independent face samples without mutating the template matrix. Hardware verification remains pending. `docs/perf/LATEST.md` remains `live16`; no change to its >25 ms missed-refresh frames is established here.

A separate stale-release-cache hypothesis did not reproduce on this corpus: resampling the current crowns produces the same cached origins, and the 77 actual streams remain on their source surfaces. This optimization does not claim a floating-crown, sparkle or pop-in appearance fix.
