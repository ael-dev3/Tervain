# Canopy source coverage by species and LOD

The existing near-source canopy audit includes conifers, but its output did not identify species and the adapter always selected near geometry. A near-card result cannot establish mid/far coverage or clear floating opaque needle islands within transparent cards.

This diagnostic adds explicit `lod` selection, per-species observed counts, independent expected counts from the authored population, and `missingSpecies`. A missing source cohort makes `complete` false. Invalid LODs and mismatched source metadata are rejected. Rendering, assets and placement are unchanged; only the explicitly invoked offline audit uses this selection.

```sh
node tools/audit-canopy.mjs --url http://127.0.0.1:4173/ --lod 0 --repro --repro-species pine --out near.json --shot pine-detached.png --restored-shot pine-restored.png
node tools/audit-canopy.mjs --url http://127.0.0.1:4173/ --lod 2 --out far.json
```

The tool verifies that the served build honors the requested LOD and supplies coverage metadata. An incomplete scan writes its report and exits nonzero. Baselines must match LOD, species populations and gap threshold. An optional `--driver` selects a compatible CDP launcher.

## Native near-source proof

The [receipt](canopy-coverage-proof/near.json) covers all 341 registered trees: 116 pine, 58 fir, one shore pine, 61 shrub, 28 birch, 51 oak, 17 palm and nine orchard trees. The unmodified geometric audit has zero detached candidates and uses 8,540,370 budgeted operations.

The pine-specific fixture moves a shared source crown away from its wood: canopy candidates change **0 → 33 → 0** after restoration. The selected fixture has one detached chunk. Root candidates remain zero throughout, showing why a root-placement check cannot detect detached crowns. Review the native [detached](canopy-coverage-proof/pine-detached.png) and [restored](canopy-coverage-proof/pine-restored.png) fixture images. This is an injected source-geometry defect, not a reproduction of every visible needle island in the playtest.

The native [far-source receipt](canopy-coverage-proof/far.json) registers only **225 of 341** trees: all **116 pines** lack wood support geometry at this LOD. It correctly reports `missingSpecies: { pine: 116 }`, `speciesComplete: false`, `complete: false` and exits nonzero despite zero detected candidates. This identifies an algorithm coverage gap, not proof that all far pines are visually detached.

Validation: 24 canopy/foliage tests pass, TypeScript and production build pass, and the native near-source run passes its coverage and injection controls. Tests also cover species counts at each source LOD and reject mismatched LOD metadata. The geometric algorithm, proximity threshold and operation accounting are unchanged.

**Limit:** alpha transparency and shader wind remain untested. Card bounding boxes can bridge space where the painted opaque needles have no connection. Zero geometric candidates is not a visual canopy PASS; an alpha-aware visible-island detector is still needed. Billboard sources that omit wood cannot be audited for wood support with this algorithm and must be reported as missing coverage.
