# Keep capture wood geometry and its baked material together

Published reproduction: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/), native pine `tree:wild:54:3`; related bark-quality evidence in [the playtest checklist](https://github.com/ael-dev3/Tervain/issues/326).

Water reflections and window captures call the forest's `lighterForReflection` method. It temporarily substitutes middle-detail geometry for near-detail geometry while retaining the near instances and coverage. It kept the near wood material too. The pine's middle wood has a separately baked atlas and UV layout, so the substitution sampled the wrong textures and shading parameters.

The fix pairs substituted **wood** geometry with its existing middle-detail material, then restores both original references. Leaf materials and their depth-prepass pairing remain unchanged. It reuses the existing textures, geometry, LOD distances and art parameters.

## Matched software proof

| Check | Original capture | Candidate capture |
| --- | ---: | ---: |
| Uses the middle wood material with middle geometry | No | Yes |
| Changed pixel channels versus the correctly paired native middle model | 181,984 | 0 |
| Draw calls | 24 | 24 |
| Triangles | 100,395 | 100,395 |

The native executable method and source-extracted original method render identically (zero changed channels). Every capture case uses exactly the same middle position/normal/UV/index hashes. The original near geometry remains unchanged. Candidate restoration returns the original geometry and material pointers; the native main-view restoration control also has zero changed pixel channels (24 calls / 102,495 triangles before and after).

[Receipt](proofs/reflection-wood-palette/report.json) · [Failing unchanged-source control](proofs/reflection-wood-palette/control.json) · [Original](proofs/reflection-wood-palette/before.png) · [Candidate](proofs/reflection-wood-palette/after.png) · [Native middle-material reference](proofs/reflection-wood-palette/reference.png) · [Main control before](proofs/reflection-wood-palette/mainBefore.png) / [after](proofs/reflection-wood-palette/mainAfter.png)

The fixture loads the published pine's native assets, placement and material hooks. It explicitly invokes the native capture substitution, then the source-extracted original and candidate methods. One placed pine is isolated with a controlled white instance tint and inspected through the native post-render path at 640×360, Low (single-sample scene target). The reference is its native middle geometry with its own material. The mesh is viewed directly to make the exact capture substitution visible; this is **not a full-water/window walkthrough, visual-quality score, or hardware frame-time measurement**.

## Reproduce

```sh
node tools/repro-live-reflection-wood-palette.mjs --out reflection-palette-proof
node tools/repro-live-reflection-wood-palette.mjs --candidate-ref 3a4d5316c --out reflection-palette-control
```

The candidate must pass; the unchanged-source control must fail with the material mismatch. Both default to live Pages and software WebGL. The fixture verifies that the native near and middle bark atlases have different decoded pixel hashes.

Validation: 34 forest/pine tests pass, including the regression that fails on the original material mismatch and nested capture restoration. Production build/type check and diff checks pass. Hardware play-gate and an in-game window/water walkthrough remain pending; this does not close the wider tree-quality checklist.
