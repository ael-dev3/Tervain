# Discarded falling-leaf pose work

## Published reproduction

On [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), the continuous falling-leaf module builds a pose for every stream on every advancing update, including particles whose opacity makes the shader discard every fragment.

```sh
node tools/repro-live-hidden-leaf-poses.mjs https://ael-dev3.github.io/Tervain/ live-hidden-leaf-poses.json before
```

The published High cohort has **153 streams**. Sixty advancing 60 Hz module updates produce **9,180 pose writes**, including **8,159 for shader-discarded slots**. Every sample already has cached sorting bounds. This is a native baseline workload count, not a measured candidate frame-time improvement. [Full receipt](../../proofs/hidden-leaf-poses/live18.json).

The probe places the camera at the old run-round hero XZ (-12.3, 44.8), renders once, then freezes drawing while advancing the forest module with small turns. It does not replay the gate's actual follow-camera or movement path. The [native view](../../proofs/hidden-leaf-poses/live18-view.png) is a location reference, not a visual comparison.

## Change

Once the batch's transparent-sort sphere is cached, omit pose construction/writes for coverage at or below 0.001. Opacity, clock, flight position and distance coverage still update for every stream; a newly visible leaf receives its current pose before drawing. The material's opacity is 0.88, so these instances are entirely below the fragment discard threshold. No geometry, shader, colors, draw count or fade policy changes.

**Initial hidden poses remain complete.** Three computes the instanced batch's initial sorting sphere from every instance. Skipping hidden initialization would alter transparent sorting. The optimization waits until that sphere exists and retains it thereafter. Consequently, a never-rendered batch still performs its original initialization work.

This complements the separate frozen-clock and draw-prefix changes: it applies while the clock advances and does not reduce upload bytes or submitted triangles.

## Matched software-WebGL proof

```sh
node tools/repro-hidden-leaf-poses.mjs hidden-leaf-poses-proof
```

The production module runs a controlled 256-stream woodland cohort through delayed first visibility, camera turns, leaving/re-entering range and later phase advances. A second transparent surface overlaps the particles to test sorting. This is a controlled module fixture, not the published cohort or whole-scene image-quality gate.

- 211 updates: **54,016 → 43,189 pose writes** (20.0% fewer).
- Thirty already-initialized, out-of-range updates: **7,680 → 0 writes**.
- Every visible matrix, opacity word, cached sphere, draw-order sequence and render counter matches exactly.
- All nine before/after PNG pairs match pixel-for-pixel. The nonempty near capture contains 1,913 RGB colors.
- Draw calls, triangles, textures and actual buffer/texture upload-byte counts are unchanged; no GL errors.

[Summary, frame hashes and captures](../../proofs/hidden-leaf-poses). Compressed traces retain per-frame counters and SHA-256 hashes of the complete visible matrix and opacity words compared in memory.

Validation: the new regression fails on baseline (256 discarded writes where zero are needed after bounds initialization); all 11 falling-leaf tests, type-check and build pass after the change. It covers initial poses, repeated hidden/visible transitions, phase progression and cached bounds.

Software rendering/workload evidence only. No hardware play-gate PASS, GC claim, Mac frame-time reduction or resolution of the live16 missed refreshes/night-mud hitch is claimed. GPU evidence remains the existing live16 run.
