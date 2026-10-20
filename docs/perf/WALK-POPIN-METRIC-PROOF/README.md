# Walking visibility metric receipt

Source head `7b6d73388409df1e84028dca9bbfe2face1192fd`. Live 0.0.33 · b317734. Native High 960×540 post/MSAA4, frozen phase, woods walking/turning route: 13 retained poses over 1.56 m at synthetic 20 Hz / 2.6 m/s. All 13 repeated updated renders are RGB-exact, hide/restore is RGB-exact, and there are zero captured console errors. Candidate events: **0**. Full-frame changes remain in the report even when excluded by the central crop. The two retained full-frame components lie at the left border: frame 4 has 18 pixels in box [2,270,9,5], and frame 7 has 23 pixels in [0,264,10,5]; the central crop begins at x=96. This is a short-path measurement, not gameplay clearance.

The native missing-foliage control detects central changed pixels **3,291→161,963** and components **40→327** with the corrected either-sign RGB metric. These controlled changes are not gameplay pop-in counts. Control PNGs and all walking/stale/repeated PNGs are retained. Two short FFV1 clips preserve the thirteen poses at the synthetic 20 Hz cadence; decoding every frame back to RGB matches the PNGs exactly (`clip-verification.json`, portable `verify-clips.mjs`). The PNGs are the native post-render output, not isolated foliage renders.

## Regression

The extracted original positive-luminance algorithm is retained in `original-algorithm.mjs`. Its dark-arrival and nearly isoluminant-colour tests fail (2 failures / 3 passes); the corrected metric and existing component suite pass (9/9). The old helper did not exist on main; this reproduces the algorithm from the earlier published replay, not a missing-module failure. Logs are scrubbed only of private paths. Production build passes.

## Retained-route reanalysis

Both-sign reanalysis of earlier native frames finds zero central candidate components on the short woods (1.56 m) and meadow (3.9 m) paths. Woods has two full-frame components and two central changed pixels below the component size threshold. Those observations are retained; no longer-route or general pop-in fix is claimed.

## Budget and product cost

The stock, unmodified budget gate ran on this exact head against two matching live probes, with no startup override, draw/triangle allowance or sampler change. The literal PASS and full draw/triangle/console counts are in `budget.log`. Product runtime, shaders, geometry and materials are untouched; this adds offline capture/measurement tooling. Texture taps and product frame work are unchanged by source inspection; no zero-millisecond or hardware timing claim is made.

Reproduce: `node tools/repro-walk-popin.mjs --route woods --frames 13 --url https://ael-dev3.github.io/Tervain/ --out walk-popin` and the test command in the source README. Build URLs may be live or preview URLs. The final version check guards deployment changes.
