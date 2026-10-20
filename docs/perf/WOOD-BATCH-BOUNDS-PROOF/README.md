# Wood-only batch bounds receipt

Source `8847b57702e1a9bb8deddfbc354217eea668307f`. Live pilot: 0.0.33 · b317734. Served candidate: 0.0.33 · 47c507fdb. The final head differs from the rendered candidate only by clearing a stale capture report at startup; application source, public assets and package/build configuration are identical (verified by Git diff). The budget runs on the final head. Native High 640×360 post/MSAA4; six fixed camera/wind poses. All before/after and restored native RGB pairs match exactly, with zero console errors. Independently decoding the old live before-PNG and served production after-PNG also matches RGB exactly for all six poses (`cross-build-pixels.json`). The candidate also asserts at every retained active pose that its actual production wood sphere matches the proposed conservative bound.

Forest view at (-210, terrain+2, 0), yaw 3, pitch 0: **230→229 draws**, **3,692,559→3,683,647 triangles**, upload bytes **13,440→13,440**. The other five poses have equal draw/triangle counts. Textures remain 274; nominal texel storage 1,310,269,324 bytes. Counts are per completed render including auxiliary passes, not hardware GPU timings.

The new bound uses all source wood LODs and the smallest instance scale, keeps the original centre and wind guard, and is contained in the original whole-tree bound. It changes no tree geometry, material, placement, visibility weight, leaf/depth sphere or shadow caster. No floating-crown closure is claimed.

## Repeated cost control

The final 8847b5770 build additionally repeats the forest view three times with production-bound assertions. Every cycle is **230→229→230 draws** and **3,692,559→3,683,647→3,692,559 triangles**. RGB and restored render costs are exact. The renderer submission trace identifies exactly one omitted `verdant-sentinel:0:wood` draw (26,736 indices, one instance), accounting for every saved triangle; there are no added wood submissions and baseline/restored submission multisets match. Reports, raw frames, executed control source and independent accounting are retained under `repeat/` and `repeat-accounting.json`. This rules out an auxiliary-pass scheduling change as the source of the measured saving.

## Verification

- Old production source fails the actual-forest tighter-wood regression (zero qualifying wood bounds). The candidate passes all 25 focused tests, including the existing vertex/wind guard and shadow coverage tests. Build and typecheck pass.
- Live captures, served-candidate captures, full reports and hashes are retained separately. These are completed runs. The earlier interrupted counter-setup attempt is excluded.
- The production assertion checks the actual bound used by the served build, beyond the pure helper overlay comparison. Run `node tools/repro-live-wood-bounds.mjs --url BUILD_URL --out wood-bounds --assert-production` from the repository root. `live-pilot.mjs` preserves the historical executed live probe for inspection. Use the maintained tool for reruns; it supports draw-count restoration both with and without a caller-provided startup raster override. Retained raster is enabled and draw counts must be nonzero.
- The unmodified budget gate runs on the exact source head, two matching live probes, normal startup, no initialization override, no allowances and no sampler change. See `budget.log` for the literal result and full draw/triangle/console counts.

## Cost limits

Construction adds one wood-vertex scan and three retained spheres per batch. Changed packing adds one cached sphere copy/subtraction per LOD; there is no new per-frame allocation or per-instance refresh walk. Shader work per submitted primitive, texture taps, geometry and materials are unchanged. CPU milliseconds, hardware GPU time, Mac FPS and heat were not measured. The observed win is fewer submitted draws/triangles in one measured view, not a general frame-time claim.
