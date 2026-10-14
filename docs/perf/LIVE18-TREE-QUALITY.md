# Published 0.0.18 tree metrics

Build confirmed from Pages: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). These are diagnostic measurements, not a visual-quality PASS. The new playtest's tree appearance remains for visual review.

## Root-ground coverage

The live complete population audit covers 453 trees/shrubs and 6,377 basal-sector samples at an 8 cm clearance threshold. Its old summary reports zero candidate trees, because a tree needs at least 25% unsupported sectors to be classified as a candidate. It nevertheless contains **12 unsupported sectors on 12 trees**, maximum sampled gap **0.24054 m**. Sampled contact coverage is **99.8118%**. The other sectors of those trees reach the terrain; these are partial exposure findings, not twelve wholly floating trees.

This PR adds coverage totals alongside the existing classification and prints them in the placement CLI. It changes no tree placement or threshold. [Raw live audit](proofs/live18-tree-quality/roots.json) · [same-sample before/after summary](proofs/live18-tree-quality/root-coverage.json).

```sh
node tools/audit-placement.mjs --url https://ael-dev3.github.io/Tervain/ --kind root --out roots.json
node tools/repro-root-coverage.mjs roots.json coverage.json
```

The first command uses the native published audit; the second applies the candidate production summarizer to that receipt, including releases that predate the added summary. Sparse basal sectors do not prove continuous root-surface contact or visually score a root flare.

## Alpha-aware crown support at every detail level

A fresh audit of the same live build evaluates cutout alpha on all 453 targets at each level. Bounds linked by proximity give zero disconnected candidates near/middle; the independent wood-contact metric still finds many leaf cards farther than 1.5 m from sampled wood. Those counts are leads, not counts of visible floating islands: shader wind, occlusion, apparent support and the whole-scene image are outside this geometry audit.

| Level | Missing wood targets | Disconnected candidates | Detached clumps beyond 1.5 m wood reach |
| --- | ---: | ---: | ---: |
| Near | 0 | 0 | 43,491 |
| Middle | 0 | 0 | 25,763 |
| Far | 128 | 723 | 8,360 |

The far report is correctly marked incomplete because those 128 leaf-only targets lack wood. High retains full detail for non-shrub trees; the far-level finding concerns the lower-detail path and must not be presented as a contradiction of a High-preset visual gate.

[Summary](proofs/live18-tree-quality/alpha-summary.json) · [complete compressed audit](proofs/live18-tree-quality/alpha-crowns.json.gz).

## Pop-in and alpha-edge evidence limits

The earlier [same-build receipt in #461](https://github.com/ael-dev3/Tervain/pull/461) contains 6,342 detail-transition checks: no wholly empty samples, but 768 wood/leaf coverage mismatches. Its eight-metre native scene sweep reports 0 connected pop events/m at a 16-pixel connected-component threshold, with 42 changed pixels/m below that threshold. It is a short frozen-world sample; its renderer omits dedicated water compositing, and its inspection clip is not real-time 60 Hz footage. It does not certify the whole playtest route or all load distances.

Neither cutout connectivity nor that pop count measures alpha-edge aliasing. A motion-compensated crown-edge capture through the native post/MSAA path remains required to attribute edge shimmer. No alpha-edge PASS or overall tree-quality score is claimed here.

Validation: the partial-root fixture has one unsupported sector while retaining zero classified floating-tree candidates; flat/empty controls remain clear. Ten placement/CLI tests and production build pass. The code is offline diagnostic reporting only.


## Uploaded playtest crown-motion sample

The uploaded 60 fps video also supplies a native-resolution 120-frame sample from 4.0–5.983 s. The fixed normalized ROI is `[.15,.15,.12,.15]` (230×162 decoded pixels), excluding HUD. Motion-compensated analysis yields 118 usable frame triplets, 99.8165% alignment coverage, mean absolute temporal residual 1.29569/255 and sparkle share 0.014385% at the existing 18/255 bright-residual threshold. These are compressed-video foliage-region statistics; camera parallax, foliage motion, compression and alpha edges can all contribute. They are **not an alpha-only aliasing metric or a before/after visual-fix claim**.

[ROI context](proofs/live18-tree-quality/crown-motion-context.jpg) · [per-frame measurements](proofs/live18-tree-quality/crown-motion.json).

```sh
node tools/video-shimmer.mjs --input playtest-0.0.18.mp4 --roi .15,.15,.12,.15 --start 4 --max-frames 120 --out crown-motion.json
```
