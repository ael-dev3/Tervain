# Grass rank coverage for secondary cameras

Grass tiles trim their sorted instance ranks using the main camera's distance. A window or reflection camera can be closer to the same tile, where the native grass shader would keep higher ranks. The draw callback adjusts blade-tail geometry for the secondary camera, but previously left the instance count trimmed for the main camera. Valid clumps were therefore missing in the captured view.

Use the same rank-count rule with the current pass's camera, then restore the main-camera instance count after the pass. This changes no grass geometry, material, fade thresholds, density or style. It addresses the rank tail of tiles already admitted to rendering; tiles hidden or absent from the main-camera stream are a separate coverage limitation.

## Controlled native grass proof

The fixture uses the production grass material, clump geometry and tile streamer, with sixteen stable ranks. Only the streamer implementation differs: published revision 9ab40b3 versus the candidate.

| Measurement | Baseline | Candidate |
| --- | ---: | ---: |
| Main-camera instance count | 6 | 6 |
| Closer capture-camera instance count | 6 | 16 |
| Count restored after capture | 6 | 6 |
| Main-camera submitted triangles | 180 | 180 |
| Capture-camera submitted triangles | 180 | 480 |
| WebGL errors | 0 | 0 |

The capture restores 491 changed pixels (maximum channel delta >10); main-camera pixels are identical. The additional capture triangles are the valid rank tail that was previously missing, not a performance reduction. This standalone software-WebGL fixture does not use whole-scene post/MSAA and does not establish hardware frame timing or that all world pop-in is fixed.

[Receipt](proofs/grass-capture-ranks/fixture.json) / [before](proofs/grass-capture-ranks/before.png) / [after](proofs/grass-capture-ranks/after.png).

```sh
node tools/repro-grass-capture-ranks.mjs --out outputs/grass-capture-ranks
node tools/repro-live-grass-capture-ranks.mjs "$BUILD_URL" outputs/live-grass-capture-ranks
npx vitest run tests/presentation/grassCaptureRanks.test.ts tests/presentation/grassEngine.test.ts tests/presentation/grassCatchupReserve.test.ts
```

The focused tests check both closer and farther secondary cameras and restoration of the main count. Eighteen tests and production build/type-check pass. Hardware play/video gate and live publication remain pending.

## Published and compiled-world callbacks

The actual compiled-world probe samples twelve matching native grass tiles, without substituting a source class. Published 0.0.16 expands none of them for the nearer capture camera. The candidate expands eleven while restoring all twelve main counts exactly. For example, one far tile captures 5 ranks before and 107 after, then restores 5; another captures 3 before and 171 after, then restores 3.

[Published receipt](proofs/grass-capture-ranks/live-before.json) / [candidate receipt](proofs/grass-capture-ranks/live-after.json). The candidate program filename and SHA-256 distinguish its compiled code from the published program; its build label names the base revision used before committing the fix. These callback checks do not substitute for a recorded in-game window/reflection walkthrough. The `available` field counts nonzero buffer slots and can include stale pooled tails; it is not a count of currently generated instances. The production callback uses its actual generated count.
