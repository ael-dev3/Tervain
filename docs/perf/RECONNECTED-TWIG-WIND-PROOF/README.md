# Reconnected birch twig wind

Runtime head `098eba7746d76cd56c52e2e848ac04286a4aa876`; published baseline **0.0.34 · d2c8327**. High preset, normal wind, noon. Target **tree:wild:71:20**, birch / verdant-sentinel, origin **(70.8976, 2.1660, -39.0233)**, largest instance scale **1.0636663**.

The existing repair moves disconnected twig roots onto wood at rest but copies motion attributes from the abandoned limb. Bind only a moved root ring to the nearest support's `_wind` / `_pivot`. Keep every tip and its leaf attachment on the original motion. Static positions, normals, UVs, indices, shaders, materials and leaf binding remain unchanged. Only 16 wind floats and 12 pivot floats differ in this template. No per-frame code, shader, texture taps, attribute size or draw interval is added. There is one additional existing nearest-vertex lookup per relocated root that has motion attributes, during construction only.

## Regression and native motion

The asset-backed regression fails on old code (support weight expected 0.555579, received 0.460999), then passes with the repair. All **27 focused tests** and production build/typecheck pass; logs included.

The native High vertex shader is executed at 17 wind phases (0 through 8 seconds, step 0.5). Float position readback measures each repaired root centre against every other drawn wood triangle, excluding its own twig. For root 15641, maximum world-space centre-to-surface distance is **0.4103489 → 0.0344474 m**; samples above 0.12 m fall **7/17 → 0/17**. This metric is a root-centre distance, not a literal surface air gap. The other repaired root stays near 0.064 m. All other vertex positions match exactly across every phase, including the tips. This does not claim a repair for static detached crowns or a zero residual clearance.

The retained published source regenerates byte-for-byte with the original helper. The instrumented candidate also matches the actual production helper byte-for-byte. Reports include both checks and the full production source. Source hashes identify the runtime and test files.

## Same-camera images

Native post/MSAA images are 640×360 at camera **(78.4261, 10.8486, -32.9060)** looking toward **(75.4261, 10.1486, -35.4060)**. This is an elevated close-up diagnostic pose, not a walking-route camera. A retained published scene is replayed with actual old and new helper output, swapping both colour and shadow geometry motion attributes. These are not separate compiled-world before/after loads. The stock gate below separately runs the compiled PR head.

`native/` contains six before/inactive/after/restored groups. At zero wind, before/after RGB pixels match exactly. With native wind at phases 0, 2, 4, 6 and 8 seconds, 56–141 pixels change; every unchanged/restored control is RGB-identical. The graft is largely occluded by foliage in the full scene. The two lossless APNGs show five phases at two-second intervals: an offline **0.5 fps phase animation**, not real-time or 60 Hz gameplay proof. Independent decoding verifies all ten frames exactly match the original PNGs.

`diagnostic/` repeats rest and wind phase 0 with only this template's leaves hidden, making the wood easier to inspect: **0 / 406** changed pixels respectively, with unchanged/restored controls exact. **Leaves are hidden only in this diagnostic, never removed by the production fix.** These images are supplemental; the full scene is the appearance control. Reflection caches are invalidated for images; no claim that every window cube face is refreshed.

Five steady full-scene wind phases use **507 draws / 8,842,129 triangles** before and after. The first cold rest capture is 513 / 8,865,574; its unchanged control is already 510 / 8,865,571, as are after/restore. That setup difference is retained and is not claimed as a saving.

## Unmodified compiled budget gate

| Cost | Live → candidate |
| --- | --- |
| Maximum draws | 285 → 285 |
| Maximum triangles | 3,048,306 → 3,048,306 |
| Console errors | 0 → 0 |
| Per-frame JS / shader code / texture taps | unchanged |

`play-gate: PASS 098eba774`; actual exit zero, ordinary startup, no initialization script, sampler edits or allowance. Software rendering proves deterministic counters and correctness; no hardware FPS, GPU timing, M5 or heat claim.

## Reproduce

From repository root, select software-WebGL Chrome with CHROME and run browsers sequentially:

```sh
REPRO_INIT_FILE=docs/perf/RECONNECTED-TWIG-WIND-PROOF/raster-suppression-init.js node docs/perf/RECONNECTED-TWIG-WIND-PROOF/repro-native.mjs
REPRO_INIT_FILE=docs/perf/RECONNECTED-TWIG-WIND-PROOF/raster-suppression-init.js node docs/perf/RECONNECTED-TWIG-WIND-PROOF/repro-diagnostic.mjs
npx vitest run tests/presentation/reconnectedTwigWind.test.ts tests/presentation/birchTwigContact.test.ts tests/presentation/canopy.test.ts tests/presentation/branchWind.test.ts
npm run build
node tools/play-gate.mjs --url BUILD_URL --budget-url https://ael-dev3.github.io/Tervain/ --head 098eba774
```

PROOF_OUT selects the proof output directory. Image probes suppress loading raster only and restore it before capture. Leave REPRO_INIT_FILE unset for the stock gate. The scripts read retained live geometry and record its revision; a later release can change that workload.
