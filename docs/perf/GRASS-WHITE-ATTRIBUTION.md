# White grass flicker: source attribution

This diagnostic extends the native whole-scene capture in [LIVE-FOLIAGE-MOTION.md](LIVE-FOLIAGE-MOTION.md). It changes shaders only in the inspection page; it does not change production shaders, grass colours, geometry or settings.

Run against the published build or a production preview:

```sh
node tools/repro-grass-white-attribution.mjs \
  --url https://ael-dev3.github.io/Tervain/ \
  --controls docs/perf/proofs/grass-white-attribution/controls.json \
  --out grass-white-attribution
```

The fixed route is a 1.3 m camera walk at the village edge, starting at (-7, 45): 31 samples at a synthetic 60 Hz and 2.6 m/s. It freezes clock, wind, actors and interactions, and renders the whole scene through the native post-processing and MSAA path. It is not a hardware frame-time benchmark or a survey of the entire meadow.

The diagnostic records normal grass, a grass-contribution mask, black grass colour with other objects unchanged, and separate removal of petal tint, straw tint, sheen and transmitted-light contributions. Each intervention preserves geometry, alpha/discards and depth. The mask indicates grass contribution, not exclusive pixel ownership: post-processing and translucent foregrounds can mix contributions.

Shader hooks keep their original cache-key identity. Before sampling, the instrumented scene with all controls enabled must match every original image channel. Every capture rejects a WebGL draw error or lost context. The near-white threshold and motion-alignment metric are the same as the preceding live walk report; counts are pixel observations across frames, not unique blades or objects. Removing a term is a causal diagnostic, not a proposed visual change or a quality pass.
