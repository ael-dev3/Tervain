# Exclude empty forest-floor batches from render setup

On published [Pages](https://ael-dev3.github.io/Tervain/) 0.0.21 · 570a859, zero-instance forest-floor batches remain visible to Three's render list. A live probe found six such batches reaching `onBeforeRender` in one frame. Three returns early for a zero-instance GPU draw only after object/material setup, so the empty batches still cost CPU work.

The fix initializes these batches as invisible and sets visibility from the selected instance count on every refresh. Nonempty batches, including offscreen shadow casters selected by the existing sun-frustum test, retain their existing selection. Geometry, materials, wind and distance fades are unchanged. The renderer's shader precompiler traverses invisible meshes too, so this does not remove their materials from precompilation.

## Verification

Native 640×360 High results:

| View | Empty object setups before → after | GL uniform calls before → after | Draws / triangles (unchanged) | Upload bytes (unchanged) |
| --- | ---: | ---: | ---: | ---: |
| Fence | 9 → 0 | 199 → 198 | 102 / 1,609,953 | 0 |
| Woods control | 0 → 0 | 465 → 465 | 194 / 3,467,287 | 20,736 |
| Beach | 10 → 0 | 28 → 27 | 44 / 271,770 | 0 |

All before/after and repeated-after pixels match. Active state hashes match in every view. The woods control keeps all 12 occupied batches. Texture count stays at 274 and observed nominal texture storage stays at 1,310,276,620 bytes (zero unknown formats), both versions. The saving is skipped empty object/material setup, not fewer triangles, reduced texture memory or a measured frame-time improvement.

[Raw receipt](proofs/empty-forest-floor/report.json) · [fence before](proofs/empty-forest-floor/0-before.png) · [fence after](proofs/empty-forest-floor/0-after.png) · [woods before](proofs/empty-forest-floor/1-before.png) · [woods after](proofs/empty-forest-floor/1-after.png) · [beach before](proofs/empty-forest-floor/2-before.png) · [beach after](proofs/empty-forest-floor/2-after.png).

The regression fails on the parent and passes with the fix. It checks empty initialization, leaving range and returning to visible instances. All 14 forest-floor tests and the production build pass.

The reusable native High replay samples the fence area, woods and beach through Grade/post/MSAA. It applies only the visibility assignment extracted verbatim from the candidate production source to native published batches; actual builder/update integration is exercised by the regression test. Each view has warm before/after/repeat controls, fixed simulation/wind and a fixed shadow map. Mesh counts, active matrices/colours/coverage and caster flags are hashed separately from the intentionally changed visibility flags.

```sh
node tools/repro-live-empty-floor-batches.mjs --url https://ael-dev3.github.io/Tervain/ --out empty-floor-proof
npx vitest run tests/presentation/forestFloor.test.ts
npm run build
```

Software evidence measures render-setup and WebGL call counts, not CPU/GPU frame time or an Air-class 60 fps pass. Hardware verification remains pending. Texture storage estimates count observed uncompressed texels/mips rather than total driver VRAM.
