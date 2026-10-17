# Skip discarded connectivity work in alpha-aware crown audits

The published [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/) crown audit first welds every leaf vertex, builds a vertex-connectivity graph and groups its triangles. With a decoded cutout, it then ignores that graph and returns separate opaque-triangle components instead. The discarded preparation adds coordinate quantization, string keys, parent storage and group construction to every cold masked-template audit.

Move the welded-graph preparation after the alpha-mode return. Keep the full finite-position check before alpha sampling, including when the mask is fully transparent. Unmasked and missing-cutout fallback paths retain their existing graph and validation. Sampling, support searches, thresholds, operation charging and reported candidates are unchanged.

## Native matched proof

`tools/repro-live-canopy-alpha-weld.mjs` compiles the actual baseline and candidate audit sources, then runs cold audits against three masked native near-detail templates from the published Low-preset world:

| Species | Leaf vertices | Triangles |
| --- | ---: | ---: |
| Oak | 21,916 | 10,958 |
| Birch | 22,276 | 11,138 |
| Pine | 5,994 | 5,328 |

| Measurement | Baseline | Candidate |
| --- | ---: | ---: |
| Alpha-mode weld coordinate rounding calls | 150,558 | 0 |
| Weld keys constructed before alpha sampling | 50,186 | 0 |
| Complete alpha report SHA-256 | `13ab200c…05ae1d09` | same |
| Charged alpha audit operations | 9,546,689 | 9,546,689 |
| Unmasked weld rounding calls | 150,558 | 150,558 |
| Complete unmasked report SHA-256 | `48baef4b…40270869` | same |
| Native Grade/post pixels | baseline | identical |

Each welded key uses three coordinate-rounding calls; the key count is derived from the measured calls and source, not a total heap-allocation measurement. The skipped vertex graph was not charged by the existing operation counter, which therefore remains unchanged.

Full hashes include per-tree outputs, candidate positions, detached-card/clump counts, coverage and charged operations. In this three-tree baseline sample, the alpha audit still reports 940 detached-card candidates in 564 clumps. Those diagnostic approximations are unchanged; this is **not a floating-foliage fix or visual quality PASS**, and does not replace the other audit-correctness fixes.

Receipts: [JSON](../../proofs/canopy-alpha-weld/report.json), [before](../../proofs/canopy-alpha-weld/before.png), [after](../../proofs/canopy-alpha-weld/after.png).

## Reproduce

```sh
node tools/repro-live-canopy-alpha-weld.mjs --url https://ael-dev3.github.io/Tervain/ --out canopy-alpha-weld-proof
npx vitest run tests/presentation/canopyAudit.test.ts
npm run build
```

The native script requires complete alpha reports, exactly matching full report hashes in both modes, zero alpha weld-round calls, unchanged unmasked calls and identical images. The recorded run passes. All 14 canopy tests and the production build pass. The malformed-position regression also checks a fully transparent cutout, so skipping graph construction cannot hide invalid geometry.

This reduces offline foliage-diagnosis work. It does not change trees, materials, game rendering, measured frame times or hardware FPS. The historical live16 spikes and night/mud hitch remain unproven; no hardware play-gate receipt is claimed.
