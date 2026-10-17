# Keep frozen struck-tree leaf buffers

An active tree-strike leaf burst rebuilt all 48 matrices and dirtied its upload range even when its effective simulation step was zero. No particle state changes in that case. Skip the repack only when the step is zero and no release is pending. Continue updating the motion-preference release policy before any early return. A newly queued release still gets its first pose at zero dt, including when reduced motion has just been enabled.

## Published repro

On **0.0.18 · 421d34b**, Low, a strike on a native collidable pine released four leaves. During 120 reduced-motion updates, the unchanged burst performed 5,760 matrix writes and increased its attribute version by 120. Raw matrix bits were identical before and after. The native receipt is `proofs/frozen-leaf-burst/live18-before.json`.

```sh
node tools/repro-live-frozen-burst.mjs --url https://ael-dev3.github.io/Tervain/ --expect before --out live-frozen-burst.json
```

Use `--expect after` against a served candidate or a later published build containing the fix.

## Controlled native before/after

The software-WebGL fixture instantiates the actual published and corrected production pools with ten emitted leaves and renders 120 reduced-motion frames:

| Work | Before | After |
| --- | ---: | ---: |
| Matrix upload bytes | 76,800 | 0 |
| Matrix writes | 5,760 | 0 |
| Dirty-version increments | 120 | 0 |
| Draws / triangles per frame | 2 / 80 | 2 / 80 |

Images are pixel-identical and nonempty. Five states' raw Float32 words match bit-for-bit, including queued zero-dt releases, a preference change with a pending release, and resume. GL errors are zero; neither context is lost.

```sh
node tools/repro-leaf-burst-frozen.mjs frozen-burst-proof
npx vitest run tests/presentation/leafBurstIdle.test.ts
npm run build
```

The live four-leaf repro and controlled ten-leaf candidate fixture are separate evidence. This optimization applies to frozen/zero-step bursts; normal moving frames and draw costs are unchanged. It is independent of #504 (the separate continuously falling-leaf module). It is not hardware timing, a full-world candidate replay, crown-quality proof or a fix for the live16/night-mud stalls. No appearance, animation or gameplay rules change. Tracking #326; live reference: https://ael-dev3.github.io/Tervain/ .
