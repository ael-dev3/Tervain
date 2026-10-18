# Bound grass colour at covered MSAA samples

A thin blade can cover an MSAA sample while the pixel centre lies outside its triangle. Default interpolation extrapolates colour; the existing global 0–1 clamp still admits values brighter than that triangle's vertex colours. The published **0.0.22 · d40777b** declarations retain this failure.

The revised candidate uses centroid interpolation for **colour and the cross-blade edge ramp** in both stages. The two light intensities keep baseline interpolation and its existing defensive clamps. This reduces centroid-qualified source components **7 → 4** compared with the rejected candidate, preserving the bounded-colour correction without moving the two light intensities to centroid sampling; the unused blade-height varying is removed. This is a shader-interface count, not a hardware instruction count or measured pacing gain. Palette, blade geometry, lighting equations, density and opacity are unchanged.

## Pacing send-back

The [hardware review](https://github.com/ael-dev3/Tervain/pull/641#issuecomment-6242067535) rejected `955c6ea`: **3.2%, 4.6%, 3.8%** of frames exceeded 25 ms, versus **1.3% / 1.1%** live. Those failures remain valid. The original comparison used 0.0.21; later base updates do not explain away that regression.

The branch now includes published `d40777b`, aligning forest/grass culling and upload work for the next comparison. It also narrows centroid sampling as described above. Neither change establishes a hardware pacing fix. A fresh baseline-then-build hardware run remains required before merge.

## Controlled regression

The fixture imports the production declarations and renders subpixel slivers with known vertex colours and a separate white coverage pass. In actual four-sample rendering, coverage-weighted vertex-colour bound violations fall **96 → 0**. The single-sample control is pixel-identical. The resolved 448-pixel colour ramp differs by at most one channel level.

[Current packed-edge receipt](proofs/grass-centroid/packed-edge/slivers.json). The source fingerprint identifies the tested runtime. This isolates interpolation correctness, not whole-scene sparkle or frame cadence.

The rejected [colour-only experiment](proofs/grass-centroid/packed-edge/rejected-colour-only.json) retained the bound test but lost the motion gain (luminance-180 flashes 673 → 674). All five baseline images [match exactly across experiments](proofs/grass-centroid/packed-edge/layout-controls.json). Adding covered-sample interpolation for the steep edge ramp recovers the gain while light intensities remain on baseline interpolation.

## Native compiled check

The new receipt uses the compiled packed-edge build, High post-processing and four-sample MSAA. It checks the build's runtime source against the committed file. Five fixed-phase samples walk through village grass at (-7,45), spanning **0.173 m**; this is a short compiled spot check, not a full walk-through or quality gate.

Each new view primes capture caches. Each pair restores the baseline image exactly, checks equal draw/triangle/texture counts and rejects a warm program link. Optional GPU queries end before synchronous PNG readback. The headed option permits an isolated GPU comparison on suitable hardware, but neither these synthetic samples nor GPU-query durations substitute for the full 60 Hz play gate.

[Native receipt](proofs/grass-centroid/packed-edge/report.json) · [lossless comparison](proofs/grass-centroid/packed-edge/motion.mp4) · [browser preview](proofs/grass-centroid/packed-edge/motion-preview.mp4) · [decoded RGB verification](proofs/grass-centroid/packed-edge/video-verification.json).

| Five-frame temporal observations | Live rule | Packed colour/edge | Original seven-component control |
| --- | ---: | ---: | ---: |
| Luminance ≥180 flashes | 673 | 619 | 617 |
| Luminance ≥200 flashes | 184 | 174 | 174 |
| Luminance ≥220 flashes | 39 | 40 | 40 |
| Luminance ≥240 flashes | 5 | 5 | 5 |
| Strict near-white flashes | 0 | 0 | 0 |
| Overall ROI sparkle | 2.0900% | 1.8844% | 1.8716% |

The packed version retains almost all of the original broad bright-flash gain (8.0% fewer luminance-180 flashes, 9.8% less overall sparkle). It does not improve the highest brightness bands, and this spot does not reproduce strict white flashes. All restored images match exactly; all three variants use 94 draws, matching per-view triangles (first sample 1,694,127) and 274 textures, with zero warm program links.

Software GPU-query medians: **3,076.1 ms live rule / 3,071.2 ms packed / 3,061.8 ms original full-centroid / 3,077.9 ms restored**. These small differences do not demonstrate a speedup, and none is a hardware frame time. The reduction in qualified components is a structural cost reduction that still needs the posted hardware gate rerun.

Earlier [31-frame full-centroid captures](proofs/grass-centroid/report.json) remain historical evidence for the rejected seven-component shader. They are not proof of the revised candidate's pacing or motion result. The strict white-speck report remains open.

## Reproduce

```sh
node tools/repro-grass-centroid.mjs grass-slivers
npm test -- --run tests/presentation/grassEngine.test.ts
npm run build
node tools/repro-live-grass-centroid.mjs --url BUILD_URL --expected-native after --route village --hour 12 --frames 5 --timing 1 --out grass-packed-edge
node tools/encode-grass-centroid-proof.mjs grass-packed-edge
```

For the unchanged-source failure, pass `d40777b` after the sliver output argument; the bounded-colour assertion should fail. Add `--headed 1` to the native command to use the existing hardware-browser path. The diagnostic view remains 640×360 and does not replace a Retina-profile gate. Fourteen focused tests and build/type-check pass.
