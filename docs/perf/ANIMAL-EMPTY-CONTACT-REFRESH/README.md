# Skip empty animal contact refreshes

Candidate `a16369fb954127dbcf113fd2ccc35b3b171c7afe`, original `a3396ee1403b2cb2e4b1e5c5a3604ca7b422113d` (live 0.0.38 base). `place` updates the full animal hierarchy twice and refreshes its skeleton palette even when no CPU sole samples exist and nothing changes the root after the first update. Keep the first walk, defer the empty-contact skin to Three's renderer, and repeat the hierarchy walk only after a finite contact correction. The nonempty contact path remains intact. No model, animation, shader, styling or sample-selection changes.

The separate delivered-paw threshold defect remains open; this optimization does not enable contacts and still preserves the old sampling path if that defect is corrected. [Read-only diagnosis](https://github.com/ael-dev3/Tervain/tree/58e83289f770166b3a807dc51e1d37c8ad7fe97a/docs/perf/ANIMAL-SOLE-CONTACT-STUDY) is on a separate study branch, linked from issue #326.

## Actual per-placement work

All 19 loaded animals, same real terrain and initial root transforms. Original/candidate root positions, quaternions and all descendant world matrices match exactly. Explicit calls in simulation: **38 → 19 forced root hierarchy walks; 19 → 0 skeleton palette refreshes**. Terrain queries **133 → 133**. Renderer-driven skin updates and texture uploads remain; this is not a measured GPU upload-byte reduction.

Three rotating sets of 15 blocks/mode, 240 complete 19-animal placement batches/block. Root restoration is outside timing. Both implementations are warmed, and unchanged-original controls are retained. [Raw samples](native.json) / [summary](cpu-summary.json).

| Helper CPU per full placement batch | Original | Candidate | Unchanged-original control |
| --- | ---: | ---: | ---: |
| Mean ms, pooled 45 blocks/mode | 0.125241 | 0.057278 | 0.124269 |
| p95 block-average ms, nearest rank | 0.133750 | 0.062917 | 0.137500 |

These are fixed-state helper timings, not per-frame p95 or hardware GPU/Mac heat measurements. The absolute saving is about 0.068 ms per full 19-animal placement batch. It does not establish the cause of historical ~33 ms walk-fence/run-round frames.

## Native rendering and moving bones

High 640×360 DPR1, one source-paired world, native post/MSAA and auxiliary passes. Five fixed scene poses and three newly animated cat poses, two repeats/mode: **32 RGB-identical images**. An independent CDP observer records the *first* render of each animated pose, before the harness warm-up; those **6 first-frame images** also match. Candidate renders first at cat frames 0 and 2, before the original has refreshed that new animation pose. Local bone transforms change at all three poses; counts are in the native report. Thus the proof does not depend on a preceding original render warming the palette.

All 38 images are independently decoded and compared in Sharp/Pillow; [RGB hashes](pixel-hashes.json), [first-render observations](first-render.json), [candidate first animated frame](first-cat-frame0-after.png) / [original](first-cat-frame0-before.png). The first-frame observer wraps the same native `SP.render` method and records its returned pixels. The published all-in-one tool stores those same first results directly instead of sending them through a second CDP connection.

| Fixed scene / animation pose | Draws original / candidate | Triangles original / candidate | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fence | 644 / 644 | 7,170,911 / 7,170,911 | 0 |
| run-round | 239 / 239 | 2,245,715 / 2,245,715 | 0 |
| bow | 707 / 707 | 7,936,955 / 7,936,955 | 0 |
| birch | 436 / 436 | 5,641,032 / 5,641,032 | 0 |
| sea | 137 / 137 | 778,895 / 778,895 | 0 |
| cat-frame0 | 622 / 622 | 9,590,822 / 9,590,822 | 0 |
| cat-frame1 | 644 / 644 | 9,702,848 / 9,702,848 | 0 |
| cat-frame2 | 644 / 644 | 9,702,848 / 9,702,848 | 0 |

The legacy run-round fixed camera now looks inside a building; these scene images are not a real-play route clip. Streaming may settle further between distinct camera/animation poses, so compare matched modes at each pose; do not attribute all between-pose pixel differences to animation. Shaders/texture taps and geometry are unchanged. Runtime source was captured before the commit, then committed without changes; its SHA-256 is in the report.

## Reproduce

From the candidate checkout with dependencies and Chrome configured: `node tools/repro-animal-empty-refresh-native.mjs [output-directory]`. Fetch the pinned original commit if shallow. The tool pairs both complete placement closures on actual loaded animals, asserts exact world matrices, replays rotating CPU controls, captures fixed/animated views, and saves first renders before warm-up. `npx vitest run tests/presentation/animals.test.ts tests/presentation/animalWorld.test.ts tests/presentation/animalPhysicalInputs.test.ts tests/presentation/animalBoneTexture.test.ts` (39 tests) and build pass. The new regression fails on original code (two walks versus expected one). The unmodified compiled current-head budget is supplied separately.
