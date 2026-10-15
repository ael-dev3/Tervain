# Detached-clump connectivity audit

Published reference: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). Tracking: [playtest checklist #326](https://github.com/ael-dev3/Tervain/issues/326).

The canopy audit counts disconnected crowns and individual cards beyond the wood-reach limit separately. It then groups those detached cards into clumps. That last grouping incorrectly reused the minimum spanning tree of **all** cards. Removing wood-supported cards from a spanning tree does not preserve the connectivity of the remaining cards: a supported card can provide a shorter path between two detached cards even though those detached cards also have a direct edge within the allowed gap.

The fix computes connectivity on the detached subset. When all cards are detached, the existing whole-crown spanning tree remains valid and is reused. Zero/one detached-card cases need no new search. Searches remain charged against the audit operation budget. No assets, repair behavior, rendering, or production placement change.

## Controlled before/after

```sh
node tools/repro-canopy-detached-connectivity.mjs canopy-connectivity.json
npx vitest run tests/presentation/canopyAudit.test.ts
```

A wood plane lies at z=0. Three small opaque cards lie at (0,0,1), (-0.3,0,1.2), and (0.3,0,1.2). At a 1.05 m wood reach, the first card is supported and the others are detached. At a 0.75 m connectivity gap, the detached pair is connected directly. The whole-crown spanning tree chooses the shorter links through the supported card instead. The baseline therefore reports two detached clumps; the candidate correctly reports one.

The actual source versions are compared with an independent all-pairs graph oracle: 72 cases across six input permutations, three uniform scales, and four controls (shortcut, separated pair, all detached, all supported).

| Measurement | Before | After |
| --- | ---: | ---: |
| Cases disagreeing with oracle | 18 | 0 |
| Other report fields, excluding operation count | identical | identical |

The separated-pair control still reports two clumps. Detached-card counts remain unchanged. The regression fails on the baseline; all 15 canopy-audit tests pass with the fix. TypeScript and the production build pass.

[Controlled receipt](../../proofs/canopy-detached-connectivity/report.json); [all case records](../../proofs/canopy-detached-connectivity/cases.json.gz).

## Published native-geometry receipt

```sh
node tools/repro-live-canopy-detached-connectivity.mjs --url https://ael-dev3.github.io/Tervain/ --out canopy-native-proof
```

The tool loads the published game with software WebGL, waits for world readiness, and freezes simulation/render scheduling. It applies both actual audit-source versions to up to three smallest distinct masked wood/leaf geometry pairs per retained Low-quality LOD. These are native registered crown geometries, transforms, and decoded cutout samplers; they are not invented replacement trees.

| Measurement, nine targets across LODs 0/1/2 | Before | After |
| --- | ---: | ---: |
| Detached clumps | 428 | 117 |
| Detached cards | 821 | 821 |
| All non-operation fields other than detached-clump counts | identical | identical |

Every selected target completes within the existing 20-million-operation budget. Additional subset searches can increase diagnostic work; this is a correctness fix, not an audit-speed claim. Complete report hashes with only clump counts and operation counters normalized match per target.

[Native receipt](../../proofs/canopy-detached-connectivity/native/report.json).

This is a read-only, sampled rest-geometry diagnostic. It does not establish full-population coverage, judge crown appearance, repair detached foliage, or prove hardware frame timing. Wind, cutout sampling approximation, and bounding-box proximity remain limitations of the existing detector. A hardware play-gate receipt is still required for review.
