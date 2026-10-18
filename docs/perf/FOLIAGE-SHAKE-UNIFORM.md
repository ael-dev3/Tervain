# Unchanged foliage shake submissions

Four shake slots are uploaded as a `vec4[4]` for many tree, shadow and floor-plant material submissions. Three's vector-array setter uploads the full sixteen floats even when the hit positions/timestamps/strengths are unchanged. Wind time changes separately, so an active tree shake does not require resending these slots every frame.

Represent the four vectors as four columns of a `mat4`. Shader indexing still returns the same `vec4`; no matrix multiplication is added. A shared, retained sixteen-float view uses Three's cached matrix setter to skip unchanged submissions. The original field and diagnostic records remain vector arrays, including in-place updates and array replacement. Colour, depth/shadow and floor wind hooks use the same transport. Program cache versions change with the uniform type.

There are no added draws, triangles, textures, texture fetches or arithmetic expressions in the wind shader body. The uniform still holds sixteen GPU floats. The change retains one 64-byte packed view per source field and sixteen cached numbers per active affected program; it allocates no array per frame.

## Compiled field-update checks

[Eight-case fixture receipt](proofs/foliage-shake-uniform/fixture.json). The fixture runs actual production foliage colour and custom shadow hooks. The before control restores only the original vector-array declaration and record. Every RGB channel and draw/triangle count matches, and every actual GL uniform write has the original Float32 words.

| Field state | Upload calls before → after | API bytes before → after |
| --- | ---: | ---: |
| Unchanged slots, four cases | 5 → 0 | 320 → 0 |
| Strike, four active slots, expiry, replacement | 5 → 2 | 320 → 128 |

Changed data still uploads; the field is not frozen. The compiled active uniforms are `FLOAT_VEC4` array size 4 before and `FLOAT_MAT4` size 1 after. The shader's per-slot lookup remains unchanged.

## Moving High forest renderer CPU

Published baseline **0.0.23 · e3b81ca**, confirmed in the menu and version endpoint. High, 640×360, native post/MSAA4, default tree detail. One controlled active strike is placed on a native tree; both modes receive the same field. The synthetic route walks 5.157 m and turns 20.45°. After 120 warm pairs, 120 measured pairs alternate A/B order. All 120 paired draw/triangle/texture counts match.

| Per moving replay frame | Live → cached | Delta |
| --- | ---: | ---: |
| Shake uniform calls, average | 97.367 → 0 | −100% |
| Shake uniform API payload, average | 6,231.47 → 0 bytes | −100% |
| Renderer thread CPU, average | 2.990 → 3.005 ms | **+0.016 ms** |
| Renderer thread CPU, p95 | 3.933 → 3.894 ms | −0.039 ms |
| Maximum intended draws | 423 → 423 | 0 |
| Maximum intended triangles | 8,005,237 → 8,005,237 | 0 |
| Texture count | 274 → 274 | 0 |
| Console errors | 0 → 0 | 0 |

[Every paired CPU sample](proofs/foliage-shake-uniform/cpu-walk.json). **This is an upload reduction, not an established CPU/FPS win:** average CPU is slightly higher and p95 slightly lower in this sample. The shader body adds no arithmetic or texture fetch, but hardware GPU timing/instruction throughput is not measured here.

The controller stops the app's animation-frame callback and sets delta time to zero for manual rendering. Camera/world preparation runs once per pair outside the renderer timestamps; wind time is advanced explicitly. Chrome thread CPU clocks measure traversal, matrix updates, callbacks and uniform submission with raster draw entry points suppressed, including common counter/sort instrumentation. GPU/scheduler waits, native draw-driver CPU and simulation/input costs are omitted. Shadow updates stay enabled. No claim is made about complete game-frame duration, Mac performance, thermals or the old hardware buffer/texture upload totals: these bytes are uniform command payload, not measured bus traffic.

## Reproduce

```sh
npx vitest run tests/presentation/foliageShakeUniform.test.ts tests/presentation/foliageEngine.test.ts tests/presentation/treeBarkDetail.test.ts
npm run build
node tools/repro-foliage-shake-uniform.mjs shake-fixture-proof
node tools/repro-live-foliage-shake-uniform.mjs --url https://ael-dev3.github.io/Tervain/ --head "$LIVE_REVISION" --cpu true --cpu-only true --moving-cpu true --out shake-cpu-proof
node tools/repro-live-foliage-shake-uniform.mjs --url https://ael-dev3.github.io/Tervain/ --head "$LIVE_REVISION" --out shake-pixel-proof
```

The live controller applies the exact production helper to native colour/floor materials and custom depth/distance materials, retaining the original opaque sort order. The inactive adapter must first match native RGB. The five-pose image replay checks before/after/restored RGB and actual draw/triangle equality with freshly rendered shadow maps. Readbacks are proof, not frame-time measurements. An active strike uses native field slots; no geometry or style is replaced.

## Five native forest poses

All five matched captures have zero changed RGB channels, including restored controls. Shadow maps refresh on every capture. Draws, triangles and texture counts are identical. Each pose reduces shake uploads from 96 calls / 6,144 bytes to zero.

| Pose | Draws, both | Triangles, both | Textures, both |
| --- | ---: | ---: | ---: |
| 0 | 376 | 6,413,125 | 274 |
| 1 | 379 | 6,447,213 | 274 |
| 2 | 380 | 6,491,322 | 274 |
| 3 | 381 | 6,506,078 | 274 |
| 4 | 380 | 6,505,694 | 274 |

[Full native receipt](proofs/foliage-shake-uniform/native.json). Matched images are before-0.png through before-4.png and after-0.png through after-4.png in the same directory. Software-rendered correctness and submission evidence; no hardware frame-time or thermal claim.
