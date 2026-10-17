# A143: 0.0.19, hero oaks seated on slopes, shader merge guard, bark seams, bow at rest

## Hero oaks on slopes

- The giant oak's root lobes and soil skirt hung over the downhill soil as pale chunks, because the game seats a tree by its flare and the roots hugged the base plane for too long. Roots now leave the flare, settle to the base plane within about a fifth of their reach and dive in proportion to it; near and mid models no longer carry the soil skirt (`tools/tree-gen/lib/mesh.mjs`, `build.mjs`). The placement audit reports no floating root.

## Leaf shader

- `tests/presentation/foliageShaderBraces.test.ts` keeps every GLSL template in `foliageMaterial.ts` brace-balanced. A merge once left one block open, the leaf program failed to link and every crown vanished while the gates stayed green on their numbers; the stills caught it.

## Folded work

- Grass trample, mover and gust cost cuts; leaf cut-outs in single-sample captures; capture LOD swaps keep each wood model's own material; habitat and forest-floor placement cost cuts; bark normal maps built only when asked for; twig bark vertex search bounded by cells; twig normal-map frames aligned with their UVs; reversed bark UV seams removed without tangent attributes; canopy retries reuse the wood search index and the leaf area tables; leaf-island repair reuses its temporary points; pine footprint scans skip the upper triangles.

## Bow at rest

- Held ready after a shot, the bow pointed straight forward, so from behind the camera looked down its arrow axis and saw only the string. The rest direction is now angled outward by about 35 degrees (`BOW_AT_REST`), so the limb arc and the string both read.

## Hero pine (off by default)

- A generated pine (`tools/tree-gen-pine`, near, mid and far models) is in the tree behind `?heropine=1`. Same-camera stills against the current pine show a fuller crown but washed-out foliage and bare dark limbs at distance, so it stays off.

## Checks

- Visual gate against the live build at 11:00 and 19:48 (giant, grove, woods, deepwoods, meadow, fence, hearth, rooms, sign, peddler, hill, camera): bow, vault 18/18, placement and shimmer pass on both. A `fireplace` spot centres the fire and mantel.
- Grass walk, same route on both builds: sparkle share 1.87% against 2.00%, no white flicker, no pop-in.
- Play gate (1440x900 at 2x): median 16.7 ms and p95 17.1 ms when the machine is quiet; the gate's hero-jump check flags a single frame where the script places the hero for a stage, on the live build too.
