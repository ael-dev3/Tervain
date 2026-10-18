# Skip invisible sea captures at dry coastal tile edges

On the published [Pages build](https://ael-dev3.github.io/Tervain/) 0.0.19 · 77c6866, looking inland near the coast can still render a complete sea reflection, including millions of forest triangles. The sea's 32 m visibility tiles include dry tails that the water shader discards.

The fix bounds each tile around its nonnegative bathymetry samples, retaining their neighbouring bilinear cells and the existing 2 m wave guard. Open-ocean bounds, geometry, materials and shaders stay unchanged. This is independent of the reflection-tree correctness proposal in #629.

## Native rendered replay

The reusable script imports the candidate production bounds function and substitutes only its bounds into the published scene. Everything else uses the native scene, bathymetry, water pass and full Grade/post/MSAA render. Simulation, wind and shadow updates are held still for each comparison. Each view renders before, after, sea-hidden and repeated-after controls.

All five views have **zero changed before/after pixels**. Three inland views also have zero changed sea-hidden pixels, establishing that their original reflection work contributes nothing visible. Two shoreline controls retain their reflection draws; hiding their sea changes more than 120,000 pixels each.

### Medium, 640×360, software WebGL

| Inland camera x (z = −100) | Draw calls before → after | Triangles before → after | Source upload bytes before → after |
| --- | ---: | ---: | ---: |
| −275 | 744 → 440 | 10,373,019 → 5,727,860 | 64,512 → 32,256 |
| −273 | 635 → 385 | 9,862,128 → 5,446,408 | 62,208 → 29,952 |
| −271 | 631 → 384 | 9,935,044 → 5,498,860 | 62,208 → 29,952 |

The removed reflection captures account for 247–304 draw calls and 4.42–4.65 million triangles per frame. Texture counts and nominal texture storage are unchanged. Storage numbers in the receipt count observed uncompressed texels and mip levels; they are not total VRAM measurements.

[Medium receipt](proofs/sea-visibility-envelope/medium/report.json) · [before](proofs/sea-visibility-envelope/medium/0-before.png) · [after](proofs/sea-visibility-envelope/medium/0-after.png) · [shore before](proofs/sea-visibility-envelope/medium/3-before.png) · [shore after](proofs/sea-visibility-envelope/medium/3-after.png).

### High, 640×360, software WebGL

| Inland camera x (z = −100) | Draw calls before → after | Triangles before → after | Source upload bytes before → after |
| --- | ---: | ---: | ---: |
| -275 | 716 → 413 | 12,550,026 → 7,875,962 | 64,512 → 32,256 |
| -273 | 608 → 359 | 12,263,956 → 7,796,701 | 62,208 → 29,952 |
| -271 | 607 → 360 | 12,273,261 → 7,808,428 | 62,208 → 29,952 |

All five High comparisons also have zero changed pixels, with reflections preserved in both shoreline controls. [High receipt](proofs/sea-visibility-envelope/high/report.json) · [before](proofs/sea-visibility-envelope/high/0-before.png) · [after](proofs/sea-visibility-envelope/high/0-after.png) · [shore before](proofs/sea-visibility-envelope/high/3-before.png) · [shore after](proofs/sea-visibility-envelope/high/3-after.png).

## Coverage and regression checks

- All **61,349 potentially wet native bathymetry cells**, including their 2 m guards, remain covered. No uncovered cells.
- 34 of 533 boxes tighten; every new box is contained in its original box. Box count and order are unchanged.
- The parent implementation fails the dry-tail regression; the candidate passes it. Regression cases cover isolated wet vertices, NaN samples, tile seams and grid boundaries.
- 52 targeted water/visibility tests pass; production build passes.

Reproduce from the PR checkout (with Chromium available):

```sh
node tools/repro-live-sea-visibility.mjs --url https://ael-dev3.github.io/Tervain/ --quality medium --out sea-proof-medium
node tools/repro-live-sea-visibility.mjs --url https://ael-dev3.github.io/Tervain/ --quality high --out sea-proof-high
npx vitest run tests/presentation/oceanVisibilityEnvelope.test.ts tests/presentation/waterSurfaces.test.ts tests/presentation/waterRenderPass.test.ts
npm run build
```

Receipts identify the published revision and candidate source hash. This proves redundant work removal and matching rendered output on the sampled views, not hardware frame times or an M5 60 fps pass. Hardware play-gate verification remains pending.
