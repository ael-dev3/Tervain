# Combined forest bound checks

Source head `b734009f8eb0ce5e982a33ee68d619df263a9f26`, baseline b317734, native High scene. Same sphere AND box predicates and existing wind guards; test both per plane so an early box rejection avoids unused later sphere tests. No geometry, materials, shaders, texture taps, intervals, art or menu changes. This is a CPU component saving, not a repair for visible detached crowns or tree LOD pop-in.

## Verification

The original two-pass predicate fails the early-rejection work regression, while the predicate-equivalence control passes. All 31 focused tests pass, including 12,000 randomized perspective/orthographic decisions, tangent controls and forest construction/grounding checks. Production build/type check passes. The unmodified stock gate exits 0 for this exact head; its sanitized stdout is included. Both sides have 285 draws / 3,048,306 triangles / zero console errors.

Seven native same-pose before/after/restored High post/MSAA render triples are RGB-identical, with equal draw/triangle counts in each triple. Packed instance matrices, colours, visibility, coverage and bounds match the native forest at all seven poses. The planar reflection cache is invalidated per comparison; no claim is made that every pose invokes a new planar capture or refreshes all window cube faces. The first five poses are adjacent forest walk samples, followed by a turn and a sea view; they are controlled captures, not a gameplay cadence clip.

## CPU method and limits

The replay executes the original/candidate production refresh blocks with reconstructed lexical bindings on native High batches, and imports the actual candidate bounds helper. It precomputes a 120-camera walking/turning path (2.6 m/s, 1/60-second steps, yaw +0.003 radians/step), repeating it for timing. Each mode warms 1,000 calls then runs 12 rotated-order batches of 5,000 calls (60,000 samples/mode). Second baseline is an independent identical-code control. No work-counter observer runs during timing. Camera construction, other world updates, draw submission, GPU work and heap profiling are outside this component measurement. Per-call timing includes clock/scheduler effects and is quantized at about 0.1 ms; raw batch means are retained.

| Mode | Mean elapsed ms/refresh | p95 ms/refresh |
| --- | ---: | ---: |
| before | 0.092785 | 0.200000 |
| after | 0.087210 | 0.200000 |
| control | 0.093717 | 0.200000 |

The initial shorter exploratory pilot (6,000 calls/mode, inline helper) averaged 0.090000 ms baseline / 0.092467 ms candidate / 0.089883 ms control; two slow candidate batches made that result inconclusive. A longer 60,000-call inline-helper run averaged 0.088812 / 0.082663 / 0.089202 ms. Both exploratory raw timing files are retained, not silently dropped. Those pilots used af6db3757 (the pending distance-skip baseline) and a post-transform inline-helper replacement; they are not final-source or compiled-build proofs. The final production-helper run above uses the untouched live baseline, not the preceding pending distance-work change.

Candidate batch means beat both controls in 11/12 batches. This is about 0.0056 ms saved per isolated refresh; all p95 values round to 0.2 ms. No whole-frame speedup, Apple GPU, 60-fps or heat claim is made.

The native acquisition ran on published b317734 while loading candidate source through the repro module server. Runtime source hashes were taken during capture and rechecked before publication; the only subsequent CLI edit adds a helper-source fingerprint assertion/report. The screenshots are an operation replay on native retained batches, not a separate seven-pose compiled-build comparison. The stock gate separately loads the actual compiled head with normal startup, no repro initialization script and no allowance or sampler changes.

## Reproduce

```sh
node tools/repro-forest-combined-bounds.mjs --url BUILD_URL --ref b317734 --out proof
npm test -- tests/presentation/treeBounds.test.ts tests/presentation/forestStands.test.ts tests/presentation/forestTrees.test.ts tests/presentation/forestFloor.test.ts
node tools/play-gate.mjs --url BUILD_URL --budget-url https://ael-dev3.github.io/Tervain/ --head b734009f8 --tag forest-combined-bounds --out budget-proof
```

`--cpu-only 1` omits rendered proof and records that explicitly. Full default runs compare all seven image triples and retained-state snapshots. Draw counts in the image report include native multi-pass work; the separate stock budget is its own fixed path and counter scope.
