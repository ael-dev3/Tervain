# Reuse validation within wildlife construction

Wildlife construction validates each source template before fitting its habitat. It then validated the same template again when cloning the body. This repeats the full skin-index/weight scan, texture and clip checks, bone traversal and world bounds lookup without a source change between those steps.

Keep the validated result in the current build's fitted record and pass it to the immediately following body clone. This is not a persistent validation cache. Every new build still validates its inputs, and standalone animal figures retain fresh validation. Geometry, bones, animation, paw selection, placement and materials are unchanged.

```sh
node tools/repro-animal-validation-reads.mjs --url http://127.0.0.1:4173/ --out animal-before
node tools/repro-animal-validation-reads.mjs --url http://127.0.0.1:4173/ --baseline animal-before/report.json --out animal-after
```

Run against the original and changed production builds. The script hooks the native attribute prototype before assets load, waits for native wildlife startup, then compares repeated full four-component float-attribute scans by vertex count. Both runs instantiate all 19 animals. All 19 repeated source attributes match; each loses exactly one complete four-component pass.

| Counter | Before | After |
| --- | ---: | ---: |
| Reads across the 19 repeated source attributes | 6,012,884 | 4,043,108 |
| Native animal instances | 19 | 19 |

Exactly **1,969,776 component reads** are removed. The probe also observes other startup and paw-selection attributes; those are retained in the receipts, but unrelated pose activity is not used to claim a precise whole-startup total. These are structural CPU-work counts, not timings. First-use bounds computation, parsing, skin cloning and paw selection still have costs; this does not establish a particular recorded hitch's cause.

The original receipt uses 0.0.15 with the independent grass vertex-work patch, which does not change the animal module. The changed receipt uses this PR's production build. The comparison fails if any of the 19 source scans does not lose exactly one full pass, or if native animal coverage is incomplete.

A focused regression observes one source-weight pass per build (previously two), then corrupts the source weights and verifies a subsequent build rejects them. Validation: 30 animal/loading/construction/deferred-wildlife tests, TypeScript, production build and the native before/after comparison pass. Receipts are in `animal-validation-proof/`. No hardware frame-time or visual improvement is claimed.
