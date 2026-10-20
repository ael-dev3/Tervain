# Forest refresh pair-list reuse

A moving-camera forest refresh creates three short-lived pair arrays per batch per LOD: mesh counts, coverage uploads, and visibility. Reuse the existing ordered wood/leaf keys instead. Packing, iteration order, materials, geometry and draw decisions are unchanged.

The regression observes eligible two-element array iterations during the actual integration fixture's forest update. Original source produces 243; the repaired update produces zero. This counts the three known temporary pair-list sites, not all JS allocations or idle-frame work.

Reproduce native rendered output and refresh counts independently against either build:

```
node tools/repro-forest-render-pairs.mjs --url BUILD_URL --out OUTPUT_DIRECTORY
```

Use the same browser and renderer for each build. Compare the six report RGB hashes and draw/triangle counts; each pose also requires a repeated render to be RGB exact. `--expected 0` asserts the repaired allocation count. The script does not replace forest bounds, geometry, materials or rendering. Optional capture startup suppression must be restored before native screenshots. The stock budget gate must run separately without startup suppression or allowances.

No hardware frame-time or heat improvement is claimed for this allocation reduction.
