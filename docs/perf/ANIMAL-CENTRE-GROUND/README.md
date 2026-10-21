# Reuse animal centre ground samples

Candidate `d344a351a449f73bd2fcef0091ff68171138156c`, original `cacffa069461091d7c55a15e07d36326ff1d23c0`. During each placement, a wild animal compares `heightAt(x,z)` with another call to the same deterministic function, then calls it again for its root height. Sample the centre once; only tame animals need the deck-vs-terrain comparison. Paw probes and the final contact correction remain unchanged. Two focused regression cases fail on original source (wild centre 3 calls; tame centre 2 ground calls) and pass on candidate (1 each).

## Actual native placement and cost

All 19 loaded animals, including the tame mount, are measured using both complete placement closures against the same real terrain, animated skin state and initial root transforms. Every descendant world matrix, root position and quaternion matches exactly. Height-query calls across the batch: **133 → 96**. [Native data](native.json).

Initial short-block timing: 15 rotating original/candidate/unchanged-original blocks, 24 complete 19-animal placement batches per block. Means 0.1194 / 0.1200 / 0.1206 ms; nearest-rank p95 block means 0.1250 / 0.1333 / 0.1250 ms. The short run is retained, including its worse candidate tail. A fresh native world repeats with longer blocks (240 complete placement batches per block), three sets of 15 rotating blocks per mode, warmup of both implementations, root restoration outside timed blocks. [Full repeat data](repeated-cpu.json).

| Helper cost per 19-animal placement batch | Original | Candidate | Unchanged-original control |
| --- | ---: | ---: | ---: |
| Mean ms, pooled 45 blocks/mode | 0.127472 | 0.122602 | 0.125130 |
| p95 block-average ms, nearest rank | 0.143333 | 0.128333 | 0.130417 |

The longer candidate mean is lower in all three sets; its p95 is lower in two, and within the unchanged-control range in the third. These are helper timings, **not per-frame p95, GPU timings, a hardware 60fps/heat result, or proof of the historical ~33 ms frames' cause**. The absolute reduction is small; the deterministic query reduction is the main result. JS terrain and animal visuals are unchanged.

## Same-pose native images

High, 640×360 DPR1, frozen time/wind, native post/MSAA, one source-paired world. Five fixed poses × two repeats/mode = 20 RGB-identical PNGs, independently decoded with Sharp and Pillow. [Hashes](pixel-hashes.json). Original/candidate placement is rerun from the same root snapshots before each render. The run-round fixed camera now looks inside a building; this is not a new route clip.

| Fixed pose | Draws original / candidate | Triangles original / candidate | Changed RGB pixels |
| --- | ---: | ---: | ---: |
| fence | 644 / 644 | 7,170,911 / 7,170,911 | 0 |
| run-round | 239 / 239 | 2,245,715 / 2,245,715 | 0 |
| bow | 707 / 707 | 7,936,955 / 7,936,955 | 0 |
| birch | 436 / 436 | 5,641,032 / 5,641,032 | 0 |
| sea | 137 / 137 | 778,895 / 778,895 | 0 |

[Walk-fence original](fence-before-0.png) / [candidate](fence-after-0.png). Shaders, texture taps, buffers and draw policy are unchanged. Runtime source was captured before the commit, then committed without changes; its SHA-256 is in the native report.

## Reproduce

From the candidate checkout with dependencies and Chrome configured: `node tools/repro-animal-ground-native.mjs [output-directory]`. For the longer CPU repeat in a fresh world: `REPRO_CPU_REPEAT=1 node tools/repro-animal-ground-native.mjs [different-output-directory]`. Fetch the pinned original commit if the checkout is shallow. `npx vitest run tests/presentation/animals.test.ts tests/presentation/animalWorld.test.ts tests/presentation/animalPhysicalInputs.test.ts` (30 tests) and `npm run build` pass. The unmodified compiled current-head budget receipt is added after completion.
## Rebased compiled head and budget

Current feature head `d5fc6a0a80e4a471f1f23a08528a3d5539989bbe` rebases the unchanged placement runtime onto published main `a3396ee14`. The source-paired captures above were made on `cacffa069` with original candidate `d344a351a449f73bd2fcef0091ff68171138156c`; the runtime SHA-256 still matches exactly. These are not independent full-world pixel comparisons on the rebased main. The separate compiled gate on the current head passes against the newer live baseline.

Unmodified stock budget: live 285 draws / 3,046,047 triangles / 0 errors; candidate 285 / 3,046,047 / 0. Two same-revision live probes, four distinct completed samples each, no sampler changes or allowances. [Raw receipt](budget.txt). The obsolete original-head run was cancelled when Pages changed revision; no receipt is reused. This remains a small redundant-query/helper-cost cut, not proof that the historical hardware ~33 ms frames are resolved.
