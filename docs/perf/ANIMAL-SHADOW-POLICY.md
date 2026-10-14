# Animal shadow-policy refresh

Published baseline: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). The open village/turn frame-pacing item is tracked in [#326](https://github.com/ael-dev3/Tervain/issues/326). The older `live16` hardware report in `LATEST.md` remains a lead, not evidence that this workload causes a missed refresh.

Every running wildlife step traversed each animal's entire scene (including its skeleton) to assign an unchanged mesh shadow flag. The meshes are fixed after construction. Initialization already sets the right flags, so refresh these scenes only when the Low versus Medium/High policy changes. Hunting effects still receive their original per-step walk because effects may create meshes. Refresh before the ridden-animal early return: that return previously left a mounted animal's old policy in place.

## Reproduce and verify

```sh
node tools/repro-animal-shadow-policy.mjs --baseline 421d34b --out animal-shadow-proof
npx vitest run tests/presentation/animals.test.ts tests/presentation/animalHunting.test.ts tests/presentation/animalConstruction.test.ts
npm run build
```

The script serves the actual baseline and candidate animal modules, loads all 19 delivered textured/rigged GLBs, and runs 120 controller steps focused at (-2, 37), the fence lead. It asserts:

- Animal mesh shadow-flag writes: **2,280 → 0** during stable High updates.
- Every mesh disables/enables shadows on Low/High transitions.
- All 120 animal snapshots have the same SHA-256 before/after.
- Native Grade/4×MSAA RGB, draw calls, triangles, texture count, nominal texture storage and source upload bytes match exactly; WebGL error is zero. Shadow rendering is enabled.

The unit test also covers the mounted deer and Medium→High (same shadow policy). All 41 targeted tests and the production build pass.

[Machine-readable receipt](proofs/animal-shadow-policy/report.json) · [before](proofs/animal-shadow-policy/before.png) · [after](proofs/animal-shadow-policy/after.png).

This isolated software-WebGL fixture measures redundant writes and verifies state/output. Its framed image shows one animal, while all 19 controllers advance. It does not reproduce a whole-world hardware stall, measure M5 frame time, or establish a hardware play-gate PASS. The saved source hash identifies the tested candidate module.
