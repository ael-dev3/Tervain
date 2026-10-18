# Trim fully faded grass instance tails

On [Pages](https://ael-dev3.github.io/Tervain/) 0.0.21 · 570a859, grass tiles choose a rank prefix from the nearest point of the whole tile. Trailing anchors can be farther away and have zero `gKeep` in the native grass vertex shader, yet still submit their blade vertices. This is geometry waste rather than a change to grass appearance or distance.

The candidate walks backward from that conservative prefix and drops only a certainly zero-coverage suffix. It uses the shader's three-dimensional anchor distance, density curve, power and rank headroom. A centimetre of distance headroom and an extra rank epsilon retain uncertain float-boundary cases. It stops at the first potentially visible anchor, preserving all lower ranks and the existing buffers/order. No per-frame arrays or new attributes are allocated.

Main and capture cameras select independent prefixes. A tile whose main prefix becomes empty remains available to a closer capture camera; capture draws restore the main count afterward. Generic tile layers retain their existing behavior unless they opt in.

## Reproduce

```sh
node tools/repro-live-grass-faded-tail.mjs --url https://ael-dev3.github.io/Tervain/ --out grass-tail-proof
npx vitest run tests/presentation/grassFadedTail.test.ts tests/presentation/grassCaptureRanks.test.ts tests/presentation/grassZeroDensity.test.ts tests/presentation/grassEngine.test.ts
npm run build
```

The replay runs the published native High scene through Grade/post/MSAA, applying the production trimming method after native per-camera grass hooks. Simulation and wind are frozen, both variants warm, and screenshots are captured synchronously after drawing. It rejects blank images and requires exact pixel equality and fewer actual submitted triangles. It records GL draw calls, source upload bytes, texture count and nominal texture storage (not total driver memory).

[Matched images and machine-readable receipt](proofs/grass-faded-tail/). All three comparisons pass exact pixel equality and opaque/nonblank checks.

| View | Draws before → after | Triangles before → after | Removed clumps | Upload bytes/frame |
| --- | ---: | ---: | ---: | ---: |
| Forest | 322 → 320 | 4,388,010 → 4,378,545 | 397 | 27,648 |
| Meadow | 238 → 237 | 2,487,153 → 2,465,079 | 712 | 6,912 |
| Woodland | 409 → 408 | 5,285,758 → 5,276,524 | 389 | 27,648 |

Texture count stays at 274 and nominal observed texture storage at 1,310,276,620 bytes, with no unknown formats. Upload bytes match before/after. The receipt hashes the extracted production method; verification-source metadata identifies the source snapshot used when the replay began.

Software rendering verifies geometry submission and pixels. It does not establish Mac frame cadence. The added backward CPU scan needs target-device frame-time review; it trades anchor distance/density checks for discarded vertex work. No hardware PASS is claimed.

The 19 selected tests and build pass, including main/capture restoration and a zero-count main tile needed by a closer capture camera.
