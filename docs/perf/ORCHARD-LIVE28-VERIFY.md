# Independent orchard check: 0.0.27 → live 0.0.28

Published build checked: **0.0.28 · 30d1f0d** at https://ael-dev3.github.io/Tervain/. Before is an exact-source production rebuild of **0.0.27 · 163ee68**, with unchanged model assets. Both compiled revisions were read from the application's audit API, independently of `version.json`.

High quality, 1470 × 956 CSS pixels, browser DPR 2, native WebGL buffer **2205 × 1434** (the preset's 1.5 DPR cap), hour 15, reduced motion. Renderer: software ANGLE/SwiftShader. No application source changes.

```js
await tervain.auditCanopies({
  lod: 0, alpha: false, gap: 0.75, woodReach: 1.5,
  maxOperations: 300000000
});
```

Both **full registered-forest** audits complete: 451/451 trees; 12,735,229 → 12,627,281 operations. These are geometry-based detached-card counts, not alpha-aware visual scores. The separate `candidates` field is zero in both and must not be substituted for `detachedCards`.

| Tree | Position (x, y, z), metres | Detached cards before → after | Detached clumps before → after |
| --- | --- | ---: | ---: |
| `tree:orchard:0:0` | (-50.140, 0.260, 19.783) | 34 → **0** | 8 → 0 |
| `tree:orchard:0:2` | (-49.972, 0.115, 30.662) | 298 → **143** | 1 → 1 |
| `tree:orchard:1:0` | (-44.744, 0.407, 19.834) | 75 → **0** | 1 → 0 |

The two controls are the first two other orchard labels in sorted order, selected before reading results. All nine orchard trees total **949 → 239 detached cards**. The requested target remains unresolved: 143 cards, one detached clump; sampled maximum wood gap 1.685 m after the change.

## Matched rendering submission counts

For each tree, camera at root + (0, 4, 12), looking at root + (0, 5, 0). Native `World.update(0, ...)`, one warm `renderWorld()`, then one counted `renderWorld()`; all passes included, automatic counter reset disabled. No raster suppression. Identical camera positions, source assets and quality settings. Counts include shadow and secondary passes and are not the gate's different fixed-view maximum.

| View | Draw calls before → after | Triangles before → after | Triangle delta |
| --- | ---: | ---: | ---: |
| `tree:orchard:0:0` | 338 → 338 | 5,434,979 → 5,432,805 | −2,174 |
| `tree:orchard:0:2` | 351 → 351 | 5,668,810 → 5,665,322 | −3,488 |
| `tree:orchard:1:0` | 343 → 343 | 5,360,694 → 5,356,228 | −4,466 |

Captured runtime console errors/exceptions: **0 → 0**. Counters describe submitted work; they do not establish completed GPU time, Mac frame pacing or heat. Full-resolution software screenshot readback did not finish in the initial attempt and was stopped. No completed Retina image, pixel-identity claim, or hardware gate PASS is attached to this inventory.

[Before receipt](proofs/orchard-live28/before.json) · [After receipt](proofs/orchard-live28/after.json) · [Before full audit](proofs/orchard-live28/before-audit.json) · [After full audit](proofs/orchard-live28/after-audit.json)

Reproduce with `node tools/verify-orchard-releases.mjs BUILD_URL OUTPUT_DIRECTORY EXPECTED_REVISION`. `ORCHARD_SCREENSHOTS=1` additionally requests full-resolution screenshots; inventory does not require readback. A failed or incomplete audit cannot produce a successful report. This check changes no tree geometry or materials.
