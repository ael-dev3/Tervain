# Trim unused water-spray upload tails

Spray already draws only through the last living pool slot, but all three attributes still upload their entire 480-slot storage on every active update. Limit each update range to the current draw prefix. Dead holes inside that prefix still upload their cleared sizes/fades, and later emissions upload the whole newly needed prefix.

The simulation, shader, draw range, point sizes, CPU arrays, buffer capacity and rendered appearance are unchanged. Attribute references are retained once at construction; the update adds no per-frame attribute-list allocation.

## Published native proof

```sh
node tools/repro-live-spray-prefix.mjs --out live-spray-prefix-proof
```

The tool defaults to https://ael-dev3.github.io/Tervain/. On 0.0.18 · 421d34b it emits 24 drops through the native pool and advances 20 frames. For each frame it draws the same CPU state once with full uploads and once with the proposed prefix ranges.

| Per-frame measurement | Full upload | Prefix |
| --- | ---: | ---: |
| Buffer upload bytes | 9,600 | 480 |
| Draws | 1 | 1 |
| Points | 24 | 24 |

The first image pair is pixel-identical; all frames have no WebGL errors. [Native receipt](../../proofs/spray-upload-prefix/native/report.json), [before](../../proofs/spray-upload-prefix/native/before.png), [after](../../proofs/spray-upload-prefix/native/after.png). Warmup/first allocation is excluded. This is a controlled native emission and same-frame range intervention, isolated from the rest of the scene; it is not a full candidate world or Grade/MSAA replay.

## Actual-source comparison

```sh
node tools/repro-spray-prefix.mjs spray-prefix-proof
npx vitest run tests/presentation/waterSurfaces.test.ts
npm run build
```

Both actual source classes run 240 updates/renders, with overlapping emissions, ring wrap, expiry, re-emission, catch-up without an intervening render, zero and invalid dt. Complete CPU attribute hashes and versions, active/draw state and draw counters match. All six diagnostic image pairs match, including an empty-pool control and five nonblack captures.

| Replay total | Before | After |
| --- | ---: | ---: |
| Source buffer upload bytes | 1,708,800 | 1,003,900 |
| Draws | 178 | 178 |
| Points | 49,739 | 49,739 |
| Texture count | 0 | 0 |
| Initial attribute allocation/upload | 9,600 B | 9,600 B |

Every candidate upload matches the expected prefix byte count. First allocation remains full-sized, and wrap/high occupied indices can still require a long prefix. The saving is not a reduction in buffer capacity or particle count.

[Compiled receipt](../../proofs/spray-upload-prefix/report.json), [per-frame traces](../../proofs/spray-upload-prefix/traces.json.gz), [before active spray](../../proofs/spray-upload-prefix/before-70.png), [after](../../proofs/spray-upload-prefix/after-70.png). Eleven existing water tests and production build pass.

All rendering here uses software WebGL. No hardware timing, M5 FPS gain, or claim that the night/mud hitch is fixed follows from these receipts. Hardware play gate remains required before shipping.
