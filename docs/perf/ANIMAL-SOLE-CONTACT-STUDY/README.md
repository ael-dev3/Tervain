# Delivered animal sole selection is empty

Read-only diagnosis, no production fix or art change. Source checkout `d5fc6a0a80e4a471f1f23a08528a3d5539989bbe` (the placement-query PR #746, based on published main `a3396ee14`); the sole-selection code is unchanged from that main.

## Two independent observations

1. A native software-WebGL world loads all 19 delivered animal models. The actual constructed animal objects report **0 sole meshes / 0 retained sole vertices for every animal**, including the tame mount. Each skeleton has 29 bones. [Native rows](native.json). This is instrumented source on the published 0.0.38 base, not a direct audit method exposed by Pages.
2. Decode all 19 delivered GLBs through the game's loader and inspect every vertex's four skin influences using the same foot-joint-name lookup as `cloneAnimal`. All have four recognized paw joints, maximum paw influence **0.3499999940395355**, and **0 vertices above 0.35**. [All delivered-skin rows](delivered-skins.json). The fixture loader strips textures but preserves geometry, skins and animation; the native observation uses the actual textured assets.

## Cause

In `src/presentation/animals.ts`, `cloneAnimal` skips a vertex when `influence <= 0.35`. The source skins cap the paw influence at authored 0.35, stored as Float32 0.3499999940395355. Thus the filter rejects every paw candidate. This is a threshold/source-data mismatch, not solely roundoff: even exact 0.35 would fail the strict filter. Changing only `<=` to `<` would still reject serialized Float32 0.35.

The fallback list is filled only when recognized foot joints are absent. These skeletons have them, so that fallback is empty too. Consequently `place`'s sole-contact loop has no vertices to evaluate. The existing contact tests use a synthetic fixture with weight 1 on the paw and do not expose this incompatibility.

An inclusive authored-0.35 threshold must account for its serialized representation (for example compare against `Math.fround(0.35)`). This is a fix direction, **not a production recommendation without verification**: enabling contacts adds CPU skin/terrain probes and changes root heights. Next checks must cover actual animated poses, slopes, seated cats, a raised patch under a paw, sample counts, and the unchanged draw/triangle budget plus CPU cost. This finding alone does not prove the playtest's cat sliding cause or visible penetration, and no correction is claimed yet.

Reproduce the delivered-skin scan from the checkout with dependencies: `node tools/repro-animal-sole-study.mjs [output-directory]`. It creates/removes only its own generated Vitest file and writes raw observations into the output directory. No renderer, shader, geometry, controller or gameplay code is changed. Native observation metadata is provided above; no pixel comparisons or hardware claims are made for this read-only study.
