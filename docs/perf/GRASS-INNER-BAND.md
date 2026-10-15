# Grass inner-band distance guard

Published reference: [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/) and [playtest checklist #326](https://github.com/ael-dev3/Tervain/issues/326). This is a grass update CPU-work reduction, not proof of a hardware frame-time or hitch improvement.

The retained-tile loop already computes the distance to a tile's nearest anchor bound. It then computes farthest-corner distance to reject a tile wholly inside the layer's inner cutoff. The latter test is unnecessary whenever nearest distance is at or beyond the inner cutoff: farthest distance cannot be smaller. Only perform it when `nearest < innerStart`.

This also skips every inner rejection test for the near-grass layer, whose inner cutoff is negative. Far-grass tiles overlapping the inner cutoff still receive the original farthest test. No range, density, interpolation, instance count rule, placement or rendering policy changes.

## Paired native replay result

| Work / equality control | Before | After |
| --- | ---: | ---: |
| Recorded tile decisions | 12,490 | 12,490 |
| Near-layer farthest checks | 1,027 | 0 |
| Far-layer farthest checks | 6,802 | 341 |
| Total farthest checks | 7,829 | 341 |
| Endpoint draw calls | 119 | 119 |
| Endpoint triangles | 788,902 | 788,902 |
| Endpoint texture objects | 120 | 120 |

Farthest-distance evaluations fall 95.6%. All visibility/count/draw-range decisions match native, with the same decision hash in all three arms, and identical endpoint pixels. Renderer counts are unchanged controls, not claimed GPU savings.

## Reproduce

Run `node tools/repro-live-grass-inner-band.mjs --url https://ael-dev3.github.io/Tervain/ --out grass-inner-band-proof` with the repository's Chromium/software-WebGL prerequisites.

The repro records actual retained tiles, native rank buffers, source options, camera inputs and post-update decisions over 120 scripted native follow-camera/grass updates. It replays the actual baseline/candidate `TileLayer.update` method on each recorded tile and requires its visibility, instance count, vertex draw count and draw range to match the recorded native decision. Request keys are treated as resident to isolate the retained-tile loop: this is not a comparison of independent streaming queues or a real-input walking gate.

The executed pre-change control has **7,795 farthest-distance evaluations** in each arm across **12,457 tile decisions**. It correctly fails the savings assertion while matching native decisions and endpoint pixels. That separate capture contains a slightly different retained-tile set; do not compare its count against the candidate arm of the paired receipt. Each paired replay shares one recorded native input trace, and assertions are exact within that trace. Add `--candidate-ref 421d34b` to repeat that negative control.

Each counted farthest evaluation executes the source helper's corner bounds and `Math.hypot`. Counts exclude other distance work in request generation, nearest-bound tests, shader preparation and rendering. No allocation, upload-byte, GPU-time or FPS gain is claimed.

- [Native before/after receipt](../../proofs/grass-inner-band/report.json)
- [Executed unchanged-source control](../../proofs/grass-inner-band/unchanged-source-control.json)
- [Native image](../../proofs/grass-inner-band/native.png)
- [Before image](../../proofs/grass-inner-band/before.png)
- [After image](../../proofs/grass-inner-band/after.png)

Images are frozen native Grade/post endpoint controls, not independently simulated motion sequences. The whole native world is synchronized to the endpoint camera before capture. Low preset, 640×360, software WebGL; no hardware timing inference.

Validation: two new regressions fail on baseline; 33 targeted tests pass with the guard, including original visibility checks and nearest-threshold equality, slopes, altitude and outer-cutoff cases. Production build passes. Hardware play-gate receipt remains pending.
