# Resend forest-floor fade coverage when the drawn prefix grows

Published [0.0.21 · 570a859](https://ael-dev3.github.io/Tervain/) can leave a drawn forest-floor shrub's GPU distance-fade coverage different from its cached CPU value after catch-up camera pans.

A larger selection queues a prefix upload. A later, smaller selection before the draw can replace that pending range. Shrinking the packed-ID list invalidates matrix/colour slots, so those resend on regrowth. Coverage has its own dirty flag: its hidden CPU tail can already equal the desired values and therefore fail to resend when exposed again.

The fix records the previous count and uploads the coverage prefix whenever the count grows, as well as when coverage values change. It keeps the visible-prefix upload size and existing buffers; no material, geometry, density or placement rule changes.

## Native WebGL reproduction

```sh
node tools/repro-live-floor-pending.mjs --url https://ael-dev3.github.io/Tervain/ --out floor-pending-proof
npx vitest run tests/presentation/forestFloorPending.test.ts tests/presentation/forestFloor.test.ts tests/presentation/forestFloorMatrices.test.ts
npm run build
```

The native-module replay uses High at 640×360, camera (-80, 3.60094, 12), FOV 65°, rotating 0.035 radians per 60 Hz selection step. Three selections precede each draw, modelling the fixed-step catch-up path after a 50 ms frame. The app's frame loop runs multiple `step(SIM_STEP)` calls, each updating the world, before one `present(alpha)`.

The check reads actual Three/WebGL matrix, colour and coverage buffers with `getBufferSubData` and compares their drawn components to the native CPU attributes. Fast diagnostic draws temporarily render only the original floor group in a separate scene; it returns to its original parent afterward. Matched final captures use the full native Grade/post/MSAA scene, with simulation and shadow-map updates frozen. These synchronous readbacks are correctness probes, not a frame-time benchmark.

The candidate adapter triggers the same coverage-prefix upload at native mesh-count growth. The production regression separately exercises the actual patched module with a CPU mirror of Three's ranged-upload rules.

| Result | Published behavior | Growth guard |
| --- | ---: | ---: |
| First GPU mismatch | Catch-up draw 90 | None in 300 draws |
| Wrong drawn components | 1 shrub coverage component | 0 |
| Maximum absolute coverage error | 0.072816 | 0 |
| Component comparisons | 352,737 over 91 draws | 1,433,922 over 300 draws |
| Mismatch after full native render | Still present | None |

All 12 floor batches are included. [Receipt and matched captures](proofs/floor-coverage-regrowth/). The two final screenshots are identical: visible flicker improvement remains unverified. This fixes the reproduced GPU/CPU coverage mismatch; it does not establish an overall foliage-quality or frame-time result.

The deterministic regression fails against source 570a859 at draw 32 (shrubs, coverage component 17) and passes with the guard. All 15 selected tests and build pass. The node fixture and published module use different generated populations, so their first failing draw differs.
