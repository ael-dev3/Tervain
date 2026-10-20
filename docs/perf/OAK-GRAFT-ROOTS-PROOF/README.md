# Supplied oak graft roots

Runtime head `610b2c1489c0295819c3a363a2cf5d463f6df74e`, stacked on #729. Published baseline **0.0.34 · d2c8327**, High, noon, resting wind. Actual live target **tree:wild:36:23**, oak / verdant-sentinel, tree origin **(-147.7846, 0.3465, -19.5108)**, scale **1.3819910**. This is a narrow static twig attachment repair, not a claim to close general detached crown quality.

## Cause and change

Crown linking may remove a parent twig plan after another twig has attached to it. Existing birch handling seats retained roots against the final wood; supplied oaks do not use it. The retained native verdant-sentinel near mesh has three root-centre distances above 0.12 local units. For the worst root (plan 109, vertex 16097), distance to every other drawn wood surface, excluding its own twig, is **0.8260482 → 0.0397685 local units**, or **1.1415911 → 0.0549597 world metres** at this instance. The candidate has no root above 0.12 local units. These are centre-to-surface distances, not literal air-gap widths.

The repair applies to supplied near oaks only. Hero oaks, mid/far LODs, leaf layout, materials, shaders, triangle indices and counts are unchanged. It keeps the original wood available for the existing leaf snap, then rebuilds just the supplied near wood with the already existing root reconnection. Moving that repair ahead of leaf snapping was tried and rejected because it changed leaf positions. Keeping the order preserves every final leaf buffer. Parent #729 ensures moved roots use their new support's wind phase while tips retain their original leaf motion binding.

## Regression

The asset-backed regression fails on old code and passes on this head. It checks verdant-sentinel, tree-1505 and oak-elder: every leaf buffer/index matches, wood indices and triangle counts match, far wood attributes match, and near roots seat within 0.12 local units. The two supplied templates actually present in the published scene each have three separated roots before and zero after; the older oak-elder fixture is additional coverage, not a claim that the default live scene uses it. All **15 focused tests** and production build/typecheck pass. Logs and source hashes are included.

## Native same-camera proof

The original helper regenerates all retained live source attributes and indices byte-for-byte. Rebuild old and repaired output from that retained trimmed source and the actual live twig plans. Replace matching native colour/shadow geometry attributes while retaining instanced attributes, materials and draw bindings. Thus captures compare actual helper output over a retained published scene; they are not separate compiled-world loads. The unmodified gate below separately loads the compiled PR head.

640×360 native post/MSAA, elevated close-up camera and focus recorded in native/report.json. Time and wind are fixed; this is a static attachment defect, not a walking-route or 60 Hz clip. In the complete scene, foliage heavily occludes the graft: **9 pixels** change. A separately labelled **wood-only diagnostic**, hiding only this template's leaf draws, exposes **106 changed pixels**; production removes no leaves. Both sets have before/inactive/after/restore frames. Every unchanged and restored control is RGB-identical, independently decoded with raw RGB hashes in native/independent-checks.json. No full crown silhouette improvement or all-floating-clumps closure is claimed.

The first cold full render is 342 draws / 4,020,699 triangles; the unchanged control is already 339 / 4,020,696, as are after/restore. This setup difference is not a saving. Wood-only before/after both use 335 / 3,960,216. Reflections are invalidated per image; no claim that all window cube faces refresh.

## Native wind follow-up

A separate run executes the actual native High wood vertex shader and reads float positions at 17 phases (0–8 seconds, step 0.5), with normal wind and no movers/shakes. For the worst graft (vertex 16097), maximum root-centre-to-other-wood distance is **1.1444497 → 0.0554063 world metres**; samples over 0.12 m **17/17 → 0/17**. Another rebuilt graft falls **0.9191281 → 0.0114588 m**. The other two sampled moved-root spans stay below 0.12 m in both variants. All positions outside those four rebuilt twig spans match exactly. The tip rings belong to those spans and are excluded from the identity assertion; the final leaf buffers are checked separately by the regression. This is not an audit of every clump or a real-time motion clip. Raw phases, source agreement and the production helper are in native/wind-trace.json. The candidate can also bring an unchanged root into contact by seating its supporting twig; that additional root was measured in the static report, not individually sampled by this wind follow-up.

## Cost and budget

| Cost | Live → candidate |
| --- | --- |
| Stock maximum draws | 285 → 285 |
| Stock maximum triangles | 3,048,306 → 3,048,306 |
| Console errors | 0 → 0 |
| Per-frame JS / shader code / texture taps / payload size | unchanged |
| Construction | supplied near wood rebuilt once after leaf snapping; source retained temporarily |

The extra construction rebuild is an explicit cost of keeping leaf placement stable. No construction-time speedup, per-frame timing, hardware FPS, M5 heat or GPU timing claim. The ordinary stock gate uses normal startup with no initialization script, sampler changes or allowance. Actual exit zero; **play-gate: PASS 610b2c148**.

## Reproduce

From repository root with software-WebGL Chrome selected by CHROME:

```sh
REPRO_INIT_FILE=docs/perf/OAK-GRAFT-ROOTS-PROOF/raster-suppression-init.js node docs/perf/OAK-GRAFT-ROOTS-PROOF/repro-native.mjs
REPRO_INIT_FILE=docs/perf/OAK-GRAFT-ROOTS-PROOF/raster-suppression-init.js node docs/perf/OAK-GRAFT-ROOTS-PROOF/repro-native-wind.mjs
npx vitest run tests/presentation/oakTwigContact.test.ts tests/presentation/birchTwigContact.test.ts tests/presentation/reconnectedTwigWind.test.ts tests/presentation/canopy.test.ts
npm run build
node tools/play-gate.mjs --url BUILD_URL --budget-url https://ael-dev3.github.io/Tervain/ --head 610b2c148
```

Image probe loading raster suppression is restored before captures. Leave REPRO_INIT_FILE unset for the stock gate. Run browsers sequentially. PROOF_OUT selects image/report output. The probe records live revision; later live changes can alter the source workload.
