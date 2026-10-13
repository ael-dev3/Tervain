# Grass reserve work during catch-up

Each grass update previously created a new two-tile, two-millisecond reserve allowance. The fixed-step loop can run nine updates before presenting a frame, multiplying that allowance while recovering from a delayed frame. Visible holes and initial preparation deliberately bypass the reserve limit.

Groundcover now shares one allowance across those updates and resets it during render preparation. The deadline starts at its first use. Resetting happens even when reduced motion or disabled trample skips the interaction pass. Standalone grass-field callers retain their existing per-call allowance.

Run against the original and changed production builds:

```sh
node tools/repro-grass-catchup.mjs --url http://127.0.0.1:4173/ --expect before --out grass-before
node tools/repro-grass-catchup.mjs --url http://127.0.0.1:4173/ --expect after --out grass-after
```

The script uses the native High groundcover, shifts its camera one near-tile width, runs nine simulation updates without rendering, and counts regenerated instance buffers by their attribute versions. Tile bounding-sphere centres classify visible versus reserve starts. It then starts a new render allowance and checks that streaming continues. The clock is fixed to isolate the count allowance; these are not timings or a hardware frame-rate measurement.

Built-game SwiftShader result on the 0.0.15 base:

| Counter | Before | After |
| --- | ---: | ---: |
| Visible tile generations on the first update | 7 | 7 |
| Reserve generations across nine updates | 16 | 2 |
| Generations after the next render preparation | 2 | 2 |

The original receipt uses the 0.0.15 base with the independent window-capture matrix-walk change; that change does not alter groundcover. Both receipts pass their assertions. The lightweight two-layer regression separately reproduces 18 versus 2 reserve generations. Tests retain visible-hole and initial-load coverage, deadline exhaustion, and reset without trample work: 28 focused tests pass, along with TypeScript and production build.

This removes catch-up amplification of unseen streaming work. It does not establish that it caused any particular recorded hitch, or claim steady 60 fps on hardware. Appearance, grass density and visible generation rules are unchanged. Receipts are in `grass-catchup-proof/`.
