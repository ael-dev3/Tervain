# Skip the discarded falling-leaf tail

When at least one falling leaf is visible, the renderer previously submitted the whole fixed instance pool. The shader discards each leaf with final opacity at or below 0.001. The module already uses coverage above 0.001 to decide visibility; its material opacity is 0.88, so every trailing instance outside that coverage predicate is discarded.

Keep the original stream slots and draw through the last potentially visible instance. Upload only that matrix/opacity prefix on subsequent updates. Internal gaps, colors, source order, animation and geometry stay unchanged. The allocation capacity and first full buffer allocation stay unchanged. The existing pool-triangle statistic remains; `fallingLeafDrawnTris` reports the submitted prefix separately.

## Native published snapshot

Unmodified **0.0.18 · 421d34b**, High, had 153 falling-leaf instances, 21 visible, with the last potentially visible leaf at index 124. The repro clones the actual mesh with its shader, colors, matrices and opacities, then compares full-pool and prefix draw/upload settings under the same diagnostic camera, background and fill light.

| Actual WebGL counter | Before | After |
| --- | ---: | ---: |
| Submitted instances | 153 | 125 |
| Triangles | 1,530 | 1,250 |
| Matrix + opacity upload bytes | 10,404 | 8,500 |
| Draw calls | 1 | 1 |

This is an 18.3% reduction for this batch. Framebuffer PNGs are pixel-identical, with 225 non-background pixels, no GL errors and no context loss. The non-background guard prevents an empty capture from passing. The receipt includes the candidate source hash and published revision.

```sh
node tools/repro-live-falling-prefix.mjs --url https://ael-dev3.github.io/Tervain/ --out falling-prefix-proof
npx vitest run tests/presentation/fallingLeaves.test.ts
npm run build
```

The native repro validates the draw/upload override on a frozen published snapshot. The unit regression exercises the actual updated module through 120 steps, disappearance and reappearance, checking prefix/range correctness. It is not a candidate full-build replay, final post/MSAA image-quality gate, GPU-memory reduction or hardware timing measurement. Every stream is still simulated. It does not establish that the live16 frame stalls or night/mud hitch are fixed. Tracking: #326.
