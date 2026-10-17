# Keep leaf contact on the far tree model

Published source: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). Related checklist: [#326](https://github.com/ael-dev3/Tervain/issues/326).

The forest repairs detached opaque leaf islands on the near and middle models, then skips that repair at far detail. The far model can therefore reintroduce unsupported foliage during a detail transition. Remove the detail-level exclusion and apply the existing contact rule once per template that has separate wood. Preserve the existing 0.6 m support reach, 0.7 m linking gap and instance-scale conversion. Woodless billboards remain outside this pass.

The native replay covers 17 distinct far templates representing 225 of 341 selected trees. The remaining 116 trees use woodless far billboards and are explicitly reported as uncovered. Nine templates contain a total of 174 islands moved by the existing repair. No triangles are dropped or added.

A positive opaque-needle witness on fir `tree:1:54`, far triangle 490, sits at world position approximately (79.91, 7.46, 94.53). Independent 48-step alpha sampling measures its nearest wood gap at **1.683 m before / 0.480 m after**. The native-material macro changes 20,262 channels; hiding the needle changes 10,000. An isolated full-tree fixture at 100 m changes 93 channels, with 42,251 channels changed by its hidden-foliage control. These captures go through the published postprocessing path.

The indexed crown extents retain effectively 100% of their original X/Z width across every replayed template. All repaired vertices fit the existing culling sphere plus its existing guard. Vertex count increases 33,188 → 33,655 because differently moving triangles split shared vertices; the index counts remain unchanged. Static leaf attribute/index payload decreases 1,406,128 → 1,358,744 bytes because rebuilding the indices also selects a smaller integer type where possible. This is geometry payload, not a measured per-frame upload saving.

The 100 m fixture renders 48 calls / 346,297 triangles in both variants. It isolates a native tree and is not a normal full-world walk, visual-quality score, or hardware frame-time receipt.

**Loading tradeoff:** this cold, isolated far-template replay allocates 48 MiB of decoded alpha channels and about 16 MiB of alpha-max levels. It records about 1.6 seconds in the instrumented repair/culling-check loop. These are CPU caches and loading work, not new GPU textures or per-frame work. The figures exclude allocator overhead and are not a measured incremental resident-memory or full startup-time change: some caches may already exist in a complete world. Hardware/loading review remains required, especially on integrated GPUs.

[Receipt](proofs/far-leaf-contact/report.json) · [Macro before](proofs/far-leaf-contact/before.png) · [Macro after](proofs/far-leaf-contact/after.png) · [100 m before](proofs/far-leaf-contact/far-before.png) · [100 m after](proofs/far-leaf-contact/far-after.png)

Run from the repository root:

```sh
node tools/repro-live-far-leaf-contact.mjs --out far-leaf-contact-proof
```

The default target is the published build; `--url` accepts another served build. The reproducer reads the candidate's actual repair guard and replays the same repair routine on clones of untouched published far templates. Its integration test also exercises `buildFlora` itself with a detached far card: the old guard leaves a 13.55 m gap and fails the 0.6 m assertion; the candidate passes. Parent reference: `9b4b97363`. Running the replay with `--candidate-ref 9b4b97363` must fail because no far witness is repaired. The [executed unchanged-source receipt](proofs/far-leaf-contact/unchanged-source.json) records that expected failure.

48 focused and forest integration tests pass. Type-check and production build pass. Hardware/video review remains pending. `docs/perf/LATEST.md` is still `live16`; this fix does not establish a change to its walk-fence, run-round, bow or resume missed-refresh frames.
