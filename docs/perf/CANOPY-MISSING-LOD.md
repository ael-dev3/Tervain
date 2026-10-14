# Preserve missing-support tree identities in LOD audits

The forest audit adapter skipped any requested detail level without wood geometry. On published 0.0.17 · 5da2776, this omits 128 far-LOD pines: the adapter supplies 325 targets despite a 453-target registry. The app's expected-population guard already rejects that incomplete scan. However, omitted trees have no individual diagnostic record, position or missing-support flag, and a lower-level pine-only scan receives an empty array.

Retain the requested target even when wood is absent. The detector reports `missingWood`, preserves the label/species/detail level and world position, and marks support analysis incomplete. Such records are not mislabeled as leafless. Ordinary supported/leafless targets keep their existing connectivity analysis. Rendered geometry, appearance, culling, collision and gameplay are unchanged.

## Published and candidate compiled-build proof

Both probes use the actual compiled forest adapter and native compiled diagnostic export, not replacement source classes. The same High registry contains 453 targets and 128 pines.

| Measurement | Published build | Candidate |
| --- | ---: | ---: |
| Near target count | 453 | 453 |
| Far target count | 325 | 453 |
| Far pine diagnostic inputs | 0 | 128 |
| Pine records explicitly marked missing wood | absent | 128 |
| Pine-only lower-level support analysis complete | true (empty input) | false |
| App wrapper accepts support analysis | no | no |

[Before receipt](proofs/canopy-missing-lod/before.json) / [after receipt](proofs/canopy-missing-lod/after.json). The latter lists all 128 pine IDs and world positions, plus the compiled program filename and SHA-256. Its build label names the base revision used for the pre-commit build; this is candidate evidence, not a claim that the fix is on Pages.

Missing-support records have zero component/candidate counters because support analysis was not performed; `missingWood` and `complete: false` distinguish that from a healthy zero-candidate result. This does not repair far-LOD foliage or establish visual connectivity. It improves coverage and locates the unsupported targets for review.

```sh
node tools/repro-canopy-missing-lod.mjs "$BUILD_URL" outputs/canopy-missing-lod
npx vitest run tests/presentation/pineForestIntegration.test.ts tests/presentation/canopyAudit.test.ts tests/presentation/canopyBaseline.test.ts --testTimeout=90000
```

The published probe fails four of five assertions as the expected reproduction. The candidate passes all five. The producer regression uses delivered source conifer geometry and verifies identical near/far target identities; the detector regression verifies missing support, coordinates, non-leafless status and preserved supported behavior. Production build/type-check pass. Hardware play/video gate and publication remain pending; these are software-rendered correctness checks, not frame-time measurements.

Validation: all 39 focused tests pass using the repository CI timeout of 90 seconds. The local five-second default timed out an existing source-geometry integration test; no assertion or repository timeout was changed.
