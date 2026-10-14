# Reuse groundcover mover inputs

Every groundcover simulation update previously built a temporary hero array, a new hero footprint object when grounded, and a spread array combining that footprint with the other bodies. The trample selector already reused its own storage; this removes the upstream input churn as well.

Groundcover now owns one footprint record and one input array per world. It overwrites the current values before the synchronous trample selection, omits the hero while airborne, preserves body ordering, and clears removed bodies. Worlds do not share the storage. Low quality has no trample field and skips assembling these inputs.

## Reproduce

```sh
node tools/repro-groundcover-inputs.mjs --baseline 421d34b --out groundcover-input-proof
npx vitest run tests/presentation/groundcoverMovers.test.ts tests/presentation/grassMoverReuse.test.ts tests/presentation/grassCatchupReserve.test.ts tests/presentation/grassTrampleFrames.test.ts
```

The script serves the original groundcover source from the baseline commit and the current source, with shared current dependencies. Each runs 120 updates including walking, airborne steps, a zero-delta step, a teleport and removal of another body. It uses actual grass generation, trample GPU passes and native Grade/MSAA on a flat synthetic terrain. It asserts identical mover values, scene counters, source upload bytes, texture payload and every captured RGB channel. This is not a full-world hardware timing test.

The CPU regression test checks the same lifecycle outputs and independent-world ownership. Across 120 updates, the supplied input arrays fall from 120 distinct identities to one; grounded hero objects fall from 110 to one. This counts these two exposed allocation sites only, not total heap allocation. The old intermediate hero arrays are not included in that counter.

The live release baseline is https://ael-dev3.github.io/Tervain/ (0.0.18 · 421d34b). No grass palette, geometry, distances, shaders or movement rules change. Hardware frame-time and heat improvements require a hardware gate.

## Native software-WebGL receipt

[Before/after receipt](proofs/groundcover-mover-inputs/report.json) · [Before](proofs/groundcover-mover-inputs/before.png) · [After](proofs/groundcover-mover-inputs/after.png).

Both renders: 27 draw calls, 733,225 triangles, six textures, 2,915,244 source-upload bytes and 3,187,748 bytes of nominal texture payload; four-sample MSAA, no GL errors. All RGB channels match. Four focused test files pass (14 tests), and the production build passes.
