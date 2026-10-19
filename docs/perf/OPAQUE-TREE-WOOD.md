# Opaque wood cutouts

Candidate `8a5c775d30bba21cb1005fabe56bf0383a4e377a`, based on the scenario-fixture repair in #684. Published baseline: 0.0.29 · `bf9261f`.

The three hero-oak bark images use simple RGB-only WebP, but their wood materials specify MASK at 0.18. The nine source wood LODs carry fully opaque vertex alpha. The candidate recognizes the encoded image container during existing texture pooling, checks the material and vertex-alpha inputs during template preparation, and omits the redundant cutout. Unknown/alpha-bearing images, alpha maps, fractional opacity and nonopaque vertex alpha retain the cutout. Existing sample-alpha state is retained to avoid adding state transitions between wood and leaves.

## Verification

23 focused tests and the production build pass. Actual bark and foliage files exercise the image guard; normalized RGBA vertex alpha and fractional opacity exercise the safety guards.

[Reproduction script](../../tools/repro-live-opaque-tree-wood.mjs): `node tools/repro-live-opaque-tree-wood.mjs --out artifacts/opaque-tree-wood`

The native published High/MSAA4 renderer is frozen per pose. All 18 affected colour/caster materials are checked before toggling their cutoff; geometry, instance packing and maps are retained. Five standard forest poses, a forest view and three views aimed at affected wood are rendered before, after and restored. Wind phases vary between poses. Image variance and positive raster counts are required. Native immutable model references are matched to the verified Git blobs.

[Native report](proofs/opaque-tree-wood/report.json) · [compiled material check](proofs/opaque-tree-wood/compiled.json) · [budget receipt](proofs/opaque-tree-wood/budget.json)

| View | Draws before | Triangles before | Draw delta | Triangle delta | RGB after / restored |
| --- | ---: | ---: | ---: | ---: | --- |
| Standard 1 | 456 | 6,242,951 | 0 | 0 | identical |
| Standard 2 | 417 | 6,142,168 | 0 | 0 | identical |
| Standard 3 | 418 | 6,186,277 | 0 | 0 | identical |
| Standard 4 | 419 | 6,201,033 | 0 | 0 | identical |
| Standard 5 | 418 | 6,200,649 | 0 | 0 | identical |
| Forest | 230 | 3,692,559 | 0 | 0 | identical |
| Wood 1 | 232 | 3,129,990 | 0 | 0 | identical |
| Wood 2 | 183 | 2,176,649 | 0 | 0 | identical |
| Wood 3 | 288 | 3,955,825 | 0 | 0 | identical |

All nine pairs also retain the same texture count (274) and buffer-upload bytes. Console errors: 0. The compiled candidate separately confirms all 18 registered wood colour/caster materials use cutoff 0.

| Cost | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Stock gate maximum draws | 285 | 285 | 0 |
| Stock gate maximum triangles | 3,048,306 | 3,048,306 | 0 |
| Registered eligible wood cutouts | 18 | 0 | −18 |
| Sample-alpha states (enabled / disabled) | 9 / 9 | 9 / 9 | 0 |
| Measured alphaTest uniform uploads per view | 0–4 | 0–4 | 0 in every pair |

The renderer already caches the alphaTest uniform, so the captures show equal upload counts. The shader change removes the eligible wood cutout branch and its coverage calculation; colour texture maps and lighting stay on their existing paths. Header and vertex checks run during template preparation, with no new per-frame callbacks or buffers. Driver instruction counts and Apple-GPU timing remain unmeasured.

The stock gate compared the maximum of four completed samples per probe against the larger of two live probes, matched the exact candidate revision, allowed zero extra triangles and exited 0:

`play-gate: PASS 8a5c775d3`

Example images: [forest before](proofs/opaque-tree-wood/pose-0-before.png) / [after](proofs/opaque-tree-wood/pose-0-after.png), [wood before](proofs/opaque-tree-wood/pose-6-before.png) / [after](proofs/opaque-tree-wood/pose-6-after.png).
