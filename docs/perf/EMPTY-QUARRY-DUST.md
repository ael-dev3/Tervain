# Empty quarry dust draw

Baseline: published [0.0.18 · 421d34b](https://ael-dev3.github.io/Tervain/). This is a small submission-cost reduction for the open performance item in [#326](https://github.com/ael-dev3/Tervain/issues/326), not an explanation of the older `live16` missed-refresh frames.

The quarry particle object is uncullable. When its last particle expires, the update clears all positions below the scene but leaves the object visible, so each applicable render still submits all 90 points. Set visibility from the existing live-particle flag. This keeps the final integrated particle frame and restores visibility as soon as a particle is emitted. Construction-time visibility is unchanged, preserving the existing initial material preparation path.

```sh
node tools/repro-empty-quarry-dust.mjs --baseline 421d34b --out quarry-dust-proof
npx vitest run tests/presentation/quarryDust.test.ts tests/presentation/worldLoading.test.ts tests/presentation/worldPickups.test.ts
npm run build
```

The repro exposes the unchanged baseline dust-update block as a method and compares it with the candidate method. It uses the actual Points material settings and generated puff texture through native Grade/4×MSAA. It warms the original visible material before measuring the empty, active, cleared and stable-idle phases. It does not start an entire world.

- Empty/cleared/idle: **5 → 4 total fixture draws**, **90 → 0 submitted points**.
- Active: **5 → 5 draws**, **90 → 90 points**.
- Every phase: **0 changed RGB channels**, identical particle positions/lifetimes and buffer versions, zero WebGL errors.
- Positive control: active dust changes **1,471 RGB channels** versus empty; this is not a blank-image pass.
- The unit test covers expiration, 120 clean idle steps without another buffer update, and a newly emitted particle becoming visible.

All 104 targeted tests and the production build pass. [Receipt](proofs/empty-quarry-dust/report.json), [empty before](proofs/empty-quarry-dust/before-empty.png), [empty after](proofs/empty-quarry-dust/after-empty.png), [active before](proofs/empty-quarry-dust/before-active.png), [active after](proofs/empty-quarry-dust/after-active.png).

No hardware timing, Mac frame-pacing improvement or play-gate PASS is inferred from software rendering. Each applicable primary/secondary view can avoid its own empty submission; the receipt measures one primary view.
