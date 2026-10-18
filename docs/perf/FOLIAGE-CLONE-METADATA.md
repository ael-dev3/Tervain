# Foliage material clone metadata

Constructing the forest's shadow and leaf-depth materials repeatedly serialized a live shader resource reachable through `material.userData.tvFoliage`. Three's `Material.copy` deep-copies enumerable user data with JSON. `TextureSource.toJSON` first expands the shared 64×64×64 noise image with `Array.from`; `Texture.toJSON` then retains only its UUID. The large temporary number array is discarded.

Keep the diagnostic uniform record directly accessible on its original material, but non-enumerable. It is not persistent material data. The depth pass still receives the original live uniforms through its copied shader hook. There are no shader, geometry, texture, render-pass or per-frame update changes.

## Reproduction

The published 0.0.23 app-bundle probe found 120 original material diagnostics and 180 shadow/depth copies containing serialized diagnostics. Replaying one `Material.clone` per original material expanded **31,457,280 temporary number-array elements before → 0 after**. The [published receipt](proofs/foliage-clone-metadata/published-repro.json) identifies the actual loaded bundle by embedded revision and SHA-256; its version endpoint advanced during loading and is not used to identify the running code.

The controlled production-code replay creates 60 wood/leaf profiles and their 180 clones using actual `installFoliage`, `Material.clone`, and `splitLeafPrepass`: **47,185,920 temporary number-array elements → 0**. Both wood and leaf vertex/fragment shader hashes and program keys match. All 60 depth programs share their original crown/noise uniforms. See [source receipt](proofs/foliage-clone-metadata/source.json).

The compiled candidate also has 120 source materials. Its 180-clone paired replay counts are recorded separately in [native receipt](proofs/foliage-clone-metadata/native.json); no absolute totals are mixed between inventories. Before changes only diagnostic enumerability; after restores the fix. Native and restored controls must match every RGB channel and every measured draw/triangle/texture/program/upload count. The replay performs the original clone operation once per wood material and twice per leaf material; it is not a captured cold-load frame or a complete game-path timing.

The shared byte image is not duplicated as a GPU texture. Array-element counts are not measured heap bytes, GC time, frame pacing, or hardware GPU time. The receipt field named `cloneCpuMs` uses `performance.now`: elapsed wall time of the synchronous clone loop, including scheduling and GC. It is not thread CPU time or frame pacing. Allocation counts are exact.

## Cost deltas

| Work | Before → after |
| --- | --- |
| Draw calls and triangles | Exact equality at every native pose |
| Texture count and per-render uploads | Exact equality at every native pose |
| Linked programs | Exact equality at every native pose |
| Shader text, cache keys and texture taps | Unchanged |
| Per-frame JS update code | Unchanged |
| Noise-image number arrays during cloning | One per clone → zero |
| Live diagnostic access / depth shader uniform sharing | Preserved |

[RGB-lossless comparison clip](proofs/foliage-clone-metadata/motion-lossless.mp4) · [browser preview](proofs/foliage-clone-metadata/motion-preview.mp4) · [decoded-frame verification](proofs/foliage-clone-metadata/video-verification.json). Left before, right after; five synthetic walk/turn poses slowed to 6 fps, not measured frame cadence. This verifies unchanged output, not closure of crown shimmer, detached foliage, grass sparkle, or a particular night/mud hitch.

## Run

```sh
npx vitest run tests/presentation/foliageEngine.test.ts tests/presentation/leafTargetCoverage.test.ts
node tools/repro-foliage-clone-metadata.mjs --baseline ef4222d8b --out clone-source-proof
npm run build
# Serve the resulting build with the repository preview command, then:
node tools/repro-live-foliage-clone-metadata.mjs --url "$BUILD_URL" --candidate 1 --head "$BUILD_REVISION" --out clone-native-proof
node tools/encode-foliage-footprint-proof.mjs clone-native-proof
```

Omit `--candidate 1` to probe an unmodified published build; the source diagnostic is then originally enumerable. The controller restores metadata descriptors after the run. Source counts and captures delete stale receipt files before acquisition. The encoder verifies every input RGB hash and decodes the lossless clip back to the exact source RGB sequence. The compiled proof revision is recorded in its receipt; evidence-only commits do not change runtime source.
