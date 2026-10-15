# Keep tight crown wood-reach checks order-independent

Crown contacts serve two thresholds: the connectivity gap and the per-card wood reach. The nearest-wood search previously stopped as soon as it found contact within the connectivity gap. If `woodReach < gap`, that contact may still fail the tighter reach even though a later triangle would pass it.

The fix uses the smaller of both thresholds when deciding whether further search can stop, including uniform instance scale. The candidate graph and search radius are unchanged. This changes diagnostic classifications only, with no production foliage or appearance changes.

## Controlled repro

```sh
node tools/repro-canopy-tight-reach.mjs canopy-tight-reach-proof
npx vitest run tests/presentation/canopyAudit.test.ts
npm run build
```

Two wood planes sit 0.5 m and 0.1 m from a small leaf. With connectivity gap 0.75 m and wood reach 0.2 m, the leaf is connected and within reach. Merely putting the farther plane first in the triangle order previously reports one detached clump; reversing the same geometry reports zero.

Both orders now report zero at uniform scales 0.5 and 1. True-detached controls with only the farther plane still report one; connectivity remains unchanged. At the ordinary 1.5 m wood reach, full reports match exactly. The new regression fails on the baseline; all 15 audit tests and production build pass.

[Controlled before/after receipt](../../proofs/canopy-tight-reach/controlled.json).

## Native-input comparison

```sh
node tools/repro-live-canopy-tight-reach.mjs --out live-canopy-tight-reach-proof
```

This defaults to https://ael-dev3.github.io/Tervain/. It runs both actual audit versions on up to three smallest masked wood/leaf targets per retained Low LOD, using the published geometry and cutout callbacks. Tight 0.2 m reach is compared with the ordinary 1.5 m reach; the connectivity gap remains 0.75 m.

On published 0.0.18 · 421d34b, the nine sampled targets report **21,843→18,355 detached cards** at the tighter reach. Ordinary-reach full reports hash identically. These are rest-geometry audit flags, not visual judgments about 3,488 individual clumps.

[Native per-target receipt](../../proofs/canopy-tight-reach/native.json). Ordinary-reach full reports must hash identically; tighter-reach connected candidates/component counts remain unchanged and falsely detached card counts can only decrease.

This is sampled, read-only diagnostic proof. It is not full-population clearance, proof that floating crowns are visually fixed, wind-deformed geometry coverage, or hardware timing/FPS evidence. There are no render/draw/upload changes to illustrate with screenshots. Hardware play gate remains required before shipping.
